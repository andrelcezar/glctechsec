# GLCTech International Site — Deployment Guide

## ⚡ Quick Start

Your site has been **fully translated to English** and is ready for deployment at **glctechsec.com**.

### What's Included
- ✅ 7 fully translated HTML pages (English)
- ✅ All 6 languages in i18n.js (EN is now default)
- ✅ Portuguese removed from language switcher UI
- ✅ New contact info: contact@glctechsec.com, +44 7778 173575
- ✅ Pricing converted to USD (EN) and EUR (DE/ES/FR/IT)
- ✅ 6 orphaned pages removed

---

## 📥 Deployment Steps

### 1. Extract & Upload
```bash
unzip glctech-international.zip
# Upload glctech-main/ contents to your web server root
# Ensure CNAME → glctechsec.com
```

### 2. Verify DNS
- Confirm CNAME record: `glctechsec.com` → your hosting provider
- Test: `nslookup glctechsec.com`

### 3. Activate Application Form
The careers form (trabalhe-conosco.html) uses FormSubmit.co for file uploads:

1. Go to https://formsubmit.co
2. Enter **hr@glctechsec.com**
3. Click "Create Access Key"
4. Confirm the activation email in your inbox
5. ✅ Form is now live

### 4. Test Language Switcher
Visit your site and check the language selector shows:
- 🇺🇸 EN (default, English)
- 🇩🇪 DE (German, EUR)
- 🇪🇸 ES (Spanish, EUR)
- 🇫🇷 FR (French, EUR)
- 🇮🇹 IT (Italian, EUR)

**Portuguese should NOT appear.**

### 5. Monitor & Verify
```bash
# Check console for i18n.js loading without errors
# Check OG tags in page source
# Test form submission from all pages
# Verify phone links: tel:+447778173575
# Verify email links: mailto:contact@glctechsec.com
```

---

## 🔧 If You Need Changes Later

### Add Portuguese Back (Optional)
If you want to restore Portuguese-Brazil:

**File:** `scripts/i18n.js`
```javascript
// Line ~1811: Add PT back to locale map
var localeMap = {
  'pt': 'pt', 'pt-br': 'pt', 'pt-pt': 'pt',  // ← Add this line
  'en': 'en', 'en-us': 'en', ...
}

// Line ~1925: Add to buildSwitcher
var flags = { pt: '🇧🇷', en: '🇺🇸', de: '🇩🇪', es: '🇪🇸', fr: '🇫🇷', it: '🇮🇹' };
var names  = { pt: 'PT', en: 'EN', de: 'DE', es: 'ES', fr: 'FR', it: 'IT' };
```
Then redeploy.

### Change Contact Email
All occurrences:
- index.html (3 places)
- politica.html (2 places)
- termos.html (1 place)
- trabalhe-conosco.html (3 places)
- scripts/i18n.js (multiple language blocks)

### Change Phone Number
All occurrences:
- index.html (form, error message, contact)
- politica.html (contact box)
- termos.html (contact box)
- trabalhe-conosco.html (form)
- scripts/i18n.js (placeholders in all languages)

### Adjust Pricing
**Zabbix static prices:**
- `zabbix.html` lines 244 & 261

**Pricing simulators:**
- `kaspersky.html` (ES currency rate line 432)
- `veeam.html` (ES currency rate line 437)
- `zabbix.html` (ES currency rate line 433)

---

## 📊 File Structure

```
glctech-main/
├── index.html                    ← Homepage
├── kaspersky.html               ← Kaspersky service page
├── veeam.html                   ← Veeam backup page
├── zabbix.html                  ← Zabbix monitoring page
├── politica.html                ← Privacy Policy (EN)
├── termos.html                  ← Terms of Use (EN)
├── trabalhe-conosco.html        ← Careers (EN)
├── CNAME                        ← glctechsec.com
├── scripts/
│   ├── i18n.js                  ← Translation engine (353 keys, 6 languages)
│   ├── script.js                ← Main functionality
│   └── fetch_zabbix_stats.py    ← Zabbix API integration
├── css/
│   └── styles.css               ← Stylesheet
└── assets/
    ├── logo/                    ← Brand logos
    ├── hero/                    ← Hero images
    ├── services/                ← Service illustrations
    ├── team/                    ← Team photos
    └── ...                      ← Other assets
```

---

## 🚨 Common Issues & Fixes

### Form Not Sending?
- ✅ Check if you clicked "Activate" link in FormSubmit email
- ✅ Verify hr@glctechsec.com is the destination in trabalhe-conosco.html
- ✅ Check browser console for CORS errors

### Language Not Changing?
- ✅ Ensure i18n.js loads (check Network tab)
- ✅ Clear browser cache (localStorage may persist old language)
- ✅ Check browser console for JS errors

### Old Content Still Showing?
- ✅ Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- ✅ Clear CDN cache if using Cloudflare
- ✅ Verify you uploaded the new files (not mixed old/new)

### Prices Still in BRL?
- ✅ Check that default language fallback is set to 'en' not 'pt'
- ✅ Verify kaspersky/veeam/zabbix.html have correct currency objects
- ✅ Check static prices were replaced (should show $, not R$)

---

## 📞 Support

For questions about the translation or deployment:
- Contact the development team
- Reference the detailed TRANSLATION_CHANGELOG.md for all changes
- All translation keys are documented in i18n.js comments

---

**Happy deploying!** 🚀 Your international site is ready!
