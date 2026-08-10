#!/usr/bin/env node
/**
 * Guards against a silently empty test run.
 *
 * `node --test "tests/*.test.js"` exits 0 when the glob matches nothing. So a
 * renamed folder, a typo in the glob, or a checkout that dropped tests/ would
 * turn CI green having verified nothing at all. This makes that fail loudly.
 */
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TESTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'tests');
const MIN_FILES = 4;

let files = [];
try {
  files = readdirSync(TESTS).filter((f) => /\.test\.(js|mjs)$/.test(f));
} catch {
  console.error(`No tests directory at ${TESTS}`);
  process.exit(1);
}

if (files.length < MIN_FILES) {
  console.error(
    `Expected at least ${MIN_FILES} test files in tests/, found ${files.length}.\n` +
    'If tests were intentionally removed, lower MIN_FILES in scripts/check-tests-exist.mjs.');
  process.exit(1);
}
