# QRious — Phase 2: Landing, Auth, Dashboard, multi-currency

You are continuing an in-progress QR-menu SaaS called **QRious**. Phase 1 (PublicMenu + Supabase live mode + Kantami seed) is already shipped and working. Build Phase 2 on top — do not rewrite Phase 1.

---

## 0. Workspace

- **Working copy (run npm here):** `C:\Users\sadee\Projects\QRious`
- **Source-of-truth mirror (copy final files here at the end, excluding `node_modules`, `.vite`, `dist`):** `G:\My Drive\PROJECTS\QRious`
- Do NOT run `npm install` or write `node_modules` inside `G:\My Drive\` — Google Drive sync locks files and breaks the install.
- Dev server: `npm run dev` from the C: path. Vite is configured to auto-open `/menu/kantami`.

## 1. Current state (don't break any of this)

**Stack:** Vite 5 + React 18 + React Router 6 + `@supabase/supabase-js` + Vanilla CSS.

**Files already present:**
- `index.html` (Cairo + Inter Google Fonts loaded)
- `vite.config.js`, `package.json`, `.env`, `.env.example`, `.gitignore`
- `src/main.jsx`, `src/App.jsx` (only routes `/menu/:slug` and `/` redirect → `/menu/kantami`)
- `src/index.css` — design tokens. Key CSS variables: `--primary-color`, `--primary-soft`, `--bg`, `--surface`, `--surface-2`, `--border`, `--text`, `--text-muted`, `--text-soft`, `--radius-sm/md/lg`, `--shadow-sm/md/lg`, `--font-en` (Inter), `--font-ar` (Cairo). `.app-shell` is the 480px-max-width mobile container.
- `src/supabaseClient.js` — exports `supabase` and `isMockMode` (true when env keys missing).
- `src/services/dataService.js` — `loadMenu(slug)`, `logVisit(companyId)`, `logProductClick(companyId, productId)`. Has localStorage seed for Kantami when in mock mode.
- `src/pages/PublicMenu.jsx` — bilingual menu page with EN/AR switcher, sticky category chips, product cards, bottom social bar, theme color driven by company record.

**Supabase project:** ref `snqsgqdovqrjsikcbaia`, name `QRIOUS`, region ap-southeast-1.

**Existing tables (all RLS enabled, public SELECT):**
- `companies(id, slug, name_en, name_ar, description_en, description_ar, logo_url, cover_url, theme_color, whatsapp, phone, google_map, instagram, snapchat, twitter, created_at)` — `id` is a standalone uuid (NO `auth.users` FK currently).
- `categories(id, company_id, name_en, name_ar, sort_order, created_at)`
- `products(id, company_id, category_id, name_en, name_ar, description_en, description_ar, price, calories, image_url, is_available, created_at)`
- `visitor_logs(id, company_id, visitor_hash, created_at)` — public INSERT
- `product_clicks(id, company_id, product_id, created_at)` — public INSERT

**Seeded tenant:** slug `kantami` — Lebanese restaurant, 6 categories, 12 products, theme `#C0392B`.

---

## 2. What to add in Phase 2

### 2.1 Schema migration (apply via Supabase MCP or the SQL editor)

```sql
-- Multi-currency + country
alter table companies add column if not exists currency_code text not null default 'USD';
alter table companies add column if not exists country_code text;  -- ISO 3166-1 alpha-2, e.g. 'LB', 'AE', 'SA'

-- Owner association for auth
alter table companies add column if not exists owner_id uuid references auth.users(id) on delete cascade;
create unique index if not exists companies_owner_id_idx on companies(owner_id);

-- Backfill the existing Kantami row
update companies set currency_code = 'USD', country_code = 'LB' where slug = 'kantami';

-- Owner-write RLS (public read already exists)
create policy "Owners insert own company"
  on companies for insert with check (auth.uid() = owner_id);
create policy "Owners update own company"
  on companies for update using (auth.uid() = owner_id);

create policy "Owners modify own categories"
  on categories for all
  using (auth.uid() = (select owner_id from companies where id = company_id));
create policy "Owners modify own products"
  on products for all
  using (auth.uid() = (select owner_id from companies where id = company_id));

create policy "Owners view own visitor logs"
  on visitor_logs for select
  using (auth.uid() = (select owner_id from companies where id = company_id));
create policy "Owners view own product clicks"
  on product_clicks for select
  using (auth.uid() = (select owner_id from companies where id = company_id));
```

Also create three **public** Supabase Storage buckets if they don't already exist: `logos`, `covers`, `products`. Allow public read; allow authenticated insert/update/delete only on objects under a folder matching the user's `auth.uid()`.

### 2.2 New / updated routes in `src/App.jsx`

| Path | Component | Notes |
|---|---|---|
| `/` | `LandingPage` | Replaces the current redirect to `/menu/kantami` |
| `/auth` | `AuthPage` | Login + Register tabs |
| `/dashboard` | `Dashboard` | Protected. Redirect to `/auth` if no session |
| `/menu/:slug` | `PublicMenu` | Unchanged behavior, but consume currency from company |

Add an `AuthProvider` (Context) that wraps the Router and exposes `{ session, user, signIn, signUp, signOut, loading }`. In mock mode it should fake-auth against localStorage (default account: email `demo@qriousqr.local` / password `demo1234` already mapped to the Kantami tenant).

### 2.3 `src/pages/LandingPage.jsx`

Marketing page — desktop-first, but responsive.

Sections:
1. **Nav bar** — QRious wordmark left, links: Features, Pricing (placeholder), Demo (→ `/menu/kantami`), Sign in (→ `/auth`), "Get started free" button (→ `/auth?mode=register`).
2. **Hero** — Headline ("Beautiful QR menus your guests will actually use"), subhead, two CTAs (Get started / View live demo), and a **simulated mobile mockup** to the right: a 320×640 phone-frame div with an `<iframe src="/menu/kantami">` inside, or a static render of the menu — your choice, but it must show the Kantami menu live. Use a subtle shadow + rounded notch to look like a phone.
3. **Features grid** — 6 cards: Bilingual menu (EN/AR), Custom theme color, Real-time analytics, Multi-currency, QR per branch, Mobile-first. Use simple inline SVG icons.
4. **How it works** — 3 steps: Sign up → Build your menu → Share your QR.
5. **Footer** — copyright, links to /auth, /menu/kantami.

Use the existing design tokens. Add new tokens for landing if needed (`--accent`, `--text-on-dark`, etc.) in `index.css`. Default theme color on the landing page is the platform brand `#FF5722` (orange) — do NOT inherit the per-tenant theme.

### 2.4 `src/pages/AuthPage.jsx`

- Centered card on a soft background.
- Tab switcher: **Sign in** / **Create account**. Reads `?mode=register` from URL on mount.
- Sign-in fields: email, password. Submit → `signIn` → on success redirect to `/dashboard`.
- Register fields: email, password, **Restaurant name (EN)**, **Restaurant name (AR)**, **Slug** (auto-generated from EN name, editable), **Country** (select from a small list: LB, AE, SA, EG, JO, KW, QA, BH, OM, US, GB), **Currency** (auto-suggested from country but editable: AED, SAR, LBP, EGP, JOD, KWD, QAR, BHD, OMR, USD, GBP, EUR).
- On register: `supabase.auth.signUp` → on success, INSERT a `companies` row with `owner_id = user.id`, `slug`, names, `country_code`, `currency_code`, default `theme_color = '#FF5722'`. Then create 1 starter category ("Menu") and 1 starter product so the menu isn't empty. Redirect to `/dashboard`.
- Mock-mode behavior: fake the whole flow against localStorage so the demo works without Supabase too.
- Inline form validation, friendly error messages, loading state on the submit button.

### 2.5 `src/pages/Dashboard.jsx`

Layout: left sidebar (collapsible on mobile) + main content. Sidebar items: **Profile**, **Menu**, **Analytics**, **Preview menu** (opens `/menu/:slug` in a new tab), **Sign out**.

#### Profile tab
- Edit: `name_en`, `name_ar`, `description_en`, `description_ar`, `theme_color` (color picker), `currency_code` (select), `country_code` (select), `whatsapp`, `phone`, `google_map`, `instagram`, `snapchat`, `twitter`.
- Logo + Cover image uploaders: upload to Supabase Storage (`logos/{user_id}/...`, `covers/{user_id}/...`), then save the public URL on the row.
- Live preview thumbnail on the right showing how the theme color + logo will look.

#### Menu tab
- Categories panel (drag-to-reorder updates `sort_order`): add / rename / delete.
- Products panel filtered by selected category: add / edit / delete. Product modal fields: name EN/AR, description EN/AR, price (currency symbol comes from company), calories, image upload (`products/{user_id}/...`), is_available toggle.
- Reflect changes immediately; on each mutation, re-fetch or update local state.

#### Analytics tab
- Visitor count (last 7 / 30 days) — query `visitor_logs` grouped by day.
- Top 10 products by clicks — query `product_clicks` grouped by product, joined to products.
- Simple bar list, no chart library — render inline SVG or CSS bars.

Build a small `services/dashboardService.js` for the CRUD/aggregation queries. Keep `dataService.js` for the public menu data.

### 2.6 Currency wiring

- Add `currency_code` to the company shape everywhere it flows.
- In `PublicMenu.jsx`, replace the hardcoded `T.en.currency = 'AED'` / `T.ar.currency = 'د.إ'` with a helper:
  ```js
  function formatPrice(amount, currencyCode, locale) {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(amount);
  }
  ```
  Pass `currency_code` from `data.company`. Use `'ar-LB'` locale when `lang === 'ar'`, otherwise `'en-US'`. Same helper used in Dashboard.
- Calories label translation stays as-is.

### 2.7 Update mock seed in `dataService.js`

Add `currency_code: 'USD'` and `country_code: 'LB'` to the Kantami SEED object so mock mode matches live.

---

## 3. Design system constraints (keep it consistent)

- Reuse the CSS variables in `src/index.css`. Add new ones only when justified.
- Mobile-first; PublicMenu max width stays 480px. Landing + Dashboard can use wider responsive layouts (max-width ~1200px container, breakpoint at 768px).
- Buttons: rounded-pill primaries (`--primary-color` bg, white text), ghost secondaries (transparent + border).
- Forms: 14px label, 15px input, 1px border `var(--border)`, focus ring using `var(--primary-soft)`.
- No CSS frameworks. No CSS-in-JS. Plain CSS files alongside components are fine if a page grows large (`Dashboard.css`, `Landing.css`).
- No icon libraries. Inline SVG only, matching the stroke style already in `PublicMenu.jsx`.

---

## 4. Acceptance / demo flow

After you finish, the dev server at `http://localhost:5173` must support this end-to-end walkthrough without errors:

1. **`/`** — Landing page renders. Phone mockup on the right shows the live Kantami menu. Sign-in and Get-started buttons work.
2. **`/auth`** — Switch tabs. Sign in with `demo@qriousqr.local` / `demo1234` in mock mode, OR register a brand new tenant (e.g. "Brewlab" / slug `brewlab` / country `AE` / currency `AED`) in live mode.
3. **`/dashboard`** — Lands on Profile. Edit theme color to a new hex, save. Switch to Menu, add a new category and a new product with an uploaded image. Switch to Analytics, see at least the visitor count from previous /menu page loads.
4. **Click "Preview menu"** → opens `/menu/{your-slug}` in a new tab. Verify: theme color changed, new category and product appear, price renders in the tenant's currency (AED with Arabic numerals when language is AR; USD/LBP for Kantami).
5. **`/menu/kantami`** — Still works exactly as before, but price now shows in **USD** (because we backfilled Kantami's `currency_code`). Toggling EN/AR formats the number correctly via `Intl.NumberFormat`.
6. **Sign out** from the dashboard → `/` again. Hitting `/dashboard` while signed out → redirect to `/auth`.

When done, take a screenshot of each route (`/`, `/auth`, `/dashboard` Profile, `/dashboard` Menu, `/dashboard` Analytics, `/menu/kantami`) at mobile width (375) AND desktop width (1280) and put them in a `docs/screenshots/` folder so the demo is self-evident.

---

## 5. Don't do

- Don't run `npm install` or write build artifacts inside `G:\My Drive\` — only mirror finished source files there at the very end.
- Don't add TypeScript, Tailwind, shadcn, Next.js, or any state library (Redux/Zustand). Keep the stack as-is.
- Don't reseed or drop the existing `kantami` row — alter only.
- Don't touch `PublicMenu.jsx` beyond the currency-formatting change.
- Don't introduce auth on the public menu route. `/menu/:slug` stays anonymous.

When everything works, summarize what changed and list the files added/modified.
