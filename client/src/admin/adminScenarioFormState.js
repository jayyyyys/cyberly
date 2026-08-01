export const SCENARIO_CREATE_LIMITS = {
  slugMin: 3,
  titleMax: 160,
  summaryMax: 500,
  estimatedMinutesMax: 240,
  totalStepsMin: 3,
  totalStepsMax: 5,
};

export const SCENARIO_TOPIC_CODES = [
  "phishing_and_scams",
  "password_and_account_security",
  "privacy_and_personal_information",
  "misinformation_and_deepfakes",
];

export const SCENARIO_DIFFICULTIES = ["beginner", "developing", "intermediate", "advanced"];

export function createScenarioCreateForm() {
  return {
    values: {
      slug: "",
      title: "",
      summary: "",
      topicCode: "phishing_and_scams",
      difficulty: "beginner",
      estimatedMinutes: 5,
      totalSteps: 3,
    },
    fields: {
      slug: { required: true },
      title: { required: true },
      summary: { required: true },
      topicCode: { required: true },
      difficulty: { required: true },
      estimatedMinutes: { required: true },
      totalSteps: { required: true },
    },
  };
}

function isPositiveWholeNumber(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0;
}

export function validateScenarioCreateForm(values = {}, options = {}) {
  const showUntouched = Boolean(options.showUntouched);
  const touched = options.touched || {};
  const errors = {};
  const shouldValidate = field => showUntouched || touched[field];
  const slug = String(values.slug || "").trim();
  const title = String(values.title || "").trim();
  const summary = String(values.summary || "").trim();
  const estimatedMinutes = Number(values.estimatedMinutes);
  const totalSteps = Number(values.totalSteps);

  if (shouldValidate("slug")) {
    if (!slug) errors.slug = "required";
    else if (
      slug.length < SCENARIO_CREATE_LIMITS.slugMin ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    ) errors.slug = "format";
  }

  if (shouldValidate("title")) {
    if (!title) errors.title = "required";
    else if (title.length > SCENARIO_CREATE_LIMITS.titleMax) errors.title = "tooLong";
  }

  if (shouldValidate("summary")) {
    if (!summary) errors.summary = "required";
    else if (summary.length > SCENARIO_CREATE_LIMITS.summaryMax) errors.summary = "tooLong";
  }

  if (shouldValidate("topicCode") && !SCENARIO_TOPIC_CODES.includes(values.topicCode)) {
    errors.topicCode = "invalid";
  }

  if (shouldValidate("difficulty") && !SCENARIO_DIFFICULTIES.includes(values.difficulty)) {
    errors.difficulty = "invalid";
  }

  if (shouldValidate("estimatedMinutes")) {
    if (!isPositiveWholeNumber(values.estimatedMinutes)) errors.estimatedMinutes = "positiveInteger";
    else if (estimatedMinutes > SCENARIO_CREATE_LIMITS.estimatedMinutesMax) errors.estimatedMinutes = "tooLarge";
  }

  if (shouldValidate("totalSteps")) {
    if (!isPositiveWholeNumber(values.totalSteps)) errors.totalSteps = "positiveInteger";
    else if (totalSteps < SCENARIO_CREATE_LIMITS.totalStepsMin || totalSteps > SCENARIO_CREATE_LIMITS.totalStepsMax) errors.totalSteps = "range";
  }

  const order = ["slug", "title", "summary", "topicCode", "difficulty", "estimatedMinutes", "totalSteps"];
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    firstInvalidField: order.find(field => errors[field]) || null,
  };
}

export function mapScenarioCreateApiError(result = {}) {
  const fieldErrors = {};
  if (result.code === "ADMIN_SCENARIO_DUPLICATE_SLUG" || result.errors?.slug === "duplicate") {
    fieldErrors.slug = "duplicate";
  }
  for (const [field, code] of Object.entries(result.errors || {})) {
    if (!fieldErrors[field]) fieldErrors[field] = code;
  }
  return {
    fieldErrors,
    formError: result.error || result.message || "Unable to create scenario.",
  };
}
