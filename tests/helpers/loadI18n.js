'use strict';

/**
 * Loads scripts/i18n.js in a minimal, headless browser-like sandbox and
 * returns the internal translation dictionary it exposes on
 * `window.glcI18n._translations`.
 *
 * i18n.js is a browser IIFE that touches `document`, `window`,
 * `localStorage` and `navigator` at load time. We stub just enough of those
 * globals (every DOM lookup returns "nothing found") so the script runs to
 * completion in Node without a real DOM or any third-party dependency.
 */

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const I18N_PATH = path.join(REPO_ROOT, 'scripts', 'i18n.js');

function loadTranslations() {
  const src = fs.readFileSync(I18N_PATH, 'utf8');

  // A universal no-op element: any property access returns a function that
  // returns the element itself, so chained DOM calls never throw.
  const el = new Proxy({}, { get: () => () => el });

  const sandbox = {
    window: {},
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    navigator: { language: 'en', languages: ['en'] },
    document: {
      readyState: 'complete',
      documentElement: el,
      body: el,
      title: '',
      createElement: () => el,
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementById: () => null,
      addEventListener: () => {},
    },
  };
  sandbox.window.localStorage = sandbox.localStorage;
  sandbox.window.navigator = sandbox.navigator;
  sandbox.window.document = sandbox.document;

  // Expose the stubs as globals for the duration of the eval, then run the
  // script in this module's scope so its top-level `window` resolves to ours.
  const runner = new Function(
    'window',
    'document',
    'localStorage',
    'navigator',
    `${src}\n;return window.glcI18n && window.glcI18n._translations;`
  );

  const translations = runner(
    sandbox.window,
    sandbox.document,
    sandbox.localStorage,
    sandbox.navigator
  );

  if (!translations || typeof translations !== 'object') {
    throw new Error('scripts/i18n.js did not expose window.glcI18n._translations');
  }
  return translations;
}

module.exports = { loadTranslations, REPO_ROOT };
