function getAgeGroup(age) {
  const value = Number(age);

  if (!Number.isInteger(value) || value < 1 || value > 120) {
    return null;
  }

  if (value <= 12) return 'child';
  if (value <= 17) return 'teen';
  if (value <= 24) return 'young_adult';
  return 'adult';
}

module.exports = {
  getAgeGroup,
};
