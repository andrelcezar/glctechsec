'use strict';

/**
 * Translation-dictionary tests.
 *
 * The site is fully multilingual and updated frequently. The single biggest
 * risk when editing copy is adding/removing a key in one language but not the
 * others, which silently falls back to English at runtime. These tests make
 * that a hard failure so it is caught before merge.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTranslations } = require('./helpers/loadI18n');

const translations = loadTranslations();
const EXPECTED_LANGS = ['pt', 'en', 'de', 'es', 'fr', 'it'];
const REFERENCE = 'en';

test('exposes all expected languages', () => {
  for (const lang of EXPECTED_LANGS) {
    assert.ok(
      translations[lang] && typeof translations[lang] === 'object',
      `missing language block: "${lang}"`
    );
  }
});

test('every language has the exact same set of keys as the reference (en)', () => {
  const refKeys = Object.keys(translations[REFERENCE]).sort();

  for (const lang of Object.keys(translations)) {
    const langKeys = new Set(Object.keys(translations[lang]));
    const missing = refKeys.filter((k) => !langKeys.has(k));
    const extra = [...langKeys].filter((k) => !refKeys.includes(k)).sort();

    assert.deepEqual(
      missing,
      [],
      `language "${lang}" is missing ${missing.length} key(s) present in "${REFERENCE}": ${missing.join(', ')}`
    );
    assert.deepEqual(
      extra,
      [],
      `language "${lang}" has ${extra.length} key(s) not present in "${REFERENCE}": ${extra.join(', ')}`
    );
  }
});

test('no translation value is empty or non-string', () => {
  for (const lang of Object.keys(translations)) {
    for (const [key, value] of Object.entries(translations[lang])) {
      assert.equal(
        typeof value,
        'string',
        `[${lang}] value for "${key}" is not a string`
      );
      assert.ok(
        value.trim().length > 0,
        `[${lang}] value for "${key}" is empty`
      );
    }
  }
});
