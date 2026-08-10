# Contact form on Cloudflare — Worker + Zoho Mail SMTP

This is the recommended relay. It removes the third-party form service entirely:
enquiries go straight from the visitor's browser to a Cloudflare Worker, which
authenticates to Zoho and sends the mail from your own mailbox.

## Why a Worker instead of putting SMTP in the page

`glctechsec.com` is a static site on GitHub Pages — every published file is
served verbatim to the visitor, so an SMTP password in `index.html` would be
readable via "view source". Browsers also cannot speak SMTP; it is raw TCP.

The Worker is the smallest piece of server that fixes both. The credential lives
in Cloudflare's encrypted secrets, never in the repository.

## Why not nodemailer

Workers have no Node TCP stack, so `nodemailer` cannot run there. What Workers
do have is `connect()` from `cloudflare:sockets`. Zoho's port 465 is *implicit*
TLS — encrypted from the first byte, no STARTTLS upgrade — which makes the
exchange short enough to implement directly in `src/smtp.js` (about 100 lines).

That module takes `connect` as a parameter rather than importing it, so the
whole dialogue is driven by a mock in `tests/smtp.test.js`: happy path,
multi-line replies, replies split across TCP chunks, auth failure, refused
recipient, bad greeting, dot-stuffing, and header injection.

---

## 1. Credential

Do this first.

1. **Rotate the Zoho password if it has ever been pasted anywhere** — chat,
   e-mail, a screenshot. In Zoho the SMTP password is normally the account
   password, which grants mailbox *read* access, not just sending.
2. Zoho Mail → **Settings → Security → Two-Factor Authentication** → enable.
3. Zoho Mail → **Settings → Security → App Passwords → Generate New Password**.
   Use that string below. It can be revoked on its own.

## 2. Deploy

```bash
cd serverless/cloudflare
npm install
npx wrangler login
npx wrangler deploy
```

Set the secrets (encrypted; they never touch the repo):

```bash
npx wrangler secret put ZOHO_USER      # contact@glctechsec.com
npx wrangler secret put ZOHO_PASS      # the app-specific password
npx wrangler secret put CONTACT_TO     # contact@glctechsec.com
```

Optional flood guard — the Worker runs fine without it:

```bash
npx wrangler kv namespace create RATE_LIMIT
# paste the printed id into wrangler.toml and uncomment the block
npx wrangler deploy
```

Wrangler prints a URL like `https://glctech-contact.<subdomain>.workers.dev`.

## 3. Point the site at it

One line in `index.html`:

```js
var CONTACT_ENDPOINT = 'https://glctech-contact.<subdomain>.workers.dev';
```

While that string is empty the form uses the previous path, so there is never a
window with a dead form. Set it, deploy the site, send a test enquiry, confirm
it lands in the Zoho inbox. To roll back, blank the string.

If your DNS is already on Cloudflare you can put the Worker on your own domain
instead (`Workers & Pages → your worker → Settings → Domains & Routes`), e.g.
`https://api.glctechsec.com/contact`. That avoids a cross-origin request
entirely.

---

## What it refuses

| Case | Response |
|---|---|
| Origin not `glctechsec.com` / `www.glctechsec.com` | `403` |
| Method other than POST/OPTIONS | `405` |
| Malformed JSON | `400` |
| Missing name or message | `400` |
| Malformed e-mail | `400` |
| Hidden `website` field filled (bot) | `200`, silently discarded |
| More than 5 per IP per 10 min (needs KV) | `429` |
| Any SMTP failure | `502`, real error logged server-side only |

The SMTP error is never returned to the browser — it names the host and the
account.

## Notes

- `From` is the authenticated mailbox. Zoho rejects anything else, and it is
  what keeps SPF and DKIM aligned for the domain. The enquirer goes in
  `Reply-To`, so replying in Zoho answers them directly.
- If Cloudflare ever blocks outbound 465 on your account, switch to 587: that
  is STARTTLS, so `src/smtp.js` would need an upgrade step added after EHLO.
  465 is the simpler path and is what the code does today.
- Logs: `npx wrangler tail` shows the real SMTP errors during setup.

## Local development

```bash
cp .dev.vars.example .dev.vars     # fill in a real app password; gitignored
npx wrangler dev
```

## The other relay

`serverless/api/contact.js` is the same thing for Vercel/Netlify, using
`nodemailer`. Deploy whichever host you prefer — they expose an identical
contract, so `CONTACT_ENDPOINT` is the only thing that changes.
