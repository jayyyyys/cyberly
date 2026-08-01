const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const bcrypt = require('bcrypt');
const { createPool } = require('../src/database/pool');

const PORT = process.env.ADMIN_SCENARIO_TEST_PORT || '5131';
const BASE_URL = `http://127.0.0.1:${PORT}`;
const PASSWORD = 'AdminScenario9';
const PREFIX = `test-admin-scenario-${Date.now()}`;

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
    const firstPart = header.split(';')[0];
    const [name, ...valueParts] = firstPart.split('=');
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
  let json = {};
  if (text) {
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
  }
  return { response, json, cookieHeader: mergeCookies(cookieHeader, response) };
}

function startServer() {
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT, CLIENT_ORIGIN: 'http://localhost:3000', NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', () => {});
  child.stderr.on('data', data => {
    if (process.env.DEBUG_ADMIN_SCENARIO_TEST) process.stderr.write(data);
  });
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

async function createUser(pool, email, role = 'user') {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const [result] = await pool.query(
    `INSERT INTO users (email, username, display_name, age, age_group, password_hash, role, account_status)
     VALUES (?, ?, ?, 16, 'teen', ?, ?, 'active')`,
    [email, email, email, passwordHash, role]
  );
  return result.insertId;
}

async function login(email) {
  const result = await request('POST', '/api/auth/login', { email, password: PASSWORD });
  assert.equal(result.response.status, 200, `login should succeed for ${email}`);
  return result.cookieHeader;
}

function validSteps() {
  return [
    {
      stepOrder: 1,
      situationText: 'A message asks you to click quickly.',
      promptText: 'What should you do first?',
      options: [
        { key: 'A', text: 'Click quickly.', score: 0, outcomeCode: 'clicked', feedback: 'Risky.', safetyExplanation: 'Urgency can be a scam sign.', nextStepOrder: 2 },
        { key: 'B', text: 'Check official channels.', score: 2, outcomeCode: 'checked', feedback: 'Good.', safetyExplanation: 'Official channels are safer.', nextStepOrder: 2 },
        { key: 'C', text: 'Ask a friend but do not click.', score: 1, outcomeCode: 'asked', feedback: 'Partial.', safetyExplanation: 'Verification still matters.', nextStepOrder: 2 },
      ],
    },
    {
      stepOrder: 2,
      situationText: 'The page asks for an OTP.',
      promptText: 'What is safest?',
      options: [
        { key: 'A', text: 'Enter OTP.', score: 0, outcomeCode: 'otp', feedback: 'Unsafe.', safetyExplanation: 'Never share OTPs.', nextStepOrder: 3 },
        { key: 'B', text: 'Close the page.', score: 2, outcomeCode: 'closed', feedback: 'Correct.', safetyExplanation: 'Closing protects you.', nextStepOrder: 3 },
        { key: 'C', text: 'Enter only your name.', score: 1, outcomeCode: 'partial', feedback: 'Still risky.', safetyExplanation: 'Avoid sharing personal data.', nextStepOrder: 3 },
      ],
    },
    {
      stepOrder: 3,
      situationText: 'You want to warn others.',
      promptText: 'What should you do?',
      options: [
        { key: 'A', text: 'Forward the risky link.', score: 0, outcomeCode: 'forwarded', feedback: 'Unsafe.', safetyExplanation: 'Do not spread risky links.', nextStepOrder: null },
        { key: 'B', text: 'Report and warn without the link.', score: 2, outcomeCode: 'reported', feedback: 'Strong.', safetyExplanation: 'Reporting reduces harm.', nextStepOrder: null },
        { key: 'C', text: 'Delete only.', score: 1, outcomeCode: 'deleted', feedback: 'Partial.', safetyExplanation: 'Reporting can help others.', nextStepOrder: null },
      ],
    },
  ];
}

async function cleanup(pool) {
  const [scenarioRows] = await pool.query('SELECT id FROM scenario_definitions WHERE slug LIKE ?', [`${PREFIX}%`]);
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
  const [users] = await pool.query('SELECT id FROM users WHERE email LIKE ?', [`${PREFIX}%@example.com`]);
  for (const user of users) {
    await pool.query(
      `DELETE FROM sessions
       WHERE CAST(JSON_UNQUOTE(JSON_EXTRACT(data, '$.userId')) AS UNSIGNED) = ?`,
      [user.id]
    );
  }
  await pool.query('DELETE FROM users WHERE email LIKE ?', [`${PREFIX}%@example.com`]);
}

async function run() {
  const pool = createPool();
  const child = startServer();
  let adminCookie = '';
  let userCookie = '';
  let scenarioId = null;
  try {
    await cleanup(pool);
    await createUser(pool, `${PREFIX}.admin@example.com`, 'admin');
    await createUser(pool, `${PREFIX}.user@example.com`, 'user');
    await waitForHealth(child);
    adminCookie = await login(`${PREFIX}.admin@example.com`);
    userCookie = await login(`${PREFIX}.user@example.com`);

    let result = await request('GET', '/api/admin/scenarios');
    assert.equal(result.response.status, 401);

    result = await request('GET', '/api/admin/scenarios', undefined, userCookie);
    assert.equal(result.response.status, 403);

    result = await request('GET', '/api/admin/scenarios', undefined, adminCookie);
    assert.equal(result.response.status, 200);
    assert.ok(Array.isArray(result.json.items));
    assert.ok(result.json.items.length >= 8);
    const [[baselinePublished]] = await pool.query("SELECT COUNT(*) AS count FROM scenario_definitions WHERE status = 'published' AND slug NOT LIKE ?", [`${PREFIX}%`]);

    result = await request('POST', '/api/admin/scenarios', {
      slug: `${PREFIX}-missing-title`,
      summary: 'Missing title should fail.',
      topicCode: 'phishing_and_scams',
      difficulty: 'beginner',
      estimatedMinutes: 4,
      totalSteps: 3,
    }, adminCookie);
    assert.equal(result.response.status, 400);

    result = await request('POST', '/api/admin/scenarios', {
      slug: 'Bad Slug',
      title: 'Invalid slug',
      summary: 'Invalid slug should fail.',
      topicCode: 'phishing_and_scams',
      difficulty: 'beginner',
      estimatedMinutes: 4,
      totalSteps: 3,
    }, adminCookie);
    assert.equal(result.response.status, 400);

    result = await request('GET', '/api/admin/scenarios?search=parcel', undefined, adminCookie);
    assert.equal(result.response.status, 200);
    assert.ok(result.json.items.some(item => item.slug.includes('parcel')));

    const slug = `${PREFIX}-draft`;
    result = await request('POST', '/api/admin/scenarios', {
      slug,
      title: 'Admin Scenario Draft',
      summary: 'A draft scenario created by an admin test.',
      topicCode: 'phishing_and_scams',
      difficulty: 'beginner',
      estimatedMinutes: 4,
      totalSteps: 3,
      status: 'published',
    }, adminCookie);
    assert.equal(result.response.status, 201);
    assert.equal(result.json.scenario.status, 'draft');
    scenarioId = result.json.scenario.id;

    result = await request('GET', `/api/admin/scenarios?search=${slug}`, undefined, adminCookie);
    assert.equal(result.response.status, 200);
    assert.ok(result.json.items.some(item => item.id === scenarioId && item.status === 'draft'));

    result = await request('POST', '/api/admin/scenarios', {
      slug,
      title: 'Duplicate',
      summary: 'Duplicate slug.',
      topicCode: 'phishing_and_scams',
      difficulty: 'beginner',
      estimatedMinutes: 4,
      totalSteps: 3,
    }, adminCookie);
    assert.equal(result.response.status, 409);

    result = await request('GET', `/api/scenarios/${slug}`, undefined, userCookie);
    assert.equal(result.response.status, 404);
    result = await request('POST', `/api/scenarios/${slug}/attempts`, {}, userCookie);
    assert.equal(result.response.status, 404);

    result = await request('GET', `/api/admin/scenarios/${scenarioId}`, undefined, adminCookie);
    assert.equal(result.response.status, 200);
    const staleUpdatedAt = result.json.scenario.updatedAt;
    await delay(1100);

    result = await request('GET', `/api/admin/scenarios/${scenarioId}/lifecycle`);
    assert.equal(result.response.status, 401);

    result = await request('GET', `/api/admin/scenarios/${scenarioId}/lifecycle`, undefined, userCookie);
    assert.equal(result.response.status, 403);

    result = await request('GET', `/api/admin/scenarios/${scenarioId}/lifecycle`, undefined, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.scenarioId, scenarioId);
    assert.equal(result.json.slug, slug);
    assert.equal(result.json.status, 'draft');
    assert.equal(result.json.firstPublishedAt, null);
    assert.equal(result.json.hasEverPublished, false);
    assert.equal(result.json.canArchive, true);
    assert.equal(result.json.canRestore, false);
    assert.equal(result.json.canPermanentlyDelete, true);
    assert.equal(result.json.counts.steps, 0);
    assert.equal(result.json.counts.choices, 0);
    assert.equal(result.json.counts.attempts, 0);
    assert.equal(result.json.counts.completedAttempts, 0);
    assert.equal(result.json.counts.decisions, 0);
    assert.ok(Array.isArray(result.json.blockingReasons));

    result = await request('PATCH', `/api/admin/scenarios/${scenarioId}/metadata`, {
      title: 'Admin Scenario Updated',
      expectedUpdatedAt: staleUpdatedAt,
    }, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.scenario.title, 'Admin Scenario Updated');

    result = await request('PATCH', `/api/admin/scenarios/${scenarioId}/metadata`, {
      title: 'Stale Update',
      expectedUpdatedAt: staleUpdatedAt,
    }, adminCookie);
    assert.equal(result.response.status, 409);

    const badSteps = validSteps();
    badSteps[0].options[0].score = 9;
    result = await request('PUT', `/api/admin/scenarios/${scenarioId}/steps`, { steps: badSteps }, adminCookie);
    assert.equal(result.response.status, 400);

    const duplicateOrder = validSteps();
    duplicateOrder[1].stepOrder = 1;
    result = await request('PUT', `/api/admin/scenarios/${scenarioId}/steps`, { steps: duplicateOrder }, adminCookie);
    assert.equal(result.response.status, 400);

    result = await request('POST', `/api/admin/scenarios/${scenarioId}/publish`, {}, adminCookie);
    assert.equal(result.response.status, 409);

    result = await request('PUT', `/api/admin/scenarios/${scenarioId}/steps`, { steps: validSteps() }, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.steps.length, 3);

    result = await request('PATCH', `/api/admin/scenarios/${scenarioId}/translations/ms`, {
      title: 'Draf Senario Admin',
      summary: 'Terjemahan Bahasa Melayu untuk senario ujian.',
      steps: validSteps().map(step => ({
        stepOrder: step.stepOrder,
        situationText: `MS situation ${step.stepOrder}`,
        promptText: `MS prompt ${step.stepOrder}`,
        options: step.options.map(option => ({
          key: option.key,
          text: `MS option ${step.stepOrder}${option.key}`,
          feedback: `MS feedback ${step.stepOrder}${option.key}`,
          safetyExplanation: `MS safety ${step.stepOrder}${option.key}`,
        })),
      })),
    }, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.scenario.translations.ms.title, 'Draf Senario Admin');
    assert.equal(result.json.steps[0].translations.some(item => item.locale === 'ms' && item.promptText === 'MS prompt 1'), true);
    assert.equal(result.json.steps[0].optionTranslations.some(item => item.locale === 'ms' && item.optionKey === 'B' && item.text === 'MS option 1B'), true);

    result = await request('GET', `/api/admin/scenarios/${scenarioId}`, undefined, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.scenario.translations.en.title, 'Admin Scenario Updated');
    assert.equal(result.json.scenario.translations.ms.title, 'Draf Senario Admin');
    assert.equal(result.json.steps[0].options.find(option => option.key === 'B').score, 2);

    result = await request('POST', `/api/admin/scenarios/${scenarioId}/publish`, {}, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.scenario.status, 'published');
    const [[publishedHistory]] = await pool.query('SELECT first_published_at FROM scenario_definitions WHERE id = ?', [scenarioId]);
    assert.ok(publishedHistory.first_published_at);

    result = await request('POST', `/api/admin/scenarios/${scenarioId}/unpublish`, {}, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.scenario.status, 'draft');
    const [[unpublishedHistory]] = await pool.query('SELECT first_published_at FROM scenario_definitions WHERE id = ?', [scenarioId]);
    assert.equal(new Date(unpublishedHistory.first_published_at).getTime(), new Date(publishedHistory.first_published_at).getTime());

    result = await request('GET', `/api/scenarios/${slug}`, undefined, userCookie);
    assert.equal(result.response.status, 404);

    result = await request('POST', `/api/admin/scenarios/${scenarioId}/publish`, {}, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.scenario.status, 'published');

    result = await request('PUT', `/api/admin/scenarios/${scenarioId}/steps`, { steps: validSteps() }, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.scenario.status, 'draft');

    result = await request('GET', `/api/admin/scenarios/${scenarioId}/lifecycle`, undefined, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.status, 'draft');
    assert.equal(result.json.hasEverPublished, true);
    assert.equal(result.json.canPermanentlyDelete, false);
    assert.ok(result.json.blockingReasons.some(reason => reason.code === 'scenario_previously_published'));

    result = await request('DELETE', `/api/admin/scenarios/${scenarioId}`, { confirmationSlug: slug }, adminCookie);
    assert.equal(result.response.status, 409);
    assert.equal(result.json.code, 'ADMIN_SCENARIO_DELETE_BLOCKED');
    assert.ok(result.json.blockingReasons.some(reason => reason.code === 'scenario_previously_published'));

    result = await request('POST', `/api/admin/scenarios/${scenarioId}/publish`, {}, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.scenario.status, 'published');
    const [[republishedHistory]] = await pool.query('SELECT first_published_at FROM scenario_definitions WHERE id = ?', [scenarioId]);
    assert.equal(new Date(republishedHistory.first_published_at).getTime(), new Date(publishedHistory.first_published_at).getTime());

    result = await request('DELETE', `/api/admin/scenarios/${scenarioId}`, { confirmationSlug: slug }, adminCookie);
    assert.equal(result.response.status, 409);
    assert.equal(result.json.code, 'ADMIN_SCENARIO_DELETE_BLOCKED');
    assert.ok(result.json.blockingReasons.some(reason => reason.code === 'scenario_published'));

    result = await request('GET', `/api/scenarios/${slug}`, undefined, userCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.firstStep.options.some(option => Object.hasOwn(option, 'score')), false);

    result = await request('POST', `/api/scenarios/${slug}/attempts`, {}, userCookie);
    assert.equal(result.response.status, 201);
    const attemptId = result.json.attempt.id;
    const steps = result.json.currentStep ? [result.json.currentStep] : [];
    assert.ok(attemptId);
    let currentStep = result.json.currentStep;
    for (const selectedOptionKey of ['B', 'B', 'B']) {
      result = await request('PUT', `/api/scenario-attempts/${attemptId}/decisions`, {
        stepId: currentStep.id,
        selectedOptionKey,
      }, userCookie);
      assert.equal(result.response.status, 200);
      currentStep = result.json.nextStep;
      if (currentStep) steps.push(currentStep);
    }
    result = await request('POST', `/api/scenario-attempts/${attemptId}/complete`, {}, userCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.attempt.percentage, 100);

    result = await request('PUT', `/api/admin/scenarios/${scenarioId}/steps`, { steps: validSteps() }, adminCookie);
    assert.equal(result.response.status, 409);
    assert.equal(result.json.code, 'ADMIN_SCENARIO_HAS_ATTEMPTS');

    result = await request('POST', `/api/admin/scenarios/${scenarioId}/archive`, {}, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.scenario.status, 'archived');
    result = await request('GET', `/api/scenarios/${slug}`, undefined, userCookie);
    assert.equal(result.response.status, 404);

    const [[attemptCount]] = await pool.query('SELECT COUNT(*) AS count FROM scenario_attempts WHERE scenario_id = ?', [scenarioId]);
    assert.equal(Number(attemptCount.count), 1);

    result = await request('POST', `/api/admin/scenarios/${scenarioId}/restore`, {}, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.scenario.status, 'draft');

    result = await request('GET', `/api/admin/scenarios/${scenarioId}/lifecycle`, undefined, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.canPermanentlyDelete, false);
    assert.equal(result.json.hasEverPublished, true);
    assert.equal(result.json.counts.completedAttempts, 1);
    assert.ok(result.json.blockingReasons.some(reason => reason.code === 'attempts_exist'));

    result = await request('DELETE', `/api/admin/scenarios/${scenarioId}`, { confirmationSlug: slug }, adminCookie);
    assert.equal(result.response.status, 409);
    assert.equal(result.json.code, 'ADMIN_SCENARIO_DELETE_BLOCKED');
    assert.ok(result.json.blockingReasons.some(reason => reason.code === 'attempts_exist'));

    const deleteSlug = `${PREFIX}-delete-me`;
    result = await request('POST', '/api/admin/scenarios', {
      slug: deleteSlug,
      title: 'Delete Me Draft',
      summary: 'Unused draft scenario for permanent delete.',
      topicCode: 'privacy_and_personal_information',
      difficulty: 'beginner',
      estimatedMinutes: 4,
      totalSteps: 3,
    }, adminCookie);
    assert.equal(result.response.status, 201);
    const deleteScenarioId = result.json.scenario.id;
    result = await request('PUT', `/api/admin/scenarios/${deleteScenarioId}/steps`, { steps: validSteps() }, adminCookie);
    assert.equal(result.response.status, 200);

    result = await request('DELETE', `/api/admin/scenarios/${deleteScenarioId}`, { confirmationSlug: `${deleteSlug} ` }, adminCookie);
    assert.equal(result.response.status, 400);
    assert.equal(result.json.code, 'ADMIN_SCENARIO_DELETE_CONFIRMATION_MISMATCH');

    result = await request('DELETE', `/api/admin/scenarios/${deleteScenarioId}`, { confirmationSlug: deleteSlug }, adminCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.deletedScenario.id, deleteScenarioId);
    assert.equal(result.json.deletedScenario.slug, deleteSlug);
    const [[deletedScenarioRows]] = await pool.query('SELECT COUNT(*) AS count FROM scenario_definitions WHERE id = ?', [deleteScenarioId]);
    assert.equal(Number(deletedScenarioRows.count), 0);
    const [[deletedStepRows]] = await pool.query('SELECT COUNT(*) AS count FROM scenario_steps WHERE scenario_id = ?', [deleteScenarioId]);
    assert.equal(Number(deletedStepRows.count), 0);
    result = await request('GET', `/api/admin/scenarios/${deleteScenarioId}`, undefined, adminCookie);
    assert.equal(result.response.status, 404);

    const [[unrelated]] = await pool.query("SELECT COUNT(*) AS count FROM scenario_definitions WHERE status = 'published' AND slug NOT LIKE ?", [`${PREFIX}%`]);
    assert.equal(Number(unrelated.count), Number(baselinePublished.count));

    console.log('Admin scenario management tests passed');
  } finally {
    await cleanup(pool);
    await stopServer(child);
    await pool.end();
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
