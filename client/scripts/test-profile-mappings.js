const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mappings = require('../src/profileMappings');

const educationValues = mappings.EDUCATION_LEVELS.map(option => option.value);
assert.deepEqual(educationValues, [
  'form_1',
  'form_2',
  'form_3',
  'form_4',
  'form_5',
  'other',
  'prefer_not_to_say',
]);

assert.equal(mappings.labelFor(mappings.EDUCATION_LEVELS, 'form_1'), 'Form 1');
assert.equal(mappings.labelFor(mappings.EDUCATION_LEVELS, 'prefer_not_to_say'), 'Prefer not to say');
assert.equal(mappings.labelFor(mappings.LANGUAGES, 'bahasa_melayu'), 'Bahasa Melayu');
assert.equal(mappings.labelFor(mappings.LEARNING_STYLES, 'quizzes_and_challenges'), 'Quizzes & challenges');
assert.deepEqual(
  mappings.labelsFor(mappings.HELP_OPTIONS, ['avoiding_scams', 'protecting_privacy']),
  ['Avoiding scams', 'Protecting privacy']
);

const appSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'App.jsx'), 'utf8');
assert.match(appSource, /registeredUser/);
assert.match(appSource, /your learner profile was not saved/i);
assert.match(appSource, /dbSaveProfile/);

console.log('Frontend profile mapping verification passed.');
