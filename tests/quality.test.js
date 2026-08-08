/**
 * Regression tests for the revision 3 audit fixes.
 * Each block here corresponds to a bug that shipped in the previous build —
 * the point is that none of them can come back silently.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PAGES = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

/** Same file with HTML and CSS comments removed, for checks that scan markup. */
const readMarkup = (f) =>
  read(f).replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

/* ── SEO / metadata ─────────────────────────────────────────────────────── */

for (const page of PAGES) {
  test(`${page}: has a meta description`, () => {
    assert.match(read(page), /<meta name="description" content="[^"]{60,}">/);
  });

  test(`${page}: has a canonical URL`, () => {
    assert.match(read(page), /<link rel="canonical" href="https:\/\/glctechsec\.com\//);
  });

  test(`${page}: has favicon links`, () => {
    const s = read(page);
    assert.match(s, /rel="icon"/, 'no <link rel="icon">');
    assert.match(s, /rel="apple-touch-icon"/, 'no apple-touch-icon');
  });

  test(`${page}: og:image is an absolute non-SVG URL`, () => {
    const m = read(page).match(/<meta property="og:image" content="([^"]+)"/);
    assert.ok(m, 'no og:image');
    assert.ok(m[1].startsWith('https://'), `og:image must be absolute, got ${m[1]}`);
    assert.ok(!m[1].endsWith('.svg'), 'social platforms do not render SVG og:image');
  });
}

/* ── assets ─────────────────────────────────────────────────────────────── */

test('no page references a removed or AI-generated asset', () => {
  const banned = [
    'zabbix_fk',        // invented Portuguese dashboard labels, broken time axis
    'escritorio',       // AI office interior with a Portuguese wall sign
    'new_logo.png',     // logo carrying the Portuguese tagline
    'services/veeam',   // wordmark misspelt "VEEEAM"
    'services/kaspersky', // off-palette, contradicted the vendor-agnostic copy
    'assets/team/',     // portraits carried a visible AI generator watermark
  ];
  for (const page of PAGES) {
    const s = read(page);
    for (const b of banned) {
      assert.ok(!s.includes(b), `${page} still references ${b}`);
    }
  }
});

test('every local asset referenced by a page exists on disk', () => {
  const re = /(?:src|href)="\.\/([^"]+)"/g;
  for (const page of PAGES) {
    const s = read(page);
    let m;
    while ((m = re.exec(s))) {
      const target = m[1].split('?')[0].split('#')[0];
      assert.ok(fs.existsSync(path.join(ROOT, target)), `${page} -> missing ${target}`);
    }
  }
});

test('every <img> carries alt text', () => {
  for (const page of PAGES) {
    for (const tag of readMarkup(page).match(/<img\b[^>]*>/g) || []) {
      assert.match(tag, /\balt="/, `${page}: <img> without alt -> ${tag.slice(0, 90)}`);
    }
  }
});

/* ── consistency across pages ───────────────────────────────────────────── */

test('a page that uses Font Awesome icons also loads Font Awesome', () => {
  for (const page of PAGES) {
    const s = read(page);
    if (/class="fa-(solid|regular|brands)/.test(s)) {
      assert.match(s, /font-awesome/, `${page} uses FA icons but never loads the library`);
    }
  }
});

test('all pages load the translation engine', () => {
  for (const page of PAGES) {
    assert.match(read(page), /scripts\/i18n\.js/, `${page} has no i18n`);
  }
});

test('one chat workspace across the whole site', () => {
  const keys = new Set();
  for (const page of PAGES) {
    for (const m of read(page).matchAll(/code\.tidio\.co\/([a-z0-9]+)\.js/g)) keys.add(m[1]);
  }
  assert.strictEqual(keys.size, 1, `expected one Tidio key, found ${[...keys].join(', ')}`);
});

test('no page uses a root-absolute fetch path', () => {
  for (const page of PAGES) {
    assert.ok(!read(page).includes("fetch('/assets"), `${page} breaks on a non-root deploy`);
  }
});

test('element IDs are unique within each page', () => {
  for (const page of PAGES) {
    const ids = [...readMarkup(page).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    const dupes = ids.filter((v, i) => ids.indexOf(v) !== i);
    assert.deepStrictEqual([...new Set(dupes)], [], `${page} has duplicate IDs`);
  }
});

/* ── translations ───────────────────────────────────────────────────────── */

const i18n = fs.readFileSync(path.join(ROOT, 'scripts', 'i18n.js'), 'utf8');

test('no translation value contains a literal backslash-n', () => {
  // These are injected with innerHTML, so "\n" rendered on screen as text.
  const hits = [...i18n.matchAll(/'([\w.]+)':\s*'[^']*\\n/g)].map((m) => m[1]);
  assert.deepStrictEqual(hits, [], `literal \\n in: ${hits.join(', ')}`);
});

test('localStorage access is guarded', () => {
  // Unguarded, this throws in private mode and takes the whole page down.
  assert.match(i18n, /function safeGet/, 'no safeGet guard');
  assert.match(i18n, /function safeSet/, 'no safeSet guard');
  const raw = [...i18n.matchAll(/(?<!try \{ )localStorage\.(get|set)Item/g)];
  assert.ok(raw.length <= 2, 'unguarded localStorage call outside the safe helpers');
});

test('the language switcher mounts on mobile too', () => {
  // .nav-links is display:none below 900px, so a nav-only switcher is unreachable.
  assert.match(i18n, /\.mobile-menu/, 'switcher never mounts into the mobile drawer');
});

test('switcher styling uses classes, not IDs (two instances now exist)', () => {
  assert.ok(!i18n.includes("'#glc-lang-btn {'"), 'ID selectors would collide across instances');
});

/* ── contact form ───────────────────────────────────────────────────────── */

test('the contact form is a real <form> with required fields', () => {
  const s = read('index.html');
  assert.match(s, /<form id="contact-form"/, 'not a <form>, so Enter does not submit');
  for (const id of ['nome', 'email', 'mensagem']) {
    assert.match(s, new RegExp(`id="${id}"[^>]*required`), `#${id} is not marked required`);
  }
});

test('the English site does not email itself in Portuguese', () => {
  const s = read('index.html');
  for (const phrase of ['Novo contato pelo site', 'Não informado', 'Erro ao enviar']) {
    assert.ok(!s.includes(phrase), `Portuguese string still in the form payload: ${phrase}`);
  }
});

/* ── accessibility ──────────────────────────────────────────────────────── */

test('every page offers a skip link and respects reduced motion', () => {
  for (const page of PAGES) {
    const s = read(page);
    assert.match(s, /class="skip-link"/, `${page} has no skip link`);
    assert.match(s, /prefers-reduced-motion/, `${page} ignores reduced-motion`);
  }
});

test('the mobile menu button exposes its state', () => {
  assert.match(read('index.html'), /id="hamburger"[^>]*aria-expanded/);
});

test('body text colour clears the WCAG contrast floor', () => {
  // #606060 on #2d2d2d measured ~1.9:1.
  for (const page of PAGES) {
    assert.ok(!read(page).includes('#606060'), `${page} still uses the failing grey`);
  }
});

/* ── build hygiene ──────────────────────────────────────────────────────── */

test('sitemap and robots are present and agree', () => {
  const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  const robots = fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8');
  assert.match(robots, /Sitemap: https:\/\/glctechsec\.com\/sitemap\.xml/);
  for (const page of PAGES) {
    if (page === 'index.html') continue;
    assert.ok(sitemap.includes(page), `${page} missing from sitemap.xml`);
  }
});

test('the copyright year is current', () => {
  const year = new Date().getFullYear();
  for (const page of PAGES) {
    const m = read(page).match(/©\s*(\d{4})/);
    if (m) assert.strictEqual(Number(m[1]), year, `${page} shows © ${m[1]}`);
  }
});

test('no asset in the bundle is oversized for the web', () => {
  const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
  for (const f of walk(path.join(ROOT, 'assets'))) {
    const kb = fs.statSync(f).size / 1024;
    assert.ok(kb < 400, `${path.relative(ROOT, f)} is ${Math.round(kb)} KB`);
  }
});

/* ── iconography ────────────────────────────────────────────────────────── */

test('every page loads Font Awesome', () => {
  for (const page of PAGES) {
    assert.match(read(page), /font-awesome\/6\.5\.2/, `${page} does not load Font Awesome`);
  }
});

test('every page actually uses Font Awesome icons', () => {
  for (const page of PAGES) {
    const n = (readMarkup(page).match(/class="fa-(solid|regular|brands)/g) || []).length;
    assert.ok(n > 0, `${page} loads Font Awesome but renders no icons`);
  }
});

test('no emoji is used as an icon', () => {
  // Emoji render as full-colour OS bitmaps: they ignore the brand palette and
  // differ across Windows, macOS, Android and iOS.
  const emoji = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;
  for (const page of PAGES) {
    const hit = read(page).match(emoji);
    assert.strictEqual(hit, null, `${page} still contains emoji: ${hit && hit[0]}`);
  }
});

test('list glyphs come from Font Awesome, not system text', () => {
  for (const page of PAGES) {
    const s = read(page);
    for (const m of s.matchAll(/([.#][\w-]+[^{]*)::before \{([^}]*)\}/g)) {
      const body = m[2];
      if (!/content:\s*'\\f/.test(body)) continue;
      // FA solid only renders at weight 900 with its own family; a later
      // font-family/font-weight in the same rule silently breaks the glyph.
      const fam = [...body.matchAll(/font-family:\s*([^;]+)/g)].pop();
      const wgt = [...body.matchAll(/font-weight:\s*([^;]+)/g)].pop();
      assert.ok(fam && /Font Awesome/.test(fam[1]), `${page}: ${m[1].trim()} overrides font-family`);
      assert.ok(wgt && wgt[1].trim() === '900', `${page}: ${m[1].trim()} is not weight 900`);
    }
  }
});

test('icons are never placed inside an innerHTML-translated node', () => {
  // data-i18n-html replaces innerHTML, so an <i> inside it disappears on the
  // first language switch.
  for (const page of PAGES) {
    for (const m of readMarkup(page).matchAll(/data-i18n-html="[^"]*"[^>]*>([\s\S]{0,200}?)</g)) {
      assert.ok(!/class="fa-(solid|regular|brands)/.test(m[1]),
        `${page}: icon inside a data-i18n-html node would be wiped on translate`);
    }
  }
});

test('decorative icons are hidden from screen readers', () => {
  for (const page of PAGES) {
    for (const tag of readMarkup(page).match(/<i class="fa-[^>]*>/g) || []) {
      assert.match(tag, /aria-hidden="true"/, `${page}: ${tag.slice(0, 70)}`);
    }
  }
});

test('no inline style overrides the responsive nav logo height', () => {
  // An inline height:70px on two pages beat the responsive rule and pushed the
  // hamburger off narrow viewports.
  for (const page of PAGES) {
    for (const tag of readMarkup(page).match(/<img[^>]*glctech-logo[^>]*>/g) || []) {
      assert.ok(!/style="[^"]*height/.test(tag), `${page}: inline height on the logo`);
    }
  }
});
