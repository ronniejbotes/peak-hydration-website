# Peak Hydration — Website

A complete, self-hostable website for **Peak Hydration** (mineral-infused water, proudly South African).
Built with plain HTML, CSS and a little vanilla JavaScript — **no build tools, no framework, no database**.
You can host it on Hostinger (or any static/PHP host) by simply uploading the files.

---

## 📁 Project structure

```
peak-hydration/
├── index.html        → Homepage
├── our-water.html    → "Our Water" — the problem & solution
├── products.html     → Products (Still & Sparkling)
├── contact.html      → Contact + enquiry form
├── send-message.php  → Form handler (PHP mail()) — makes forms actually work
├── 404.html          → Custom 404 page
├── robots.txt        → Search engine crawl rules
├── .htaccess         → Apache cache/security tweaks (Hostinger)
├── css/
│   └── style.css     → All styling (brand palette, responsive)
├── js/
│   └── main.js       → Nav, scroll-reveal, accordion, form handling
└── assets/           → All brand images (logo, bottles, photography)
```

**Why static HTML?** Hostinger shared hosting serves plain HTML/CSS/JS with zero configuration
and maximum speed. The only dynamic piece is `send-message.php`, which handles the contact + newsletter
forms using PHP's built-in `mail()` — that's supported on Hostinger's PHP stack.

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