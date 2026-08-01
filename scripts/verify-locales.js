const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const LOCALE_DIR = path.join(ROOT, 'client', 'src', 'i18n', 'locales');
const LOCALES = ['en', 'ms', 'zh-CN'];
const FILES = Object.fromEntries(
  LOCALES.map(locale => [locale, path.join(LOCALE_DIR, `${locale}.json`)])
);

function findDuplicateKeys(source, file) {
  const duplicates = [];
  const stack = [{ keys: new Set(), path: '$' }];
  let inString = false;
  let escaped = false;
  let token = '';
  let lastString = null;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
        lastString = token;
        token = '';
      } else {
        token += char;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      token = '';
      continue;
    }

    if (char === '{') {
      const nextPath = lastString && source.slice(0, index).trimEnd().endsWith(':')
        ? `${stack[stack.length - 1].path}.${lastString}`
        : stack[stack.length - 1].path;
      stack.push({ keys: new Set(), path: nextPath });
      lastString = null;
      continue;
    }

    if (char === '}') {
      stack.pop();
      lastString = null;
      continue;
    }

    if (char === ':' && lastString) {
      const current = stack[stack.length - 1];
      if (current.keys.has(lastString)) {
        duplicates.push(`${file}:${current.path}.${lastString}`);
      }
      current.keys.add(lastString);
      continue;
    }

    if (!/\s/.test(char)) {
      lastString = null;
    }
  }

  return duplicates;
}

function flatten(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [[prefix, value]];
  }

  return Object.entries(value).flatMap(([key, child]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    return flatten(child, next);
  });
}

function placeholders(value) {
  if (typeof value !== 'string') return [];
  return Array.from(value.matchAll(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g))
    .map(match => match[1])
    .sort();
}

function diffKeys(referenceKeys, currentKeys) {
  const reference = new Set(referenceKeys);
  const current = new Set(currentKeys);
  return {
    missing: referenceKeys.filter(key => !current.has(key)),
    extra: currentKeys.filter(key => !reference.has(key)),
  };
}

function hasSuspiciousEnglish(value) {
  if (typeof value !== 'string') return false;
  const allowed = /\b(Cyberly|CyberGuard|AI|Gateway|Capstone|Taylor|University|DISS|Impact Lab|Form|English|Bahasa Melayu|Deepfake|deepfake)\b/g;
  const cleaned = value.replace(allowed, '').replace(/\{\{[^}]+\}\}/g, '');
  return /\b(the|and|or|to|with|for|your|you|loading|unable|please|assessment|scenario|resources|profile|recommendation)\b/i.test(cleaned);
}

const loaded = {};
const duplicateErrors = [];

for (const [locale, file] of Object.entries(FILES)) {
  const source = fs.readFileSync(file, 'utf8');
  duplicateErrors.push(...findDuplicateKeys(source, path.relative(ROOT, file)));
  loaded[locale] = JSON.parse(source);
}

const flattened = Object.fromEntries(
  LOCALES.map(locale => [locale, flatten(loaded[locale])])
);
const keyLists = Object.fromEntries(
  LOCALES.map(locale => [locale, flattened[locale].map(([key]) => key).sort()])
);
const enValues = new Map(flattened.en);

let failed = false;

if (duplicateErrors.length) {
  failed = true;
  console.error('Duplicate locale keys found:');
  duplicateErrors.forEach(item => console.error(`- ${item}`));
}

for (const locale of LOCALES.filter(locale => locale !== 'en')) {
  const { missing, extra } = diffKeys(keyLists.en, keyLists[locale]);
  if (missing.length || extra.length) {
    failed = true;
    console.error(`${locale} key mismatch:`);
    missing.forEach(key => console.error(`- missing ${key}`));
    extra.forEach(key => console.error(`- extra ${key}`));
  }

  const currentValues = new Map(flattened[locale]);
  for (const key of keyLists.en) {
    const expected = placeholders(enValues.get(key));
    const actual = placeholders(currentValues.get(key));
    if (expected.join('|') !== actual.join('|')) {
      failed = true;
      console.error(`${locale} interpolation mismatch at ${key}: expected ${expected.join(',') || '(none)'}, got ${actual.join(',') || '(none)'}`);
    }
  }
}

const suspicious = [];
for (const locale of ['ms', 'zh-CN']) {
  for (const [key, value] of flattened[locale]) {
    if (hasSuspiciousEnglish(value)) suspicious.push(`${locale}:${key}`);
  }
}

if (suspicious.length) {
  console.warn('Suspicious English-like locale values to review:');
  suspicious.forEach(item => console.warn(`- ${item}`));
}

if (failed) process.exit(1);

console.log('Locale JSON is valid, key structure matches, interpolation placeholders match, and duplicate keys were not found.');
