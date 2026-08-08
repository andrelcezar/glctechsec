# Contact form relay — Zoho Mail SMTP

## Why this folder exists

`glctechsec.com` is a **static site on GitHub Pages**. Every file in the repo is
served verbatim to the visitor's browser, so anything put in `index.html` is
public — including, if you put it there, an SMTP password. Browsers also cannot
speak SMTP: it is raw TCP on port 465/587, not HTTP.

This function is the smallest piece of server that solves both. The browser
POSTs JSON to it over HTTPS; only this function holds the Zoho credential.

**The password is never committed.** It lives in the host's encrypted
environment variables. `.env` is gitignored.

---

## Before you deploy: the credential

1. **Rotate the password if it has ever been pasted anywhere** — chat, email,
   a ticket, a screenshot. In Zoho, the SMTP password is usually the account
   password, which means it grants *mailbox read access*, not just sending.
2. Turn on two-factor authentication:
   Zoho Mail → **Settings → Security → Two-Factor Authentication**.
3. Generate an **app-specific password**:
   Zoho Mail → **Settings → Security → App Passwords → Generate New Password**.
   Use that string below, never the account password. It can be revoked on its
   own without locking you out of the mailbox.

---

## Deploy (Vercel — free tier is enough)

```bash
cd serverless
npx vercel            # first run links the project
npx vercel --prod
```

Then set the three variables (**Project → Settings → Environment Variables**,
or on the CLI):

```bash
npx vercel env add ZOHO_USER production     # contact@glctechsec.com
npx vercel env add ZOHO_PASS production     # the app-specific password
npx vercel env add CONTACT_TO production    # contact@glctechsec.com
npx vercel --prod                           # redeploy so they take effect
```

Vercel gives you a URL like `https://glctech-contact-relay.vercel.app`.

## Switch the site over

One line in `index.html`:

```js
var CONTACT_ENDPOINT = 'https://glctech-contact-relay.vercel.app/api/contact';
```

While that string is empty the form keeps using FormSubmit, so there is no
window where the form is dead. Set it, deploy, send a test enquiry, confirm it
lands in the Zoho inbox — then you are done.

To roll back, blank the string again.

---

## Settings used

From the Zoho panel, the outgoing (SMTP) column:

| Setting | Value |
|---|---|
| Host | `smtppro.zoho.com` |
| Port | `465` |
| Encryption | implicit TLS (`secure: true`) |
| Auth | required |

Port 587 with STARTTLS also works — change `port` to `587` and `secure` to
`false` in `api/contact.js` if your host blocks 465.

The `From` header is the authenticated mailbox. Zoho rejects anything else, and
it is what keeps SPF and DKIM aligned for the domain. The visitor's address goes
in `Reply-To`, so hitting reply in Zoho answers the enquirer directly.

## What the function refuses

| Case | Response |
|---|---|
| Origin not `glctechsec.com` / `www.glctechsec.com` | `403` |
| Method other than POST/OPTIONS | `405` |
| Missing name or message | `400` |
| Malformed email | `400` |
| Hidden `website` field filled (bot) | `200`, silently discarded |
| More than 5 submissions per IP per 10 min | `429` |
| SMTP failure | `502`, with the real error logged server-side only |

The SMTP error is deliberately not echoed to the browser — it leaks the host
and account name.

## Local testing

```bash
cd serverless
cp .env.example .env      # fill in a real app password; .env is gitignored
npm install
npx vercel dev
```

## Alternative hosts

The handler is a plain `(req, res)` function. It runs unchanged on Netlify
Functions and Cloudflare Pages Functions with a thin wrapper. Cloudflare
*Workers* are the exception — their runtime has no Node TCP stack, so
`nodemailer` will not run there; use Zoho's ZeptoMail HTTP API instead if you
want Workers specifically.
