const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { createPool } = require('../src/database/pool');
const { validateProfileInput } = require('../src/profile/profile.validation');

const PORT = process.env.PROFILE_TEST_PORT || '5103';
const BASE_URL = `http://127.0.0.1:${PORT}`;
const TEST_PASSWORD = 'Profile1b2Pass9';
const USER_A_EMAIL = 'phase1b2.profile.a@example.com';
const USER_B_EMAIL = 'phase1b2.profile.b@example.com';

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
  const serverPath = path.join(__dirname, '..', 'server.js');
  const child = spawn(process.execPath, [serverPath], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT,
      CLIENT_ORIGIN: 'http://localhost:3000',
      NODE_ENV: 'test',
    },
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
    password: TEST_PASSWORD,
    age: 16,
  });
  assert.equal(result.response.status, 201);
  return result;
}

async function login(email) {
  const result = await request('POST', '/api/auth/login', {
    email,
    password: TEST_PASSWORD,
  });
  assert.equal(result.response.status, 200);
  return result;
}

function assertSafeProfileShape(profile) {
  assert.equal(Object.prototype.hasOwnProperty.call(profile, 'id'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(profile, 'userId'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(profile, 'createdAt'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(profile, 'updatedAt'), false);
}

async function run() {
  assert.equal(validateProfileInput({ educationLevel: 'form_4' }).ok, true);
  assert.equal(validateProfileInput({ educationLevel: 'college' }).ok, false);
  assert.equal(validateProfileInput({ preferredLanguage: 'bahasa_melayu' }).ok, true);
  assert.equal(validateProfileInput({ preferredLanguage: 'spanish' }).ok, false);
  assert.equal(validateProfileInput({ helpTopics: ['avoiding_scams', 'protecting_privacy', 'learning_cybersecurity', 'staying_safe_online'] }).ok, false);
  assert.equal(validateProfileInput({ helpTopics: ['avoiding_scams', 'avoiding_scams'] }).ok, false);
  assert.equal(validateProfileInput({ helpTopics: ['unknown_topic'] }).ok, false);
  assert.equal(validateProfileInput({ onboardingCompleted: true }).ok, false);

  const pool = createPool();
  const child = startServer();

  try {
    await cleanup(pool);
    await waitForHealth(child);

    let result = await request('GET', '/api/profile');
    assert.equal(result.response.status, 401);

    result = await request('PUT', '/api/profile', { aiNickname: 'No Session' });
    assert.equal(result.response.status, 401);

    const userA = await register(USER_A_EMAIL, 'Phase 1B2 A');
    const cookieA = userA.cookieHeader;

    const userB = await register(USER_B_EMAIL, 'Phase 1B2 B');
    const cookieB = userB.cookieHeader;

    result = await request('GET', '/api/profile', undefined, cookieA);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.profile.exists, false);
    assert.equal(result.json.profile.onboardingCompleted, false);

    result = await request('PUT', '/api/profile', {
      aiNickname: 'Alex',
      educationLevel: 'form_4',
      preferredLanguage: 'english',
      familiarityLevel: 'beginner',
      helpTopics: ['avoiding_scams', 'protecting_privacy'],
      learningStyle: 'short_explanations',
      onboardingCompleted: true,
      userId: userB.json.user.id,
    }, cookieA);
    assert.equal(result.response.status, 200);
    assertSafeProfileShape(result.json.profile);
    assert.equal(result.json.profile.exists, true);
    assert.equal(result.json.profile.aiNickname, 'Alex');
    assert.equal(result.json.profile.onboardingCompleted, true);
    const firstCompletedAt = result.json.profile.onboardingCompletedAt;
    assert.ok(firstCompletedAt);

    const [[profileCount]] = await pool.query('SELECT COUNT(*) AS count FROM learner_profiles WHERE user_id = ?', [userA.json.user.id]);
    assert.equal(profileCount.count, 1);

    const [[storedProfile]] = await pool.query('SELECT JSON_EXTRACT(help_topics, "$") AS help_topics FROM learner_profiles WHERE user_id = ?', [userA.json.user.id]);
    const storedTopics = typeof storedProfile.help_topics === 'string' ? JSON.parse(storedProfile.help_topics) : storedProfile.help_topics;
    assert.deepEqual(storedTopics, ['avoiding_scams', 'protecting_privacy']);

    result = await request('GET', '/api/profile', undefined, cookieB);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.profile.exists, false);

    result = await request('PUT', '/api/profile', {
      aiNickname: 'Bee',
      educationLevel: 'form_2',
      preferredLanguage: 'mixed',
      familiarityLevel: 'intermediate',
      helpTopics: ['staying_safe_online'],
      learningStyle: 'step_by_step',
      onboardingCompleted: true,
      userId: userA.json.user.id,
    }, cookieB);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.profile.aiNickname, 'Bee');

    const [[profileCounts]] = await pool.query(
      `SELECT
         SUM(user_id = ?) AS a_count,
         SUM(user_id = ?) AS b_count
       FROM learner_profiles
       WHERE user_id IN (?, ?)`,
      [userA.json.user.id, userB.json.user.id, userA.json.user.id, userB.json.user.id]
    );
    assert.equal(Number(profileCounts.a_count), 1);
    assert.equal(Number(profileCounts.b_count), 1);

    result = await request('POST', '/api/auth/logout', {}, cookieA);
    assert.equal(result.response.status, 200);

    result = await login(USER_A_EMAIL);
    const cookieAfterLogin = result.cookieHeader;
    assert.equal(result.json.profile.aiNickname, 'Alex');
    assert.equal(result.json.profile.onboardingCompleted, true);

    result = await request('GET', '/api/auth/me', undefined, cookieAfterLogin);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.profile.aiNickname, 'Alex');
    assert.equal(result.json.profile.helpTopics.length, 2);

    await delay(1100);
    result = await request('PUT', '/api/profile', {
      aiNickname: 'Alex Updated',
      educationLevel: 'form_5',
      preferredLanguage: 'bahasa_melayu',
      familiarityLevel: 'intermediate',
      helpTopics: ['learning_cybersecurity'],
      learningStyle: 'quizzes_and_challenges',
      onboardingCompleted: true,
    }, cookieAfterLogin);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.profile.aiNickname, 'Alex Updated');
    assert.equal(result.json.profile.onboardingCompletedAt, firstCompletedAt);
    assert.notEqual(result.json.profile.profileLastConfirmedAt, null);

    result = await request('GET', '/api/profile', undefined, cookieAfterLogin);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.profile.preferredLanguage, 'bahasa_melayu');

    await cleanup(pool);
    const [[remainingUsers]] = await pool.query('SELECT COUNT(*) AS count FROM users WHERE email IN (?, ?)', [USER_A_EMAIL, USER_B_EMAIL]);
    const [[remainingProfiles]] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM learner_profiles lp
       LEFT JOIN users u ON u.id = lp.user_id
       WHERE u.email IN (?, ?)`,
      [USER_A_EMAIL, USER_B_EMAIL]
    );
    assert.equal(remainingUsers.count, 0);
    assert.equal(remainingProfiles.count, 0);

    console.log('Learner profile verification passed.');
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
