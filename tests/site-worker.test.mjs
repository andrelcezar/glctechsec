import { test } from 'node:test';
import assert from 'node:assert';
const mod = await import(new URL('../worker/index.js', import.meta.url));
const w = mod.default;
const ENV = { ZOHO_USER:'contact@glctechsec.com', ZOHO_PASS:'pw',
  ASSETS: { fetch: async (req) => new Response('asset:' + new URL(req.url).pathname, {status:200}) } };
const CTX = { waitUntil(){} };
const GOOD = { name:'Jane', email:'jane@acme.co.uk', message:'hi' };
const post = (body, origin) => new Request('https://glctechsec.com/api/contact',
  { method:'POST', headers: origin ? {Origin:origin} : {}, body: JSON.stringify(body) });

test('static paths fall through to assets', async () => {
  for (const p of ['/', '/index.html', '/assets/logo/glctech-logo.png', '/zabbix.html']) {
    const r = await w.fetch(new Request('https://glctechsec.com' + p), ENV, CTX);
    assert.strictEqual(await r.text(), 'asset:' + p);
  }
});
test('same-origin post is accepted', async () => {
  const r = await w.fetch(post(GOOD, 'https://glctechsec.com'), ENV, CTX);
  assert.notStrictEqual(r.status, 403);
});
test('missing Origin is accepted (same-origin browsers may omit it)', async () => {
  const r = await w.fetch(post(GOOD, null), ENV, CTX);
  assert.notStrictEqual(r.status, 403);
});
test('cross-origin post is refused', async () => {
  const r = await w.fetch(post(GOOD, 'https://evil.example'), ENV, CTX);
  assert.strictEqual(r.status, 403);
});
test('GET on the endpoint is refused', async () => {
  const r = await w.fetch(new Request('https://glctechsec.com/api/contact'), ENV, CTX);
  assert.strictEqual(r.status, 405);
});
test('validation and honeypot behave', async () => {
  assert.strictEqual((await w.fetch(post({...GOOD, email:'x'}), ENV, CTX)).status, 400);
  assert.strictEqual((await w.fetch(post({...GOOD, name:''}), ENV, CTX)).status, 400);
  const hp = await w.fetch(post({...GOOD, website:'bot'}), ENV, CTX);
  assert.strictEqual(hp.status, 200);
  assert.deepStrictEqual(await hp.json(), {ok:true});
});
test('fails closed without secrets', async () => {
  const r = await w.fetch(post(GOOD), { ASSETS: ENV.ASSETS }, CTX);
  assert.strictEqual(r.status, 500);
});
test('smtp failure returns 502, not a stack', async () => {
  const r = await w.fetch(post(GOOD), ENV, CTX);
  assert.strictEqual(r.status, 502);
  assert.deepStrictEqual(await r.json(), { ok:false, error:'Could not send right now.' });
});
