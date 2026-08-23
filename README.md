# A. Woods — Marketing Site (Prototype)

Static HTML/CSS/JS marketing site for A. Woods, a Columbus, Ohio siding &
construction contractor. No build step, no framework — built to run as-is
locally, on GitHub Pages, and later on the client's own domain.

## Running it locally

Contact form submission and the gallery both use `fetch()`, which browsers
block against `file://` URLs (a raw double-click on `index.html` will show a
blank gallery and a broken form). Serve the folder over HTTP instead:

```bash
cd a-woods-website
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static server works (VS Code "Live Server" extension, `npx serve`,
etc.) — the important part is `http://localhost:...`, not `file://`.

## Where to plug in credentials

Everything lives in **`js/config.js`**:

```js
const WEB3FORMS_ACCESS_KEY = "...";   // Web3Forms access key
const RATE_LIMIT = { cooldownMs, dailyCap, storageKey }; // client-side throttle
```

- **Web3Forms access key** — from your Web3Forms dashboard. Already filled
  in for local testing.
- **hCaptcha** — ✅ enabled and confirmed working. No separate account or key
  needed — this uses
  [Web3Forms' native hCaptcha integration](https://docs.web3forms.com/getting-started/customizations/spam-protection/hcaptcha):
  the widget markup (`<div class="h-captcha" data-captcha="true">`) and
  script tag (`web3forms.com/client/script.js`) are already in
  `contact.html`, and hCaptcha has been switched on for this form in the
  **Web3Forms dashboard** (Form Settings → Spam Protection → hCaptcha). If
  this form ever gets recreated with a new access key, that toggle needs to
  be re-enabled for the new form.

## Anti-spam / quota protection (why there are four layers)

**Is the exposed access key a security problem?** No — by design. This key
is meant to sit in client-side code, the same way a Stripe "publishable key"
or a Google Maps API key does; it identifies which form submissions land in,
it's not a credential that unlocks the account. The only thing someone could
do with a copied key is submit junk to this form (spam/quota risk), not read
past submissions, see other forms, or access the Web3Forms account. If it's
ever abused, the fix is just generating a new key in the dashboard and
swapping the one line in `config.js` — no data exposure to clean up.

Web3Forms' free tier caps out at 250 submissions/month. Because this is a
static site, the access key above is visible to anyone who views the page
source — no purely client-side code can make that key un-copyable. So the
form uses layered defenses, each catching a different threat:

1. **Honeypot** (`botcheck` field, hidden via CSS, not `display:none`) —
   catches unsophisticated bots that fill in every input.
2. **Time-trap** — rejects submissions completed in under 3 seconds, a
   giveaway for scripted form-fillers.
3. **Client-side rate limit** (`localStorage`, see `RATE_LIMIT` in
   `config.js`) — a courtesy limiter against accidental double-submits and
   repeat clicks from the same browser. Adjust `cooldownMs` / `dailyCap` as
   needed.
4. **hCaptcha** — the actual backstop, enabled in the Web3Forms dashboard
   (see above) and confirmed working. Web3Forms will not accept a
   submission without a solved challenge, so this is what protects the
   monthly quota against someone who bypasses the page entirely and calls
   the Web3Forms API directly with the key.

If traffic ever threatens the 250/month ceiling despite these, Web3Forms'
paid tier is inexpensive and requires no code changes — just swap the access
key.

## Migration checklist

Things to update as this moves from prototype → live site:

- [ ] **Web3Forms allowed domain** — in the Web3Forms dashboard, this form
      is currently scoped to `localhost`. Add the GitHub Pages URL when you
      deploy there, then add the client's final domain when it's live (and
      remove `localhost` / the Pages URL once retired).
- [x] **hCaptcha** — toggled on in the Web3Forms dashboard (Form Settings →
      Spam Protection → hCaptcha) and confirmed working.
- [ ] **Open Graph tags** — each page's `<meta property="og:*">` tags have
      no `og:url` set (see comment in `index.html`). Add absolute URLs once
      a permanent domain exists.
- [ ] **Hero/banner placeholder images** — see "Images" below; gallery
      photos are already real.
- [ ] **Gallery photo locations** — replace the generic "Columbus Metro
      Area, OH" location on each `data/gallery.json` entry with the actual
      city, once known.
- [ ] **Placeholder copy** — phone number, email, address, hours, license
      numbers, and insurance details throughout the site are placeholders
      (search for "placeholder" — every instance is labeled).
- [ ] **Custom domain on GitHub Pages** (if used as an interim host) — add
      a `CNAME` file at the repo root once the domain is purchased, per
      GitHub's docs.

## Images

- `images/gallery/` — **real project photos**, resized to a 1600px max edge,
  re-compressed (JPEG, quality 80, EXIF metadata stripped), and referenced
  from `data/gallery.json`. Categorized as: 4 Siding Installation & Repair,
  3 General Contracting, 3 Commercial Construction, 2 Exterior Renovation.
  The `location` field for all 12 is currently a generic "Columbus Metro
  Area, OH" placeholder — swap in the real city for each project when known.
  Raw, unprocessed originals are kept locally in `ProdPhotos/` for reference
  (git-ignored, not part of the deployed site — see `.gitignore`).
- `images/hero/` — still **placeholder SVGs** (home hero, about, services,
  contact, gallery page banners). These are good candidates to swap for real
  job-site/finished-project photos too — ask if you'd like a couple of the
  stronger gallery shots repurposed as hero/banner images instead of adding
  new ones.

To add or swap gallery photos going forward:

1. Add the image file into `images/gallery/`.
2. Add/update the matching entry in `data/gallery.json` (`category`,
   `categoryLabel`, `title`, `location`, `image`, `alt`) — this is the single
   source of truth the gallery grid and lightbox render from.
3. Keep `loading="lazy" decoding="async"` on gallery images (already handled
   by `js/gallery.js`), and keep new photos in a similar resolution/file-size
   range (resize long edge to ~1600px, JPEG quality ~80) to keep the
   image-heavy gallery page fast.

## Project structure

```
index.html          Home
gallery.html         Our Work — filterable grid + lightbox
services.html        Services
about.html           About
contact.html         Contact — form
css/                 base.css (tokens/reset), layout.css (header/footer/grid),
                      components.css (buttons, cards, gallery, lightbox, form)
js/
  config.js          Credentials + rate-limit config (edit this file)
  nav.js             Mobile nav toggle
  gallery.js         Fetches data/gallery.json, renders preview + full grid + lightbox
  contact-form.js    Validation, honeypot/time-trap/rate-limit checks, Web3Forms submit
data/gallery.json     Project entries — edit this to add/remove/update gallery photos
images/               Placeholder SVGs (see above)
```

All paths are relative — no hardcoded GitHub-specific or localhost URLs
anywhere in the markup, so hosting on GitHub Pages now and moving to the
client's own domain later requires no path changes.
