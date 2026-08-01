const TOPIC_CODES = new Set([
  'phishing_and_scams',
  'password_and_account_security',
  'privacy_and_personal_information',
  'misinformation_and_deepfakes',
]);

const DIFFICULTIES = new Set(['beginner', 'developing', 'intermediate', 'advanced']);
const STATUSES = new Set(['draft', 'published', 'archived']);
const SCORE_VALUES = new Set([0, 1, 2]);
const LOCALES = ['en', 'ms', 'zh-CN'];

function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}

function toBoolean(value) {
  return Number(value || 0) === 1;
}

function httpError(status, code, message, extra = {}) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  Object.assign(error, extra);
  return error;
}

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function normalizeText(value, maxLength) {
  const text = String(value || '').trim();
  return maxLength ? text.slice(0, maxLength) : text;
}

function parseOptions(value) {
  if (Array.isArray(value)) return value;
  return JSON.parse(value || '[]');
}

function mapScenarioRow(row, structuralValidation = null) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    topicCode: row.topic_code,
    difficulty: row.difficulty,
    version: row.version,
    status: row.status,
    estimatedMinutes: row.estimated_minutes,
    totalSteps: row.total_steps,
    stepCount: Number(row.step_count || 0),
    learnerAvailable: row.status === 'published',
    updatedAt: toIso(row.updated_at),
    createdAt: toIso(row.created_at),
    translationCoverage: row.translation_coverage ? String(row.translation_coverage).split(',').filter(Boolean) : [],
    structuralValidation,
  };
}

function mapOption(option) {
  return {
    key: String(option.key || '').trim(),
    text: String(option.text || ''),
    score: Number(option.score),
    outcomeCode: String(option.outcomeCode || ''),
    feedback: String(option.feedback || ''),
    safetyExplanation: String(option.safetyExplanation || ''),
    nextStepOrder: option.nextStepOrder === null || option.nextStepOrder === undefined ? null : Number(option.nextStepOrder),
  };
}

function mapStep(row, translations = [], optionTranslations = []) {
  const options = parseOptions(row.options_json).map(mapOption);
  return {
    id: row.id,
    stepOrder: Number(row.step_order),
    situationText: row.situation_text,
    promptText: row.prompt_text,
    options,
    translations,
    optionTranslations,
    updatedAt: toIso(row.updated_at),
  };
}

function validationResult(reasons = []) {
  return {
    valid: reasons.length === 0,
    reasons,
  };
}

function validateScenarioStructure(scenario, steps) {
  const reasons = [];
  if (!scenario?.title) reasons.push({ code: 'title_required', field: 'title' });
  if (!scenario?.summary) reasons.push({ code: 'summary_required', field: 'summary' });
  if (!TOPIC_CODES.has(scenario?.topic_code)) reasons.push({ code: 'topic_invalid', field: 'topicCode' });
  if (!DIFFICULTIES.has(scenario?.difficulty)) reasons.push({ code: 'difficulty_invalid', field: 'difficulty' });
  if (!Number.isInteger(Number(scenario?.estimated_minutes)) || Number(scenario.estimated_minutes) < 1) {
    reasons.push({ code: 'duration_invalid', field: 'estimatedMinutes' });
  }
  if (!Number.isInteger(Number(scenario?.total_steps)) || Number(scenario.total_steps) < 3 || Number(scenario.total_steps) > 5) {
    reasons.push({ code: 'total_steps_invalid', field: 'totalSteps' });
  }

  const expectedTotal = Number(scenario?.total_steps || 0);
  if (steps.length !== expectedTotal) {
    reasons.push({ code: 'step_count_mismatch', field: 'steps', expected: expectedTotal, actual: steps.length });
  }

  const orders = steps.map(step => Number(step.step_order));
  const uniqueOrders = new Set(orders);
  if (uniqueOrders.size !== orders.length) reasons.push({ code: 'duplicate_step_order', field: 'steps' });
  for (let order = 1; order <= expectedTotal; order += 1) {
    if (!uniqueOrders.has(order)) reasons.push({ code: 'missing_step_order', field: 'steps', order });
  }

  for (const step of steps) {
    if (!String(step.situation_text || '').trim()) reasons.push({ code: 'step_situation_required', field: `step:${step.step_order}:situationText` });
    if (!String(step.prompt_text || '').trim()) reasons.push({ code: 'step_prompt_required', field: `step:${step.step_order}:promptText` });
    let options = [];
    try {
      options = parseOptions(step.options_json).map(mapOption);
    } catch {
      reasons.push({ code: 'options_json_invalid', field: `step:${step.step_order}:options` });
      continue;
    }
    if (options.length !== 3) reasons.push({ code: 'choice_count_invalid', field: `step:${step.step_order}:options`, expected: 3, actual: options.length });
    const keys = new Set();
    let safestCount = 0;
    for (const option of options) {
      if (!option.key || option.key.length > 10) reasons.push({ code: 'choice_key_invalid', field: `step:${step.step_order}:optionKey` });
      if (keys.has(option.key)) reasons.push({ code: 'duplicate_choice_key', field: `step:${step.step_order}:optionKey`, key: option.key });
      keys.add(option.key);
      if (!option.text.trim()) reasons.push({ code: 'choice_text_required', field: `step:${step.step_order}:${option.key}:text` });
      if (!SCORE_VALUES.has(Number(option.score))) reasons.push({ code: 'choice_score_invalid', field: `step:${step.step_order}:${option.key}:score` });
      if (Number(option.score) === 2) safestCount += 1;
      if (!option.feedback.trim()) reasons.push({ code: 'choice_feedback_required', field: `step:${step.step_order}:${option.key}:feedback` });
      if (!option.safetyExplanation.trim()) reasons.push({ code: 'choice_safety_explanation_required', field: `step:${step.step_order}:${option.key}:safetyExplanation` });
      if (option.nextStepOrder !== null && (!Number.isInteger(option.nextStepOrder) || option.nextStepOrder < 1 || option.nextStepOrder > expectedTotal)) {
        reasons.push({ code: 'choice_next_step_invalid', field: `step:${step.step_order}:${option.key}:nextStepOrder` });
      }
    }
    if (safestCount !== 1) reasons.push({ code: 'safest_choice_count_invalid', field: `step:${step.step_order}:options`, expected: 1, actual: safestCount });
  }

  return validationResult(reasons);
}

async function fetchScenarioBase(poolOrConnection, scenarioId, lock = false) {
  const [rows] = await poolOrConnection.query(
    `SELECT *
     FROM scenario_definitions
     WHERE id = ?
     LIMIT 1
     ${lock ? 'FOR UPDATE' : ''}`,
    [scenarioId]
  );
  return rows[0] || null;
}

async function fetchScenarioSteps(poolOrConnection, scenarioId) {
  const [rows] = await poolOrConnection.query(
    `SELECT *
     FROM scenario_steps
     WHERE scenario_id = ?
     ORDER BY step_order`,
    [scenarioId]
  );
  return rows;
}

async function fetchDefinitionTranslations(poolOrConnection, scenarioId) {
  const [rows] = await poolOrConnection.query(
    `SELECT locale, title, summary
     FROM scenario_definition_translations
     WHERE scenario_id = ?
     ORDER BY FIELD(locale, 'en', 'ms', 'zh-CN'), locale`,
    [scenarioId]
  );
  return rows;
}

async function fetchStepTranslations(poolOrConnection, stepIds) {
  if (!stepIds.length) return new Map();
  const [rows] = await poolOrConnection.query(
    `SELECT step_id, locale, situation_text, prompt_text
     FROM scenario_step_translations
     WHERE step_id IN (?)
     ORDER BY step_id, FIELD(locale, 'en', 'ms', 'zh-CN'), locale`,
    [stepIds]
  );
  const byStep = new Map();
  for (const row of rows) {
    const list = byStep.get(Number(row.step_id)) || [];
    list.push({
      locale: row.locale,
      situationText: row.situation_text,
      promptText: row.prompt_text,
    });
    byStep.set(Number(row.step_id), list);
  }
  return byStep;
}

async function fetchOptionTranslations(poolOrConnection, stepIds) {
  if (!stepIds.length) return new Map();
  const [rows] = await poolOrConnection.query(
    `SELECT step_id, option_key, locale, text, feedback, safety_explanation
     FROM scenario_option_translations
     WHERE step_id IN (?)
     ORDER BY step_id, option_key, FIELD(locale, 'en', 'ms', 'zh-CN'), locale`,
    [stepIds]
  );
  const byStep = new Map();
  for (const row of rows) {
    const list = byStep.get(Number(row.step_id)) || [];
    list.push({
      optionKey: row.option_key,
      locale: row.locale,
      text: row.text,
      feedback: row.feedback,
      safetyExplanation: row.safety_explanation,
    });
    byStep.set(Number(row.step_id), list);
  }
  return byStep;
}

async function countAttempts(poolOrConnection, scenarioId) {
  const [[row]] = await poolOrConnection.query(
    `SELECT COUNT(*) AS count
     FROM scenario_attempts
     WHERE scenario_id = ?`,
    [scenarioId]
  );
  return Number(row?.count || 0);
}

async function countCompletedAttempts(poolOrConnection, scenarioId) {
  const [[row]] = await poolOrConnection.query(
    `SELECT COUNT(*) AS count
     FROM scenario_attempts
     WHERE scenario_id = ? AND status = 'completed'`,
    [scenarioId]
  );
  return Number(row?.count || 0);
}

async function countScenarioDecisions(poolOrConnection, scenarioId) {
  const [[row]] = await poolOrConnection.query(
    `SELECT COUNT(sd.id) AS count
     FROM scenario_decisions sd
     JOIN scenario_attempts sa ON sa.id = sd.attempt_id
     WHERE sa.scenario_id = ?`,
    [scenarioId]
  );
  return Number(row?.count || 0);
}

async function countScenarioProgressReferences(poolOrConnection, scenarioId) {
  const [[row]] = await poolOrConnection.query(
    `SELECT COUNT(spe.id) AS count
     FROM scenario_progress_events spe
     JOIN scenario_attempts sa ON sa.id = spe.scenario_attempt_id
     WHERE sa.scenario_id = ?`,
    [scenarioId]
  );
  return Number(row?.count || 0);
}

async function countScenarioRagDocuments(poolOrConnection, scenarioId) {
  const [[row]] = await poolOrConnection.query(
    `SELECT COUNT(id) AS count
     FROM rag_documents
     WHERE scenario_id = ?`,
    [scenarioId]
  );
  return Number(row?.count || 0);
}

async function buildScenarioLifecycle(poolOrConnection, scenarioId, lock = false) {
  const scenario = await fetchScenarioBase(poolOrConnection, scenarioId, lock);
  if (!scenario) return null;
  const [steps, attempts, completedAttempts, decisions, progressReferences, ragDocuments] = await Promise.all([
    fetchScenarioSteps(poolOrConnection, scenarioId),
    countAttempts(poolOrConnection, scenarioId),
    countCompletedAttempts(poolOrConnection, scenarioId),
    countScenarioDecisions(poolOrConnection, scenarioId),
    countScenarioProgressReferences(poolOrConnection, scenarioId),
    countScenarioRagDocuments(poolOrConnection, scenarioId).catch(() => 0),
  ]);
  const choices = steps.reduce((total, step) => {
    try {
      return total + parseOptions(step.options_json).length;
    } catch {
      return total;
    }
  }, 0);
  const counts = {
    steps: steps.length,
    choices,
    attempts,
    completedAttempts,
    decisions,
    progressReferences,
    recommendationReferences: 0,
    ragDocuments,
  };
  const blockingReasons = [];
  if (scenario.status === 'published') {
    blockingReasons.push({ code: 'scenario_published', count: 1 });
  }
  if (scenario.first_published_at) {
    blockingReasons.push({ code: 'scenario_previously_published', count: 1 });
  }
  if (attempts > 0) blockingReasons.push({ code: 'attempts_exist', count: attempts });
  if (completedAttempts > 0) blockingReasons.push({ code: 'completed_attempts_exist', count: completedAttempts });
  if (decisions > 0) blockingReasons.push({ code: 'decisions_exist', count: decisions });
  if (progressReferences > 0) blockingReasons.push({ code: 'progress_references_exist', count: progressReferences });
  if (ragDocuments > 0) blockingReasons.push({ code: 'rag_documents_exist', count: ragDocuments });

  return {
    scenarioId: Number(scenario.id),
    slug: scenario.slug,
    title: scenario.title,
    status: scenario.status,
    firstPublishedAt: toIso(scenario.first_published_at),
    hasEverPublished: Boolean(scenario.first_published_at),
    canArchive: scenario.status !== 'archived',
    canRestore: scenario.status === 'archived',
    canPermanentlyDelete: blockingReasons.length === 0,
    counts,
    blockingReasons,
  };
}

async function buildScenarioDetail(poolOrConnection, scenarioId) {
  const scenario = await fetchScenarioBase(poolOrConnection, scenarioId);
  if (!scenario) return null;
  const [translations, steps, attemptCount] = await Promise.all([
    fetchDefinitionTranslations(poolOrConnection, scenarioId),
    fetchScenarioSteps(poolOrConnection, scenarioId),
    countAttempts(poolOrConnection, scenarioId),
  ]);
  const stepIds = steps.map(step => Number(step.id));
  const [stepTranslations, optionTranslations] = await Promise.all([
    fetchStepTranslations(poolOrConnection, stepIds),
    fetchOptionTranslations(poolOrConnection, stepIds),
  ]);
  const structuralValidation = validateScenarioStructure(scenario, steps);
  return {
    scenario: {
      ...mapScenarioRow({
        ...scenario,
        step_count: steps.length,
        translation_coverage: translations.map(item => item.locale).join(','),
      }, structuralValidation),
      translations: Object.fromEntries(translations.map(item => [item.locale, {
        locale: item.locale,
        title: item.title,
        summary: item.summary,
      }])),
      attemptCount,
      archiveEligible: scenario.status !== 'archived',
      restoreEligible: scenario.status === 'archived',
    },
    steps: steps.map(step => mapStep(
      step,
      stepTranslations.get(Number(step.id)) || [],
      optionTranslations.get(Number(step.id)) || []
    )),
  };
}

function validateCreatePayload(body = {}) {
  const rawSlug = body.slug === undefined || body.slug === null ? '' : String(body.slug).trim();
  const slug = rawSlug || normalizeSlug(body.title);
  const title = normalizeText(body.title, 160);
  const summary = normalizeText(body.summary, 500);
  const topicCode = String(body.topicCode || '').trim();
  const difficulty = String(body.difficulty || '').trim();
  const estimatedMinutes = Number(body.estimatedMinutes);
  const totalSteps = Number(body.totalSteps);
  const errors = {};
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || (rawSlug && rawSlug !== slug)) errors.slug = 'invalid';
  if (!title) errors.title = 'required';
  if (!summary) errors.summary = 'required';
  if (!TOPIC_CODES.has(topicCode)) errors.topicCode = 'invalid';
  if (!DIFFICULTIES.has(difficulty)) errors.difficulty = 'invalid';
  if (!Number.isInteger(estimatedMinutes) || estimatedMinutes < 1) errors.estimatedMinutes = 'invalid';
  if (!Number.isInteger(totalSteps) || totalSteps < 3 || totalSteps > 5) errors.totalSteps = 'invalid';
  if (Object.keys(errors).length) {
    throw httpError(400, 'ADMIN_SCENARIO_INVALID_CREATE', 'Scenario creation details are invalid.', { errors });
  }
  return { slug, title, summary, topicCode, difficulty, estimatedMinutes, totalSteps };
}

function validateMetadataPayload(body = {}) {
  const normalized = {};
  const errors = {};
  if (body.title !== undefined) {
    normalized.title = normalizeText(body.title, 160);
    if (!normalized.title) errors.title = 'required';
  }
  if (body.summary !== undefined) {
    normalized.summary = normalizeText(body.summary, 500);
    if (!normalized.summary) errors.summary = 'required';
  }
  if (body.topicCode !== undefined) {
    normalized.topicCode = String(body.topicCode || '').trim();
    if (!TOPIC_CODES.has(normalized.topicCode)) errors.topicCode = 'invalid';
  }
  if (body.difficulty !== undefined) {
    normalized.difficulty = String(body.difficulty || '').trim();
    if (!DIFFICULTIES.has(normalized.difficulty)) errors.difficulty = 'invalid';
  }
  if (body.estimatedMinutes !== undefined) {
    normalized.estimatedMinutes = Number(body.estimatedMinutes);
    if (!Number.isInteger(normalized.estimatedMinutes) || normalized.estimatedMinutes < 1) errors.estimatedMinutes = 'invalid';
  }
  if (body.totalSteps !== undefined) {
    normalized.totalSteps = Number(body.totalSteps);
    if (!Number.isInteger(normalized.totalSteps) || normalized.totalSteps < 3 || normalized.totalSteps > 5) errors.totalSteps = 'invalid';
  }
  if (body.expectedUpdatedAt !== undefined) normalized.expectedUpdatedAt = body.expectedUpdatedAt || null;
  if (body.translations && typeof body.translations === 'object') {
    normalized.translations = {};
    for (const locale of LOCALES) {
      if (!body.translations[locale]) continue;
      normalized.translations[locale] = {
        title: normalizeText(body.translations[locale].title, 160),
        summary: normalizeText(body.translations[locale].summary, 500),
      };
    }
  }
  if (Object.keys(errors).length) {
    throw httpError(400, 'ADMIN_SCENARIO_INVALID_METADATA', 'Scenario metadata is invalid.', { errors });
  }
  return normalized;
}

function validateStepsPayload(body = {}, currentScenario) {
  if (!Array.isArray(body.steps)) {
    throw httpError(400, 'ADMIN_SCENARIO_INVALID_STEPS', 'Scenario steps are required.', {
      errors: { steps: 'required' },
    });
  }
  const steps = body.steps.map((step, index) => {
    const stepOrder = Number(step.stepOrder || index + 1);
    const situationText = normalizeText(step.situationText, 900);
    const promptText = normalizeText(step.promptText, 500);
    const options = Array.isArray(step.options) ? step.options.map(mapOption) : [];
    return { stepOrder, situationText, promptText, options };
  });
  const synthetic = {
    ...currentScenario,
    total_steps: Number(body.totalSteps || currentScenario.total_steps),
  };
  const syntheticSteps = steps.map(step => ({
    step_order: step.stepOrder,
    situation_text: step.situationText,
    prompt_text: step.promptText,
    options_json: step.options,
  }));
  const validation = validateScenarioStructure(synthetic, syntheticSteps);
  if (!validation.valid) {
    throw httpError(400, 'ADMIN_SCENARIO_INVALID_STEPS', 'Scenario steps are invalid.', {
      errors: { steps: validation.reasons },
    });
  }
  return steps;
}

function validateTranslationPayload(body = {}) {
  const locale = String(body.locale || '').trim();
  const errors = {};
  if (!LOCALES.includes(locale)) errors.locale = 'invalid';
  const title = normalizeText(body.title, 160);
  const summary = normalizeText(body.summary, 500);
  if (!title) errors.title = 'required';
  if (!summary) errors.summary = 'required';
  const steps = Array.isArray(body.steps) ? body.steps.map((step, index) => {
    const stepOrder = Number(step.stepOrder || index + 1);
    const situationText = normalizeText(step.situationText, 900);
    const promptText = normalizeText(step.promptText, 500);
    if (!Number.isInteger(stepOrder) || stepOrder < 1 || stepOrder > 5) errors[`steps.${index}.stepOrder`] = 'invalid';
    if (!situationText) errors[`steps.${index}.situationText`] = 'required';
    if (!promptText) errors[`steps.${index}.promptText`] = 'required';
    const options = Array.isArray(step.options) ? step.options.map((option, optionIndex) => {
      const key = String(option.key || '').trim();
      const text = normalizeText(option.text);
      const feedback = normalizeText(option.feedback);
      const safetyExplanation = normalizeText(option.safetyExplanation);
      if (!key) errors[`steps.${index}.options.${optionIndex}.key`] = 'required';
      if (!text) errors[`steps.${index}.options.${optionIndex}.text`] = 'required';
      if (!feedback) errors[`steps.${index}.options.${optionIndex}.feedback`] = 'required';
      if (!safetyExplanation) errors[`steps.${index}.options.${optionIndex}.safetyExplanation`] = 'required';
      return { key, text, feedback, safetyExplanation };
    }) : [];
    return { stepOrder, situationText, promptText, options };
  }) : [];
  if (Object.keys(errors).length) {
    throw httpError(400, 'ADMIN_SCENARIO_INVALID_TRANSLATION', 'Scenario translation is invalid.', { errors });
  }
  return { locale, title, summary, steps };
}

async function upsertDefinitionTranslations(connection, scenarioId, translations = {}) {
  for (const [locale, translation] of Object.entries(translations)) {
    if (!LOCALES.includes(locale) || !translation.title || !translation.summary) continue;
    await connection.query(
      `INSERT INTO scenario_definition_translations (scenario_id, locale, title, summary)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title = VALUES(title), summary = VALUES(summary)`,
      [scenarioId, locale, translation.title, translation.summary]
    );
  }
}

async function upsertScenarioTranslation(connection, scenarioId, payload) {
  await upsertDefinitionTranslations(connection, scenarioId, {
    [payload.locale]: {
      title: payload.title,
      summary: payload.summary,
    },
  });
  if (!payload.steps.length) return;
  const steps = await fetchScenarioSteps(connection, scenarioId);
  const stepsByOrder = new Map(steps.map(step => [Number(step.step_order), step]));
  for (const translationStep of payload.steps) {
    const step = stepsByOrder.get(Number(translationStep.stepOrder));
    if (!step) continue;
    await connection.query(
      `INSERT INTO scenario_step_translations (step_id, locale, situation_text, prompt_text)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE situation_text = VALUES(situation_text), prompt_text = VALUES(prompt_text)`,
      [step.id, payload.locale, translationStep.situationText, translationStep.promptText]
    );
    const structuralOptions = parseOptions(step.options_json);
    const validKeys = new Set(structuralOptions.map(option => option.key));
    for (const option of translationStep.options) {
      if (!validKeys.has(option.key)) continue;
      await connection.query(
        `INSERT INTO scenario_option_translations (step_id, option_key, locale, text, feedback, safety_explanation)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE text = VALUES(text), feedback = VALUES(feedback), safety_explanation = VALUES(safety_explanation)`,
        [step.id, option.key, payload.locale, option.text, option.feedback, option.safetyExplanation]
      );
    }
  }
}

async function replaceSteps(connection, scenarioId, steps) {
  await connection.query('DELETE FROM scenario_steps WHERE scenario_id = ?', [scenarioId]);
  for (const step of steps) {
    const [result] = await connection.query(
      `INSERT INTO scenario_steps (scenario_id, step_order, situation_text, prompt_text, options_json)
       VALUES (?, ?, ?, ?, CAST(? AS JSON))`,
      [
        scenarioId,
        step.stepOrder,
        step.situationText,
        step.promptText,
        JSON.stringify(step.options),
      ]
    );
    const stepId = result.insertId;
    await connection.query(
      `INSERT INTO scenario_step_translations (step_id, locale, situation_text, prompt_text)
       VALUES (?, 'en', ?, ?)
       ON DUPLICATE KEY UPDATE situation_text = VALUES(situation_text), prompt_text = VALUES(prompt_text)`,
      [stepId, step.situationText, step.promptText]
    );
    for (const option of step.options) {
      await connection.query(
        `INSERT INTO scenario_option_translations (step_id, option_key, locale, text, feedback, safety_explanation)
         VALUES (?, ?, 'en', ?, ?, ?)
         ON DUPLICATE KEY UPDATE text = VALUES(text), feedback = VALUES(feedback), safety_explanation = VALUES(safety_explanation)`,
        [stepId, option.key, option.text, option.feedback, option.safetyExplanation]
      );
    }
  }
}

module.exports = {
  DIFFICULTIES,
  LOCALES,
  STATUSES,
  TOPIC_CODES,
  buildScenarioDetail,
  buildScenarioLifecycle,
  countAttempts,
  fetchScenarioBase,
  fetchScenarioSteps,
  httpError,
  mapScenarioRow,
  normalizeSlug,
  replaceSteps,
  upsertDefinitionTranslations,
  upsertScenarioTranslation,
  validateCreatePayload,
  validateMetadataPayload,
  validateTranslationPayload,
  validateScenarioStructure,
  validateStepsPayload,
};
