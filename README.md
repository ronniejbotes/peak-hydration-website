# Peak Hydration — Website

A complete, self-hostable website for **Peak Hydration** (mineral-infused water, proudly South African).
Built with plain HTML, CSS and a little vanilla JavaScript — **no build tools, no framework, no database**.
You can host it on Hostinger (or any static/PHP host) by simply uploading the files.

---

## 📁 Project structure

```
peak-hydration/
├── index.html        → Homepage — scroll-cinema (bottle spins, transforms & pours) + products/gallery
├── our-water.html    → "Our Water" — the problem & solution
├── products.html     → Products (Still & Sparkling)
├── contact.html      → Contact + enquiry form
├── send-message.php  → Form handler (PHP mail()) — makes forms actually work
├── 404.html          → Custom 404 page
├── robots.txt        → Search engine crawl rules
├── .htaccess         → Apache cache/security tweaks (Hostinger)
├── css/
│   ├── style.css     → All core styling (brand palette, responsive)
│   └── movie.css     → The scroll-scrub film player (stage, theme flip, copy)
├── js/
│   ├── main.js       → Nav, scroll-reveal, form handling
│   └── scrub.js      → The film engine — maps scroll to video time, flips theme
└── assets/
    ├── …             → Brand images (logo, bottle photography)
    └── video/        → clip1.mp4 · clip2.mp4 · clip3.mp4 + posters
```

**The homepage is one full scrollable film made of three generated clips** — scroll down to
play it forward, scroll up to play it back (it's scrubbed by scroll, frame-accurate):

1. **Clip 1** — the Still bottle (black cap, black label) rotates and the camera pushes in to a
   sharp label close-up. The first section shows everything about the Still water.
2. **Clip 2** — starts exactly on Clip 1's final frame, pulls back, and the bottle turns, its
   black cap & label becoming the white Sparkling edition while the whole site flips from dark to
   **light mode**. The second section shows the Sparkling water.
3. **Clip 3** — starts exactly on Clip 2's final frame; the scene reverts to the dark original,
   the bottle multiplies into a burst and splashes into water — the **"Join the movement"** section.

Each clip is generated so its final frame **is** the next clip's first frame, so the handoff between
sections is seamless in both scroll directions. It's pure HTML5 video `<video>` scrubbing —
`js/scrub.js` maps each section's scroll progress to that clip's `currentTime` and writes the theme
flip (`body[data-movie="2"]`). No libraries, no build step, works on Hostinger shared hosting.

**Why static HTML?** Hostinger shared hosting serves plain HTML/CSS/JS with zero configuration
and maximum speed. The only dynamic piece is `send-message.php`, which handles the contact + newsletter
forms using PHP's built-in `mail()` — that's supported on Hostinger's PHP stack.

**Tuning the film:** each section's scroll length is the `height: 320vh` on `.movie` in `css/movie.css`
(longer = a slower, more deliberate scrub through that clip; try `400vh` for a more cinematic pace).
Replacing a clip is just swapping the file in `assets/video/` (keep the same filename) — keep it 16:9,
a short keyframe interval, and `-movflags +faststart` so scrubbing stays smooth.

---

## 🚀 Deploy to Hostinger (2 ways)

### Option A — File Manager (easiest, no FTP app)

1. Log in to **hPanel** → **Websites** → click **Manage** on your domain.
2. Go to **Files → File Manager**.
3. Open the **`public_html`** folder (this is your site's root).
4. Click **Upload** → select all the files in this project folder (or upload the `.zip` and **right-click → Extract**).
5. You're done — your site is live at your domain.

> Make sure the files land **inside** `public_html` (so `public_html/index.html` exists),
> not in a sub-folder, otherwise your domain won't serve them.

### Option B — FTP (FileZilla)

1. In hPanel, create an FTP account: **Websites → Manage → Files → FTP Accounts**.
2. Open **FileZilla**, connect with your host + FTP username + password.
3. Upload all files from this project folder into **`/public_html/`**.
4. Done.

---

## ✉️ Setup the contact forms (important)

The forms post to `send-message.php`, which emails submissions to an address you choose.

1. Open **`send-message.php`** in any text editor (VS Code).
2. Find this line near the top:
   ```php
   $to = "info@peakhydration.co.za";
   ```
3. Replace it with the email address you want to receive enquiries — e.g. `hello@yourdomain.co.za`.
4. Save and re-upload the file.

**To guarantee emails land in the inbox (recommended):**
In Hostinger → **Websites → Manage → Emails → Authentication / SPF**, make sure the SPF record allows
your domain to send mail (Hostinger sets a default SPF — leave it enabled).

---

## 🎨 Customising

- **Brand colours** — all colours are defined as CSS variables at the top of `css/style.css`
  (the `:root { ... }` block). Change them there and every page updates.
- **Fonts** — loaded from Google Fonts in each `<head>` (Fraunces for headlines, Manrope for body).
- **Logo / images** — drop replacements into `assets/` with the same filenames and refresh.
- **Add a product / section** — copy an existing `<section>` block in any `.html` file and edit the text.

---

## 🔍 SEO & finishing touches

- Update **`robots.txt`** (`Sitemap:` line) once you know your real domain.
- Add a **sitemap.xml** for better indexing (optional).
- Swap the placeholder **`assets/favicon.png`** note: the brand's real favicon is already included.
- In Hostinger, enable **free SSL** (HTTPS): **Websites → Manage → Security → SSL** — click *Install*.
- Set the custom 404 handler in hPanel if needed (`.htaccess` already points to `404.html`).

---

## ✅ Checklist before you go live

- [ ] `send-message.php` has the correct **`$to`** email
- [ ] SSL installed (HTTPS) on your domain
- [ ] `robots.txt` points to your real domain
- [ ] Instagram & Facebook links verified in the nav, footer and contact page

© Peak Hydration. Proudly South African.