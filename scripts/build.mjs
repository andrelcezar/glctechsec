#!/usr/bin/env node
/**
 * Assembles dist/ — the only directory Cloudflare publishes.
 *
 * WHY THIS EXISTS
 * The Cloudflare deploy was configured with assets.directory = "." which
 * uploads the whole repository. That broke on node_modules/workerd/bin/workerd
 * (122 MiB, over the 25 MiB asset limit), but the size was the lesser problem:
 * it would also have published tests/, docs/, serverless/ source, and any
 * .dev.vars file sitting in the tree.
 *
 * So this is an ALLOWLIST, not an ignore file. Anything not named here is not
 * published, which means a new private file cannot leak by being forgotten.
 */
import { cp, mkdir, rm, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

/** Directories copied wholesale. */
const DIRS = ['assets'];

/** Individual files copied. Every published file must be listed here. */
const FILES = [
  'index.html',
  'about-the-group.html',
  'trust-compliance.html',
  'zabbix.html',
  'kaspersky.html',
  'veeam.html',
  'trabalhe-conosco.html',
  'politica.html',
  'termos.html',
  'robots.txt',
  'sitemap.xml',
  'favicon.ico',
  'apple-touch-icon.png',
  'CNAME',
];

/** Copied but renamed/nested. */
const NESTED = [['scripts/i18n.js', 'scripts/i18n.js']];

const bytes = (n) =>
  n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;

async function dirSize(dir) {
  let total = 0;
  let count = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = await dirSize(p);
      total += sub.total;
      count += sub.count;
    } else {
      total += (await stat(p)).size;
      count += 1;
    }
  }
  return { total, count };
}

/** Cloudflare rejects any single asset over 25 MiB. */
const MAX_ASSET = 25 * 1024 * 1024;

async function assertNoOversizedAsset(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await assertNoOversizedAsset(p);
    } else {
      const { size } = await stat(p);
      if (size > MAX_ASSET) {
        throw new Error(`${path.relative(DIST, p)} is ${bytes(size)}, over Cloudflare's 25 MiB limit`);
      }
    }
  }
}

async function main() {
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  const missing = [];

  for (const dir of DIRS) {
    if (!existsSync(path.join(ROOT, dir))) { missing.push(dir); continue; }
    await cp(path.join(ROOT, dir), path.join(DIST, dir), { recursive: true });
  }

  for (const file of FILES) {
    if (!existsSync(path.join(ROOT, file))) { missing.push(file); continue; }
    await cp(path.join(ROOT, file), path.join(DIST, file));
  }

  for (const [from, to] of NESTED) {
    if (!existsSync(path.join(ROOT, from))) { missing.push(from); continue; }
    await mkdir(path.dirname(path.join(DIST, to)), { recursive: true });
    await cp(path.join(ROOT, from), path.join(DIST, to));
  }

  if (missing.length) {
    // Fail loudly: a silently missing page is worse than a failed build.
    throw new Error(`listed in the allowlist but not found:\n  ${missing.join('\n  ')}`);
  }

  await assertNoOversizedAsset(DIST);

  const { total, count } = await dirSize(DIST);
  console.log(`dist/ built: ${count} files, ${bytes(total)}`);
}

main().catch((err) => {
  console.error('Build failed:', err.message);
  process.exit(1);
});
