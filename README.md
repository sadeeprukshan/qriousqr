# QR Menu Plus - Developer & Transfer Guide

This project is a multi-tenant QR Menu SaaS Web Application built with **React (Vite)**, **Vanilla CSS**, and **Supabase** backend support. 

To transfer this project to your other laptop, simply copy the **entire folder** containing these files (excluding `node_modules`).

---

## 📂 Project Structure

```text
QRMENU/
├── .env.example            # Template for Supabase environment credentials
├── .env                    # Active local environment variables
├── index.html              # HTML entry point (Cairo & Inter font imports)
├── package.json            # NPM dependencies (React Router, Supabase JS client)
├── supabase_schema.sql     # Database SQL script (Paste this in Supabase editor)
├── vite.config.js          # Vite compilation config
└── src/
    ├── main.jsx            # Entry mount logic
    ├── App.jsx             # Route mapping (/dashboard, /menu/:slug, etc.)
    ├── index.css           # Central HSL variables and Vanilla CSS design tokens
    ├── supabaseClient.js   # Supabase client initializer (with mock toggle)
    ├── services/
    │   └── dataService.js  # DB queries & localStorage fallback CRUD engine
    └── pages/
        ├── LandingPage.jsx # Platform home page with simulated mobile mockup
        ├── AuthPage.jsx    # Login and Registration portal
        ├── Dashboard.jsx   # Admin settings & visitor analytics portal
        └── PublicMenu.jsx  # Interactive, bilingual customer menu view
```

---

## 🚀 How to Run on Your New Laptop

Once you copy the files over to your new laptop, follow these steps:

### 1. Open Terminal in Project Folder
Open your terminal (PowerShell, Command Prompt, or terminal in VS Code) and navigate to the project directory:
```bash
cd path/to/your/QRMENU
```

### 2. Install Dependencies
Install all required modules (React Router, Supabase JS, etc.):
*   **If using Command Prompt (CMD) or Git Bash**:
    ```bash
    npm install
    ```
*   **If using Windows PowerShell** (and you get an execution policy error):
    ```powershell
    npm.cmd install
    ```
    *Or run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in PowerShell first.*

### 3. Run the Development Server
Start the Vite local development server:
*   **CMD / Git Bash**:
    ```bash
    npm run dev
    ```
*   **PowerShell**:
    ```powershell
    npm.cmd run dev
    ```

Open the local URL displayed in your terminal (usually `http://localhost:5173`) in your browser to view the application.

---

## ⚙️ Running in Local Mock Mode vs. Live Supabase

### A. Local Mock Mode (Default)
By default, if there are no variables in `.env`, the app runs in **Local Demo Mode**. 
- It uses a pre-populated dataset (Lebanese Restaurant "Kantami").
- Any modifications (creating categories, updating theme colors, adding products, custom covers) are persisted to your browser's **localStorage**.
- **Credentials to test login**: Email `owner@kantami.com` with password `password123`.

### B. Live Supabase Connection
To switch the app to a live database:
1. Create a free account at [supabase.com](https://supabase.com) and create a new project.
2. In the Supabase project dashboard, open the **SQL Editor**, click **New Query**, paste the contents of `supabase_schema.sql` (found at the root of this folder), and click **Run**.
3. Create three **Public Storage Buckets** in the Supabase Storage tab:
   - `logos`
   - `covers`
   - `products`
4. Rename `.env.example` to `.env` (or update `.env`) and input your project's API details:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
   ```
5. Restart your development server. The app will detect the variables and immediately route all data and image uploads to your Supabase cloud database!

---

## 🗄️ Database Schema Reference (`supabase_schema.sql`)

If you need to view or re-run the schema, copy and paste this into your database SQL panel:

```sql
create extension if not exists "uuid-ossp";

-- Companies (Restaurant Profile)
create table companies (
  id uuid references auth.users on delete cascade primary key,
  slug text unique not null,
  name_en text not null,
  name_ar text not null,
  description_en text,
  description_ar text,
  logo_url text,
  cover_url text,
  theme_color text default '#FF5722',
  whatsapp text,
  phone text,
  google_map text,
  instagram text,
  snapchat text,
  twitter text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table companies enable row level security;
create policy "Public companies viewable" on companies for select using (true);
create policy "Users update own company" on companies for update using (auth.uid() = id);
create policy "Users insert own company" on companies for insert with check (auth.uid() = id);

-- Categories
create table categories (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references companies(id) on delete cascade not null,
  name_en text not null,
  name_ar text not null,
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table categories enable row level security;
create policy "Categories public viewable" on categories for select using (true);
create policy "Owners modify own categories" on categories for all using (auth.uid() = company_id);

-- Products
create table products (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references companies(id) on delete cascade not null,
  category_id uuid references categories(id) on delete cascade not null,
  name_en text not null,
  name_ar text not null,
  description_en text,
  description_ar text,
  price numeric(10, 2) not null,
  calories integer,
  image_url text,
  is_available boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table products enable row level security;
create policy "Products public viewable" on products for select using (true);
create policy "Owners modify own products" on products for all using (auth.uid() = company_id);

-- Visitor Logs (Insights)
create table visitor_logs (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references companies(id) on delete cascade not null,
  visitor_hash text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table visitor_logs enable row level security;
create policy "Public insert visitor logs" on visitor_logs for insert with check (true);
create policy "Owners view own visitor logs" on visitor_logs for select using (auth.uid() = company_id);

-- Product Clicks (Insights)
create table product_clicks (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references companies(id) on delete cascade not null,
  product_id uuid references products(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table product_clicks enable row level security;
create policy "Public insert product clicks" on product_clicks for insert with check (true);
create policy "Owners view own product clicks" on product_clicks for select using (auth.uid() = company_id);

-- Indexes
create index idx_companies_slug on companies(slug);
create index idx_categories_company on categories(company_id);
create index idx_products_company on products(company_id);
create index idx_products_category on products(category_id);
```

---

## 🎨 Developing More Styling & Layouts

1. **Theme variables**: The application references the current restaurant's color preset via `--primary-color` inside `src/index.css`. All components dynamically inherit this primary color for active states, borders, and buttons.
2. **Adding layout variants**: Modify `src/pages/PublicMenu.jsx` to build additional templates or add menu options.
