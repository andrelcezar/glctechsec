/**
 * Contact form relay — Zoho Mail SMTP.
 *
 * WHY THIS EXISTS
 * The website is a static site on GitHub Pages. Every file it publishes is
 * served verbatim to the visitor's browser, so an SMTP password placed in the
 * site would be readable by anyone via "view source". Browsers also cannot
 * speak SMTP at all — it is raw TCP, not HTTP.
 *
 * This function is the smallest possible piece of server that fixes both: the
 * browser POSTs JSON here over HTTPS, and only this function — which nobody can
 * read the source of — holds the credential and talks to Zoho.
 *
 * The credential is NEVER committed. It lives in the platform's encrypted
 * environment variables (see README.md in this folder).
 */
const nodemailer = require('nodemailer');

const ALLOWED_ORIGINS = [
  'https://glctechsec.com',
  'https://www.glctechsec.com',
];

// Zoho throttles hard on auth failures, and an open relay invites abuse.
// A tiny in-memory bucket blocks the obvious flooding case. It resets when the
// function goes cold, which is fine — it is a speed bump, not a security
// boundary. The real boundary is that the credential is not public.
const hits = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin);

  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  if (!allowed) return res.status(403).json({ ok: false, error: 'Origin not allowed' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) {
    return res.status(429).json({ ok: false, error: 'Too many submissions. Please try again later.' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

  // Honeypot: a hidden field no human fills in. Bots fill everything.
  if (clean(body.website, 200)) return res.status(200).json({ ok: true });

  const name = clean(body.name, 120);
  const email = clean(body.email, 200);
  const message = clean(body.message, 5000);
  const company = clean(body.company, 160) || 'Not provided';
  const phone = clean(body.phone, 60) || 'Not provided';

  if (!name || !message) return res.status(400).json({ ok: false, error: 'Name and message are required.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'A valid email address is required.' });
  }

  const { ZOHO_USER, ZOHO_PASS, CONTACT_TO } = process.env;
  if (!ZOHO_USER || !ZOHO_PASS) {
    console.error('ZOHO_USER / ZOHO_PASS are not set in the environment.');
    return res.status(500).json({ ok: false, error: 'Mail is not configured.' });
  }

  const transport = nodemailer.createTransport({
    host: 'smtppro.zoho.com',
    port: 465,
    secure: true,               // implicit TLS, per Zoho's "465 com SSL"
    auth: { user: ZOHO_USER, pass: ZOHO_PASS },
  });

  try {
    await transport.sendMail({
      // The envelope sender must be the authenticated mailbox or Zoho rejects
      // it — that is also what keeps SPF/DKIM aligned for the domain.
      from: `"GLCTech website" <${ZOHO_USER}>`,
      to: CONTACT_TO || ZOHO_USER,
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
    return res.status(200).json({ ok: true });
  } catch (err) {
    // Never echo the SMTP error to the browser — it leaks host and account detail.
    console.error('Zoho send failed:', err && err.message);
    return res.status(502).json({ ok: false, error: 'Could not send right now.' });
  }
};
