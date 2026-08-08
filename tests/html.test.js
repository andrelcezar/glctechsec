'use strict';

/**
 * Structural HTML sanity checks + i18n-key integrity for every page.
 *
 * These are intentionally lightweight (no external parser) so they stay fast
 * and dependency-free while still catching the mistakes that actually happen
 * when hand-editing pages: a missing <title>, a dropped `lang` attribute, or
 * a `data-i18n` reference to a translation key that does not exist.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadTranslations, REPO_ROOT } = require('./helpers/loadI18n');

const en = loadTranslations().en;

const htmlFiles = fs
  .readdirSync(REPO_ROOT)
  .filter((f) => f.endsWith('.html'))
  .sort();

test('there is at least one HTML page to validate', () => {
  assert.ok(htmlFiles.length > 0, 'no .html files found in repo root');
});

for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');

  // Some files (e.g. stats-snippet.html) are embeddable HTML fragments, not
  // standalone documents. Full-page structural checks only apply to real
  // pages, which we detect by the presence of an <html> tag.
  const isFullPage = /<html[\s>]/i.test(html);

  test(`${file}: has a <!doctype html> declaration`, { skip: !isFullPage && 'HTML fragment' }, () => {
    assert.match(html.slice(0, 200), /<!doctype html>/i, 'missing <!doctype html>');
  });

  test(`${file}: has a <html lang="…"> attribute`, { skip: !isFullPage && 'HTML fragment' }, () => {
    assert.match(html, /<html[^>]*\slang=["'][^"']+["']/i, 'missing lang attribute on <html>');
  });

  test(`${file}: has a non-empty <title>`, { skip: !isFullPage && 'HTML fragment' }, () => {
    const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    assert.ok(m, 'missing <title> element');
    assert.ok(m[1].trim().length > 0, '<title> is empty');
  });

  test(`${file}: has balanced <html> and <body> tags`, { skip: !isFullPage && 'HTML fragment' }, () => {
    assert.equal((html.match(/<html[\s>]/gi) || []).length, 1, 'expected exactly one <html>');
    assert.equal((html.match(/<\/html>/gi) || []).length, 1, 'expected exactly one </html>');
    assert.equal((html.match(/<body[\s>]/gi) || []).length, 1, 'expected exactly one <body>');
    assert.equal((html.match(/<\/body>/gi) || []).length, 1, 'expected exactly one </body>');
  });

  test(`${file}: every data-i18n / data-i18n-html key exists in the dictionary`, () => {
    // data-i18n and data-i18n-html hold translation KEYS.
    // data-i18n-attr holds an ATTRIBUTE NAME (e.g. "placeholder"), not a key.
    const keys = [...html.matchAll(/data-i18n(?:-html)?=["']([^"']+)["']/g)].map((m) => m[1]);
    const unknown = [...new Set(keys)].filter((k) => en[k] === undefined);
    assert.deepEqual(
      unknown,
      [],
      `${file} references ${unknown.length} unknown translation key(s): ${unknown.join(', ')}`
    );
  });
}
