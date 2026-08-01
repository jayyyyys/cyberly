const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { createPool } = require('../src/database/pool');
const { getAgeGroup } = require('../src/database/age-group');
const {
  normalizeEmail,
  validateAge,
  validatePassword,
  validateRegistration,
} = require('../src/auth/validation');

const PORT = process.env.AUTH_TEST_PORT || '5101';
const BASE_URL = `http://127.0.0.1:${PORT}`;
const TEST_EMAIL = 'phase1b1.test@example.com';
const TEST_PASSWORD = 'Phase1b1Pass9';
const TEST_DISPLAY_NAME = 'Phase 1B1 Test';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSetCookieHeaders(response) {
  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers.getSetCookie();
  }

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

  return Array.from(cookieMap.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
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
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }

  return {
    response,
    json,
    cookieHeader: mergeCookies(cookieHeader, response),
  };
}

async function waitForHealth(child) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    if (child.exitCode !== null) {
      throw new Error('Server exited before health check completed.');
    }

    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) return;
    } catch {
      await delay(250);
    }
  }

  throw new Error('Timed out waiting for server health check.');
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

async function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  child.kill();
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    delay(3000),
  ]);
}

async function cleanup(pool) {
  const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [TEST_EMAIL]);
  for (const user of users) {
    await pool.query(
      `DELETE FROM sessions
       WHERE CAST(JSON_UNQUOTE(JSON_EXTRACT(data, '$.userId')) AS UNSIGNED) = ?`,
      [user.id]
    );
  }
  await pool.query('DELETE FROM users WHERE email = ?', [TEST_EMAIL]);
  await pool.query('DELETE FROM sessions WHERE expires < NOW()');
}

async function run() {
  assert.equal(getAgeGroup(0), null);
  assert.equal(getAgeGroup(13), 'teen');
  assert.equal(getAgeGroup(20), 'young_adult');
  assert.equal(validateAge(121), 'Age must be a whole number from 1 to 120.');
  assert.equal(validatePassword('short1'), 'Password must be at least 8 characters.');
  assert.equal(validatePassword('NoNumbers'), 'Password must contain at least one letter and one number.');
  assert.equal(validatePassword('12345678'), 'Password must contain at least one letter and one number.');
  assert.equal(normalizeEmail('  PHASE1B1.TEST@EXAMPLE.COM '), TEST_EMAIL);
  assert.equal(validateRegistration({
    email: TEST_EMAIL,
    displayName: TEST_DISPLAY_NAME,
    password: TEST_PASSWORD,
    age: 16,
  }).ok, true);

  const pool = createPool();
  const child = startServer();

  try {
    await cleanup(pool);
    const [[beforeCount]] = await pool.query('SELECT COUNT(*) AS count FROM users WHERE email = ?', [TEST_EMAIL]);
    assert.equal(beforeCount.count, 0);

    await waitForHealth(child);

    let result = await request('POST', '/api/register', {});
    assert.equal(result.response.status, 404);

    result = await request('POST', '/api/login', {});
    assert.equal(result.response.status, 404);

    result = await request('GET', '/api/admin/ping');
    assert.equal(result.response.status, 404);

    result = await request('POST', '/api/auth/register', {
      email: TEST_EMAIL,
      displayName: TEST_DISPLAY_NAME,
      password: TEST_PASSWORD,
      age: 16,
      role: 'admin',
    });
    assert.equal(result.response.status, 201);
    assert.equal(result.json.user.email, TEST_EMAIL);
    assert.equal(result.json.user.role, 'user');
    assert.equal(result.json.user.ageGroup, 'teen');
    assert.equal(Object.prototype.hasOwnProperty.call(result.json.user, 'password'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(result.json.user, 'passwordHash'), false);

    let cookieHeader = result.cookieHeader;
    assert.ok(cookieHeader.length > 0, 'register should set a session cookie');

    const [[storedUser]] = await pool.query(
      `SELECT
         COUNT(*) AS count,
         MAX(role = 'user') AS is_user,
         MAX(age_group = 'teen') AS is_teen,
         MAX(password_hash IS NOT NULL) AS has_hash,
         MAX(password_hash <> ?) AS hash_not_plaintext,
         MAX(password IS NULL OR password <> ?) AS legacy_password_not_plaintext
       FROM users
       WHERE email = ?`,
      [TEST_PASSWORD, TEST_PASSWORD, TEST_EMAIL]
    );
    assert.equal(storedUser.count, 1);
    assert.equal(Number(storedUser.is_user), 1);
    assert.equal(Number(storedUser.is_teen), 1);
    assert.equal(Number(storedUser.has_hash), 1);
    assert.equal(Number(storedUser.hash_not_plaintext), 1);
    assert.equal(Number(storedUser.legacy_password_not_plaintext), 1);

    result = await request('GET', '/api/auth/me', undefined, cookieHeader);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.user.email, TEST_EMAIL);
    cookieHeader = result.cookieHeader || cookieHeader;

    result = await request('GET', '/api/admin/ping', undefined, cookieHeader);
    assert.equal(result.response.status, 404);

    result = await request('GET', '/api/admin/status');
    assert.equal(result.response.status, 401);

    result = await request('GET', '/api/admin/resources/review');
    assert.equal(result.response.status, 401);

    result = await request('GET', '/api/admin/status?role=admin', undefined, cookieHeader);
    assert.equal(result.response.status, 403);

    result = await request('GET', '/api/admin/resources/review?role=admin', undefined, cookieHeader);
    assert.equal(result.response.status, 403);

    await pool.query('UPDATE users SET role = ? WHERE email = ?', ['admin', TEST_EMAIL]);

    result = await request('GET', '/api/auth/me', undefined, cookieHeader);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.user.role, 'admin');
    cookieHeader = result.cookieHeader || cookieHeader;

    result = await request('GET', '/api/admin/status?role=user', undefined, cookieHeader);
    assert.equal(result.response.status, 200);
    assert.deepEqual(result.json, {
      ok: true,
      role: 'admin',
      modules: [
        'dashboard',
        'resources',
        'rag',
        'aiSafety',
        'contentRelationships',
        'malaysiaGuidance',
      ],
      message: 'Admin access verified',
    });
    assert.equal(Object.prototype.hasOwnProperty.call(result.json, 'email'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(result.json, 'password_hash'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(result.json, 'passwordHash'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(result.json, 'session'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(result.json, 'apiKey'), false);

    result = await request('GET', '/api/admin/ping', undefined, cookieHeader);
    assert.equal(result.response.status, 404);

    result = await request('GET', '/api/admin/resources/review?role=user', undefined, cookieHeader);
    assert.equal(result.response.status, 200);
    assert.ok(Array.isArray(result.json.resources));
    assert.ok(result.json.summary.totalResources >= result.json.resources.length);
    assert.ok(result.json.summary.totalResources > 0);
    assert.equal(Object.prototype.hasOwnProperty.call(result.json, 'email'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(result.json, 'password_hash'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(result.json, 'passwordHash'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(result.json, 'session'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(result.json, 'apiKey'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(result.json, 'prompt'), false);

    const phishingReview = result.json.resources.find(resource => resource.slug === 'phishing');
    assert.ok(phishingReview, 'admin review endpoint should include seeded resource summaries');
    assert.equal(phishingReview.categoryCode, 'Scams');
    assert.equal(phishingReview.displayCategory, 'Scams & Social Engineering');
    assert.equal(phishingReview.reviewStatus, 'approved');
    assert.equal(typeof phishingReview.ragReady, 'boolean');
    assert.equal(typeof phishingReview.translationCount, 'number');
    assert.equal(Object.prototype.hasOwnProperty.call(phishingReview, 'password_hash'), false);

    result = await request('POST', '/api/auth/register', {
      email: TEST_EMAIL,
      displayName: TEST_DISPLAY_NAME,
      password: TEST_PASSWORD,
      age: 16,
    });
    assert.equal(result.response.status, 409);

    const invalidAges = [0, -1, 121, 16.5];
    for (const age of invalidAges) {
      result = await request('POST', '/api/auth/register', {
        email: `phase1b1.age.${String(age).replace('.', '-') }@example.com`,
        displayName: TEST_DISPLAY_NAME,
        password: TEST_PASSWORD,
        age,
      });
      assert.equal(result.response.status, 400);
    }

    const weakPasswords = ['short1', 'NoNumbers', '12345678'];
    for (const password of weakPasswords) {
      result = await request('POST', '/api/auth/register', {
        email: `phase1b1.weak.${password.toLowerCase()}@example.com`,
        displayName: TEST_DISPLAY_NAME,
        password,
        age: 16,
      });
      assert.equal(result.response.status, 400);
    }

    result = await request('POST', '/api/auth/login', {
      email: TEST_EMAIL,
      password: 'WrongPassword9',
    });
    assert.equal(result.response.status, 401);
    const wrongPasswordMessage = result.json.message;

    result = await request('POST', '/api/auth/login', {
      email: 'missing.phase1b1@example.com',
      password: TEST_PASSWORD,
    });
    assert.equal(result.response.status, 401);
    assert.equal(result.json.message, wrongPasswordMessage);

    result = await request('POST', '/api/auth/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    assert.equal(result.response.status, 200);
    cookieHeader = result.cookieHeader;
    assert.ok(cookieHeader.length > 0, 'login should set a session cookie');

    result = await request('GET', '/api/auth/me', undefined, cookieHeader);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.user.email, TEST_EMAIL);

    result = await request('POST', '/api/auth/logout', {}, cookieHeader);
    assert.equal(result.response.status, 200);
    cookieHeader = result.cookieHeader;

    result = await request('POST', '/api/auth/logout', {}, cookieHeader);
    assert.equal(result.response.status, 200);

    result = await request('GET', '/api/auth/me', undefined, cookieHeader);
    assert.equal(result.response.status, 401);

    const [[afterCountBeforeCleanup]] = await pool.query('SELECT COUNT(*) AS count FROM users WHERE email = ?', [TEST_EMAIL]);
    assert.equal(afterCountBeforeCleanup.count, 1);

    await cleanup(pool);
    const [[afterCount]] = await pool.query('SELECT COUNT(*) AS count FROM users WHERE email = ?', [TEST_EMAIL]);
    assert.equal(afterCount.count, 0);

    console.log('Auth verification passed.');
  } finally {
    await stopServer(child);
    await cleanup(pool).catch(() => {});
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
