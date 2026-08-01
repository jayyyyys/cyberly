const RESULT_THRESHOLDS = [
  { min: 85, level: 'strong' },
  { min: 70, level: 'proficient' },
  { min: 40, level: 'developing' },
  { min: 0, level: 'needs_review' },
];

function getResultLevel(percentage) {
  const value = Number(percentage);
  const match = RESULT_THRESHOLDS.find(threshold => value >= threshold.min);
  return match ? match.level : 'needs_review';
}

function getMasteryDelta(percentage) {
  const value = Number(percentage);
  if (value >= 85) return 6;
  if (value >= 70) return 4;
  if (value >= 40) return 2;
  return 0;
}

function calculateScenarioScore(steps, decisions) {
  const decisionByStepId = new Map(decisions.map(decision => [Number(decision.step_id), decision]));
  const maximumScore = steps.reduce((sum, step) => {
    const options = Array.isArray(step.options_json) ? step.options_json : JSON.parse(step.options_json);
    const maxForStep = options.reduce((max, option) => Math.max(max, Number(option.score || 0)), 0);
    return sum + maxForStep;
  }, 0);
  const totalScore = steps.reduce((sum, step) => {
    const decision = decisionByStepId.get(Number(step.id));
    return sum + Number(decision?.awarded_score || 0);
  }, 0);
  const percentage = maximumScore ? Math.round((totalScore / maximumScore) * 100) : 0;

  return {
    totalScore,
    maximumScore,
    percentage,
    resultLevel: getResultLevel(percentage),
  };
}

module.exports = {
  calculateScenarioScore,
  getMasteryDelta,
  getResultLevel,
};
