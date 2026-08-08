# CI/CD Pipeline

This repository uses GitHub Actions for continuous integration and continuous
deployment of the static GLCTech website.

## Overview

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| **CI** | `.github/workflows/ci.yml` | every pull request + push to `main` | Runs the test suite. Blocks broken changes from merging. |
| **Deploy** | `.github/workflows/deploy.yml` | push to `main`, after the stats job, or manual | Runs the tests, then publishes the site to GitHub Pages. |
| **Stats** | `.github/workflows/Atualizar Stats Zabbix.yml` | hourly + manual | Existing job that refreshes `assets/data/stats.json` from Zabbix. |

## Test suite

The tests live in `tests/` and run on Node.js with the built-in test
runner — **no third-party dependencies**, so CI is fast and reliable. CI
runs them on Node.js 22.

```bash
npm test        # runs: node --test tests/*.test.js
```

What is covered:

- **`i18n.test.js`** — every language (`pt, en, de, es, fr, it`) exposes the
  **exact same set of translation keys**, and no value is empty. This is the
  main guard-rail for the multilingual copy: adding a key in one language but
  forgetting the others becomes a hard failure.
- **`html.test.js`** — each page has a `<!doctype html>`, a `<html lang>`
  attribute, a non-empty `<title>`, balanced `<html>/<body>` tags, and every
  `data-i18n` / `data-i18n-html` reference points to a key that actually
  exists in the dictionary. (Embeddable fragments such as
  `stats-snippet.html` are detected automatically and skip the full-page
  structural checks.)
- **`links.test.js`** — every local `href`/`src` resolves to a file that
  exists in the repo, so no page ships a dead internal link or missing asset.
- **`json.test.js`** — every JSON file is valid, and `stats.json` has the
  expected shape.

## Deployment

Deployment uses the official GitHub Pages Actions flow. The whole repository
is uploaded as the Pages artifact, so the repo-root `CNAME`
(`glctechsec.com`) keeps the custom domain automatically.

### One-time setup (required once)

In the repository: **Settings → Pages → Build and deployment → Source →
select "GitHub Actions".**

Until this is set, the site continues to serve from its previous source; after
it is set, every push to `main` (that passes the tests) publishes
automatically.

### Recommended: protect `main`

For the CI gate to actually block bad merges, enable branch protection:
**Settings → Branches → Add rule** for `main` → require the **CI / Test
suite** check to pass before merging.

## Adding new tests

Drop a `*.test.js` file in `tests/` using `node:test` and `node:assert`; it is
picked up automatically. Use `tests/helpers/loadI18n.js` to load the
translation dictionary in a headless environment.
