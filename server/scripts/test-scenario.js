const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { createPool } = require('../src/database/pool');
const { getResultLevel, getMasteryDelta, calculateScenarioScore } = require('../src/scenario/scenario.scoring');

const PORT = process.env.SCENARIO_TEST_PORT || '5107';
const BASE_URL = `http://127.0.0.1:${PORT}`;
const PASSWORD = 'Scenario1d1Pass9';
const USER_A_EMAIL = 'phase1d1.scenario.a@example.com';
const USER_B_EMAIL = 'phase1d1.scenario.b@example.com';
const TEMP_SCENARIO_SLUG = `phase-2d2-locale-${Date.now()}`;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getSetCookieHeaders(response) {
  if (typeof response.headers.getSetCookie === 'function') return response.headers.getSetCookie();
  const value = response.headers.get('set-cookie');
  return value ? [value] : [];
}

function mergeCookies(currentCookieHeader, response) {
  const cookieMap = new Map();
  if (currentCookieHeader) {
    for (const item of currentCookieHeader.split(';')) {
      const [name, ...valueParts] = item.trim().split('=');
      if (name) cookieMap.set(name, valueParts.join('='));
    }
  }
  for (const header of getSetCookieHeaders(response)) {
    const [name, ...valueParts] = header.split(';')[0].split('=');
    if (!name) continue;
    const value = valueParts.join('=');
    if (value) cookieMap.set(name, value);
    else cookieMap.delete(name);
  }
  return Array.from(cookieMap.entries()).map(([name, value]) => `${name}=${value}`).join('; ');
}

async function request(method, pathName, body, cookieHeader = '') {
  const response = await fetch(`${BASE_URL}${pathName}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};
  return { response, json, cookieHeader: mergeCookies(cookieHeader, response) };
}

function startServer() {
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT, CLIENT_ORIGIN: 'http://localhost:3000', NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  return child;
}

async function waitForHealth(child) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    if (child.exitCode !== null) throw new Error('Server exited before health check completed.');
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) return;
    } catch {}
    await delay(250);
  }
  throw new Error('Timed out waiting for server health check.');
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  child.kill();
  await Promise.race([new Promise(resolve => child.once('exit', resolve)), delay(3000)]);
}

async function cleanup(pool) {
  const [scenarioRows] = await pool.query('SELECT id FROM scenario_definitions WHERE slug = ?', [TEMP_SCENARIO_SLUG]);
  const scenarioIds = scenarioRows.map(row => row.id);
  if (scenarioIds.length) {
    const [attemptRows] = await pool.query('SELECT id FROM scenario_attempts WHERE scenario_id IN (?)', [scenarioIds]);
    const attemptIds = attemptRows.map(row => row.id);
    if (attemptIds.length) {
      await pool.query('DELETE FROM scenario_progress_events WHERE scenario_attempt_id IN (?)', [attemptIds]);
      await pool.query('DELETE FROM scenario_decisions WHERE attempt_id IN (?)', [attemptIds]);
      await pool.query('DELETE FROM scenario_attempts WHERE id IN (?)', [attemptIds]);
    }
    await pool.query('DELETE FROM scenario_definitions WHERE id IN (?)', [scenarioIds]);
  }
  const [users] = await pool.query('SELECT id FROM users WHERE email IN (?, ?)', [USER_A_EMAIL, USER_B_EMAIL]);
  for (const user of users) {
    await pool.query(
      `DELETE FROM sessions
       WHERE CAST(JSON_UNQUOTE(JSON_EXTRACT(data, '$.userId')) AS UNSIGNED) = ?`,
      [user.id]
    );
  }
  await pool.query('DELETE FROM users WHERE email IN (?, ?)', [USER_A_EMAIL, USER_B_EMAIL]);
  await pool.query('DELETE FROM sessions WHERE expires < NOW()');
}

async function createLocaleTestScenario(pool) {
  const [scenarioResult] = await pool.query(
    `INSERT INTO scenario_definitions
       (slug, title, summary, topic_code, difficulty, version, status, estimated_minutes, total_steps, first_published_at)
     VALUES (?, 'English Locale Test', 'English fallback summary.', 'phishing_and_scams', 'beginner', 1, 'published', 4, 3, CURRENT_TIMESTAMP(3))`,
    [TEMP_SCENARIO_SLUG]
  );
  const scenarioId = scenarioResult.insertId;
  await pool.query(
    `INSERT INTO scenario_definition_translations (scenario_id, locale, title, summary)
     VALUES (?, 'en', 'English Locale Test', 'English fallback summary.'),
            (?, 'zh-CN', '中文场景测试', '中文摘要。')`,
    [scenarioId, scenarioId]
  );
  for (let order = 1; order <= 3; order += 1) {
    const options = [
      { key: 'A', text: `English unsafe ${order}`, score: 0, outcomeCode: `unsafe_${order}`, feedback: `English unsafe feedback ${order}`, safetyExplanation: `English unsafe safety ${order}`, nextStepOrder: order < 3 ? order + 1 : null },
      { key: 'B', text: `English safe ${order}`, score: 2, outcomeCode: `safe_${order}`, feedback: `English safe feedback ${order}`, safetyExplanation: `English safe safety ${order}`, nextStepOrder: order < 3 ? order + 1 : null },
      { key: 'C', text: `English partial ${order}`, score: 1, outcomeCode: `partial_${order}`, feedback: `English partial feedback ${order}`, safetyExplanation: `English partial safety ${order}`, nextStepOrder: order < 3 ? order + 1 : null },
    ];
    const [stepResult] = await pool.query(
      `INSERT INTO scenario_steps (scenario_id, step_order, situation_text, prompt_text, options_json)
       VALUES (?, ?, ?, ?, CAST(? AS JSON))`,
      [scenarioId, order, `English situation ${order}`, `English prompt ${order}`, JSON.stringify(options)]
    );
    await pool.query(
      `INSERT INTO scenario_step_translations (step_id, locale, situation_text, prompt_text)
       VALUES (?, 'en', ?, ?),
              (?, 'zh-CN', ?, ?)`,
      [stepResult.insertId, `English situation ${order}`, `English prompt ${order}`, stepResult.insertId, `中文情境 ${order}`, `中文问题 ${order}`]
    );
    for (const option of options) {
      await pool.query(
        `INSERT INTO scenario_option_translations (step_id, option_key, locale, text, feedback, safety_explanation)
         VALUES (?, ?, 'en', ?, ?, ?),
                (?, ?, 'zh-CN', ?, ?, ?)`,
        [
          stepResult.insertId,
          option.key,
          option.text,
          option.feedback,
          option.safetyExplanation,
          stepResult.insertId,
          option.key,
          `中文选项 ${order}${option.key}`,
          `中文反馈 ${order}${option.key}`,
          `中文说明 ${order}${option.key}`,
        ]
      );
    }
  }
  return scenarioId;
}

async function register(email, displayName) {
  const result = await request('POST', '/api/auth/register', {
    email,
    displayName,
    password: PASSWORD,
    age: 16,
  });
  assert.equal(result.response.status, 201);
  return result;
}

async function login(email) {
  const result = await request('POST', '/api/auth/login', { email, password: PASSWORD });
  assert.equal(result.response.status, 200);
  return result;
}

async function saveProfile(cookie) {
  const result = await request('PUT', '/api/profile', {
    aiNickname: 'Scenario',
    educationLevel: 'form_4',
    preferredLanguage: 'english',
    familiarityLevel: 'beginner',
    helpTopics: ['avoiding_scams', 'protecting_privacy'],
    learningStyle: 'step_by_step',
    onboardingCompleted: true,
  }, cookie);
  assert.equal(result.response.status, 200);
}

function wrongOption(correct) {
  return correct === 'A' ? 'B' : 'A';
}

async function completeAssessmentForPhishingRecommendation(pool, cookie) {
  let result = await request('POST', '/api/assessments/initial/attempts', {}, cookie);
  assert.equal(result.response.status, 201);
  const attemptId = result.json.attempt.id;
  const [[definition]] = await pool.query("SELECT id FROM assessment_definitions WHERE slug='initial-cyber-wellness-v1' AND version=1");
  const [questions] = await pool.query(
    `SELECT id, topic_code, correct_option_key
     FROM assessment_questions
     WHERE assessment_id = ?
     ORDER BY display_order`,
    [definition.id]
  );
  for (const question of questions) {
    const selectedOptionKey = question.topic_code === 'phishing_and_scams'
      ? wrongOption(question.correct_option_key)
      : question.correct_option_key;
    result = await request('PUT', `/api/assessment-attempts/${attemptId}/answers`, {
      questionId: question.id,
      selectedOptionKey,
    }, cookie);
    assert.equal(result.response.status, 200);
  }
  result = await request('POST', `/api/assessment-attempts/${attemptId}/submit`, {}, cookie);
  assert.equal(result.response.status, 200);
}

function assertNoHiddenStepData(step) {
  assert.ok(step);
  for (const option of step.options) {
    assert.equal(Object.prototype.hasOwnProperty.call(option, 'score'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(option, 'feedback'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(option, 'safetyExplanation'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(option, 'outcomeCode'), false);
  }
}

async function run() {
  assert.equal(getResultLevel(0), 'needs_review');
  assert.equal(getResultLevel(39), 'needs_review');
  assert.equal(getResultLevel(40), 'developing');
  assert.equal(getResultLevel(69), 'developing');
  assert.equal(getResultLevel(70), 'proficient');
  assert.equal(getResultLevel(84), 'proficient');
  assert.equal(getResultLevel(85), 'strong');
  assert.equal(getResultLevel(100), 'strong');
  assert.equal(getMasteryDelta(39), 0);
  assert.equal(getMasteryDelta(40), 2);
  assert.equal(getMasteryDelta(70), 4);
  assert.equal(getMasteryDelta(85), 6);
  assert.equal(calculateScenarioScore([
    { id: 1, options_json: [{ score: 2 }, { score: 0 }] },
    { id: 2, options_json: [{ score: 2 }, { score: 1 }] },
  ], [{ step_id: 1, awarded_score: 2 }, { step_id: 2, awarded_score: 1 }]).percentage, 75);

  const pool = createPool();
  const child = startServer();
  try {
    await cleanup(pool);
    await waitForHealth(child);

    const [[publishedCount]] = await pool.query("SELECT COUNT(*) AS count FROM scenario_definitions WHERE status = 'published'");
    assert.ok(Number(publishedCount.count) >= 8);
    const [topicCounts] = await pool.query("SELECT topic_code, COUNT(*) AS count FROM scenario_definitions WHERE status = 'published' GROUP BY topic_code");
    assert.ok(topicCounts.length >= 4);
    assert.ok(topicCounts.every(row => Number(row.count) >= 1));
    const [stepCounts] = await pool.query(
      `SELECT sd.slug, COUNT(ss.id) AS count
       FROM scenario_definitions sd
       JOIN scenario_steps ss ON ss.scenario_id = sd.id
       WHERE sd.status = 'published'
       GROUP BY sd.id`
    );
    assert.equal(stepCounts.length, Number(publishedCount.count));
    assert.ok(stepCounts.every(row => row.count >= 3 && row.count <= 5));
    const [steps] = await pool.query('SELECT options_json FROM scenario_steps');
    for (const step of steps) {
      const options = Array.isArray(step.options_json) ? step.options_json : JSON.parse(step.options_json);
      assert.ok(options.length >= 3);
      assert.equal(new Set(options.map(option => option.key)).size, options.length);
      assert.ok(options.every(option => ['string', 'number'].includes(typeof option.key) || option.key));
      assert.ok(!JSON.stringify(options).match(/https?:\/\/|api[_-]?key|password123|123456|otp:\s*\d/i));
    }

    let result = await request('GET', '/api/scenarios');
    assert.equal(result.response.status, 401);

    const userA = await register(USER_A_EMAIL, 'Phase 1D1 A');
    let cookieA = userA.cookieHeader;
    const userB = await register(USER_B_EMAIL, 'Phase 1D1 B');
    const cookieB = userB.cookieHeader;
    await saveProfile(cookieA);
    await completeAssessmentForPhishingRecommendation(pool, cookieA);
    await createLocaleTestScenario(pool);

    result = await request('GET', `/api/scenarios/${TEMP_SCENARIO_SLUG}?locale=en`, undefined, cookieA);
    assert.equal(result.response.status, 200);
    assert.deepEqual(result.json.locale, { requestedLocale: 'en', resolvedLocale: 'en', fallbackUsed: false });
    assert.equal(result.json.firstStep.promptText, 'English prompt 1');

    result = await request('GET', `/api/scenarios/${TEMP_SCENARIO_SLUG}?locale=zh-CN`, undefined, cookieA);
    assert.equal(result.response.status, 200);
    assert.deepEqual(result.json.locale, { requestedLocale: 'zh-CN', resolvedLocale: 'zh-CN', fallbackUsed: false });
    assert.equal(result.json.firstStep.promptText, '中文问题 1');

    result = await request('GET', `/api/scenarios/${TEMP_SCENARIO_SLUG}?locale=ms`, undefined, cookieA);
    assert.equal(result.response.status, 200);
    assert.deepEqual(result.json.locale, { requestedLocale: 'ms', resolvedLocale: 'en', fallbackUsed: true });
    assert.equal(result.json.firstStep.promptText, 'English prompt 1');

    result = await request('POST', `/api/scenarios/${TEMP_SCENARIO_SLUG}/attempts?locale=en`, {}, cookieA);
    assert.equal(result.response.status, 201);
    const localeAttemptId = result.json.attempt.id;
    const localeStepId = result.json.currentStep.id;
    const englishChoiceKeys = result.json.currentStep.options.map(option => option.key).join(',');
    assert.deepEqual(result.json.locale, { requestedLocale: 'en', resolvedLocale: 'en', fallbackUsed: false });

    result = await request('GET', `/api/scenario-attempts/${localeAttemptId}?locale=zh-CN`, undefined, cookieA);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.attempt.id, localeAttemptId);
    assert.equal(result.json.currentStep.id, localeStepId);
    assert.equal(result.json.currentStep.options.map(option => option.key).join(','), englishChoiceKeys);
    assert.equal(result.json.currentStep.promptText, '中文问题 1');
    assert.deepEqual(result.json.locale, { requestedLocale: 'zh-CN', resolvedLocale: 'zh-CN', fallbackUsed: false });

    result = await request('GET', `/api/scenario-attempts/${localeAttemptId}?locale=ms`, undefined, cookieA);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.attempt.id, localeAttemptId);
    assert.equal(result.json.currentStep.id, localeStepId);
    assert.equal(result.json.currentStep.options.map(option => option.key).join(','), englishChoiceKeys);
    assert.equal(result.json.currentStep.promptText, 'English prompt 1');
    assert.deepEqual(result.json.locale, { requestedLocale: 'ms', resolvedLocale: 'en', fallbackUsed: true });

    result = await request('GET', '/api/recommendations/current', undefined, cookieA);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.recommendation.topicCode, 'phishing_and_scams');

    result = await request('GET', '/api/scenarios/recommended', undefined, cookieA);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.scenarios.length, 1);
    assert.equal(result.json.scenarios[0].topicCode, 'phishing_and_scams');
    assert.ok(['beginner', 'developing'].includes(result.json.scenarios[0].difficulty));
    const slug = result.json.scenarios[0].slug;
    const scenarioRecommendationId = result.json.scenarios[0].id;

    let currentRecommendation = await request('GET', '/api/recommendations/current', undefined, cookieA);
    assert.equal(currentRecommendation.response.status, 200);
    assert.equal(currentRecommendation.json.recommendation.targetScenarioId, scenarioRecommendationId);
    assert.equal(currentRecommendation.json.recommendation.targetScenarioSlug, slug);

    result = await request('GET', `/api/scenarios/${slug}`, undefined, cookieA);
    assert.equal(result.response.status, 200);
    assertNoHiddenStepData(result.json.firstStep);

    result = await request('POST', `/api/scenarios/${slug}/attempts`, {}, cookieA);
    assert.equal(result.response.status, 201);
    const attemptId = result.json.attempt.id;
    const firstStepId = result.json.currentStep.id;
    assertNoHiddenStepData(result.json.currentStep);

    result = await request('POST', `/api/scenarios/${slug}/attempts`, {}, cookieA);
    assert.equal(result.response.status, 201);
    assert.equal(result.json.attempt.id, attemptId);

    result = await request('GET', `/api/scenario-attempts/${attemptId}`, undefined, cookieB);
    assert.equal(result.response.status, 404);

    result = await request('PUT', `/api/scenario-attempts/${attemptId}/decisions`, {
      stepId: firstStepId + 1,
      selectedOptionKey: 'A',
    }, cookieA);
    assert.equal(result.response.status, 409);

    result = await request('PUT', `/api/scenario-attempts/${attemptId}/decisions`, {
      stepId: firstStepId,
      selectedOptionKey: 'Z',
    }, cookieA);
    assert.equal(result.response.status, 400);

    result = await request('PUT', `/api/scenario-attempts/${attemptId}/decisions`, {
      stepId: firstStepId,
      selectedOptionKey: 'B',
      awardedScore: 999,
    }, cookieA);
    assert.equal(result.response.status, 200);
    assert.ok(result.json.decision.feedback);
    assert.ok(result.json.decision.safetyExplanation);
    assert.equal(Object.prototype.hasOwnProperty.call(result.json.decision, 'awardedScore'), false);
    assertNoHiddenStepData(result.json.nextStep);

    result = await request('PUT', `/api/scenario-attempts/${attemptId}/decisions`, {
      stepId: firstStepId,
      selectedOptionKey: 'A',
    }, cookieA);
    assert.equal(result.response.status, 409);

    result = await request('POST', '/api/auth/logout', {}, cookieA);
    assert.equal(result.response.status, 200);
    result = await login(USER_A_EMAIL);
    cookieA = result.cookieHeader;
    result = await request('GET', `/api/scenario-attempts/${attemptId}`, undefined, cookieA);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.decisions.length, 1);
    assert.ok(result.json.decisions[0].feedback);
    assertNoHiddenStepData(result.json.currentStep);

    while (result.json.currentStep) {
      const step = result.json.currentStep;
      const selectedOptionKey = step.options.find(option => option.key === 'B') ? 'B' : step.options[0].key;
      result = await request('PUT', `/api/scenario-attempts/${attemptId}/decisions`, {
        stepId: step.id,
        selectedOptionKey,
      }, cookieA);
      if (result.response.status !== 200) throw new Error(`Decision submit failed: ${result.response.status} ${JSON.stringify(result.json)} step=${step.id}`);
      assert.equal(result.response.status, 200);
      result = await request('GET', `/api/scenario-attempts/${attemptId}`, undefined, cookieA);
      assert.equal(result.response.status, 200);
    }

    const [[beforeProgress]] = await pool.query("SELECT mastery_percentage, activity_count FROM learner_topic_progress WHERE user_id = ? AND topic_code = 'phishing_and_scams'", [userA.json.user.id]);
    result = await request('POST', `/api/scenario-attempts/${attemptId}/complete`, { totalScore: 0, percentage: 0 }, cookieA);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.attempt.status, 'completed');
    assert.equal(result.json.attempt.percentage, 100);
    assert.equal(result.json.attempt.resultLevel, 'strong');
    assert.equal(result.json.progressImpact.masteryDelta, 6);
    assert.equal(result.json.progressImpact.applied, true);
    assert.ok(result.json.recommendation);
    assert.equal(result.json.review.length, 3);
    assert.ok(result.json.review[0].feedback);
    assert.ok(result.json.review[0].safetyExplanation);

    result = await request('GET', '/api/scenarios/recommended', undefined, cookieA);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.scenarios.length, 1);
    const freshRecommended = result.json.scenarios[0];
    if (freshRecommended.slug === slug) {
      assert.equal(freshRecommended.recommendationMode, 'review');
    } else {
      assert.notEqual(freshRecommended.latestAttempt?.status, 'completed');
    }
    const [incompletePublished] = await pool.query(
      `SELECT sd.id
       FROM scenario_definitions sd
       LEFT JOIN scenario_attempts completed
         ON completed.scenario_id = sd.id
        AND completed.user_id = ?
        AND completed.status = 'completed'
       WHERE sd.status = 'published'
         AND completed.id IS NULL
       LIMIT 1`,
      [userA.json.user.id]
    );
    if (incompletePublished.length) {
      assert.notEqual(freshRecommended.slug, slug, 'completed strong scenario should not remain the default recommendation while incomplete scenarios exist');
      assert.notEqual(freshRecommended.latestAttempt?.status, 'completed');
    }
    currentRecommendation = await request('GET', '/api/recommendations/current', undefined, cookieA);
    assert.equal(currentRecommendation.response.status, 200);
    assert.equal(currentRecommendation.json.recommendation.targetScenarioId, freshRecommended.id);
    assert.equal(currentRecommendation.json.recommendation.targetScenarioSlug, freshRecommended.slug);

    const [[afterProgress]] = await pool.query("SELECT mastery_percentage, activity_count FROM learner_topic_progress WHERE user_id = ? AND topic_code = 'phishing_and_scams'", [userA.json.user.id]);
    assert.equal(afterProgress.mastery_percentage, Math.min(100, beforeProgress.mastery_percentage + 6));
    assert.equal(afterProgress.activity_count, beforeProgress.activity_count + 1);

    result = await request('POST', `/api/scenario-attempts/${attemptId}/complete`, {}, cookieA);
    assert.equal(result.response.status, 200);
    const [[afterRepeat]] = await pool.query("SELECT mastery_percentage, activity_count FROM learner_topic_progress WHERE user_id = ? AND topic_code = 'phishing_and_scams'", [userA.json.user.id]);
    assert.equal(afterRepeat.mastery_percentage, afterProgress.mastery_percentage);
    assert.equal(afterRepeat.activity_count, afterProgress.activity_count);

    result = await request('GET', `/api/scenario-attempts/${attemptId}/result`, undefined, cookieA);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.attempt.status, 'completed');

    result = await request('GET', '/api/scenarios/dashboard', undefined, cookieA);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.completedCount >= 1, true);
    assert.equal(result.json.latestCompleted.attemptId, attemptId);

    await cleanup(pool);
    const [[remainingUsers]] = await pool.query('SELECT COUNT(*) AS count FROM users WHERE email IN (?, ?)', [USER_A_EMAIL, USER_B_EMAIL]);
    const [[remainingAttempts]] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM scenario_attempts sa
       LEFT JOIN users u ON u.id = sa.user_id
       WHERE u.email IN (?, ?)`,
      [USER_A_EMAIL, USER_B_EMAIL]
    );
    const [[remainingEvents]] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM scenario_progress_events spe
       LEFT JOIN users u ON u.id = spe.user_id
       WHERE u.email IN (?, ?)`,
      [USER_A_EMAIL, USER_B_EMAIL]
    );
    assert.equal(remainingUsers.count, 0);
    assert.equal(remainingAttempts.count, 0);
    assert.equal(remainingEvents.count, 0);

    console.log('Scenario engine verification passed.');
  } finally {
    await stopServer(child);
    await cleanup(pool).catch(() => {});
    await pool.end();
  }
}

run().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
