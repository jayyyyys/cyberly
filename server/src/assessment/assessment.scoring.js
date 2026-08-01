function getMeasuredLevel(percentage) {
  if (percentage >= 85) return 'advanced';
  if (percentage >= 70) return 'intermediate';
  if (percentage >= 40) return 'developing';
  return 'beginner';
}

function classifyTopic(percentage) {
  return percentage >= 67 ? 'strength' : 'improvement';
}

function calculatePercentage(correctCount, totalCount) {
  if (!totalCount) return 0;
  return Math.round((correctCount / totalCount) * 100);
}

function scoreQuestions(questions, answers) {
  const answerByQuestion = new Map(answers.map(answer => [Number(answer.question_id), answer]));
  let totalScore = 0;
  const maximumScore = questions.length;
  const topicBuckets = new Map();
  const scoredAnswers = [];

  for (const question of questions) {
    const answer = answerByQuestion.get(Number(question.id));
    const isCorrect = answer?.selected_option_key === question.correct_option_key;
    const awardedScore = isCorrect ? 1 : 0;
    totalScore += awardedScore;

    const bucket = topicBuckets.get(question.topic_code) || { topicCode: question.topic_code, correctCount: 0, totalCount: 0 };
    bucket.totalCount += 1;
    if (isCorrect) bucket.correctCount += 1;
    topicBuckets.set(question.topic_code, bucket);

    scoredAnswers.push({
      questionId: question.id,
      selectedOptionKey: answer?.selected_option_key || null,
      correctOptionKey: question.correct_option_key,
      isCorrect,
      awardedScore,
    });
  }

  const percentage = calculatePercentage(totalScore, maximumScore);
  const topicScores = Array.from(topicBuckets.values()).map(topic => ({
    ...topic,
    percentage: calculatePercentage(topic.correctCount, topic.totalCount),
    classification: classifyTopic(calculatePercentage(topic.correctCount, topic.totalCount)),
  }));

  return {
    totalScore,
    maximumScore,
    percentage,
    measuredLevel: getMeasuredLevel(percentage),
    scoredAnswers,
    topicScores,
  };
}

module.exports = {
  calculatePercentage,
  classifyTopic,
  getMeasuredLevel,
  scoreQuestions,
};
