'use strict';

/**
 * Internal link / asset integrity.
 *
 * For every page, every local (non-external) href/src must resolve to a file
 * that actually exists in the repo. This is the guard-rail that lets the team
 * push continuously without shipping a dead link or a missing image.
 *
 * External URLs, mailto:/tel:, in-page anchors, data: URIs, Cloudflare
 * runtime paths (/cdn-cgi/…) and any template-interpolated value (containing
 * a quote or `+`) are intentionally skipped.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { REPO_ROOT } = require('./helpers/loadI18n');

const htmlFiles = fs
  .readdirSync(REPO_ROOT)
  .filter((f) => f.endsWith('.html'))
  .sort();

function isSkippable(ref) {
  return (
    /^(https?:|mailto:|tel:|#|data:|javascript:|\/\/)/i.test(ref) ||
    ref.startsWith('/cdn-cgi/') || // Cloudflare-injected runtime paths
    ref.includes('+') || // template interpolation: "' + item.link + '"
    ref.includes('{{') ||
    ref.includes("'") ||
    ref.trim() === ''
  );
}

function localRefs(html) {
  return [...html.matchAll(/(?:href|src)=["']([^"']+)["']/g)]
    .map((m) => m[1])
    .filter((ref) => !isSkippable(ref))
    .map((ref) => ref.split('#')[0].split('?')[0]) // drop anchors/query
    .filter(Boolean);
}

for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');

  test(`${file}: all local links and assets resolve to existing files`, () => {
    const missing = [];
    for (const ref of localRefs(html)) {
      const rel = decodeURIComponent(ref.replace(/^\.\//, '').replace(/^\//, ''));
      const target = path.join(REPO_ROOT, rel);
      if (!fs.existsSync(target)) missing.push(ref);
    }
    assert.deepEqual(
      [...new Set(missing)],
      [],
      `${file} points at ${missing.length} missing local target(s): ${[...new Set(missing)].join(', ')}`
    );
  });
}
