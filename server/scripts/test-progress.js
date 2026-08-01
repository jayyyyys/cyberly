const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { createPool } = require('../src/database/pool');
const {
  buildActivityComposition,
  ACTIVITY_SEGMENT_IDS,
} = require('../src/progress/progress.composition');
const {
  buildLearningPathProgressFromMetrics,
} = require('../src/progress/learning-path-progress.service');
const { getLevelForPercentage, selectRecommendation } = require('../src/progress/progress.rules');

const PORT = process.env.PROGRESS_TEST_PORT || '5106';
const BASE_URL = `http://127.0.0.1:${PORT}`;
const PASSWORD = 'Progress1c2Pass9';
const USER_A_EMAIL = 'phase1c2.progress.a@example.com';
const USER_B_EMAIL = 'phase1c2.progress.b@example.com';

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
    aiNickname: 'Progress',
    educationLevel: 'form_4',
    preferredLanguage: 'english',
    familiarityLevel: 'advanced',
    helpTopics: ['avoiding_scams', 'protecting_privacy'],
    learningStyle: 'step_by_step',
    onboardingCompleted: true,
  }, cookie);
  assert.equal(result.response.status, 200);
}

function wrongOption(correct) {
  return correct === 'A' ? 'B' : 'A';
}

async function completeAssessment(pool, cookie) {
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
  return { attemptId, result: result.json };
}

async function run() {
  const mixedComposition = buildActivityComposition({
    assessedTopicCount: 4,
    completedScenarioCount: 3,
    completedRecommendationCount: 2,
  });
  assert.equal(mixedComposition.totalRecordedActivities, 9);
  assert.deepEqual(mixedComposition.segments.map(segment => segment.id), [
    ACTIVITY_SEGMENT_IDS.ASSESSMENT_TOPICS,
    ACTIVITY_SEGMENT_IDS.COMPLETED_SCENARIOS,
    ACTIVITY_SEGMENT_IDS.COMPLETED_RECOMMENDATIONS,
  ]);
  assert.equal(mixedComposition.segments.reduce((sum, segment) => sum + segment.sharePercentage, 0), 100);
  assert.deepEqual(mixedComposition.segments.map(segment => segment.sharePercentage), [45, 33, 22]);
  assert.equal(mixedComposition.segments[0].displayValue, '4 assessed topics');
  assert.equal(mixedComposition.segments[1].displayValue, '3 completed scenarios');
  assert.equal(mixedComposition.segments[2].displayValue, '2 completed recommendations');
  assert.equal(buildActivityComposition({}).segments.length, 0);

  assert.equal(buildLearningPathProgressFromMetrics({
    correctAnswers: 0,
    totalQuestions: 12,
    totalEligibleScenarios: 8,
  }).assessment.earnedPoints, 0);
  assert.equal(buildLearningPathProgressFromMetrics({
    correctAnswers: 6,
    totalQuestions: 12,
    totalEligibleScenarios: 8,
  }).assessment.earnedPoints, 12.5);
  assert.equal(buildLearningPathProgressFromMetrics({
    correctAnswers: 12,
    totalQuestions: 12,
    totalEligibleScenarios: 8,
  }).assessment.earnedPoints, 25);
  assert.equal(buildLearningPathProgressFromMetrics({}).assessment.status, 'not_completed');
  assert.equal(buildLearningPathProgressFromMetrics({
    totalEligibleScenarios: 8,
    completedUniqueScenarios: 4,
  }).scenarios.earnedPoints, 37.5);
  assert.equal(buildLearningPathProgressFromMetrics({
    totalEligibleScenarios: 8,
    completedUniqueScenarios: 8,
  }).scenarios.earnedPoints, 75);
  assert.equal(buildLearningPathProgressFromMetrics({
    totalEligibleScenarios: 0,
    completedUniqueScenarios: 4,
  }).scenarios.status, 'no_eligible_scenarios');
  assert.equal(buildLearningPathProgressFromMetrics({ completedRecommendations: 0 }).engagement.earnedPoints, 0);
  assert.equal(buildLearningPathProgressFromMetrics({ completedRecommendations: 1 }).engagement.earnedPoints, 5);
  assert.equal(buildLearningPathProgressFromMetrics({ completedRecommendations: 2 }).engagement.earnedPoints, 10);
  assert.equal(buildLearningPathProgressFromMetrics({ completedRecommendations: 3 }).engagement.earnedPoints, 15);
  assert.equal(buildLearningPathProgressFromMetrics({ completedRecommendations: 4 }).engagement.earnedPoints, 15);
  const overCap = buildLearningPathProgressFromMetrics({
    correctAnswers: 12,
    totalQuestions: 12,
    totalEligibleScenarios: 8,
    completedUniqueScenarios: 8,
    completedRecommendations: 3,
  });
  assert.equal(overCap.rawPoints, 115);
  assert.equal(overCap.displayedPercent, 100);
  assert.equal(overCap.semantics.notMastery, true);
  assert.equal(overCap.semantics.notAbilityScore, true);

  assert.equal(getLevelForPercentage(0), 'beginner');
  assert.equal(getLevelForPercentage(39), 'beginner');
  assert.equal(getLevelForPercentage(40), 'developing');
  assert.equal(getLevelForPercentage(69), 'developing');
  assert.equal(getLevelForPercentage(70), 'intermediate');
  assert.equal(getLevelForPercentage(84), 'intermediate');
  assert.equal(getLevelForPercentage(85), 'advanced');
  assert.equal(getLevelForPercentage(100), 'advanced');

  assert.equal(selectRecommendation([]).reasonCode, 'assessment_pending');
  const tied = selectRecommendation([
    { topicCode: 'password_and_account_security', percentage: 40 },
    { topicCode: 'phishing_and_scams', percentage: 40 },
  ]);
  assert.equal(tied.topicCode, 'phishing_and_scams');
  assert.equal(tied.reasonCode, 'developing_topic');
  const strong = selectRecommendation([{ topicCode: 'privacy_and_personal_information', percentage: 92 }]);
  assert.equal(strong.reasonCode, 'high_mastery_challenge');
  assert.equal(strong.recommendedLevel, 'advanced');

  const pool = createPool();
  const child = startServer();
  try {
    await cleanup(pool);
    await waitForHealth(child);

    let result = await request('GET', '/api/progress');
    assert.equal(result.response.status, 401);

    const userA = await register(USER_A_EMAIL, 'Phase 1C2 A');
    let cookieA = userA.cookieHeader;
    const userB = await register(USER_B_EMAIL, 'Phase 1C2 B');
    const cookieB = userB.cookieHeader;
    await saveProfile(cookieA);

    result = await request('GET', '/api/recommendations/current', undefined, cookieA);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.recommendation.reasonCode, 'assessment_pending');

    const { attemptId } = await completeAssessment(pool, cookieA);

    result = await request('GET', '/api/progress', undefined, cookieA);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.learningPathProgress.modelVersion, 'phase4a5-v1');
    assert.equal(result.json.learningPathProgress.assessment.earnedPoints, 18.75);
    assert.equal(result.json.learningPathProgress.assessment.correctAnswers, 9);
    assert.equal(result.json.learningPathProgress.assessment.totalQuestions, 12);
    assert.equal(result.json.learningPathProgress.assessment.status, 'completed');
    assert.equal(result.json.learningPathProgress.scenarios.completedUnique, 0);
    assert.equal(result.json.learningPathProgress.engagement.earnedPoints, 0);
    assert.equal(result.json.learningPathProgress.displayedPercent, 19);
    assert.equal(result.json.learningPathProgress.semantics.notMastery, true);
    assert.equal(result.json.summary.exists, true);
    assert.equal(result.json.summary.completedTopicCount, 4);
    assert.equal(result.json.topics.length, 4);
    assert.equal(result.json.topics.find(topic => topic.topicCode === 'phishing_and_scams').masteryPercentage, 0);
    assert.equal(result.json.latestCompletedAssessment.attemptId, attemptId);
    assert.equal(result.json.activityComposition.totalRecordedActivities, 4);
    assert.deepEqual(result.json.activityComposition.segments.map(segment => segment.id), [
      ACTIVITY_SEGMENT_IDS.ASSESSMENT_TOPICS,
    ]);
    assert.equal(result.json.activityComposition.segments[0].count, 4);
    assert.equal(result.json.activityComposition.segments[0].sharePercentage, 100);
    assert.equal(result.json.activityComposition.segments[0].displayValue, '4 assessed topics');
    assert.match(result.json.activityComposition.disclaimer, /does not measure/i);

    const [scenarioRows] = await pool.query(
      `SELECT id
       FROM scenario_definitions
       WHERE status = 'published'
       ORDER BY id
       LIMIT 2`
    );
    assert.ok(scenarioRows.length >= 2);
    await pool.query(
      `INSERT INTO scenario_attempts (user_id, scenario_id, status, current_step_order, total_score, maximum_score, percentage, result_level, completed_at)
       VALUES
         (?, ?, 'completed', 3, 6, 6, 100, 'strong', CURRENT_TIMESTAMP),
         (?, ?, 'completed', 3, 5, 6, 83, 'proficient', CURRENT_TIMESTAMP),
         (?, ?, 'in_progress', 1, NULL, NULL, NULL, NULL, NULL),
         (?, ?, 'completed', 3, 6, 6, 100, 'strong', CURRENT_TIMESTAMP)`,
      [
        userA.json.user.id,
        scenarioRows[0].id,
        userA.json.user.id,
        scenarioRows[0].id,
        userA.json.user.id,
        scenarioRows[1].id,
        userB.json.user.id,
        scenarioRows[1].id,
      ]
    );
    result = await request('GET', '/api/progress', undefined, cookieA);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.learningPathProgress.scenarios.completedUnique, 1);
    const [[publishedScenarioCount]] = await pool.query("SELECT COUNT(*) AS count FROM scenario_definitions WHERE status = 'published'");
    assert.equal(result.json.learningPathProgress.scenarios.totalEligible, Number(publishedScenarioCount.count));
    assert.equal(result.json.learningPathProgress.scenarios.totalEligible >= 1, true);
    assert.ok(
      Math.abs(result.json.learningPathProgress.scenarios.earnedPoints - (75 / result.json.learningPathProgress.scenarios.totalEligible)) < 0.001
    );
    assert.notEqual(result.json.learningPathProgress.scenarios.status, 'no_eligible_scenarios');
    assert.equal(result.json.activityComposition.totalRecordedActivities, 5);
    assert.deepEqual(result.json.activityComposition.segments.map(segment => segment.id), [
      ACTIVITY_SEGMENT_IDS.ASSESSMENT_TOPICS,
      ACTIVITY_SEGMENT_IDS.COMPLETED_SCENARIOS,
    ]);
    assert.deepEqual(result.json.activityComposition.segments.map(segment => segment.sharePercentage), [80, 20]);
    assert.equal(result.json.activityComposition.segments[1].count, 1);
    assert.equal(result.json.recentLearningActivity.filter(activity => activity.type === 'scenario_completed').length, 1);

    result = await request('GET', '/api/recommendations/current', undefined, cookieA);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.recommendation.topicCode, 'phishing_and_scams');
    assert.equal(result.json.recommendation.reasonCode, 'weak_topic');
    assert.ok(result.json.recommendation.targetScenarioId);
    assert.ok(result.json.recommendation.targetScenarioSlug);
    const recommendationId = result.json.recommendation.id;

    let scenarioRecommendation = await request('GET', '/api/scenarios/recommended', undefined, cookieA);
    assert.equal(scenarioRecommendation.response.status, 200);
    assert.equal(scenarioRecommendation.json.scenarios.length, 1);
    assert.equal(
      result.json.recommendation.targetScenarioId,
      scenarioRecommendation.json.scenarios[0].id,
      'current recommendation target should match canonical scenario recommendation'
    );

    result = await request('POST', `/api/recommendations/${recommendationId}/viewed`, {}, cookieB);
    assert.equal(result.response.status, 404);
    result = await request('POST', `/api/recommendations/${recommendationId}/viewed`, {}, cookieA);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.recommendation.status, 'viewed');
    result = await request('POST', `/api/recommendations/${recommendationId}/completed`, {}, cookieA);
    assert.equal(result.response.status, 200, JSON.stringify(result.json));
    assert.equal(result.json.completedRecommendation.status, 'completed');
    assert.notEqual(result.json.recommendation.id, recommendationId);
    assert.notEqual(result.json.recommendation.status, 'completed');
    assert.ok(result.json.recommendation.targetScenarioId);

    const repeatComplete = await request('POST', `/api/recommendations/${recommendationId}/completed`, {}, cookieA);
    assert.equal(repeatComplete.response.status, 200);
    assert.equal(repeatComplete.json.completedRecommendation.id, recommendationId);
    assert.equal(repeatComplete.json.recommendation.id, result.json.recommendation.id);

    const currentAfterComplete = await request('GET', '/api/recommendations/current', undefined, cookieA);
    assert.equal(currentAfterComplete.response.status, 200);
    assert.equal(currentAfterComplete.json.recommendation.id, result.json.recommendation.id);
    assert.notEqual(currentAfterComplete.json.recommendation.id, recommendationId);

    result = await request('GET', '/api/progress', undefined, cookieA);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.learningPathProgress.engagement.completedRecommendations, 1);
    assert.equal(result.json.learningPathProgress.engagement.earnedPoints, 5);
    assert.equal(result.json.learningPathProgress.rawPoints > result.json.learningPathProgress.assessment.earnedPoints, true);
    assert.equal(Number.isNaN(result.json.learningPathProgress.rawPoints), false);
    assert.equal(result.json.activityComposition.totalRecordedActivities, 6);
    assert.deepEqual(result.json.activityComposition.segments.map(segment => segment.id), [
      ACTIVITY_SEGMENT_IDS.ASSESSMENT_TOPICS,
      ACTIVITY_SEGMENT_IDS.COMPLETED_SCENARIOS,
      ACTIVITY_SEGMENT_IDS.COMPLETED_RECOMMENDATIONS,
    ]);
    assert.deepEqual(result.json.activityComposition.segments.map(segment => segment.sharePercentage), [67, 17, 16]);
    assert.equal(result.json.activityComposition.segments[2].count, 1);

    const [[archivedScenario]] = await pool.query(
      `SELECT id
       FROM scenario_definitions
       WHERE status = 'archived'
       ORDER BY id
       LIMIT 1`
    );
    if (archivedScenario?.id) {
      await pool.query(
        `INSERT INTO scenario_attempts (user_id, scenario_id, status, current_step_order, total_score, maximum_score, percentage, result_level, completed_at)
         VALUES (?, ?, 'completed', 3, 6, 6, 100, 'strong', CURRENT_TIMESTAMP)`,
        [userA.json.user.id, archivedScenario.id]
      );
      result = await request('GET', '/api/progress', undefined, cookieA);
      assert.equal(result.response.status, 200);
      assert.equal(result.json.learningPathProgress.scenarios.completedUnique, 1);
    }

    result = await request('POST', '/api/progress/sync-initial-assessment', {}, cookieA);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.topics.length, 4);
    assert.equal(result.json.recommendation.status, 'active');
    assert.equal(result.json.recommendation.topicCode, 'phishing_and_scams');

    const [[topicProgressCount]] = await pool.query('SELECT COUNT(*) AS count FROM learner_topic_progress WHERE user_id = ?', [userA.json.user.id]);
    assert.equal(topicProgressCount.count, 4);
    const [[activeRecommendationCount]] = await pool.query("SELECT COUNT(*) AS count FROM learner_recommendations WHERE user_id = ? AND status IN ('active', 'viewed')", [userA.json.user.id]);
    assert.equal(activeRecommendationCount.count, 1);

    result = await request('POST', '/api/auth/logout', {}, cookieA);
    assert.equal(result.response.status, 200);
    result = await login(USER_A_EMAIL);
    cookieA = result.cookieHeader;
    result = await request('GET', '/api/progress', undefined, cookieA);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.summary.exists, true);
    assert.equal(result.json.topics.length, 4);

    await cleanup(pool);
    const [[remainingUsers]] = await pool.query('SELECT COUNT(*) AS count FROM users WHERE email IN (?, ?)', [USER_A_EMAIL, USER_B_EMAIL]);
    const [[remainingTopicProgress]] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM learner_topic_progress ltp
       LEFT JOIN users u ON u.id = ltp.user_id
       WHERE u.email IN (?, ?)`,
      [USER_A_EMAIL, USER_B_EMAIL]
    );
    const [[remainingRecommendations]] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM learner_recommendations lr
       LEFT JOIN users u ON u.id = lr.user_id
       WHERE u.email IN (?, ?)`,
      [USER_A_EMAIL, USER_B_EMAIL]
    );
    assert.equal(remainingUsers.count, 0);
    assert.equal(remainingTopicProgress.count, 0);
    assert.equal(remainingRecommendations.count, 0);

    console.log('Progress and recommendation verification passed.');
  } finally {
    await stopServer(child);
    await cleanup(pool).catch(() => {});
    await pool.end();
  }
}

run().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
