'use strict';

/**
 * Every JSON file the site ships (data feeds, language files) must be valid
 * JSON. A malformed data file — e.g. a bad commit from the hourly Zabbix stats
 * job — would break the pages that fetch it, so we fail the build instead.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { REPO_ROOT } = require('./helpers/loadI18n');

const IGNORE_DIRS = new Set(['node_modules', '.git']);

function findJson(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) findJson(path.join(dir, entry.name), acc);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      acc.push(path.join(dir, entry.name));
    }
  }
  return acc;
}

const jsonFiles = findJson(REPO_ROOT).sort();

test('found JSON files to validate', () => {
  assert.ok(jsonFiles.length > 0, 'no JSON files discovered');
});

for (const file of jsonFiles) {
  const rel = path.relative(REPO_ROOT, file);
  test(`${rel}: is valid JSON`, () => {
    const raw = fs.readFileSync(file, 'utf8');
    assert.doesNotThrow(() => JSON.parse(raw), `${rel} is not parseable JSON`);
  });
}

test('stats.json has the expected shape', () => {
  const statsPath = path.join(REPO_ROOT, 'assets', 'data', 'stats.json');
  if (!fs.existsSync(statsPath)) return; // optional file
  const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
  assert.equal(typeof stats.devices, 'number', 'stats.devices must be a number');
  assert.equal(typeof stats.problems, 'number', 'stats.problems must be a number');
  assert.match(
    String(stats.updated_at),
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
    'stats.updated_at must be an ISO-8601 UTC timestamp'
  );
});
