/**
 * Contact form relay — Cloudflare Worker + Zoho Mail SMTP.
 *
 * The website is a static site: anything published there is readable by any
 * visitor. The Zoho credential therefore lives in Worker secrets, which are
 * encrypted and never appear in the code or in the repository.
 *
 * Deploy:  see ../README.md
 */
import { sendMail } from './smtp.js';

const ALLOWED_ORIGINS = [
  'https://glctechsec.com',
  'https://www.glctechsec.com',
];

const json = (body, status, origin) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...(origin ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } : {}),
    },
  });

/** Strips control characters and caps length before anything reaches SMTP. */
const clean = (v, max) =>
  String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const allowed = ALLOWED_ORIGINS.includes(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...(allowed ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } : {}),
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405, allowed ? origin : null);
    if (!allowed) return json({ ok: false, error: 'Origin not allowed' }, 403, null);

    // Rate limit per IP. KV is optional — without it the Worker still works,
    // it just loses the flood guard rather than failing the request.
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (env.RATE_LIMIT) {
      const key = `rl:${ip}`;
      const count = Number((await env.RATE_LIMIT.get(key)) || 0);
      if (count >= 5) {
        return json({ ok: false, error: 'Too many submissions. Please try again later.' }, 429, origin);
      }
      ctx.waitUntil(env.RATE_LIMIT.put(key, String(count + 1), { expirationTtl: 600 }));
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: 'Invalid request.' }, 400, origin);
    }

    // Honeypot: a hidden field no human fills in.
    if (clean(body.website, 200)) return json({ ok: true }, 200, origin);

    const name = clean(body.name, 120);
    const email = clean(body.email, 200);
    const message = clean(body.message, 5000);
    const company = clean(body.company, 160) || 'Not provided';
    const phone = clean(body.phone, 60) || 'Not provided';

    if (!name || !message) return json({ ok: false, error: 'Name and message are required.' }, 400, origin);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return json({ ok: false, error: 'A valid email address is required.' }, 400, origin);
    }

    if (!env.ZOHO_USER || !env.ZOHO_PASS) {
      console.error('ZOHO_USER / ZOHO_PASS secrets are not set.');
      return json({ ok: false, error: 'Mail is not configured.' }, 500, origin);
    }

    try {
      // Inside the try: if the runtime ever fails to provide the socket module,
      // that must surface as the same clean 502, not an unhandled rejection.
      const { connect } = await import('cloudflare:sockets');
      await sendMail({
        connect,
        user: env.ZOHO_USER,
        pass: env.ZOHO_PASS,
        // Zoho only accepts the authenticated mailbox as the envelope sender,
        // which is also what keeps SPF and DKIM aligned for the domain.
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
      return json({ ok: true }, 200, origin);
    } catch (err) {
      // The SMTP error names the host and account — log it, never return it.
      console.error('Zoho send failed:', err && err.message);
      return json({ ok: false, error: 'Could not send right now.' }, 502, origin);
    }
  },
};
