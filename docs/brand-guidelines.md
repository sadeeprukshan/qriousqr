# QriousQR — Brand Guidelines

*Living document. Last updated 2026-07-19.*

QriousQR is a bilingual QR-menu and diner-loyalty platform. This document defines how the brand looks, sounds, and feels — across the product, marketing, transactional emails, and any partner-facing material.

If you're building something QriousQR-shaped and don't see it covered here, ask; don't guess.

---

## 1. Brand identity

**Full name (display):** QriousQR

**Technical name (slugs, class names, file names):** `qriousqr`

**One-line pitch:**
> QR menus that reward loyal diners.

**Elevator pitch:**
> QriousQR turns any restaurant menu into a bilingual, mobile-first digital experience that runs off a QR code — and rewards returning diners with a built-in loyalty coupon system that redeems in seconds at the table.

**Never spell as:** QRious, Qriousqr, QRiousQR, Qrious-QR, QRIOUSQR (unless in an all-caps display context like a nav badge).

---

## 2. Wordmark

Text-only wordmark, set in **Inter 800** (extra-bold), color **`#FF5722`** (primary orange), with slight negative letter-spacing (`-0.02em`) for optical tightness at large sizes.

```
QriousQR
```

The wordmark is text — no image asset. This is intentional:

- Emails: every mail client blocks image logos by default; text renders everywhere without loading, blocking, or download prompts.
- Web: no HTTP request for a logo file, no missing-image state, no CDN dependency.
- Print: designers can typeset the wordmark in any layout without file management.

**Sizes:**

| Context | Size | Weight | Letter-spacing |
|---|---|---|---|
| Marketing hero | 32–48px | 800 | -0.02em |
| App nav | 22–24px | 800 | -0.02em |
| Email header | 24px | 800 | -0.02em |
| Footer / small print | 14–16px | 700 | normal |

**Minimum size:** 14px. Below that, use just the **Q** favicon mark (see §3).

**Clear space:** at least `1× the cap-height` of the wordmark on all sides. Nothing else in that zone.

---

## 3. The Q mark (favicon / app icon)

For contexts too small for the full wordmark or where a square symbol is needed (browser tabs, PWA home-screen icons, avatar-style placements):

- Orange rounded square: `#FF5722` background, `14/64` corner radius (~22% radius ratio — soft, iOS-app-shaped, not fully circular).
- White uppercase **Q** centered, Inter 800.
- Source SVG lives at `public/favicon.svg`.
- PNG variants at `public/icons/icon-192.png`, `icon-512.png`, `icon-512-maskable.png` for PWA.

Do NOT modify the color, the shape, or the letter. Do NOT add a stroke, gradient, or texture. If you need a variant, ask first.

---

## 4. Color palette

### Core brand

| Token | Hex | Where |
|---|---|---|
| **Primary** | `#FF5722` | Wordmark, CTAs, highlights, active states, links in emails |
| **Background** | `#FAF8F5` | Page backgrounds, email outer canvas — a warm off-white, never pure `#FFF` |
| **Surface / Card** | `#FFFFFF` | Cards, modals, inputs |
| **Text** | `#111111` | Headings, body copy |
| **Text muted** | `#666666` | Secondary text, subheads |
| **Text soft** | `#71717A` / `#999999` | Timestamps, fine print |
| **Divider** | `#EBEBEB` | Hairline separators, input borders |

### Semantic

| Token | Hex | Meaning |
|---|---|---|
| Success | `#065F46` on `#ECFDF5` | Positive state, verified, sent |
| Warning | `#92400E` on `#FFFBEB` | Pending, needs attention |
| Danger | `#991B1B` on `#FEF2F2` | Error, rejected, destructive |
| Info | `#1E40AF` on `#EFF6FF` | Neutral information |

### Tenant-specific palette (per-restaurant customization)

Every tenant sets their own 4-color palette that overrides the QriousQR default on their public menu and their diner-facing coupon UI:

- `theme_color` (primary)
- `secondary_color`
- `text_color`
- `background_color`

These are stored on the `companies` row and applied via CSS custom properties (`--primary-color`, `--secondary-color`, `--text-color`, `--bg`). This means tenant screens should never hardcode QriousQR orange — always use `var(--primary-color)`.

**QriousQR chrome** (Landing, Auth, Admin console, Customer nav island, Change Password modal, transactional emails) always uses the core brand palette above, never a tenant palette. The customer bottom nav island uses neutral chrome because it spans all tenants.

---

## 5. Typography

Two font families. Both loaded from Google Fonts in `index.html`.

**English (default):** Inter
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```
Weights we use: 400, 500, 600, 700, 800.

**Arabic (RTL contexts):** Cairo
```css
font-family: 'Cairo', system-ui, sans-serif;
```
Weights we use: 400, 600, 700, 800.

**Whichever font stack you're in, always inline the fallback.** Mail clients strip `<style>` tags; anything setting `font-family` without a fallback ends up in Times New Roman.

### Type scale

| Role | Size | Weight | Line-height |
|---|---|---|---|
| Display / Hero | 48–56px | 800 | 1.1 |
| H1 | 32px | 800 | 1.2 |
| H2 | 22–24px | 700–800 | 1.3 |
| H3 | 18px | 700 | 1.4 |
| Body large | 16px | 400 | 1.6 |
| Body | 14–15px | 400 | 1.6 |
| Small | 13px | 500 | 1.5 |
| Fine print | 11–12px | 400 | 1.5 |

Body copy is `#111` on `#FAF8F5` or `#FFF`. Never `#000` on `#FFF` — too harsh for long-form.

---

## 6. Iconography

- **Inline SVG only.** No icon libraries, no icon fonts, no PNG icons.
- **24×24 viewBox** for functional icons.
- **`strokeWidth: 2`** default, `strokeLinecap: round`, `strokeLinejoin: round`.
- **`fill: none`, `stroke: currentColor`** — icons inherit color from their parent.
- Weight matches the wordmark's confident feel: rounded, medium-weight strokes, no delicate hair-line details.

Reference style: Lucide/Feather. Do not use Material or Font Awesome shapes.

Example (a checkmark):
```jsx
<svg width="24" height="24" viewBox="0 0 24 24" fill="none"
     stroke="currentColor" strokeWidth="2"
     strokeLinecap="round" strokeLinejoin="round">
  <path d="M5 12l5 5L20 7" />
</svg>
```

---

## 7. Layout, spacing, motion

**Spacing scale:** multiples of 4px (`4, 8, 12, 16, 20, 24, 32, 40, 48, 64`). Everything snaps to this grid.

**Radius:**
- Pills (buttons, badges): `999px`
- Cards, modals: `12px`
- Inputs: `8px`
- The Q mark: `~22%` of side length (see §3)

**Shadows:**
- Cards: `0 2px 8px rgba(0,0,0,0.04)` — barely there
- Elevated (modals, nav island): `0 10px 30px rgba(0,0,0,0.12)`
- Never use hard drop-shadows

**Motion:**
- Standard transition: `200ms ease`
- Nothing longer than `300ms`
- No spring/bounce for functional UI

---

## 8. Voice & tone

**We sound like:** a smart, kind restaurant technology partner who respects the reader's time.

- Second-person, direct: *"You have 3 unused coupons expiring on December 31."*
- No exclamation-mark spam. One `!` per email or page, max. Zero is often better.
- No emojis in subject lines (deliverability). Sparingly in body, only where they add clarity.
- Contractions are fine. *"You'll"* > *"You will."*
- Never call the diner a "user" in customer-facing copy — they're a *diner*, a *guest*, or by their first name.
- Never call a restaurant a "merchant" or "vendor" in customer-facing copy — they're a *restaurant*.
- Never use "utilize" when "use" works.
- Never write "here at QriousQR" — omit needless self-reference.

### Bilingual copy

- Every diner-facing surface is bilingual EN/AR.
- Tenant Dashboard and Admin console are English-only.
- Auth transactional emails (confirm signup, reset password, invite) are English-only in v1 — Arabic templates land after a real translator pass.
- For Arabic copy, we use Cairo font, `dir="rtl"`, and mirror the layout — but **do not** mirror the customer nav island's button order (Home / Coupons / Profile stays the same). The island reads left-to-right in every language.

---

## 9. Component patterns

### Buttons

Three tiers:

**Primary CTA** — orange pill, always the strongest call-to-action on a screen.
```jsx
<button style={{
  background: '#FF5722',
  color: '#FFFFFF',
  padding: '14px 32px',
  borderRadius: '999px',
  fontWeight: 700,
  fontSize: '15px',
  border: 'none',
}}>Redeem before Dec 31</button>
```

**Secondary** — outline pill, same shape but transparent background + border.

**Ghost / text link** — no background, no border, primary color, underline on hover.

Only ONE primary CTA per view. Never two orange pills competing.

### Inputs

```jsx
<input style={{
  padding: '10px 14px',
  border: '1px solid #EBEBEB',
  borderRadius: '8px',
  fontSize: '14px',
  background: '#FFFFFF',
}} />
```

Focus state uses primary orange for the border. No blue.

### Badges & pills

Small, capsule-shaped, muted background + colored text. Category examples:
- Main Course: `#FFF6F2` background, `#FF5722` text
- Success: `#ECFDF5` bg, `#065F46` text
- Warning: `#FFFBEB` bg, `#92400E` text

Never invert (colored bg + white text) unless the pill is on a dark backdrop.

---

## 10. Do & don't

### ✅ Do

- Use `#FF5722` sparingly — it's the loudest color, so it earns attention when used
- Set both `font-family` **and** an inline fallback stack, everywhere
- Design for mobile first — the primary customer surface is a phone in someone's hand at a restaurant table
- Test screens in both EN LTR and AR RTL before shipping
- Keep tenant chrome using `var(--primary-color)` — never hardcode QriousQR orange in tenant UI
- Keep QriousQR chrome (Landing, Auth, Admin, transactional emails) using core brand palette — never a tenant color

### ❌ Don't

- Don't use a different orange (`#FF5500`, `#F97316`, `#FF6B35`) — it's always `#FF5722`
- Don't hardcode image assets for the wordmark — it's always styled text
- Don't add gradients, textures, or drop-shadows to the Q mark
- Don't use fonts other than Inter (EN) or Cairo (AR) — no Poppins, Roboto, Montserrat, Nunito
- Don't use pure black (`#000`) or pure white (`#FFF`) for body copy backgrounds — `#111` on `#FAF8F5` is the pair
- Don't put emojis in email subject lines
- Don't use "Get Started Now!!!" style copy — one exclamation mark per surface, max
- Don't build a screen where two primary orange buttons are visible at the same time
- Don't embed images in transactional emails (blocked by mail clients)

---

## 11. Assets reference

| Asset | Location |
|---|---|
| Favicon (SVG) | `public/favicon.svg` |
| PWA icons | `public/icons/icon-{192,512,512-maskable}.png` |
| Web manifest | `public/manifest.webmanifest` |
| Global CSS + tokens | `src/index.css` |
| Landing page (canonical brand chrome) | `src/pages/LandingPage.jsx` |
| Email template patterns | `docs/email-templates/{confirm-signup,reset-password,invite}.html` + `supabase/functions/coupon-expiry-reminder/email-template.ts` |
| Country + currency data (tenant register) | `src/pages/AuthPage.jsx` (inline arrays at top) |
| Country data (customer register) | `src/lib/countries.js` |
| Category label lookup | `src/lib/couponCategories.js` |

---

## 12. Legal & contact

**Copyright:** © 2026 QriousQR. All rights reserved.

**Contact:**
- General: `hello@qriousqr.com`
- Privacy inquiries: `privacy@qriousqr.com`
- Security reports: `security@qriousqr.com`

**Legal pages** (linked from Landing footer + both register forms):
- Terms: [`/legal/terms`](/legal/terms) — `src/pages/legal/TermsPage.jsx`
- Privacy: [`/legal/privacy`](/legal/privacy) — `src/pages/legal/PrivacyPage.jsx`

---

*Questions or brand-related requests → hello@qriousqr.com. If you're a partner or contractor asking about a specific use, share the mockup first, ask second.*
