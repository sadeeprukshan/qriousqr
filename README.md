# QriousQR

Multi-tenant QR-menu SaaS with a customer loyalty coupon system.

- Bilingual EN/AR public menu (`/menu/:slug`)
- Tenant back office (`/dashboard`) — categories, products, allergens, tags, team, branches, QR generator, analytics
- Super admin console (`/admin`) — companies, users, reports, customers
- Customer accounts (`/customer`) — 3-BOGO-per-year coupons with dual-PIN redemption

## Stack

- Vite + React 18 + React Router 6
- Supabase (Postgres + Auth + Realtime + Storage + pg_cron)
- Vanilla CSS, inline SVG icons, no UI libs

## Run locally

```bash
npm install
cp .env.example .env      # fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev
```

Opens on `http://localhost:5173/menu/kantami` (the demo tenant).

## Build for production

```bash
npm run build
# → dist/ is the deployable artifact
```

Hosting configuration (SPA fallback, custom domain, redirect allow-list) is handled in a later phase.

## Environments

| Var | Where |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase project settings → API → publishable (anon) key |

## Login credentials (local demo only)

See `.env.example` — mock credentials are `demo@qriousqr.local` / `demo1234`. Production credentials live in Supabase Auth.

## Project structure

- `src/pages/` — route components
- `src/pages/admin/` — super admin console
- `src/pages/dashboard/` — tenant back-office tabs
- `src/components/` — shared UI (charts, file input)
- `src/context/AuthContext.jsx` — auth state, role gates (`isCustomer`, `isSuperAdmin`)
- `src/services/dataService.js` — DB queries
- `src/supabaseClient.js` — Supabase client + mock toggle
- `docs/legacy/` — historical migration SQL

## License

Proprietary. All rights reserved.
