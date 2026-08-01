const { getAgeGroup } = require("../database/age-group");

const ALLOWED_ACCOUNT_FIELDS = new Set([
  "displayName",
  "age",
]);

function validateAccountUpdate(input = {}) {
  const errors = {};

  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    return {
      ok: false,
      errors: {
        form: "Account update must be a valid object.",
      },
      value: {},
    };
  }

  const unknownFields = Object.keys(input).filter(
    field => !ALLOWED_ACCOUNT_FIELDS.has(field)
  );

  if (unknownFields.length > 0) {
    errors.forbidden =
      `Unsupported account fields: ${unknownFields.join(", ")}.`;
  }

  const value = {};

  if (Object.prototype.hasOwnProperty.call(input, "displayName")) {
    if (typeof input.displayName !== "string") {
      errors.displayName = "Display name must be text.";
    } else {
      const displayName = input.displayName.trim();

      if (displayName.length < 2 || displayName.length > 50) {
        errors.displayName =
          "Display name must be 2 to 50 characters.";
      } else {
        value.displayName = displayName;
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, "age")) {
    const age = Number(input.age);
    const ageGroup = getAgeGroup(age);

    if (!Number.isInteger(age) || !ageGroup) {
      errors.age =
        "Age must be a whole number from 1 to 120.";
    } else {
      value.age = age;
      value.ageGroup = ageGroup;
    }
  }

  if (
    !Object.prototype.hasOwnProperty.call(value, "displayName") &&
    !Object.prototype.hasOwnProperty.call(value, "age") &&
    unknownFields.length === 0
  ) {
    errors.form = "Provide displayName or age to update.";
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value,
  };
}

module.exports = {
  ALLOWED_ACCOUNT_FIELDS,
  validateAccountUpdate,
};