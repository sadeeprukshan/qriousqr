# QRious — Phase 2 Implementation Plan

This plan details the technical changes required to implement Phase 2 of **QRious**, including user authentication (Supabase auth with localStorage mock fallback), a marketing landing page, a full-featured admin dashboard, analytics logs, and multi-currency formatting support.

## User Review Required

> [!IMPORTANT]
> The database schema changes must be applied directly to the Supabase project via the SQL Editor. We will provide the SQL script below. Please run this in your Supabase console.

> [!IMPORTANT]
> In Mock Mode, all user registrations, company profiles, menu edits, and analytics are simulated using `localStorage` to allow local end-to-end testing without Supabase credentials.

## Proposed Changes

### 1. Database Schema
#### [MODIFY] Supabase SQL Editor
Apply the following SQL script to migrate your Supabase database:
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

Make sure the following three buckets are created in **Supabase Storage** and set to **Public**:
- `logos`
- `covers`
- `products`

We will add a storage policy for authenticated users:
- Select: allowed for anyone (Public).
- Insert/Update/Delete: allowed for authenticated users only under their user ID folder (i.e. `auth.uid() = (storage.foldername(name))[1]`).

---

### 2. Authentication Context
#### [NEW] [AuthContext.jsx](file:///C:/Users/sadee/Projects/QRious/src/context/AuthContext.jsx)
We will introduce a React Context Provider to wrap the entire app:
*   Exports: `{ session, user, signIn, signUp, signOut, loading }`.
*   **Live Mode**: Hooks into `supabase.auth.onAuthStateChange`.
*   **Mock Mode**: Simulates auth.
    *   Tracks users and current session in `localStorage`.
    *   Default account: `demo@qriousqr.local` / `demo1234` mapped to company `kantami`.
    *   Registrations create a new company slug record and user credentials in local state.

---

### 3. Services Layer
#### [MODIFY] [dataService.js](file:///C:/Users/sadee/Projects/QRious/src/services/dataService.js)
*   Add `currency_code: 'USD'` and `country_code: 'LB'` to the Kantami mock seed data.
*   Update `loadMenu(slug)` to ensure it uses and returns `currency_code` and `country_code` for the restaurant.

#### [NEW] [dashboardService.js](file:///C:/Users/sadee/Projects/QRious/src/services/dashboardService.js)
Provide all admin-side CRUD and analytics aggregation operations:
*   **Profile**:
    *   `getCompany()`: Fetch the company row associated with the logged-in user.
    *   `updateCompany(profileData)`: Update profile fields.
    *   `uploadImage(bucket, file)`: Upload logos, covers, or product images. In mock mode, we convert images to base64 data URLs.
*   **Categories**:
    *   `addCategory(nameEn, nameAr, sortOrder)`
    *   `updateCategory(id, nameEn, nameAr, sortOrder)`
    *   `deleteCategory(id)`
    *   `reorderCategories(categoriesList)`: Bulk update `sort_order` in the database.
*   **Products**:
    *   `getProducts(companyId)`
    *   `addProduct(productData)`
    *   `updateProduct(id, productData)`
    *   `deleteProduct(id)`
*   **Analytics**:
    *   `getVisitorLogsCount(companyId, days)`: Returns visitor counts grouped by day.
    *   `getProductClicksCount(companyId)`: Returns top 10 products sorted by click count.

---

### 4. Routing Configuration
#### [MODIFY] [App.jsx](file:///C:/Users/sadee/Projects/QRious/src/App.jsx)
Wrap the app with `AuthProvider` and update routes:
*   `/` → `LandingPage`
*   `/auth` → `AuthPage`
*   `/dashboard` → `Dashboard` (protected route, redirects to `/auth` if no session is active)
*   `/menu/:slug` → `PublicMenu` (publicly accessible menu)

---

### 5. Page Implementations
#### [NEW] [LandingPage.jsx](file:///C:/Users/sadee/Projects/QRious/src/pages/LandingPage.jsx)
Marketing landing page with custom CSS (or defined in `index.css`):
*   **Nav bar**: Brand Logo, Features, Pricing link, Live Demo (→ `/menu/kantami`), Sign in, "Get started free" CTA button.
*   **Hero**: Catchy headline, CTA buttons, and a live phone preview on the right (rendered as a 320x640 div wrapping an `<iframe>` pointing to `/menu/kantami` with a mobile frame).
*   **Features grid**: 6 responsive benefit cards.
*   **How it works**: 3 steps with visual checklist.
*   **Footer**: Quick links.

#### [NEW] [AuthPage.jsx](file:///C:/Users/sadee/Projects/QRious/src/pages/AuthPage.jsx)
Authentication interface:
*   Centered login/registration card.
*   Tabs: **Sign in** / **Create account** (reads `?mode=register` to set the initial active tab).
*   Forms for signing in and registering with validators, slug auto-generation from English name, country selectors, and currency auto-selection.
*   Triggers `signUp` or `signIn` methods from `AuthContext` and redirects to `/dashboard` on success.

#### [NEW] [Dashboard.jsx](file:///C:/Users/sadee/Projects/QRious/src/pages/Dashboard.jsx)
Fully-featured SaaS dashboard:
*   **Sidebar**: Tabs (Profile, Menu, Analytics), Preview Menu link, and Sign Out button.
*   **Profile Tab**: Edit company details, color picker for `theme_color`, file inputs for logo and cover with live preview rendering.
*   **Menu Tab**:
    *   Categories: Inline list with drag handles or sort order change handlers (with visual up/down arrows or drag-and-drop) to reorder category sorting.
    *   Products: Filtered by category. Modal forms for adding/editing items (with name, description, price, calories, image upload, and availability toggles).
*   **Analytics Tab**:
    *   Custom inline SVG/CSS bar layout for daily visitors (7 / 30 days) and top 10 clicked products. No chart libraries are used.

#### [MODIFY] [PublicMenu.jsx](file:///C:/Users/sadee/Projects/QRious/src/pages/PublicMenu.jsx)
*   Integrate currency formatting via `Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode })` inside the menu renderer, driven by `data.company.currency_code`.
*   Update EN/AR localization variables to format the price dynamically based on language rules (`ar-LB` vs `en-US`).

---

### 6. Styles
#### [MODIFY] [index.css](file:///C:/Users/sadee/Projects/QRious/src/index.css)
*   Add responsive layouts for dashboard grid, sidebar navigation, form controls, responsive landing page grid, phone mockup shell, and simple CSS bars for analytics.

## Verification Plan

### Automated Verification
*   Verify that Vite builds without errors using `npm run build`.

### Manual Verification
1.  **Check Landing Page**: Go to `/` and inspect the marketing layout and interactive phone preview.
2.  **Mock Authentication**: Check tab switching, sign in with demo credentials, and register a new restaurant profile.
3.  **Dashboard CRUD**:
    *   Change profile details, save, and verify theme color updates.
    *   Add and reorder menu categories, add a product, upload images.
    *   Verify visitor count and product clicks metrics on the Analytics tab.
4.  **Preview Menu**: Verify `/menu/:slug` renders the dynamic theme, newly added categories, and products with correct currency formatting.
