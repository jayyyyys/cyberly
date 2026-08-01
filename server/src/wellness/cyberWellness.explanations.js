function clamp(value, max) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 3)).trim()}...`;
}

function buildCyberWellnessModelSummary(guidance) {
  if (!guidance) return null;
  const steps = (guidance.practicalSteps || []).slice(0, 3)
    .map((step, index) => `${index + 1}. ${clamp(step, 180)}`)
    .join('\n');
  const support = (guidance.suggestedSupport || []).slice(0, 1).map(item => clamp(item, 180)).join(' ');
  const context = [
    'Cyber Wellness situation:',
    `Domain: ${clamp(guidance.domain, 80)}`,
    `Confidence: ${clamp(guidance.confidence, 20)}`,
    `Guidance type: ${clamp(guidance.guidanceType, 80)}`,
    `Learner-safe summary: ${clamp(guidance.learnerMessage, 260)}`,
    '',
    'Recommended response:',
    'Use supportive, non-diagnostic wording. Do not label the learner or give a wellness risk score.',
    'Give up to three practical steps. Remind the learner they stay in control.',
    steps ? `Practical steps:\n${steps}` : null,
    support ? `Trusted support: ${support}` : null,
    'Do not claim activities were started, completed, scheduled, or automatically changed.',
  ].filter(Boolean).join('\n');
  return clamp(context, 1500);
}

module.exports = {
  buildCyberWellnessModelSummary,
};
