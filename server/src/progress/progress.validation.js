const { TOPIC_PRIORITY, getLevelForPercentage } = require('./progress.rules');

function isValidTopic(topicCode) {
  return TOPIC_PRIORITY.includes(topicCode);
}

function validatePercentage(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 100;
}

module.exports = {
  getLevelForPercentage,
  isValidTopic,
  validatePercentage,
};
