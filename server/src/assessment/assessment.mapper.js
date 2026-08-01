const TOPIC_LABELS = {
  phishing_and_scams: 'Phishing and scams',
  password_and_account_security: 'Password and account security',
  privacy_and_personal_information: 'Privacy and personal information',
  misinformation_and_deepfakes: 'Misinformation and deepfakes',
};

function parseOptions(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}

function mapAssessment(row, topics = []) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    type: row.assessment_type,
    version: row.version,
    questionCount: row.question_count,
    topics,
  };
}

function mapQuestionForDelivery(row) {
  return {
    id: row.id,
    topicCode: row.topic_code,
    topicLabel: TOPIC_LABELS[row.topic_code] || row.topic_code,
    prompt: row.prompt,
    options: parseOptions(row.localized_options_json || row.options_json),
    displayOrder: row.display_order,
  };
}

function mapAttempt(row, answers = []) {
  if (!row) return null;
  return {
    id: row.id,
    assessmentId: row.assessment_id,
    status: row.status,
    startedAt: toIso(row.started_at),
    completedAt: toIso(row.completed_at),
    totalScore: row.total_score,
    maximumScore: row.maximum_score,
    percentage: row.percentage,
    measuredLevel: row.measured_level,
    answers: answers.map(answer => ({
      questionId: answer.question_id,
      selectedOptionKey: answer.selected_option_key,
      answeredAt: toIso(answer.answered_at),
    })),
  };
}

function mapCompletedResult(attempt, questions, answers, topicScores) {
  const answerByQuestion = new Map(answers.map(answer => [Number(answer.question_id), answer]));
  return {
    attempt: mapAttempt(attempt, answers),
    topicScores: topicScores.map(topic => ({
      topicCode: topic.topic_code,
      topicLabel: TOPIC_LABELS[topic.topic_code] || topic.topic_code,
      correctCount: topic.correct_count,
      totalCount: topic.total_count,
      percentage: topic.percentage,
      classification: topic.percentage >= 67 ? 'strength' : 'improvement',
    })),
    review: questions.map(question => {
      const answer = answerByQuestion.get(Number(question.id));
      const options = parseOptions(question.localized_options_json || question.options_json);
      return {
        questionId: question.id,
        topicCode: question.topic_code,
        topicLabel: TOPIC_LABELS[question.topic_code] || question.topic_code,
        prompt: question.prompt,
        options,
        selectedOptionKey: answer?.selected_option_key || null,
        correctOptionKey: question.correct_option_key,
        isCorrect: Boolean(answer?.is_correct),
        explanation: question.explanation,
        displayOrder: question.display_order,
      };
    }),
  };
}

module.exports = {
  TOPIC_LABELS,
  mapAssessment,
  mapAttempt,
  mapCompletedResult,
  mapQuestionForDelivery,
  parseOptions,
};
