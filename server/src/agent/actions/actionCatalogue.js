const { actionError } = require('./actionErrors');

function safeDate(value) {
  return value ? new Date(value).toISOString() : null;
}

function normalizeRowId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function findActiveLearner(pool, userId) {
  const [rows] = await pool.query(
    `SELECT id, role, account_status
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function assertLearnerContext(pool, context) {
  const user = await findActiveLearner(pool, context.userId);
  if (!user || user.account_status !== 'active') {
    throw actionError(403, 'ACTION_OWNERSHIP_DENIED', 'Learner action is not available.');
  }
  if (user.role !== 'user' || context.role !== 'user') {
    throw actionError(403, 'ACTION_OWNERSHIP_DENIED', 'Learner action is not available.');
  }
  return user;
}

async function findPublishedResource(pool, parameters, locale) {
  const clauses = ["ra.status = 'published'"];
  const values = [locale];
  if (parameters.resourceId) {
    clauses.push('ra.id = ?');
    values.push(parameters.resourceId);
  } else {
    clauses.push('ra.slug = ?');
    values.push(parameters.resourceSlug);
  }
  const [rows] = await pool.query(
    `SELECT ra.id,
            ra.slug,
            COALESCE(requested.title, english.title) AS title
     FROM resource_articles ra
     LEFT JOIN resource_article_translations requested
       ON requested.resource_id = ra.id AND requested.locale = ?
     JOIN resource_article_translations english
       ON english.resource_id = ra.id AND english.locale = 'en'
     WHERE ${clauses.join(' AND ')}
     LIMIT 1`,
    values
  );
  return rows[0] || null;
}

async function findPublishedScenario(pool, parameters, locale) {
  const clauses = ["sd.status = 'published'"];
  const values = [locale];
  if (parameters.scenarioId) {
    clauses.push('sd.id = ?');
    values.push(parameters.scenarioId);
  } else {
    clauses.push('sd.slug = ?');
    values.push(parameters.scenarioSlug);
  }
  const [rows] = await pool.query(
    `SELECT sd.id,
            sd.slug,
            sd.topic_code,
            sd.difficulty,
            COALESCE(requested.title, english.title, sd.title) AS title
     FROM scenario_definitions sd
     LEFT JOIN scenario_definition_translations requested
       ON requested.scenario_id = sd.id AND requested.locale = ?
     LEFT JOIN scenario_definition_translations english
       ON english.scenario_id = sd.id AND english.locale = 'en'
     WHERE ${clauses.join(' AND ')}
     ORDER BY sd.version DESC
     LIMIT 1`,
    values
  );
  return rows[0] || null;
}

async function findOwnedRecommendation(pool, userId, recommendationId) {
  const [rows] = await pool.query(
    `SELECT id,
            user_id,
            recommendation_type,
            topic_code,
            recommended_level,
            reason_code,
            reason_text,
            status,
            viewed_at,
            completed_at
     FROM learner_recommendations
     WHERE id = ? AND user_id = ?
     LIMIT 1`,
    [recommendationId, userId]
  );
  return rows[0] || null;
}

function recommendationTarget(row) {
  return {
    type: 'recommendation',
    id: Number(row.id),
    label: row.topic_code || row.reason_code || 'Current recommendation',
  };
}

function mapRecommendationResult(row) {
  return {
    recommendation: {
      id: Number(row.id),
      status: row.status,
      topicCode: row.topic_code,
      recommendedLevel: row.recommended_level,
      viewedAt: safeDate(row.viewed_at),
      completedAt: safeDate(row.completed_at),
    },
  };
}

function createPreview({ actionType, title, explanation, consequence, mode, riskLevel, target, parameters, requiresConfirmation }) {
  return {
    actionType,
    title,
    explanation,
    consequence,
    mode,
    riskLevel,
    target,
    parameters,
    requiresConfirmation,
  };
}

function createActionCatalogue(pool) {
  const catalogue = {
    open_resource: {
      type: 'open_resource',
      mode: 'navigation',
      riskLevel: 'minimal',
      requiresConfirmation: false,
      expirySeconds: 300,
      async previewBuilder({ parameters, locale }) {
        const resource = await findPublishedResource(pool, parameters, locale);
        if (!resource) throw actionError(404, 'ACTION_TARGET_UNAVAILABLE', 'Resource is no longer available.');
        return createPreview({
          actionType: 'open_resource',
          title: 'Open resource',
          explanation: `Open "${resource.title}".`,
          consequence: 'This opens the resource. Nothing changes in your account.',
          mode: 'navigation',
          riskLevel: 'minimal',
          target: { type: 'resource', id: Number(resource.id), label: resource.title },
          parameters: { resourceId: Number(resource.id), resourceSlug: resource.slug },
          requiresConfirmation: false,
        });
      },
      async handler({ parameters, locale }) {
        const resource = await findPublishedResource(pool, parameters, locale);
        if (!resource) throw actionError(404, 'ACTION_TARGET_UNAVAILABLE', 'Resource is no longer available.');
        return {
          actionType: 'open_resource',
          target: { page: 'resources', resourceId: Number(resource.id), resourceSlug: resource.slug },
          message: 'Resource is ready to open.',
        };
      },
    },
    open_scenario: {
      type: 'open_scenario',
      mode: 'navigation',
      riskLevel: 'minimal',
      requiresConfirmation: false,
      expirySeconds: 300,
      async previewBuilder({ parameters, locale }) {
        const scenario = await findPublishedScenario(pool, parameters, locale);
        if (!scenario) throw actionError(404, 'ACTION_TARGET_UNAVAILABLE', 'Scenario is no longer available.');
        return createPreview({
          actionType: 'open_scenario',
          title: 'View scenario',
          explanation: `Open "${scenario.title}".`,
          consequence: 'This opens the scenario introduction. It does not start an attempt.',
          mode: 'navigation',
          riskLevel: 'minimal',
          target: { type: 'scenario', id: Number(scenario.id), label: scenario.title },
          parameters: { scenarioId: Number(scenario.id), scenarioSlug: scenario.slug },
          requiresConfirmation: false,
        });
      },
      async handler({ parameters, locale }) {
        const scenario = await findPublishedScenario(pool, parameters, locale);
        if (!scenario) throw actionError(404, 'ACTION_TARGET_UNAVAILABLE', 'Scenario is no longer available.');
        return {
          actionType: 'open_scenario',
          target: { page: 'scenarios', scenarioId: Number(scenario.id), scenarioSlug: scenario.slug },
          message: 'Scenario is ready to view.',
        };
      },
    },
    open_recommendation: {
      type: 'open_recommendation',
      mode: 'navigation',
      riskLevel: 'minimal',
      requiresConfirmation: false,
      expirySeconds: 300,
      async previewBuilder({ context, parameters }) {
        const recommendation = await findOwnedRecommendation(pool, context.userId, parameters.recommendationId);
        if (!recommendation) throw actionError(404, 'ACTION_OWNERSHIP_DENIED', 'Recommendation is not available.');
        return createPreview({
          actionType: 'open_recommendation',
          title: 'View recommendation',
          explanation: 'Open your current recommendation area.',
          consequence: 'This opens Progress. It does not mark the recommendation as viewed.',
          mode: 'navigation',
          riskLevel: 'minimal',
          target: recommendationTarget(recommendation),
          parameters: { recommendationId: Number(recommendation.id) },
          requiresConfirmation: false,
        });
      },
      async handler({ context, parameters }) {
        const recommendation = await findOwnedRecommendation(pool, context.userId, parameters.recommendationId);
        if (!recommendation) throw actionError(404, 'ACTION_OWNERSHIP_DENIED', 'Recommendation is not available.');
        return {
          actionType: 'open_recommendation',
          target: { page: 'progress', sectionId: 'progress-recommendation' },
          message: 'Recommendation is ready to view.',
        };
      },
    },
    mark_recommendation_viewed: {
      type: 'mark_recommendation_viewed',
      mode: 'learner_write',
      riskLevel: 'low',
      requiresConfirmation: true,
      expirySeconds: 180,
      async previewBuilder({ context, parameters }) {
        const recommendation = await findOwnedRecommendation(pool, context.userId, parameters.recommendationId);
        if (!recommendation || !['active', 'viewed'].includes(recommendation.status)) {
          throw actionError(404, 'ACTION_TARGET_UNAVAILABLE', 'Recommendation is not available for this action.');
        }
        return createPreview({
          actionType: 'mark_recommendation_viewed',
          title: 'Mark recommendation as viewed',
          explanation: 'Record that you have viewed this recommendation.',
          consequence: 'This updates recommendation status only. It does not change your score, mastery or progress.',
          mode: 'learner_write',
          riskLevel: 'low',
          target: recommendationTarget(recommendation),
          parameters: { recommendationId: Number(recommendation.id) },
          requiresConfirmation: true,
        });
      },
      async handler({ context, parameters }) {
        const recommendation = await findOwnedRecommendation(pool, context.userId, parameters.recommendationId);
        if (!recommendation || !['active', 'viewed'].includes(recommendation.status)) {
          throw actionError(404, 'ACTION_TARGET_UNAVAILABLE', 'Recommendation is not available for this action.');
        }
        await pool.query(
          `UPDATE learner_recommendations
           SET status = CASE WHEN status = 'active' THEN 'viewed' ELSE status END,
               viewed_at = COALESCE(viewed_at, CURRENT_TIMESTAMP)
           WHERE id = ? AND user_id = ? AND status IN ('active', 'viewed')`,
          [parameters.recommendationId, context.userId]
        );
        const updated = await findOwnedRecommendation(pool, context.userId, parameters.recommendationId);
        return {
          actionType: 'mark_recommendation_viewed',
          ...mapRecommendationResult(updated),
          message: 'Recommendation was marked as viewed.',
        };
      },
    },
    mark_recommendation_completed: {
      type: 'mark_recommendation_completed',
      mode: 'learner_write',
      riskLevel: 'low',
      requiresConfirmation: true,
      expirySeconds: 180,
      async previewBuilder({ context, parameters }) {
        const recommendation = await findOwnedRecommendation(pool, context.userId, parameters.recommendationId);
        if (!recommendation || !['active', 'viewed', 'completed'].includes(recommendation.status)) {
          throw actionError(404, 'ACTION_TARGET_UNAVAILABLE', 'Recommendation is not available for this action.');
        }
        return createPreview({
          actionType: 'mark_recommendation_completed',
          title: 'Mark recommendation as completed',
          explanation: 'Record that you have completed this recommendation.',
          consequence: 'This updates recommendation status only. It does not change your score, mastery or progress.',
          mode: 'learner_write',
          riskLevel: 'low',
          target: recommendationTarget(recommendation),
          parameters: { recommendationId: Number(recommendation.id) },
          requiresConfirmation: true,
        });
      },
      async handler({ context, parameters }) {
        const recommendation = await findOwnedRecommendation(pool, context.userId, parameters.recommendationId);
        if (!recommendation || !['active', 'viewed', 'completed'].includes(recommendation.status)) {
          throw actionError(404, 'ACTION_TARGET_UNAVAILABLE', 'Recommendation is not available for this action.');
        }
        await pool.query(
          `UPDATE learner_recommendations
           SET status = 'completed',
               completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP),
               viewed_at = COALESCE(viewed_at, CURRENT_TIMESTAMP)
           WHERE id = ? AND user_id = ? AND status IN ('active', 'viewed', 'completed')`,
          [parameters.recommendationId, context.userId]
        );
        const updated = await findOwnedRecommendation(pool, context.userId, parameters.recommendationId);
        return {
          actionType: 'mark_recommendation_completed',
          ...mapRecommendationResult(updated),
          message: 'Recommendation was marked as completed.',
        };
      },
    },
  };

  async function preview(actionType, payload) {
    await assertLearnerContext(pool, payload.context);
    const definition = catalogue[actionType];
    if (!definition) throw actionError(400, 'ACTION_NOT_SUPPORTED', 'Action is not supported.');
    return definition.previewBuilder(payload);
  }

  async function execute(actionType, payload) {
    await assertLearnerContext(pool, payload.context);
    const definition = catalogue[actionType];
    if (!definition) throw actionError(400, 'ACTION_NOT_SUPPORTED', 'Action is not supported.');
    return definition.handler(payload);
  }

  function listSafeMetadata() {
    return Object.values(catalogue).map(definition => ({
      type: definition.type,
      mode: definition.mode,
      riskLevel: definition.riskLevel,
      requiresConfirmation: definition.requiresConfirmation,
      expirySeconds: definition.expirySeconds,
    }));
  }

  return {
    execute,
    listSafeMetadata,
    preview,
  };
}

module.exports = {
  createActionCatalogue,
  normalizeRowId,
};
