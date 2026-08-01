const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { createPool } = require('../src/database/pool');
const { createRagRepository } = require('../src/rag/rag.repository');
const { createRagService } = require('../src/rag/rag.service');

const BASE_PORT = Number(process.env.AI_TEST_PORT || 5119);
const PASSWORD = 'Ai8b2Pass9';
const USER_A_EMAIL = 'phase8b2.ai.a@example.com';
const USER_B_EMAIL = 'phase8b2.ai.b@example.com';

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

async function request(baseUrl, method, pathName, body, cookieHeader = '', extraHeaders = {}) {
  const response = await fetch(`${baseUrl}${pathName}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
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
  return { response, json, cookieHeader: mergeCookies(cookieHeader, response) };
}

function startServer(port, extraEnv = {}) {
  const logs = { stdout: '', stderr: '' };
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      CLIENT_ORIGIN: 'http://localhost:3000',
      NODE_ENV: 'test',
      AI_MODEL: 'gpt-5.4-mini',
      AI_TIMEOUT_MS: '200',
      AI_MAX_OUTPUT_TOKENS: '800',
      AI_CONTEXT_MESSAGE_LIMIT: '12',
      AI_CONTEXT_CHARACTER_LIMIT: '8000',
      AI_PER_USER_MINUTE_LIMIT: '6',
      AI_PER_USER_DAILY_LIMIT: '60',
      ...extraEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', chunk => { logs.stdout += chunk.toString(); });
  child.stderr.on('data', chunk => { logs.stderr += chunk.toString(); });
  child.logs = logs;
  return child;
}

async function waitForHealth(baseUrl, child) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    if (child.exitCode !== null) throw new Error('Server exited before health check completed.');
    try {
      const response = await fetch(`${baseUrl}/api/health`);
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

async function tableExists(pool, tableName) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    [tableName]
  );
  return rows[0].count > 0;
}

async function cleanup(pool) {
  const [users] = await pool.query('SELECT id FROM users WHERE email IN (?, ?)', [USER_A_EMAIL, USER_B_EMAIL]);
  const userIds = users.map(user => user.id);
  for (const user of users) {
    await pool.query(
      `DELETE FROM sessions
       WHERE CAST(JSON_UNQUOTE(JSON_EXTRACT(data, '$.userId')) AS UNSIGNED) = ?`,
      [user.id]
    );
  }
  if (userIds.length && await tableExists(pool, 'chat_conversations')) {
    await pool.query('DELETE FROM chat_conversations WHERE user_id IN (?)', [userIds]);
  }
  await pool.query('DELETE FROM users WHERE email IN (?, ?)', [USER_A_EMAIL, USER_B_EMAIL]);
  await pool.query('DELETE FROM sessions WHERE expires < NOW()');
}

async function withServer(extraEnv, callback) {
  const port = BASE_PORT + Math.floor(Math.random() * 2000);
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startServer(port, extraEnv);
  try {
    await waitForHealth(baseUrl, child);
    return await callback(baseUrl);
  } catch (error) {
    if (child.logs?.stderr) console.error(child.logs.stderr);
    throw error;
  } finally {
    await stopServer(child);
  }
}

async function register(baseUrl, email, displayName) {
  const result = await request(baseUrl, 'POST', '/api/auth/register', {
    email,
    displayName,
    password: PASSWORD,
    age: 16,
  });
  assert.equal(result.response.status, 201);
  return result;
}

async function createConversation(baseUrl, cookieHeader, content = 'How do I spot a phishing message?', locale = 'en') {
  const result = await request(baseUrl, 'POST', '/api/chat/conversations', {
    message: { role: 'user', content },
    locale,
  }, cookieHeader);
  assert.equal(result.response.status, 201);
  return {
    conversation: result.json.conversation,
    message: result.json.messages[0],
  };
}

function assertSafeAction(action) {
  assert.ok(Number.isInteger(action.id));
  assert.ok(action.id > 0);
  assert.ok(['resource', 'scenario', 'progress', 'assessment', 'resources', 'scenarios'].includes(action.type));
  assert.equal(typeof action.labelKey, 'string');
  assert.equal(action.labelKey.startsWith('chat.actions.'), true);
  assert.ok(action.target && typeof action.target === 'object');
  assert.ok(['resources', 'scenarios', 'progress', 'assessment'].includes(action.target.page));
  assert.equal(Object.hasOwn(action.target, 'route'), false);
  assert.equal(Object.hasOwn(action.target, 'url'), false);
  assert.equal(Object.hasOwn(action.target, 'href'), false);
  assert.equal(Object.hasOwn(action.target, 'providerRequestId'), false);
  assert.ok(Number.isInteger(action.displayOrder));
}

function assertSafeSource(source) {
  assert.ok(Number.isInteger(source.id));
  assert.ok(source.id > 0);
  assert.equal(typeof source.title, 'string');
  assert.equal(typeof source.locale, 'string');
  assert.equal(typeof source.snippet, 'string');
  assert.ok(source.snippet.length > 0);
  assert.ok(Number.isInteger(source.citationOrder));
  assert.equal(Object.hasOwn(source, 'chunkId'), false);
  assert.equal(Object.hasOwn(source, 'documentId'), false);
  assert.equal(Object.hasOwn(source, 'providerRequestId'), false);
  assert.equal(Object.hasOwn(source, 'inputTokens'), false);
  assert.equal(Object.hasOwn(source, 'outputTokens'), false);
  assert.equal(Object.hasOwn(source, 'estimatedCostUsd'), false);
  assert.equal(Object.hasOwn(source, 'prompt'), false);
  if (source.internalTarget) {
    assert.equal(source.internalTarget.page, 'resources');
    assert.equal(Object.hasOwn(source.internalTarget, 'route'), false);
    assert.equal(Object.hasOwn(source.internalTarget, 'url'), false);
  }
}

async function ensureRagContent(pool) {
  const ragRepository = createRagRepository(pool);
  const ragService = createRagService(ragRepository);
  await ragService.ingestPublishedResources();
}

async function addUserMessage(baseUrl, cookieHeader, conversationId, content) {
  const result = await request(baseUrl, 'POST', `/api/chat/conversations/${conversationId}/messages`, {
    content,
  }, cookieHeader);
  assert.equal(result.response.status, 201);
  return result.json.message;
}

async function seedLearnerContextEvidence(pool, userId) {
  await pool.query(
    `INSERT INTO learner_profiles (
        user_id, ai_nickname, education_level, preferred_language, familiarity_level,
        help_topics, learning_style, onboarding_completed, onboarding_completed_at, profile_last_confirmed_at
     )
     VALUES (?, 'Private Nickname', 'form_3', 'english', 'beginner', JSON_ARRAY('avoiding_scams'), 'step_by_step', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE education_level = VALUES(education_level)`,
    [userId]
  );

  const [[assessment]] = await pool.query(
    "SELECT id FROM assessment_definitions WHERE slug = 'initial-cyber-wellness-v1' ORDER BY id LIMIT 1"
  );
  const [attempt] = await pool.query(
    `INSERT INTO assessment_attempts (
        user_id, assessment_id, status, total_score, maximum_score, percentage, measured_level, completed_at
     )
     VALUES (?, ?, 'completed', 6, 10, 60, 'developing', CURRENT_TIMESTAMP)`,
    [userId, assessment.id]
  );

  const assessmentTopics = [
    ['phishing_and_scams', 1, 4, 25],
    ['password_and_account_security', 2, 4, 50],
    ['privacy_and_personal_information', 2, 4, 50],
    ['misinformation_and_deepfakes', 4, 4, 100],
  ];
  for (const topic of assessmentTopics) {
    await pool.query(
      `INSERT INTO assessment_topic_scores (attempt_id, topic_code, correct_count, total_count, percentage)
       VALUES (?, ?, ?, ?, ?)`,
      [attempt.insertId, ...topic]
    );
  }

  const scenarioRows = [
    ['phishing_and_scams', 20],
    ['password_and_account_security', 50],
    ['privacy_and_personal_information', 60],
    ['misinformation_and_deepfakes', 100],
  ];
  for (const [topicCode, percentage] of scenarioRows) {
    const [[scenario]] = await pool.query(
      `SELECT id FROM scenario_definitions
       WHERE topic_code = ?
       ORDER BY id
       LIMIT 1`,
      [topicCode]
    );
    await pool.query(
      `INSERT INTO scenario_attempts (
          user_id, scenario_id, status, total_score, maximum_score, percentage, result_level, completed_at
       )
       VALUES (?, ?, 'completed', ?, 100, ?, 'developing', CURRENT_TIMESTAMP)`,
      [userId, scenario.id, percentage, percentage]
    );
  }

  await pool.query(
    `INSERT INTO learner_progress_summary (
        user_id, overall_mastery_percentage, measured_level, completed_topic_count, total_activity_count, last_progress_at
     )
     VALUES (?, 69, 'developing', 4, 5, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE overall_mastery_percentage = VALUES(overall_mastery_percentage)`,
    [userId]
  );

  for (const [topicCode, mastery] of [
    ['phishing_and_scams', 30],
    ['password_and_account_security', 48],
    ['privacy_and_personal_information', 60],
    ['misinformation_and_deepfakes', 100],
  ]) {
    await pool.query(
      `INSERT INTO learner_topic_progress (
          user_id, topic_code, current_level, mastery_percentage, source_type, source_reference_id, activity_count, last_activity_at
       )
       VALUES (?, ?, 'developing', ?, 'initial_assessment', ?, 1, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE mastery_percentage = VALUES(mastery_percentage)`,
      [userId, topicCode, mastery, attempt.insertId]
    );
  }

  await pool.query(
    `INSERT INTO learner_recommendations (
        user_id, recommendation_type, topic_code, recommended_level, reason_code,
        reason_text, source_type, source_reference_id, status
     )
     VALUES (?, 'review_topic', 'phishing_and_scams', 'developing', 'weak_topic',
       'A good topic to strengthen next is phishing and scams.', 'initial_assessment', ?, 'active')`,
    [userId, attempt.insertId]
  );
}

async function generate(baseUrl, cookieHeader, conversationId, messageId, body = {}) {
  return request(
    baseUrl,
    'POST',
    `/api/chat/conversations/${conversationId}/messages/${messageId}/generate`,
    body,
    cookieHeader
  );
}

async function run() {
  const pool = createPool();
  try {
    await cleanup(pool);
    await ensureRagContent(pool);

    await withServer({ OPENAI_API_KEY: '', AI_TEST_MOCK_OPENAI: '' }, async (baseUrl) => {
      const userA = await register(baseUrl, USER_A_EMAIL, 'Phase 8B2 A');
      const created = await createConversation(baseUrl, userA.cookieHeader);
      const result = await generate(baseUrl, userA.cookieHeader, created.conversation.id, created.message.id);
      assert.equal(result.response.status, 503);
      assert.equal(result.json.code, 'AI_NOT_CONFIGURED');
      assert.equal(JSON.stringify(result.json).includes('OPENAI_API_KEY'), false);
    });

    await cleanup(pool);

    await withServer({ OPENAI_API_KEY: 'test-key', AI_TEST_MOCK_OPENAI: 'success' }, async (baseUrl) => {
      const userA = await register(baseUrl, USER_A_EMAIL, 'Phase 8B2 A');
      const userB = await register(baseUrl, USER_B_EMAIL, 'Phase 8B2 B');
      const created = await createConversation(baseUrl, userA.cookieHeader, 'Explain phishing safely.', 'ms-MY');

      let result = await generate(baseUrl, userA.cookieHeader, created.conversation.id, created.message.id, { locale: 'ms-MY' });
      assert.equal(result.response.status, 201);
      assert.equal(result.json.assistantMessage.role, 'assistant');
      assert.equal(result.json.assistantMessage.replyToMessageId, created.message.id);
      assert.equal(result.json.userMessage.locale, 'ms');
      assert.equal(result.json.assistantMessage.locale, 'ms');
      assert.equal(result.json.generation.status, 'completed');
      assert.equal(result.json.generation.provider, 'openai');
      assert.equal(result.json.generation.model, 'gpt-5.4-mini');
      assert.equal(result.json.generation.inputTokens > 0, true);
      assert.equal(result.json.generation.outputTokens > 0, true);
      assert.equal(Number(result.json.generation.estimatedCostUsd) > 0, true);
      assert.equal(result.json.generation.durationMs >= 0, true);
      assert.equal(result.json.assistantMessage.content.includes('OPENAI_API_KEY'), false);
      assert.equal(Array.isArray(result.json.actions), true);
      assert.equal(result.json.actions.length > 0, true);
      assert.equal(result.json.actions.length <= 3, true);
      result.json.actions.forEach(assertSafeAction);
      assert.equal(Array.isArray(result.json.sources), true);
      assert.equal(result.json.sources.length > 0, true);
      assert.equal(result.json.sources.length <= 4, true);
      result.json.sources.forEach(assertSafeSource);
      const assistantId = result.json.assistantMessage.id;
      const firstActionIds = result.json.actions.map(action => action.id);
      const firstSourceIds = result.json.sources.map(source => source.id);

      const [[assistantRow]] = await pool.query(
        'SELECT reply_to_message_id, locale FROM chat_messages WHERE id = ?',
        [assistantId]
      );
      assert.equal(assistantRow.reply_to_message_id, created.message.id);
      assert.equal(assistantRow.locale, 'ms');

      result = await generate(baseUrl, userA.cookieHeader, created.conversation.id, created.message.id, { locale: 'ms' });
      assert.equal(result.response.status, 200);
      assert.equal(result.json.assistantMessage.id, assistantId);
      assert.equal(result.json.assistantMessage.locale, 'ms');
      assert.deepEqual(result.json.actions.map(action => action.id), firstActionIds);
      assert.deepEqual(result.json.sources.map(source => source.id), firstSourceIds);
      const [[assistantCount]] = await pool.query(
        "SELECT COUNT(*) AS count FROM chat_messages WHERE conversation_id = ? AND role = 'assistant'",
        [created.conversation.id]
      );
      assert.equal(assistantCount.count, 1);
      const [[actionCount]] = await pool.query(
        'SELECT COUNT(*) AS count FROM chat_message_actions WHERE message_id = ?',
        [assistantId]
      );
      assert.equal(actionCount.count, firstActionIds.length);
      const [[sourceCount]] = await pool.query(
        'SELECT COUNT(*) AS count FROM chat_message_sources WHERE message_id = ?',
        [assistantId]
      );
      assert.equal(sourceCount.count, firstSourceIds.length);

      const detail = await request(baseUrl, 'GET', `/api/chat/conversations/${created.conversation.id}`, undefined, userA.cookieHeader);
      assert.equal(detail.response.status, 200);
      assert.equal(Array.isArray(detail.json.actions), true);
      const actionGroup = detail.json.actions.find(group => group.messageId === assistantId);
      assert.ok(actionGroup);
      assert.deepEqual(actionGroup.actions.map(action => action.id), firstActionIds);
      actionGroup.actions.forEach(assertSafeAction);
      assert.equal(Array.isArray(detail.json.sources), true);
      const sourceGroup = detail.json.sources.find(group => group.messageId === assistantId);
      assert.ok(sourceGroup);
      assert.deepEqual(sourceGroup.sources.map(source => source.id), firstSourceIds);
      sourceGroup.sources.forEach(assertSafeSource);
      await assert.rejects(
        pool.query(
          `INSERT INTO chat_message_actions (
              conversation_id, message_id, action_type, label_key, target_json, display_order
           )
           VALUES (?, ?, 'external', 'chat.actions.bad', JSON_OBJECT('page', 'resources'), 99)`,
          [created.conversation.id, assistantId]
        )
      );

      result = await generate(baseUrl, userB.cookieHeader, created.conversation.id, created.message.id);
      assert.equal(result.response.status, 404);
      assert.equal(result.json.code, 'CHAT_CONVERSATION_NOT_FOUND');

      const [assistantTarget] = await pool.query(
        `INSERT INTO chat_messages (conversation_id, role, content)
         VALUES (?, 'assistant', 'Existing assistant')`,
        [created.conversation.id]
      );
      result = await generate(baseUrl, userA.cookieHeader, created.conversation.id, assistantTarget.insertId);
      assert.equal(result.response.status, 400);
      assert.equal(result.json.code, 'CHAT_INVALID_MESSAGE');
    });

    await cleanup(pool);

    await withServer({ OPENAI_API_KEY: 'test-key', AI_TEST_MOCK_OPENAI: 'context' }, async (baseUrl) => {
      const userA = await register(baseUrl, USER_A_EMAIL, 'Phase 8B2 A');
      await seedLearnerContextEvidence(pool, userA.json.user.id);
      const beforeCounts = {
        attempts: (await pool.query('SELECT COUNT(*) AS count FROM scenario_attempts'))[0][0].count,
        decisions: (await pool.query('SELECT COUNT(*) AS count FROM scenario_decisions'))[0][0].count,
        progress: (await pool.query('SELECT COUNT(*) AS count FROM learner_topic_progress'))[0][0].count,
        recommendations: (await pool.query('SELECT COUNT(*) AS count FROM learner_recommendations'))[0][0].count,
      };

      const created = await createConversation(baseUrl, userA.cookieHeader, 'Give me a 15-minute phishing practice plan.', 'en');
      const result = await generate(baseUrl, userA.cookieHeader, created.conversation.id, created.message.id, { locale: 'en' });
      assert.equal(result.response.status, 201);
      const content = result.json.assistantMessage.content;
      assert.match(content, /hasLearningRoute=true/);
      assert.match(content, /routeStepCount=3/);
      assert.match(content, /routeTimeBudget=15/);
      assert.match(content, /routeTopic=phishing_and_scams/);
      assert.doesNotMatch(content, /Private Nickname/);
      assert.doesNotMatch(content, /phase8b2\.ai\.a@example\.com/);
      assert.doesNotMatch(content, /selectedOptionKey/);
      assert.doesNotMatch(content, /execute_sql/i);
      assert.equal(result.json.actions.length <= 3, true);
      result.json.actions.forEach(assertSafeAction);
      assert.deepEqual(result.json.actions.map(action => action.type), ['resource', 'scenario', 'progress']);
      assert.equal(result.json.actions[0].target.page, 'resources');
      assert.equal(result.json.actions[1].target.page, 'scenarios');
      assert.equal(result.json.actions[2].target.page, 'progress');

      const afterCounts = {
        attempts: (await pool.query('SELECT COUNT(*) AS count FROM scenario_attempts'))[0][0].count,
        decisions: (await pool.query('SELECT COUNT(*) AS count FROM scenario_decisions'))[0][0].count,
        progress: (await pool.query('SELECT COUNT(*) AS count FROM learner_topic_progress'))[0][0].count,
        recommendations: (await pool.query('SELECT COUNT(*) AS count FROM learner_recommendations'))[0][0].count,
      };
      assert.deepEqual(afterCounts, beforeCounts);
    });

    await cleanup(pool);

    await withServer({ OPENAI_API_KEY: 'test-key', AI_TEST_MOCK_OPENAI: 'context' }, async (baseUrl) => {
      const userA = await register(baseUrl, USER_A_EMAIL, 'Phase 8B2 A');
      await seedLearnerContextEvidence(pool, userA.json.user.id);
      const created = await createConversation(baseUrl, userA.cookieHeader, 'Message 0', 'zh-CN');
      let lastMessage = created.message;
      for (let index = 1; index <= 15; index += 1) {
        lastMessage = await addUserMessage(baseUrl, userA.cookieHeader, created.conversation.id, `Message ${index} ${'x'.repeat(700)}`);
      }

      const result = await generate(baseUrl, userA.cookieHeader, created.conversation.id, lastMessage.id, { locale: 'zh-CN' });
      assert.equal(result.response.status, 201);
      const content = result.json.assistantMessage.content;
      assert.equal(Array.isArray(result.json.sources), true);
      assert.equal(result.json.sources.length > 0, true);
      result.json.sources.forEach(assertSafeSource);
      assert.equal(Array.isArray(result.json.actions), true);
      assert.equal(result.json.actions.length <= 3, true);
      result.json.actions.forEach(assertSafeAction);
      const resourceAction = result.json.actions.find(action => action.type === 'resource');
      const scenarioAction = result.json.actions.find(action => action.type === 'scenario');
      const progressAction = result.json.actions.find(action => action.type === 'progress');
      assert.ok(resourceAction);
      assert.ok(scenarioAction);
      assert.ok(progressAction);
      assert.equal(resourceAction.target.page, 'resources');
      assert.equal(resourceAction.target.resourceSlug, 'phishing');
      assert.equal(scenarioAction.target.page, 'scenarios');
      assert.equal(typeof scenarioAction.target.scenarioSlug, 'string');
      const [[completedPhishingScenario]] = await pool.query(
        `SELECT sd.slug
         FROM scenario_attempts sa
         JOIN scenario_definitions sd ON sd.id = sa.scenario_id
         WHERE sa.user_id = ?
           AND sa.status = 'completed'
           AND sd.topic_code = 'phishing_and_scams'
         ORDER BY sd.id
         LIMIT 1`,
        [userA.json.user.id]
      );
      assert.notEqual(scenarioAction.target.scenarioSlug, completedPhishingScenario.slug);
      assert.equal(progressAction.target.page, 'progress');
      assert.match(content, /locale=zh-CN/);
      assert.match(content, /ageBand=13-17/);
      assert.match(content, /learnerLevel=L3/);
      assert.match(content, /confidence=Medium/);
      assert.match(content, /schoolStage=Form 3/);
      assert.match(content, /primaryFocus=phishing_and_scams/);
      assert.match(content, /secondaryCount=2/);
      assert.match(content, /recommendation=phishing_and_scams:developing:weak_topic/);
      assert.match(content, /focusCount=3/);
      assert.match(content, /nonJudgmental=true/);
      assert.doesNotMatch(content, /phase8b2\.ai\.a@example\.com/);
      assert.doesNotMatch(content, /Private Nickname/);
      assert.doesNotMatch(content, /selectedOptionKey/);
      assert.match(content, /messageCount=12/);
      assert.match(content, /sourceCount=\d+/);
      assert.doesNotMatch(content, /chunkId=/);
      const chars = Number(content.match(/chars=(\d+)/)[1]);
      assert.equal(chars <= 8000, true);
    });

    await cleanup(pool);

    await withServer({ OPENAI_API_KEY: 'test-key', AI_TEST_MOCK_OPENAI: 'context' }, async (baseUrl) => {
      const userA = await register(baseUrl, USER_A_EMAIL, 'Phase 8B2 A');
      await seedLearnerContextEvidence(pool, userA.json.user.id);
      await pool.query(
        `INSERT INTO scenario_attempts (
            user_id, scenario_id, status, total_score, maximum_score, percentage, result_level, completed_at
         )
         SELECT ?, sd.id, 'completed', 80, 100, 80, 'proficient', CURRENT_TIMESTAMP
         FROM scenario_definitions sd
         WHERE sd.status = 'published'
           AND sd.topic_code = 'phishing_and_scams'`,
        [userA.json.user.id]
      );

      const created = await createConversation(baseUrl, userA.cookieHeader, 'I finished the phishing scenario. What should I do next?', 'en');
      const result = await generate(baseUrl, userA.cookieHeader, created.conversation.id, created.message.id);
      assert.equal(result.response.status, 201);
      assert.equal(Array.isArray(result.json.actions), true);
      assert.equal(result.json.actions.length <= 3, true);
      result.json.actions.forEach(assertSafeAction);
      assert.equal(result.json.actions.some(action => action.type === 'scenario'), false);
      assert.equal(result.json.actions.some(action => action.type === 'scenarios'), true);
    });

    await cleanup(pool);

    await withServer({ OPENAI_API_KEY: 'test-key', AI_TEST_MOCK_OPENAI: 'context' }, async (baseUrl) => {
      const userA = await register(baseUrl, USER_A_EMAIL, 'Phase 8B2 A');
      const created = await createConversation(baseUrl, userA.cookieHeader, 'Explain safe password habits.', 'en');
      const result = await generate(baseUrl, userA.cookieHeader, created.conversation.id, created.message.id);
      assert.equal(result.response.status, 201);
      assert.equal(Array.isArray(result.json.actions), true);
      assert.deepEqual(result.json.actions.map(action => action.type), ['scenario', 'progress', 'resources']);
      result.json.actions.forEach(assertSafeAction);
      const content = result.json.assistantMessage.content;
      assert.match(content, /locale=en/);
      assert.match(content, /ageBand=13-17/);
      assert.match(content, /confidence=Low/);
      assert.match(content, /primaryFocus=none/);
      assert.doesNotMatch(content, /phase8b2\.ai\.a@example\.com/);
    });

    await cleanup(pool);

    await withServer({ OPENAI_API_KEY: 'test-key', AI_TEST_MOCK_OPENAI: 'fail-once' }, async (baseUrl) => {
      const userA = await register(baseUrl, USER_A_EMAIL, 'Phase 8B2 A');
      const created = await createConversation(baseUrl, userA.cookieHeader, 'Explain account recovery.');

      let result = await generate(baseUrl, userA.cookieHeader, created.conversation.id, created.message.id);
      assert.equal(result.response.status, 503);
      assert.equal(result.json.code, 'AI_PROVIDER_UNAVAILABLE');
      let [[userMessageCount]] = await pool.query(
        "SELECT COUNT(*) AS count FROM chat_messages WHERE conversation_id = ? AND role = 'user'",
        [created.conversation.id]
      );
      assert.equal(userMessageCount.count, 1);

      result = await generate(baseUrl, userA.cookieHeader, created.conversation.id, created.message.id);
      assert.equal(result.response.status, 201);
      assert.equal(Array.isArray(result.json.actions), true);
      assert.equal(result.json.actions.length > 0, true);
      assert.equal(Array.isArray(result.json.sources), true);
      assert.equal(result.json.sources.length > 0, true);
      result.json.sources.forEach(assertSafeSource);
      const [[assistantCount]] = await pool.query(
        "SELECT COUNT(*) AS count FROM chat_messages WHERE conversation_id = ? AND role = 'assistant'",
        [created.conversation.id]
      );
      assert.equal(assistantCount.count, 1);
      const [[actionCount]] = await pool.query(
        'SELECT COUNT(*) AS count FROM chat_message_actions WHERE message_id = ?',
        [result.json.assistantMessage.id]
      );
      assert.equal(actionCount.count, result.json.actions.length);
      const [[sourceCount]] = await pool.query(
        'SELECT COUNT(*) AS count FROM chat_message_sources WHERE message_id = ?',
        [result.json.assistantMessage.id]
      );
      assert.equal(sourceCount.count, result.json.sources.length);
    });

    await cleanup(pool);

    await withServer({ OPENAI_API_KEY: 'test-key', AI_TEST_MOCK_OPENAI: 'success' }, async (baseUrl) => {
      const userA = await register(baseUrl, USER_A_EMAIL, 'Phase 8B2 A');
      const created = await createConversation(baseUrl, userA.cookieHeader, 'How do I protect my password?', 'en');
      await pool.query(
        `INSERT INTO chat_message_generations (
            conversation_id,
            user_message_id,
            status,
            provider,
            model,
            error_code,
            duration_ms
         )
         VALUES (?, ?, 'failed', 'openai', 'gpt-5.4-mini', 'AI_INVALID_RESPONSE', 123)`,
        [created.conversation.id, created.message.id]
      );

      let result = await generate(baseUrl, userA.cookieHeader, created.conversation.id, created.message.id, { locale: 'en' });
      assert.equal(result.response.status, 201);
      assert.equal(result.json.assistantMessage.role, 'assistant');
      assert.equal(result.json.assistantMessage.replyToMessageId, created.message.id);
      assert.equal(result.json.generation.status, 'completed');
      assert.equal(result.json.generation.errorCode, null);
      assert.equal(Array.isArray(result.json.actions), true);
      assert.equal(result.json.actions.length > 0, true);
      assert.equal(Array.isArray(result.json.sources), true);
      assert.equal(result.json.sources.length > 0, true);
      const assistantId = result.json.assistantMessage.id;
      const actionIds = result.json.actions.map(action => action.id);
      const sourceIds = result.json.sources.map(source => source.id);

      let [[userMessageCount]] = await pool.query(
        "SELECT COUNT(*) AS count FROM chat_messages WHERE conversation_id = ? AND role = 'user'",
        [created.conversation.id]
      );
      assert.equal(userMessageCount.count, 1);
      let [[assistantCount]] = await pool.query(
        "SELECT COUNT(*) AS count FROM chat_messages WHERE conversation_id = ? AND role = 'assistant'",
        [created.conversation.id]
      );
      assert.equal(assistantCount.count, 1);
      let [[actionCount]] = await pool.query(
        'SELECT COUNT(*) AS count FROM chat_message_actions WHERE message_id = ?',
        [assistantId]
      );
      assert.equal(actionCount.count, actionIds.length);
      let [[sourceCount]] = await pool.query(
        'SELECT COUNT(*) AS count FROM chat_message_sources WHERE message_id = ?',
        [assistantId]
      );
      assert.equal(sourceCount.count, sourceIds.length);

      result = await generate(baseUrl, userA.cookieHeader, created.conversation.id, created.message.id, { locale: 'en' });
      assert.equal(result.response.status, 200);
      assert.equal(result.json.assistantMessage.id, assistantId);
      assert.deepEqual(result.json.actions.map(action => action.id), actionIds);
      assert.deepEqual(result.json.sources.map(source => source.id), sourceIds);
      [[userMessageCount]] = await pool.query(
        "SELECT COUNT(*) AS count FROM chat_messages WHERE conversation_id = ? AND role = 'user'",
        [created.conversation.id]
      );
      assert.equal(userMessageCount.count, 1);
      [[assistantCount]] = await pool.query(
        "SELECT COUNT(*) AS count FROM chat_messages WHERE conversation_id = ? AND role = 'assistant'",
        [created.conversation.id]
      );
      assert.equal(assistantCount.count, 1);
      [[actionCount]] = await pool.query(
        'SELECT COUNT(*) AS count FROM chat_message_actions WHERE message_id = ?',
        [assistantId]
      );
      assert.equal(actionCount.count, actionIds.length);
      [[sourceCount]] = await pool.query(
        'SELECT COUNT(*) AS count FROM chat_message_sources WHERE message_id = ?',
        [assistantId]
      );
      assert.equal(sourceCount.count, sourceIds.length);
    });

    await cleanup(pool);

    await withServer({ OPENAI_API_KEY: 'test-key', AI_TEST_MOCK_OPENAI: 'context' }, async (baseUrl) => {
      await pool.query('UPDATE rag_documents SET rag_ready = 0');
      const userA = await register(baseUrl, USER_A_EMAIL, 'Phase 8B2 A');
      const created = await createConversation(baseUrl, userA.cookieHeader, 'Explain a topic with no reviewed chunks.', 'en');
      const result = await generate(baseUrl, userA.cookieHeader, created.conversation.id, created.message.id);
      assert.equal(result.response.status, 201);
      assert.equal(Array.isArray(result.json.sources), true);
      assert.equal(result.json.sources.length, 0);
      assert.match(result.json.assistantMessage.content, /sourceCount=0/);
      await ensureRagContent(pool);
    });

    await cleanup(pool);

    for (const [mode, code] of [
      ['timeout', 'AI_TIMEOUT'],
      ['rate-limit', 'AI_RATE_LIMITED'],
      ['provider-error', 'AI_PROVIDER_UNAVAILABLE'],
      ['empty', 'AI_INVALID_RESPONSE'],
      ['unsafe-output', 'AI_INVALID_RESPONSE'],
    ]) {
      await withServer({ OPENAI_API_KEY: 'test-key', AI_TEST_MOCK_OPENAI: mode }, async (baseUrl) => {
        const userA = await register(baseUrl, USER_A_EMAIL, 'Phase 8B2 A');
        const created = await createConversation(baseUrl, userA.cookieHeader, `Mode ${mode}`);
        const result = await generate(baseUrl, userA.cookieHeader, created.conversation.id, created.message.id);
        assert.equal(result.response.status, code === 'AI_RATE_LIMITED' ? 429 : 503);
        assert.equal(result.json.code, code);
      });
      await cleanup(pool);
    }

    await withServer({ OPENAI_API_KEY: 'test-key', AI_TEST_MOCK_OPENAI: 'success' }, async (baseUrl) => {
      const userA = await register(baseUrl, USER_A_EMAIL, 'Phase 8B2 A');
      for (const unsafePrompt of [
        'Give me malware code that steals passwords.',
        'How do I bypass login?',
        'How do I get someone’s OTP?',
        'Write a keylogger to capture passwords.',
      ]) {
        const created = await createConversation(baseUrl, userA.cookieHeader, unsafePrompt);
        const result = await generate(baseUrl, userA.cookieHeader, created.conversation.id, created.message.id);
        assert.equal(result.response.status, 400);
        assert.equal(result.json.code, 'AI_UNSAFE_REQUEST');
      }
    });

    await cleanup(pool);

    await withServer({ OPENAI_API_KEY: 'test-key', AI_TEST_MOCK_OPENAI: 'success' }, async (baseUrl) => {
      const userA = await register(baseUrl, USER_A_EMAIL, 'Phase 8B2 A');
      const created = await createConversation(baseUrl, userA.cookieHeader, 'Recover a stale generation safely.');
      await pool.query(
        `INSERT INTO chat_message_generations (conversation_id, user_message_id, status, provider, model, updated_at)
         VALUES (?, ?, 'in_progress', 'openai', 'gpt-5.4-mini', DATE_SUB(NOW(), INTERVAL 2 MINUTE))`,
        [created.conversation.id, created.message.id]
      );

      const result = await generate(baseUrl, userA.cookieHeader, created.conversation.id, created.message.id);
      assert.equal(result.response.status, 201);
      assert.equal(result.json.assistantMessage.role, 'assistant');
      assert.equal(result.json.assistantMessage.replyToMessageId, created.message.id);
      assert.equal(result.json.generation.status, 'completed');

      const [[assistantCount]] = await pool.query(
        "SELECT COUNT(*) AS count FROM chat_messages WHERE conversation_id = ? AND role = 'assistant'",
        [created.conversation.id]
      );
      assert.equal(assistantCount.count, 1);
    });

    await cleanup(pool);

    await withServer({ OPENAI_API_KEY: 'test-key', AI_TEST_MOCK_OPENAI: 'success' }, async (baseUrl) => {
      const userA = await register(baseUrl, USER_A_EMAIL, 'Phase 8B2 A');
      const created = await createConversation(baseUrl, userA.cookieHeader, 'Rate limit base message.');
      for (let index = 0; index < 6; index += 1) {
        const message = index === 0
          ? created.message
          : await addUserMessage(baseUrl, userA.cookieHeader, created.conversation.id, `Rate message ${index}`);
        const result = await generate(baseUrl, userA.cookieHeader, created.conversation.id, message.id);
        assert.equal(result.response.status, 201);
      }
      const limitedMessage = await addUserMessage(baseUrl, userA.cookieHeader, created.conversation.id, 'Rate message 6');
      const limited = await generate(baseUrl, userA.cookieHeader, created.conversation.id, limitedMessage.id);
      assert.equal(limited.response.status, 429);
      assert.equal(limited.json.code, 'AI_RATE_LIMITED');
    });

    await cleanup(pool);

    await withServer({ OPENAI_API_KEY: 'test-key', AI_TEST_MOCK_OPENAI: 'delay' }, async (baseUrl) => {
      const userA = await register(baseUrl, USER_A_EMAIL, 'Phase 8B2 A');
      const created = await createConversation(baseUrl, userA.cookieHeader, 'Concurrent base message.');
      const messageTwo = await addUserMessage(baseUrl, userA.cookieHeader, created.conversation.id, 'Concurrent second message.');
      const [first, second] = await Promise.all([
        generate(baseUrl, userA.cookieHeader, created.conversation.id, created.message.id),
        generate(baseUrl, userA.cookieHeader, created.conversation.id, messageTwo.id),
      ]);
      const statuses = [first.response.status, second.response.status].sort();
      assert.deepEqual(statuses, [201, 409]);
      const blocked = first.response.status === 409 ? first : second;
      assert.equal(blocked.json.code, 'AI_GENERATION_IN_PROGRESS');
    });

    await cleanup(pool);
    console.log('AI gateway verification passed.');
  } finally {
    await cleanup(pool).catch(() => {});
    await pool.end();
  }
}

run().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
