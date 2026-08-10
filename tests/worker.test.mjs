import { test } from 'node:test';
import assert from 'node:assert';

/**
 * Exercises the Worker's guards under plain Node. Everything up to the SMTP
 * call is runtime-independent, so all of it is testable here; the SMTP exchange
 * itself is covered separately in smtp.test.js.
 */
const ORIGIN = 'https://glctechsec.com';

const mod = await import(new URL('../serverless/cloudflare/src/worker.js', import.meta.url));
const worker = mod.default;

const post = (body, origin = ORIGIN, headers = {}) =>
  new Request('https://x/api/contact', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

const ENV = { ZOHO_USER: 'contact@glctechsec.com', ZOHO_PASS: 'pw', CONTACT_TO: 'contact@glctechsec.com' };
const CTX = { waitUntil() {} };
const GOOD = { name: 'Jane', email: 'jane@acme.co.uk', message: 'hi', company: 'Acme', phone: '123' };

test('rejects a foreign origin', async () => {
  const r = await worker.fetch(post(GOOD, 'https://evil.example'), ENV, CTX);
  assert.strictEqual(r.status, 403);
  assert.strictEqual(r.headers.get('Access-Control-Allow-Origin'), null);
});
test('answers preflight', async () => {
  const r = await worker.fetch(new Request('https://x', { method: 'OPTIONS', headers: { Origin: ORIGIN } }), ENV, CTX);
  assert.strictEqual(r.status, 204);
  assert.strictEqual(r.headers.get('Access-Control-Allow-Origin'), ORIGIN);
});
test('rejects GET', async () => {
  const r = await worker.fetch(new Request('https://x', { headers: { Origin: ORIGIN } }), ENV, CTX);
  assert.strictEqual(r.status, 405);
});
test('rejects malformed json', async () => {
  const r = await worker.fetch(new Request('https://x', { method: 'POST', headers: { Origin: ORIGIN }, body: '{' }), ENV, CTX);
  assert.strictEqual(r.status, 400);
});
test('validates required fields and email', async () => {
  assert.strictEqual((await worker.fetch(post({ ...GOOD, name: '' }), ENV, CTX)).status, 400);
  assert.strictEqual((await worker.fetch(post({ ...GOOD, message: '' }), ENV, CTX)).status, 400);
  assert.strictEqual((await worker.fetch(post({ ...GOOD, email: 'nope' }), ENV, CTX)).status, 400);
});
test('silently drops honeypot submissions', async () => {
  const r = await worker.fetch(post({ ...GOOD, website: 'spam' }), ENV, CTX);
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(await r.json(), { ok: true });
});
test('fails closed when secrets are missing', async () => {
  const r = await worker.fetch(post(GOOD), {}, CTX);
  assert.strictEqual(r.status, 500);
  assert.strictEqual((await r.json()).error, 'Mail is not configured.');
});
test('rate limits per IP', async () => {
  const store = new Map();
  const env = { ...ENV, RATE_LIMIT: { get: async (k) => store.get(k), put: async (k, v) => store.set(k, v) } };
  let last;
  for (let i = 0; i < 7; i++) last = await worker.fetch(post(GOOD, ORIGIN, { 'CF-Connecting-IP': '9.9.9.9' }), env, CTX);
  assert.strictEqual(last.status, 429);
});
