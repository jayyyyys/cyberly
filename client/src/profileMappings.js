const EDUCATION_LEVELS = [
  { value: "form_1", label: "Form 1" },
  { value: "form_2", label: "Form 2" },
  { value: "form_3", label: "Form 3" },
  { value: "form_4", label: "Form 4" },
  { value: "form_5", label: "Form 5" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const LANGUAGES = [
  { value: "english", label: "English" },
  { value: "bahasa_melayu", label: "Bahasa Melayu" },
  { value: "chinese", label: "中文" },
  { value: "mixed", label: "Mixed" },
];

const FAMILIARITY = [
  { value: "beginner", label: "Beginner", desc: "I'm just getting started; the basics are new to me." },
  { value: "intermediate", label: "Intermediate", desc: "I know the fundamentals and want to go deeper." },
  { value: "advanced", label: "Advanced", desc: "I'm confident and looking for advanced challenges." },
];

const HELP_OPTIONS = [
  { value: "staying_safe_online", label: "Staying safe online" },
  { value: "learning_cybersecurity", label: "Learning cybersecurity" },
  { value: "avoiding_scams", label: "Avoiding scams" },
  { value: "protecting_privacy", label: "Protecting privacy" },
  { value: "understanding_cyber_threats", label: "Understanding cyber threats" },
  { value: "cybersecurity_careers", label: "Exploring cybersecurity careers" },
];

const LEARNING_STYLES = [
  { value: "step_by_step", label: "Step-by-step guidance", icon: "🗺️" },
  { value: "short_explanations", label: "Short explanations", icon: "⚡" },
  { value: "quizzes_and_challenges", label: "Quizzes & challenges", icon: "🎯" },
];

function labelFor(options, value, fallback = "Not set") {
  return options.find(option => option.value === value)?.label || fallback;
}

function labelsFor(options, values = []) {
  return values.map(value => labelFor(options, value, value));
}

module.exports = {
  EDUCATION_LEVELS,
  LANGUAGES,
  FAMILIARITY,
  HELP_OPTIONS,
  LEARNING_STYLES,
  labelFor,
  labelsFor,
};
