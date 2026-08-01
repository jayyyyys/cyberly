const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { createPool } = require('../src/database/pool');
const { getMeasuredLevel, scoreQuestions } = require('../src/assessment/assessment.scoring');

const PORT = process.env.ASSESSMENT_TEST_PORT || '5105';
const BASE_URL = `http://127.0.0.1:${PORT}`;
const PASSWORD = 'Assessment1c1Pass9';
const USER_A_EMAIL = 'phase1c1.assessment.a@example.com';
const USER_B_EMAIL = 'phase1c1.assessment.b@example.com';

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
    aiNickname: 'Baseline',
    educationLevel: 'form_4',
    preferredLanguage: 'english',
    familiarityLevel: 'beginner',
    helpTopics: ['avoiding_scams', 'protecting_privacy'],
    learningStyle: 'short_explanations',
    onboardingCompleted: true,
  }, cookie);
  assert.equal(result.response.status, 200);
}

function wrongOption(correct) {
  return correct === 'A' ? 'B' : 'A';
}

async function run() {
  assert.equal(getMeasuredLevel(0), 'beginner');
  assert.equal(getMeasuredLevel(39), 'beginner');
  assert.equal(getMeasuredLevel(40), 'developing');
  assert.equal(getMeasuredLevel(69), 'developing');
  assert.equal(getMeasuredLevel(70), 'intermediate');
  assert.equal(getMeasuredLevel(84), 'intermediate');
  assert.equal(getMeasuredLevel(85), 'advanced');
  assert.equal(getMeasuredLevel(100), 'advanced');

  const topicScore = scoreQuestions(
    [
      { id: 1, topic_code: 'phishing_and_scams', correct_option_key: 'A' },
      { id: 2, topic_code: 'phishing_and_scams', correct_option_key: 'B' },
      { id: 3, topic_code: 'phishing_and_scams', correct_option_key: 'C' },
    ],
    [
      { question_id: 1, selected_option_key: 'A' },
      { question_id: 2, selected_option_key: 'A' },
      { question_id: 3, selected_option_key: 'C' },
    ]
  ).topicScores[0];
  assert.equal(topicScore.correctCount, 2);
  assert.equal(topicScore.totalCount, 3);
  assert.equal(topicScore.percentage, 67);
  assert.equal(topicScore.classification, 'strength');

  const pool = createPool();
  const child = startServer();
  try {
    await cleanup(pool);
    await waitForHealth(child);

    let result = await request('GET', '/api/assessments/initial');
    assert.equal(result.response.status, 401);

    const userA = await register(USER_A_EMAIL, 'Phase 1C1 A');
    let cookieA = userA.cookieHeader;
    const userB = await register(USER_B_EMAIL, 'Phase 1C1 B');
    const cookieB = userB.cookieHeader;
    await saveProfile(cookieA);

    result = await request('GET', '/api/assessments/initial', undefined, cookieA);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.questions.length, 12);
    assert.equal(Object.prototype.hasOwnProperty.call(result.json.questions[0], 'correctOptionKey'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(result.json.questions[0], 'explanation'), false);

    const [[definition]] = await pool.query("SELECT id FROM assessment_definitions WHERE slug='initial-cyber-wellness-v1' AND version=1");
    const [dbQuestions] = await pool.query(
      `SELECT id, topic_code, correct_option_key
       FROM assessment_questions
       WHERE assessment_id = ?
       ORDER BY display_order`,
      [definition.id]
    );

    result = await request('POST', '/api/assessments/initial/attempts', {}, cookieA);
    assert.equal(result.response.status, 201);
    const attemptId = result.json.attempt.id;

    result = await request('PUT', `/api/assessment-attempts/${attemptId}/answers`, {
      questionId: dbQuestions[0].id,
      selectedOptionKey: dbQuestions[0].correct_option_key,
    }, cookieA);
    assert.equal(result.response.status, 200);

    result = await request('GET', `/api/assessment-attempts/${attemptId}`, undefined, cookieA);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.attempt.answers.length, 1);
    assert.equal(Object.prototype.hasOwnProperty.call(result.json, 'review'), false);

    result = await request('POST', `/api/assessment-attempts/${attemptId}/submit`, { totalScore: 12, percentage: 100 }, cookieA);
    assert.equal(result.response.status, 400);

    result = await request('GET', `/api/assessment-attempts/${attemptId}`, undefined, cookieB);
    assert.equal(result.response.status, 404);
    result = await request('PUT', `/api/assessment-attempts/${attemptId}/answers`, {
      questionId: dbQuestions[1].id,
      selectedOptionKey: dbQuestions[1].correct_option_key,
    }, cookieB);
    assert.equal(result.response.status, 404);
    result = await request('POST', `/api/assessment-attempts/${attemptId}/submit`, {}, cookieB);
    assert.equal(result.response.status, 404);

    result = await request('PUT', `/api/assessment-attempts/${attemptId}/answers`, {
      questionId: dbQuestions[1].id,
      selectedOptionKey: 'Z',
    }, cookieA);
    assert.equal(result.response.status, 400);
    result = await request('PUT', `/api/assessment-attempts/${attemptId}/answers`, {
      questionId: 999999,
      selectedOptionKey: 'A',
    }, cookieA);
    assert.equal(result.response.status, 400);

    for (let i = 0; i < dbQuestions.length; i++) {
      const selected = i < 10 ? dbQuestions[i].correct_option_key : wrongOption(dbQuestions[i].correct_option_key);
      result = await request('PUT', `/api/assessment-attempts/${attemptId}/answers`, {
        questionId: dbQuestions[i].id,
        selectedOptionKey: selected,
      }, cookieA);
      assert.equal(result.response.status, 200);
    }

    result = await request('GET', `/api/assessment-attempts/${attemptId}`, undefined, cookieA);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.attempt.answers.length, 12);

    result = await request('POST', `/api/assessment-attempts/${attemptId}/submit`, { totalScore: 12 }, cookieA);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.attempt.totalScore, 10);
    assert.equal(result.json.attempt.maximumScore, 12);
    assert.equal(result.json.attempt.percentage, 83);
    assert.equal(result.json.attempt.measuredLevel, 'intermediate');
    assert.equal(result.json.topicScores.length, 4);
    assert.equal(result.json.review.length, 12);
    assert.ok(result.json.review[0].correctOptionKey);
    assert.ok(result.json.review[0].explanation);

    result = await request('POST', `/api/assessment-attempts/${attemptId}/submit`, {}, cookieA);
    assert.equal(result.response.status, 409);

    const [[attemptCountBefore]] = await pool.query('SELECT COUNT(*) AS count FROM assessment_attempts WHERE user_id = ?', [userA.json.user.id]);
    result = await request('POST', '/api/assessments/initial/attempts', {}, cookieA);
    assert.equal(result.response.status, 201);
    assert.equal(result.json.completed, true);
    const [[attemptCountAfter]] = await pool.query('SELECT COUNT(*) AS count FROM assessment_attempts WHERE user_id = ?', [userA.json.user.id]);
    assert.equal(attemptCountAfter.count, attemptCountBefore.count);

    result = await request('GET', '/api/assessments/initial/result', undefined, cookieA);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.exists, true);
    assert.equal(result.json.result.attempt.totalScore, 10);

    result = await request('POST', '/api/auth/logout', {}, cookieA);
    assert.equal(result.response.status, 200);
    result = await login(USER_A_EMAIL);
    cookieA = result.cookieHeader;
    result = await request('GET', '/api/assessments/initial/result', undefined, cookieA);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.result.attempt.totalScore, 10);

    await cleanup(pool);
    const [[remainingUsers]] = await pool.query('SELECT COUNT(*) AS count FROM users WHERE email IN (?, ?)', [USER_A_EMAIL, USER_B_EMAIL]);
    const [[remainingAttempts]] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM assessment_attempts aa
       LEFT JOIN users u ON u.id = aa.user_id
       WHERE u.email IN (?, ?)`,
      [USER_A_EMAIL, USER_B_EMAIL]
    );
    assert.equal(remainingUsers.count, 0);
    assert.equal(remainingAttempts.count, 0);

    console.log('Initial assessment verification passed.');
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
