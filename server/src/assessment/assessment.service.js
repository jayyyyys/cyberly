const { mapAssessment, mapAttempt, mapCompletedResult, mapQuestionForDelivery, TOPIC_LABELS, parseOptions } = require('./assessment.mapper');
const { scoreQuestions } = require('./assessment.scoring');
const { validateAnswerInput } = require('./assessment.validation');
const { normalizeLocale } = require('../i18n/locale');
const { ERROR_CODES } = require('../errors/errorCodes');

function httpError(status, code, message, errors) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  if (errors) error.errors = errors;
  return error;
}

function createAssessmentService(repository, progressService = null) {
  async function getInitialAssessment(localeInput) {
    const locale = normalizeLocale(localeInput);
    const assessment = await repository.getPublishedInitialAssessment(locale);
    if (!assessment) throw httpError(404, ERROR_CODES.ASSESSMENT_NOT_AVAILABLE, 'Initial assessment is not available.');

    const [questions, topics] = await Promise.all([
      repository.listPublishedQuestions(assessment.id, locale),
      repository.listTopics(assessment.id),
    ]);

    return {
      assessment: mapAssessment(assessment, topics.map(topic => ({
        topicCode: topic.topic_code,
        topicLabel: TOPIC_LABELS[topic.topic_code] || topic.topic_code,
        questionCount: topic.question_count,
      }))),
      questions: questions.map(mapQuestionForDelivery),
    };
  }

  async function buildAttemptResponse(attempt, includeResult = false, localeInput) {
    const locale = normalizeLocale(localeInput);
    const answers = await repository.listAnswers(attempt.id);
    if (includeResult || attempt.status === 'completed') {
      const questions = await repository.listPublishedQuestions(attempt.assessment_id, locale);
      const topicScores = await repository.listTopicScores(attempt.id);
      return mapCompletedResult(attempt, questions, answers, topicScores);
    }
    return { attempt: mapAttempt(attempt, answers) };
  }

  async function startOrResumeInitialAttempt(userId, localeInput) {
    const locale = normalizeLocale(localeInput);
    const assessment = await repository.getPublishedInitialAssessment(locale);
    if (!assessment) throw httpError(404, ERROR_CODES.ASSESSMENT_NOT_AVAILABLE, 'Initial assessment is not available.');

    const completed = await repository.findLatestCompletedAttempt(userId, assessment.id);
    if (completed) {
      return {
        completed: true,
        ...(await buildAttemptResponse(completed, true, locale)),
      };
    }

    const inProgress = await repository.findInProgressAttempt(userId, assessment.id);
    if (inProgress) {
      return {
        completed: false,
        ...(await buildAttemptResponse(inProgress, false, locale)),
      };
    }

    const attempt = await repository.createAttempt(userId, assessment.id);
    return {
      completed: false,
      ...(await buildAttemptResponse(attempt, false, locale)),
    };
  }

  async function getAttemptForUser(userId, attemptId, localeInput) {
    const attempt = await repository.findAttemptById(Number(attemptId));
    if (!attempt || attempt.user_id !== userId) throw httpError(404, ERROR_CODES.ASSESSMENT_ATTEMPT_NOT_FOUND, 'Assessment attempt was not found.');
    return buildAttemptResponse(attempt, attempt.status === 'completed', localeInput);
  }

  async function saveAnswer(userId, attemptId, input) {
    const validation = validateAnswerInput(input);
    if (!validation.ok) throw httpError(400, ERROR_CODES.ASSESSMENT_ANSWER_INVALID, 'Answer details are invalid.', validation.errors);

    const attempt = await repository.findAttemptById(Number(attemptId));
    if (!attempt || attempt.user_id !== userId) throw httpError(404, ERROR_CODES.ASSESSMENT_ATTEMPT_NOT_FOUND, 'Assessment attempt was not found.');
    if (attempt.status !== 'in_progress') throw httpError(409, ERROR_CODES.ASSESSMENT_ATTEMPT_NOT_OPEN, 'This assessment attempt is not open for answers.');

    const question = await repository.findQuestionForAssessment(validation.value.questionId, attempt.assessment_id);
    if (!question) throw httpError(400, ERROR_CODES.ASSESSMENT_QUESTION_MISMATCH, 'Question does not belong to this assessment.');

    const optionKeys = new Set(parseOptions(question.options_json).map(option => option.key));
    if (!optionKeys.has(validation.value.selectedOptionKey)) {
      throw httpError(400, ERROR_CODES.ASSESSMENT_OPTION_INVALID, 'Selected option is invalid for this question.');
    }

    await repository.upsertAnswer(attempt.id, question.id, validation.value.selectedOptionKey);
    const answers = await repository.listAnswers(attempt.id);
    return { attempt: mapAttempt(attempt, answers) };
  }

  async function submitAttempt(userId, attemptId, localeInput) {
    const locale = normalizeLocale(localeInput);
    return repository.withTransaction(async (connection) => {
      const attempt = await repository.findAttemptById(Number(attemptId), connection);
      if (!attempt || attempt.user_id !== userId) throw httpError(404, ERROR_CODES.ASSESSMENT_ATTEMPT_NOT_FOUND, 'Assessment attempt was not found.');
      if (attempt.status !== 'in_progress') throw httpError(409, ERROR_CODES.ASSESSMENT_ALREADY_SUBMITTED, 'This assessment attempt has already been submitted.');

      const questions = await repository.listPublishedQuestions(attempt.assessment_id, locale, connection);
      const answers = await repository.listAnswers(attempt.id, connection);
      if (answers.length !== questions.length) {
        throw httpError(400, ERROR_CODES.ASSESSMENT_INCOMPLETE, 'Please answer all questions before submitting.');
      }

      const answeredQuestionIds = new Set(answers.map(answer => Number(answer.question_id)));
      if (questions.some(question => !answeredQuestionIds.has(Number(question.id)))) {
        throw httpError(400, ERROR_CODES.ASSESSMENT_INCOMPLETE, 'Please answer all questions before submitting.');
      }

      const score = scoreQuestions(questions, answers);
      await repository.updateAnswerScores(attempt.id, score.scoredAnswers, connection);
      await repository.replaceTopicScores(attempt.id, score.topicScores, connection);
      const completedAttempt = await repository.completeAttempt(attempt.id, score, connection);
      if (progressService) {
        await progressService.syncInitialAssessment(userId, completedAttempt.id, connection);
      }
      const scoredAnswers = await repository.listAnswers(attempt.id, connection);
      const topicScores = await repository.listTopicScores(attempt.id, connection);
      return mapCompletedResult(completedAttempt, questions, scoredAnswers, topicScores);
    });
  }

  async function getLatestInitialResult(userId, localeInput) {
    const locale = normalizeLocale(localeInput);
    const assessment = await repository.getPublishedInitialAssessment(locale);
    if (!assessment) throw httpError(404, ERROR_CODES.ASSESSMENT_NOT_AVAILABLE, 'Initial assessment is not available.');
    const completed = await repository.findLatestCompletedAttempt(userId, assessment.id);
    if (!completed) return { exists: false, result: null };
    return { exists: true, result: await buildAttemptResponse(completed, true, locale) };
  }

  async function getInitialStatus(userId, localeInput) {
    const locale = normalizeLocale(localeInput);
    const assessment = await repository.getPublishedInitialAssessment(locale);
    if (!assessment) throw httpError(404, ERROR_CODES.ASSESSMENT_NOT_AVAILABLE, 'Initial assessment is not available.');
    const completed = await repository.findLatestCompletedAttempt(userId, assessment.id);
    if (completed) {
      return { status: 'completed', result: await buildAttemptResponse(completed, true, locale) };
    }
    const inProgress = await repository.findInProgressAttempt(userId, assessment.id);
    if (inProgress) {
      return { status: 'in_progress', attempt: mapAttempt(inProgress, await repository.listAnswers(inProgress.id)) };
    }
    return { status: 'pending', attempt: null, result: null };
  }

  return {
    getAttemptForUser,
    getInitialAssessment,
    getInitialStatus,
    getLatestInitialResult,
    saveAnswer,
    startOrResumeInitialAttempt,
    submitAttempt,
  };
}

module.exports = {
  createAssessmentService,
};
