const { normalizeLocale } = require('../i18n/locale');
const { ADAPTIVE_TOPICS, SUMMARY_LIMITS } = require('./adaptiveLearning.constants');
const { buildAdaptiveContext } = require('./adaptiveLearning.rules');

const ADAPTIVE_REQUEST_PATTERNS = [
  /\b(what|which).{0,30}\b(study|learn|practice|practise|improve|weak|weakness|progress|next)\b/i,
  /\b(am i improving|support priorities|recommend.*scenario|recommend.*based on my progress|based on my progress|study today|practise today|practice today)\b/i,
  /\b(why).{0,40}\b(practise|practice|recommend|scenario|difficult)\b/i,
  /我.{0,16}(学习|學習|练习|練習|进步|進步|提高|改进|改進)|应该学|應該學|先学|先學/i,
  /(apa|topik|patut|belajar|latih|kemajuan|cadangkan|lemah).{0,40}(saya|seterusnya|hari ini|berdasarkan)/i,
];

const UNSAFE_ADAPTIVE_EXCLUSIONS = [
  /\b(steal|bypass|keylogger|malware|hack someone|password theft|get someone'?s otp)\b/i,
];

function adaptiveError(code, message, status = 401) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function shouldUseAdaptiveLearning(userMessage = '') {
  const text = String(userMessage || '').trim();
  if (!text) return false;
  if (UNSAFE_ADAPTIVE_EXCLUSIONS.some(pattern => pattern.test(text))) return false;
  return ADAPTIVE_REQUEST_PATTERNS.some(pattern => pattern.test(text));
}

function compactReasons(reasons = []) {
  return reasons.slice(0, 2).map(reason => reason.learnerExplanation || reason.code).join('; ');
}

function buildAdaptiveModelSummary(context) {
  if (!context) return null;
  const lines = [
    'Adaptive Learning Summary:',
    'This is deterministic advisory context from existing Cyberly learning records. It is not a diagnosis or a permanent capability label.',
    `Locale: ${context.locale}`,
    `Education level: ${context.educationLevel || 'not provided'}`,
    `Learning style: ${context.learningStyle || 'neutral default'}`,
    `Evidence quality: ${context.signalQuality?.overall || 'low'}`,
    `Data availability: assessment=${Boolean(context.signalQuality?.assessmentAvailable)}, progress=${Boolean(context.signalQuality?.progressAvailable)}, scenarios=${Boolean(context.signalQuality?.scenarioHistoryAvailable)}, recommendation=${Boolean(context.signalQuality?.recommendationDataAvailable)}`,
  ];

  const strengths = (context.strengths || []).slice(0, SUMMARY_LIMITS.strengths);
  lines.push(`Current strengths: ${strengths.length ? strengths.map(item => `${item.topicLabel} (${item.confidence})`).join('; ') : 'none with strong evidence'}`);

  const priorities = (context.supportPriorities || []).slice(0, SUMMARY_LIMITS.supportPriorities);
  lines.push(`Support priorities: ${priorities.length ? priorities.map(item => `${item.topicLabel} (${item.supportNeed}, ${item.confidence}) - ${compactReasons(item.reasons)}`).join('; ') : 'none with strong evidence'}`);

  lines.push(`Suggested response style: ${context.responseGuidance?.explanationDepth || 'standard'}, ${context.responseGuidance?.pacing || 'normal'}, formats=${(context.responseGuidance?.preferredFormats || ['clear_steps']).join(', ')}`);

  const steps = (context.recommendedNextSteps || []).slice(0, SUMMARY_LIMITS.nextSteps);
  lines.push(`Possible learner-chosen next actions: ${steps.length ? steps.map(step => `${step.type}${step.topicId ? ` for ${step.topicId}` : ''}`).join('; ') : 'none'}`);
  lines.push('Boundaries: learner chooses next action; do not change scores, progress, recommendations, scenario attempts, profile, or content; acknowledge limited data when evidence is low; do not invent scores or mastery.');

  return lines.join('\n').slice(0, SUMMARY_LIMITS.modelSummaryCharacters);
}

function createAdaptiveLearningService({ repository, now = () => new Date() } = {}) {
  if (!repository || typeof repository.loadLearnerContextData !== 'function') {
    throw new Error('Adaptive Learning service requires a read-only learner context repository.');
  }

  async function getAdaptiveContext({ userId, locale = 'en' } = {}) {
    if (!userId) {
      throw adaptiveError('ADAPTIVE_AUTH_REQUIRED', 'Authentication is required to build adaptive learning context.');
    }
    const data = await repository.loadLearnerContextData(userId);
    return buildAdaptiveContext({
      learnerId: userId,
      locale: normalizeLocale(locale),
      data,
      now: now(),
    });
  }

  return {
    getAdaptiveContext,
  };
}

module.exports = {
  ADAPTIVE_TOPICS,
  buildAdaptiveContext,
  buildAdaptiveModelSummary,
  createAdaptiveLearningService,
  shouldUseAdaptiveLearning,
};
