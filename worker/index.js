/**
 * Cloudflare Worker for glctechsec.com — static site plus the contact endpoint.
 *
 * One deploy serves both, which means the form posts to /api/contact on its own
 * origin: no CORS preflight, no second URL to configure, and no third-party
 * form service in the path.
 *
 * Everything that is not /api/contact falls through to the static assets in
 * dist/, assembled by scripts/build.mjs.
 *
 * The Zoho credential lives in Worker secrets. It is never in this file, and
 * never in the repository.
 */
import { sendMail } from '../serverless/cloudflare/src/smtp.js';

/** Strips control characters and caps length before anything reaches SMTP. */
const clean = (v, max) =>
  String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

const json = (body, status, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });

/**
 * The form is same-origin now, so an exact origin match is the normal case.
 * A missing Origin header is allowed because some browsers omit it for
 * same-origin requests; anything from a *different* origin is refused.
 */
function originAllowed(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

async function handleContact(request, env, ctx) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { 'Allow': 'POST, OPTIONS', 'Access-Control-Allow-Methods': 'POST, OPTIONS' },
    });
  }
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);
  if (!originAllowed(request)) return json({ ok: false, error: 'Origin not allowed' }, 403);

  // Flood guard. Optional: without the KV binding the Worker still sends,
  // it just loses the limit rather than failing the request.
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (env.RATE_LIMIT) {
    const key = `rl:${ip}`;
    const count = Number((await env.RATE_LIMIT.get(key)) || 0);
    if (count >= 5) {
      return json({ ok: false, error: 'Too many submissions. Please try again later.' }, 429);
    }
    ctx.waitUntil(env.RATE_LIMIT.put(key, String(count + 1), { expirationTtl: 600 }));
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid request.' }, 400);
  }

  // Honeypot: a hidden field no human fills in.
  if (clean(body.website, 200)) return json({ ok: true }, 200);

  const name = clean(body.name, 120);
  const email = clean(body.email, 200);
  const message = clean(body.message, 5000);
  const company = clean(body.company, 160) || 'Not provided';
  const phone = clean(body.phone, 60) || 'Not provided';

  if (!name || !message) return json({ ok: false, error: 'Name and message are required.' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return json({ ok: false, error: 'A valid email address is required.' }, 400);
  }

  if (!env.ZOHO_USER || !env.ZOHO_PASS) {
    console.error('ZOHO_USER / ZOHO_PASS secrets are not set.');
    return json({ ok: false, error: 'Mail is not configured.' }, 500);
  }

  try {
    const { connect } = await import('cloudflare:sockets');
    await sendMail({
      connect,
      user: env.ZOHO_USER,
      pass: env.ZOHO_PASS,
      // Zoho only accepts the authenticated mailbox as sender, which is also
      // what keeps SPF and DKIM aligned for the domain.
      from: `"GLCTech website" <${env.ZOHO_USER}>`,
      to: env.CONTACT_TO || env.ZOHO_USER,
      replyTo: `"${name}" <${email}>`,
      subject: `New website enquiry — ${name}`,
      text: [
        `Name:    ${name}`,
        `Company: ${company}`,
        `Email:   ${email}`,
        `Phone:   ${phone}`,
        '',
        'Message:',
        message,
      ].join('\n'),
    });
    return json({ ok: true }, 200);
  } catch (err) {
    // The SMTP error names the host and the account — log it, never return it.
    console.error('Zoho send failed:', err && err.message);
    return json({ ok: false, error: 'Could not send right now.' }, 502);
  }
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/contact') return handleContact(request, env, ctx);

    // The ASSETS binding comes from [assets] in wrangler.toml and is attached
    // by `wrangler deploy`. Re-publishing this Worker from the dashboard code
    // editor drops it, which took the whole site down with an opaque
    // "Cannot read properties of undefined (reading 'fetch')". Fail with
    // something that names the cause instead.
    if (!env.ASSETS) {
      console.error(
        'ASSETS binding missing. This version was almost certainly published from ' +
        'the dashboard editor, which does not carry static assets. Redeploy with ' +
        '`npx wrangler deploy`, or roll back to the last wrangler-published version.');
      return new Response(
        'Site temporarily unavailable. (Deploy error: static assets are not bound to this Worker version.)',
        { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    return env.ASSETS.fetch(request);
  },
};
