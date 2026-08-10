# Revision 3 — Full audit, image replacement and rebuild

Everything below was found by auditing the previous build, not requested feature
by feature. Items marked **⚠ needs you** cannot be closed without a decision or
an asset only you can supply.

---

## 1. Imagery — the headline problem

Every photographic asset in the previous build was AI-generated, and several
carried errors that a prospect could spot.

| Asset | What was wrong | Now |
|---|---|---|
| `hero/zabbix_fk.webp` | Invented Portuguese labels (*"COMEÇO PROBLEMAS DISPONIBILIDANDE"*, *"USO DE MEMORIA SERVIDOVES UTILIZADO/COMPRNEL"*, *"Trodogo Rascitalib V etviado"*). Time axis not sequential (15:00, 15:00, 10:00, 17:00…) and included **18:60**, not a valid time. CPU at 93 shown in green. | `hero/glc-noc-dashboard.svg` — hand-built, English, sequential 09:00→15:00, internally consistent figures |
| `services/veeam.webp` | Wordmark misspelt **"VEEEAM"**; cyan palette, off-brand | `services/glc-backup-continuity.svg` |
| `services/kaspersky.webp` | Teal/green, off-brand, and led with a single vendor logo — contradicting the vendor-agnostic copy directly beneath it | `services/glc-endpoint-security.svg`, which *shows* the platform choice |
| `team/eu3.webp`, `team/tchize.webp` | Visible AI-generator watermark (bottom-right sparkle); garbled text on book spines and certificates; two portraits with unrelated lighting and framing | Brand monogram cards — see §2 |
| `hero/escritorio.webp` | AI office interior with a Portuguese wall sign, used with `alt="Equipe GLCTech"` while showing nobody; warm beige clashed with the charcoal palette | `hero/glc-monitored-estate.svg` |
| `logo/new_logo.png` | Portuguese tagline "MONITORAMENTO E SEGURANÇA EM TI" on an English site; the mark's dark-grey arcs were near-invisible on the `#2d2d2d` nav | `logo/glctech-logo.png` — tagline removed, arcs lifted for contrast |

The four new illustrations are SVG, built from the site's own tokens
(`#2d2d2d` / `#e6262c` / Syne / DM Sans). They are ~15–20 KB each, sharp at any
resolution, and every number in them is internally consistent — the 3 open
problems match the "2 warning · 1 average" subtitle, and db-01 at 83% memory
matches the "Memory usage above 80%" event.

Generators live in `tools/` so the figures can be edited without redrawing.

### ⚠ needs you
**Get real founder photographs taken.** The monograms are an honest interim, not
a destination. An "About the team" section on a *cybersecurity* site is exactly
where a prospect looks for proof that real people are behind the service. To
switch back: restore the `<img class="team-card-img">` markup in `index.html`
(the CSS rule is still there, commented) and drop the files into `assets/team/`.

---

## 2. Bugs fixed

**Rendering**
- The homepage `<h1>` rendered **entirely red**: `.hero-content h1 span` matched
  every i18n fragment span, not just the accent word. It also read *"Total
  Visibility of Your Infrastructure IT"* — the four keys were ordered for
  Portuguese grammar. Replaced with one `hero.h1` key per locale so each
  language orders its own words.
- `services.h2` printed a literal `\n` on screen in all six locales (the value
  is injected with `innerHTML`). Now `<br>`.
- The nav logo overflowed narrow viewports: at `height:70px` the wordmark is
  ~405px wide, wider than a 390px phone, which pushed **the hamburger button
  off-screen entirely**. Capped and made responsive.
- Below 720px the origin strip switched to `position:static` while the nav
  stayed `fixed`, so the nav sat on top of it.
- `width`/`height` attributes without `height:auto` letterboxed the new SVGs.

**JavaScript**
- `localStorage` was called unguarded in `detectLang()`. It *throws* (not
  returns null) in private mode and when cookies are blocked — that took the
  whole translation layer down. Wrapped in `safeGet`/`safeSet`.
- `fetch('/assets/data/stats.json')` used a root-absolute path; broke on any
  non-root deploy. Now relative.
- `zabbix.html` listened for `change` on `#lang-switcher` — an element that has
  never existed on the page, so plan prices never re-rendered on a language
  change. `kaspersky.html` and `veeam.html` had no refresh hook at all. All
  three now listen for a new `glc:langchange` event dispatched by `i18n.js`.
- `getKey()` fell through to `data-i18n-attr`, whose value is the attribute
  *name* (`"placeholder"`), and looked that up as a translation key.
- The language preference was written to storage on first *automatic*
  detection, freezing the language even for users who never chose one. Now only
  an explicit choice is persisted.

**Consistency**
- `kaspersky.html` used a Font Awesome icon but never loaded the library.
- `about-the-group.html` and `trust-compliance.html` loaded neither `i18n.js`
  nor the chat widget — no language switcher on two nav-linked pages.
- Two different Tidio workspaces were in use: `index.html` on one key, all other
  pages on another. Unified.
- Footer read © 2025.
- The contact form emailed itself in Portuguese (`"Novo contato pelo site"`,
  `"Não informado"`) from an English-language site.

---

## 3. Performance

Bundle: **24 MB → 1.4 MB**.

- `kaspersky.html`, `veeam.html` and `zabbix.html` each loaded a 1.3–1.8 MB PNG
  when a visually identical 32–56 KB WebP sat beside it — ~4.9 MB wasted on
  three page loads.
- Of ~40 image files, only 11 were referenced. ~22 MB was never served.
- All below-fold images now `loading="lazy"` + `decoding="async"`; hero images
  are `fetchpriority="high"`.
- `width`/`height` on every image, so nothing shifts as the page loads.
- Added `preconnect` to `fonts.gstatic.com` — without the crossorigin hint the
  existing `googleapis.com` preconnect did almost nothing.

---

## 4. SEO

Six pages (`index`, `kaspersky`, `veeam`, `zabbix`, `politica`, `termos`) had
**no meta description, no canonical, no Open Graph and no favicon** — despite
the previous README claiming all of it was done.

- Full head metadata on all nine pages.
- Favicon set generated from the logo mark (`.ico`, 32px, 180px apple-touch).
  A `favicon.png` existed in the repo and was never linked.
- `og:image` rendered to 1200×630 PNG — social platforms don't render SVG. The
  careers page previously used a *relative* `og:image`, which is invalid.
- `robots.txt`, `sitemap.xml`, and `Organization` JSON-LD listing both offices.

---

## 5. Accessibility

- Skip-to-content link and visible `:focus-visible` rings on every page.
- `prefers-reduced-motion` respected site-wide.
- `--gray-dark` was `#606060` on `#2d2d2d` — roughly **1.9:1**, far below the
  4.5:1 floor. Now `#8d8d8d`.
- The contact block was a `<div>`, not a `<form>`: no Enter-to-submit, no
  autofill. Now a real form with `required`, `autocomplete` and `aria-invalid`.
- Errors and the success state announce via `role="alert"` / `role="status"`.
- Hamburger exposes `aria-expanded`/`aria-controls`, closes on Escape and
  returns focus to the trigger.
- The language switcher only mounted into `.nav-links`, which is
  `display:none` below 900px — **invisible on mobile**. A second instance now
  mounts in the drawer, with the ID collisions that caused converted to classes.
- Decorative icons marked `aria-hidden`.

---

## 6. Tests

`tests/quality.test.js` adds 106 regression tests covering every fix above, so
none of it can come back silently. Total suite: **168 passing**.

The icon tests are the strict ones: they assert no emoji anywhere, that every
`::before` glyph rule ends with `font-family: "Font Awesome 6 Free"` **and**
`font-weight: 900` (FA solid renders at neither default), and that no icon sits
inside an `innerHTML`-translated node.

The pre-existing 63 tests all passed against the broken build — they only
checked link resolution and JSON validity, which is why none of this was caught.

---

## 7. Iconography — standardised on Font Awesome

The site was running three icon systems at once: Font Awesome on four pages, raw
emoji on three, and CSS text glyphs (`✓ × →`) in every list. Emoji are rendered
by the OS as full-colour bitmaps — they ignore the brand palette entirely and
look different on Windows, macOS, Android and iOS.

- **Font Awesome 6.5.2 now loads on all nine pages** (was four), with a
  `preconnect` to the CDN.
- **21 emoji replaced** with mapped icons: `📊`→`fa-chart-line`,
  `🛡️`→`fa-shield-halved`, `⚡`→`fa-bolt`, `🔁`→`fa-arrows-rotate`,
  `🖥️`→`fa-desktop`, `✉️`→`fa-envelope`, `📍`→`fa-location-dot`, and so on.
- **The `🇧🇷` flag** in the testimonials rendered as a grey "BR" box on Windows,
  which has no glyph for regional-indicator pairs. Replaced with an icon plus
  the country name.
- **List glyphs now come from the icon font too** — `content: '\f00c'` /
  `'\f00d'` / `'\f105'` instead of literal `✓ × →`, so ticks and arrows can
  never fall back to a system typeface.
- **`politica.html` and `termos.html` had no icons at all.** Added to section
  headings, the table of contents, hero metadata and contact blocks.
- Every icon is `aria-hidden="true"` — decorative, not announced.

Two bugs surfaced while doing this:

1. **Icons inside `data-i18n-html` nodes would vanish.** That attribute writes
   via `innerHTML`, so the `<i>` was destroyed the moment a visitor switched
   language. Icons now sit outside the translated node.
2. **`crossorigin="anonymous"` on the stylesheet blocked it entirely** under
   `file://` and made the whole icon set silently invisible in local preview.
   Removed — it belongs on the `preconnect`, not the stylesheet.
3. **`politica.html` and `termos.html` still had the nav-logo overflow bug**, hidden
   behind an inline `style="height:70px"` that beat the responsive rule.

---

## 8. Contact form was delivering to the wrong company

Reported after the icon pass: enquiries were arriving at
`contato@glctech.com.br` instead of `contact@glctechsec.com`.

The address was **not in the code anywhere**. The form used Web3Forms, whose
access key determines the recipient server-side — the key in the page was
generated against the old Brazilian address, so the destination was invisible
to anyone reading `index.html`. The site's own docs recorded it, which is how it
was traced.

Switched to FormSubmit.co, which puts the destination in the request URL:

```js
var CONTACT_EMAIL = 'contact@glctechsec.com';
fetch('https://formsubmit.co/ajax/' + CONTACT_EMAIL, …)
```

That is now one greppable line, it matches what `trabalhe-conosco.html` already
did, and two tests assert it — one on the destination, one forbidding any
routing address outside `glctechsec.com`.

Verified by submitting the form with the network intercepted: the POST goes to
`https://formsubmit.co/ajax/contact@glctechsec.com`, the success state renders,
and the failure path re-enables the button and shows an error.

### ⚠ needs you
**Click the activation link once.** FormSubmit sends a confirmation e-mail to
`contact@glctechsec.com` on the first real submission. Until that link is
clicked, the API returns success but nothing is delivered — so send one test
enquiry from the live site and confirm it arrives before you rely on the form.

Also cleaned up: `docs/INTEGRATIONS.md`, `docs/ARCHITECTURE.md` and
`docs/CONTENT-EDITING.md` all documented the old address, and the Portuguese
e-mail placeholder read `seu@email.com.br`.

---

## 9. Zoho Mail SMTP — relay, not credentials in the page

Requested: send the contact form through Zoho Mail SMTP, with the mailbox
password supplied.

**That password cannot go in this repository.** The site is static on GitHub
Pages: every published file is served verbatim to the visitor's browser, so an
SMTP password in `index.html` is readable via "view source". Browsers cannot
speak SMTP in any case — it is raw TCP on 465/587, not HTTP.

Added `serverless/` — a single function that holds the credential server-side:

- `smtppro.zoho.com:465`, implicit TLS, authenticated as the mailbox.
- `From` is the authenticated mailbox (Zoho rejects anything else, and it keeps
  SPF/DKIM aligned); the enquirer goes in `Reply-To`.
- Credential comes from `process.env`, never a literal. `.env` is gitignored.
- Refuses foreign origins (403), non-POST (405), invalid input (400), bots via a
  hidden honeypot field (silent 200), and floods at 5/IP/10 min (429).
- SMTP errors are logged server-side and never echoed to the browser, which
  would leak the host and account name.

The site keeps working throughout: `CONTACT_ENDPOINT` in `index.html` is blank
by default and the form stays on FormSubmit. Setting it to the deployed URL
switches to Zoho; blanking it rolls back. Both paths were tested in a browser
with the network intercepted.

Five tests now cover credential hygiene, including one that greps the whole
tree for committed secrets.

### ⚠ needs you
1. **Rotate the Zoho password.** It was shared in chat, so treat it as
   compromised. In Zoho the SMTP password is normally the account password —
   that is mailbox *read* access, not just sending.
2. **Enable 2FA, then generate an app-specific password** (Settings → Security →
   App Passwords) and use that for the relay. It can be revoked on its own.
3. Deploy the relay and set `CONTACT_ENDPOINT`. Steps in
   `serverless/README.md`.

---

## 10. Cloudflare Worker — the form's own mail path

Reported: the form was showing "Error sending". FormSubmit requires a one-time
activation click on the first submission, and until that happens its API
reports failure — which is what the page was surfacing.

Rather than chase the activation, the form now has a Cloudflare option that
drops the third-party service entirely: `serverless/cloudflare/`.

**Why not nodemailer.** Workers have no Node TCP stack, so it cannot run there.
Workers do have `connect()` from `cloudflare:sockets`, and Zoho's port 465 is
*implicit* TLS — encrypted from the first byte, no STARTTLS to negotiate — so
`src/smtp.js` implements the exchange directly in about 100 lines.

`connect` is injected rather than imported, which makes the protocol testable
without a network. `tests/smtp.test.js` drives it against a mock Zoho across ten
cases: command order, implicit TLS on 465, multi-line `250-` replies, a reply
split across TCP chunks, the lone-dot terminator, dot-stuffing a body line that
begins with `.`, CRLF stripped from headers so `Bcc:` cannot be injected via the
subject, auth failure that does not echo the password, refused recipient, and a
bad greeting.

`tests/worker.test.mjs` covers the eight guards around it. One of those tests
found a real bug: `import('cloudflare:sockets')` sat outside the `try`, so a
runtime failure there would have escaped as an unhandled rejection instead of
the clean 502. Moved inside.

The site still cannot break during the switch — `CONTACT_ENDPOINT` is blank by
default and the form keeps its current path until you set it.

### ⚠ needs you
Rotate the Zoho password (it was shared in chat), enable 2FA, generate an
**app-specific password**, then follow `serverless/cloudflare/README.md`. The
credential goes into Wrangler secrets and never into the repository.

---

## 11. Cloudflare deploy — failing build, and a leak it would have caused

The Cloudflare build failed with:

```
✘ [ERROR] Asset too large.
  We found a file /opt/buildhome/repo/node_modules/workerd/bin/workerd
  with a size of 122 MiB.
```

Cause: the project was set up with `assets.directory = "."`, so the deploy
uploaded the whole repository — including the `node_modules` that wrangler had
just installed. It read 2126 files.

**The size was the lesser problem.** With the repo root as the asset directory,
`tests/`, `docs/`, `serverless/` source and any `.dev.vars` sitting in the tree
would have been served publicly at `glctechsec.com/...`.

Fixed with an explicit build rather than an ignore list:

- `scripts/build.mjs` assembles `dist/` from an **allowlist**. Anything not
  named is not published, so a new private file cannot leak by being forgotten.
  It fails the build if a listed page is missing, and refuses any asset over
  Cloudflare's 25 MiB limit before the upload gets that far.
- `wrangler.toml` (replacing the generated `wrangler.jsonc`) points
  `assets.directory` at `./dist`.
- Result: **27 files, 1.2 MB**, down from 2126 files.

### The form moved into the same deploy

Since the site is now a Worker, the contact endpoint lives with it:
`worker/index.js` handles `/api/contact` and falls through to the static assets
for everything else.

That makes the form **same-origin** — `CONTACT_ENDPOINT = '/api/contact'`. No
CORS preflight, no second URL to keep in sync, one deploy. The standalone
relays in `serverless/` remain for anyone who wants to host the endpoint apart
from the site.

Eight tests cover the routing: static fall-through, same-origin accepted,
missing `Origin` accepted (browsers may omit it same-origin), cross-origin
refused, GET refused, validation, honeypot, fail-closed without secrets, and
SMTP failure returning a clean 502.

### ⚠ needs you
```bash
npx wrangler secret put ZOHO_USER     # contact@glctechsec.com
npx wrangler secret put ZOHO_PASS     # app-specific password, not the account one
npx wrangler secret put CONTACT_TO    # contact@glctechsec.com
npm run deploy
```
Set Cloudflare's build command to `npm run build` and leave the deploy command
as `npx wrangler deploy`.

---

## ⚠ Still open — needs a human decision

1. **Founder photographs** (§1). The most important one.
2. **Cyber Essentials** is published as "in progress" with no date.
   UK procurement will ask when.
3. **`trust-compliance.html` describes commitments, not audited status.** The
   DPA, insurance certificate and 72-hour breach process need to be confirmed as
   accurate before this page is read by real UK prospects — it is the page most
   likely to be relied on in a vendor questionnaire.
4. **DE/ES/FR/IT are stale.** They still carry the old Kaspersky-default wording
   and have no keys for the Sectors, Trust or About-the-Group content, which
   falls back to English. If those locales matter, they need a translation pass;
   if they don't, removing them from the switcher is more honest than showing a
   half-translated page.
5. **Web3Forms key is live in the HTML** (`524f9ef9-…`). That's normal for the
   service, but it is public — keep the spam filters on in their dashboard.
6. **Testimonials are Brazil-only**, disclosed as such. Worth revisiting once
   you have the first UK reference.
