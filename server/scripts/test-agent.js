const assert = require('node:assert/strict');
const { createPool } = require('../src/database/pool');
const {
  detectRoutePlanningIntent,
  extractRoutePlanningInput,
} = require('../src/agent/agent.planning');
const { createAgentService } = require('../src/agent/agent.service');
const { createRagRepository } = require('../src/rag/rag.repository');
const { createRagService } = require('../src/rag/rag.service');

const USER_EMAIL = 'phase8d2.agent@example.com';

async function tableCount(pool, tableName) {
  const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM ${tableName}`);
  return Number(rows[0]?.count || 0);
}

async function cleanup(pool) {
  const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [USER_EMAIL]);
  await pool.query('DELETE FROM users WHERE email = ?', [USER_EMAIL]);
  return users.map(user => Number(user.id));
}

async function createUser(pool) {
  const [result] = await pool.query(
    `INSERT INTO users (email, username, display_name, password, password_hash, age, age_group, role, account_status)
     VALUES (?, 'Agent Test', 'Agent Test', 'not-used', 'not-used', 16, 'teen', 'user', 'active')`,
    [USER_EMAIL]
  );
  return result.insertId;
}

async function seedLearnerEvidence(pool, userId) {
  await pool.query(
    `INSERT INTO learner_profiles (
        user_id, ai_nickname, education_level, preferred_language, familiarity_level,
        help_topics, learning_style, onboarding_completed, onboarding_completed_at, profile_last_confirmed_at
     )
     VALUES (?, 'Private Nickname', 'form_3', 'english', 'beginner',
        JSON_ARRAY('avoiding_scams'), 'step_by_step', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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

  for (const topic of [
    ['phishing_and_scams', 1, 4, 25],
    ['password_and_account_security', 2, 4, 50],
    ['privacy_and_personal_information', 3, 4, 75],
    ['misinformation_and_deepfakes', 4, 4, 100],
  ]) {
    await pool.query(
      `INSERT INTO assessment_topic_scores (attempt_id, topic_code, correct_count, total_count, percentage)
       VALUES (?, ?, ?, ?, ?)`,
      [attempt.insertId, ...topic]
    );
  }

  for (const [topicCode, mastery] of [
    ['phishing_and_scams', 30],
    ['password_and_account_security', 50],
    ['privacy_and_personal_information', 75],
    ['misinformation_and_deepfakes', 100],
  ]) {
    await pool.query(
      `INSERT INTO learner_topic_progress (
          user_id, topic_code, current_level, mastery_percentage, source_type,
          source_reference_id, activity_count, last_activity_at
       )
       VALUES (?, ?, 'developing', ?, 'initial_assessment', ?, 1, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE mastery_percentage = VALUES(mastery_percentage)`,
      [userId, topicCode, mastery, attempt.insertId]
    );
  }

  await pool.query(
    `INSERT INTO learner_progress_summary (
        user_id, overall_mastery_percentage, measured_level, completed_topic_count,
        total_activity_count, last_progress_at
     )
     VALUES (?, 64, 'developing', 4, 4, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE overall_mastery_percentage = VALUES(overall_mastery_percentage)`,
    [userId]
  );

  await pool.query(
    `INSERT INTO learner_recommendations (
        user_id, recommendation_type, topic_code, recommended_level, reason_code,
        reason_text, source_type, source_reference_id, status
     )
     VALUES (?, 'review_topic', 'phishing_and_scams', 'developing', 'weak_topic',
       'A good topic to strengthen next is phishing and scams.', 'initial_assessment', ?, 'active')`,
    [userId, attempt.insertId]
  );

  const [[scenario]] = await pool.query(
    `SELECT id FROM scenario_definitions
     WHERE topic_code = 'phishing_and_scams' AND status = 'published'
     ORDER BY id
     LIMIT 1`
  );
  await pool.query(
    `INSERT INTO scenario_attempts (
        user_id, scenario_id, status, total_score, maximum_score, percentage,
        result_level, completed_at
     )
     VALUES (?, ?, 'completed', 80, 100, 80, 'proficient', CURRENT_TIMESTAMP)`,
    [userId, scenario.id]
  );

  for (const topicCode of ['password_and_account_security', 'privacy_and_personal_information']) {
    const [[extraScenario]] = await pool.query(
      `SELECT id FROM scenario_definitions
       WHERE topic_code = ? AND status = 'published'
       ORDER BY id
       LIMIT 1`,
      [topicCode]
    );
    if (!extraScenario) continue;
    await pool.query(
      `INSERT INTO scenario_attempts (
          user_id, scenario_id, status, total_score, maximum_score, percentage,
          result_level, completed_at
       )
       VALUES (?, ?, 'completed', 70, 100, 70, 'developing', CURRENT_TIMESTAMP)`,
      [userId, extraScenario.id]
    );
  }
}

function stringify(value) {
  return JSON.stringify(value);
}

function assertSafeOutput(value) {
  const text = stringify(value);
  for (const forbidden of [
    'password_hash',
    USER_EMAIL,
    'Private Nickname',
    'selected_option_key',
    'selectedOptionKey',
    'session',
    'OPENAI_API_KEY',
    'providerRequestId',
    'systemPrompt',
    'execute_sql',
    'SELECT ',
  ]) {
    assert.equal(text.includes(forbidden), false, `Output leaked forbidden value: ${forbidden}`);
  }
}

function assertInternalTarget(target, page) {
  assert.ok(target);
  assert.equal(target.page, page);
  assert.equal(Object.hasOwn(target, 'route'), false);
  assert.equal(Object.hasOwn(target, 'url'), false);
  assert.equal(Object.hasOwn(target, 'href'), false);
}

async function run() {
  const pool = createPool();
  const ragService = createRagService(createRagRepository(pool));
  const service = createAgentService({ pool, ragService });

  try {
    for (const prompt of [
      'Give me a 15-minute phishing practice plan.',
      'Can you make me a study plan for phishing?',
      'What steps should I follow to improve password safety?',
      'Help me learn scams in 10 minutes.',
      'I want a learning route for privacy.',
      'Plan my next cybersecurity study session.',
      '我想学习网络钓鱼，帮我安排步骤。',
      '给我一个15分钟的网络安全学习计划。',
      'Saya mahu pelan belajar phishing selama 15 minit.',
    ]) {
      assert.equal(detectRoutePlanningIntent(prompt), true, prompt);
    }
    for (const prompt of [
      'What is phishing?',
      'What is a strong password?',
      'How do I protect my password?',
      'What should I learn next?',
      'How can I steal someone’s password?',
    ]) {
      assert.equal(detectRoutePlanningIntent(prompt), false, prompt);
    }
    assert.deepEqual(extractRoutePlanningInput('Give me a 10-minute phishing practice plan.'), {
      goal: 'Give me a 10-minute phishing practice plan.',
      topicCode: 'phishing_and_scams',
      timeBudgetMinutes: 10,
    });
    assert.deepEqual(extractRoutePlanningInput('What steps should I follow to improve password safety?'), {
      goal: 'What steps should I follow to improve password safety?',
      topicCode: 'password_and_account_security',
      timeBudgetMinutes: 15,
    });
    assert.deepEqual(extractRoutePlanningInput('I want a 20 minute route for privacy.'), {
      goal: 'I want a 20 minute route for privacy.',
      topicCode: 'privacy_and_personal_information',
      timeBudgetMinutes: 20,
    });

    await cleanup(pool);
    await ragService.ingestPublishedResources();
    const userId = await createUser(pool);
    await seedLearnerEvidence(pool, userId);

    const metadata = service.listTools();
    const names = metadata.map(tool => tool.name).sort();
    assert.deepEqual(names, [
      'build_learning_route',
      'get_completed_scenarios',
      'get_current_recommendation',
      'get_learner_context',
      'get_related_scenarios',
      'search_learning_resources',
    ]);
    metadata.forEach(tool => {
      assert.equal(tool.readOnly, true);
      assert.equal(Object.hasOwn(tool, 'implementation'), false);
    });

    await assert.rejects(
      service.executeTool({ toolName: 'not_a_tool', input: {}, userId, locale: 'en' }),
      /Unknown agent tool/
    );
    for (const toolName of ['execute_sql', 'read_api_keys', 'modify_assessment_score']) {
      await assert.rejects(
        service.executeTool({ toolName, input: {}, userId, locale: 'en' }),
        /prohibited/
      );
    }
    await assert.rejects(
      service.executeTool({ toolName: 'search_learning_resources', input: { query: '   ' }, userId, locale: 'en' }),
      /query is required/
    );
    await assert.rejects(
      service.executeTool({ toolName: 'get_learner_context', input: { userId: 999 }, userId, locale: 'en' }),
      /userId is not accepted/
    );

    let result = await service.executeTool({
      toolName: 'get_learner_context',
      input: { locale: 'en' },
      userId,
      locale: 'en',
    });
    assert.equal(result.toolName, 'get_learner_context');
    assert.equal(result.output.ageBand, '13-17');
    assert.equal(result.output.learnerLevel.code, 'L3');
    assert.equal(result.output.learnerLevel.confidence, 'Medium');
    assert.equal(result.output.primaryFocus.topicCode, 'phishing_and_scams');
    assert.equal(result.output.currentRecommendation.topicCode, 'phishing_and_scams');
    assertSafeOutput(result.output);

    result = await service.executeTool({
      toolName: 'get_current_recommendation',
      input: { locale: 'ms' },
      userId,
      locale: 'ms',
    });
    assert.equal(result.output.topicCode, 'phishing_and_scams');
    assertInternalTarget(result.output.internalTarget, 'progress');
    assertSafeOutput(result.output);

    result = await service.executeTool({
      toolName: 'search_learning_resources',
      input: { query: 'online scam fraud money', locale: 'en', limit: 3 },
      userId,
      locale: 'en',
    });
    assert.equal(result.output.items.length > 0, true);
    assert.equal(result.output.items.length <= 3, true);
    result.output.items.forEach(item => {
      assertInternalTarget(item.internalTarget, 'resources');
      assert.equal(Object.hasOwn(item, 'sourceUrl'), false);
    });
    assertSafeOutput(result.output);

    result = await service.executeTool({
      toolName: 'get_related_scenarios',
      input: { topicCode: 'phishing_and_scams', locale: 'en', excludeCompleted: true, limit: 3 },
      userId,
      locale: 'en',
    });
    assert.equal(result.output.items.length > 0, true);
    assert.equal(result.output.items.every(item => item.completed === false), true);
    result.output.items.forEach(item => assertInternalTarget(item.internalTarget, 'scenarios'));
    assertSafeOutput(result.output);

    result = await service.executeTool({
      toolName: 'get_completed_scenarios',
      input: { topicCode: 'phishing_and_scams', locale: 'zh-CN' },
      userId,
      locale: 'zh-CN',
    });
    assert.equal(result.output.completedCount > 0, true);
    assert.equal(Array.isArray(result.output.items), true);
    assert.equal(Object.hasOwn(result.output, 'decisions'), false);
    assertSafeOutput(result.output);

    const beforeCounts = {
      users: await tableCount(pool, 'users'),
      attempts: await tableCount(pool, 'scenario_attempts'),
      decisions: await tableCount(pool, 'scenario_decisions'),
      recommendations: await tableCount(pool, 'learner_recommendations'),
      messages: await tableCount(pool, 'chat_messages'),
    };

    result = await service.executeTool({
      toolName: 'build_learning_route',
      input: {
        goal: 'Help me learn phishing in 15 minutes',
        topicCode: 'phishing_and_scams',
        timeBudgetMinutes: 15,
        locale: 'en',
      },
      userId,
      locale: 'en',
    });
    assert.equal(result.output.steps.length >= 2, true);
    assert.equal(result.output.steps.length <= 4, true);
    assert.equal(result.output.requiresConfirmation, false);
    assert.equal(result.output.steps.some(step => step.type === 'progress'), true);
    result.output.steps.forEach(step => {
      assert.ok(['resource', 'scenario', 'progress', 'assessment'].includes(step.type));
      assertInternalTarget(step.internalTarget, step.type === 'resource' ? 'resources' : step.type === 'scenario' ? 'scenarios' : step.type);
    });
    const scenarioSteps = result.output.steps.filter(step => step.type === 'scenario');
    assert.equal(scenarioSteps.every(step => step.completed === false), true);
    assertSafeOutput(result.output);

    const afterCounts = {
      users: await tableCount(pool, 'users'),
      attempts: await tableCount(pool, 'scenario_attempts'),
      decisions: await tableCount(pool, 'scenario_decisions'),
      recommendations: await tableCount(pool, 'learner_recommendations'),
      messages: await tableCount(pool, 'chat_messages'),
    };
    assert.deepEqual(afterCounts, beforeCounts);

    for (const locale of ['en', 'ms', 'zh-CN']) {
      const route = await service.buildAgentLearningRoute({
        userId,
        goal: 'Prepare me for a short quiz',
        locale,
        timeBudgetMinutes: 10,
      });
      assert.equal(route.locale, locale);
      assert.equal(route.steps.length >= 2, true);
      assertSafeOutput(route);
    }

    console.log('Agent read-only tool registry verification passed.');
  } finally {
    await cleanup(pool).catch(() => {});
    await pool.end();
  }
}

run().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
