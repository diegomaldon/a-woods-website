/* ==========================================================================
   A. Woods — site configuration
   Loaded before any other script. This is the ONE place to edit when
   plugging in real credentials or moving to a new domain.
   ========================================================================== */

// 1. WEB3FORMS ACCESS KEY — paste it below.
//    Get one at https://web3forms.com. While you're testing locally, this
//    key should be registered for "localhost" in your Web3Forms dashboard
//    under that form's settings. When you deploy to GitHub Pages, ADD the
//    Pages URL there too (e.g. https://yourname.github.io/a-woods-website);
//    when the client's real domain goes live, add that and remove the old
//    entries. See README.md → "Migration checklist."
const WEB3FORMS_ACCESS_KEY = "04a1b76e-b72a-492c-941d-ddfbfda853d7";

// 2. HCAPTCHA — no key needed here. This uses Web3Forms' native hCaptcha
//    integration instead of a standalone hCaptcha account:
//    https://docs.web3forms.com/getting-started/customizations/spam-protection/hcaptcha
//    Turn it on in the Web3Forms dashboard for this form (Form Settings ->
//    Spam Protection -> hCaptcha) — that's the only setup step. The widget
//    markup + script tag are already in contact.html.

// 3. Client-side submission throttle (courtesy limiter only).
//    Web3Forms' free tier allows 250 submissions/month. This cooldown/cap
//    stops accidental double-submits and careless repeat bots hitting the
//    rendered page from burning through that quota. It is NOT a security
//    boundary — a determined bot could copy the access key out of this
//    file (it's visible client-side on any static site) and POST directly
//    to the Web3Forms API, bypassing this page and this file entirely.
//    hCaptcha (#2 above) is what actually protects the quota against that,
//    since Web3Forms won't accept a submission without a solved challenge.
const RATE_LIMIT = {
  cooldownMs: 60 * 1000, // minimum time between submissions, per browser
  dailyCap: 5,           // soft cap on submissions per day, per browser
  storageKey: "aw_contact_submissions",
};

const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";
