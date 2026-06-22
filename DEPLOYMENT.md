# Cabler Parts — Deployment & Launch Checklist

This guide takes Cabler Parts from a local build to a live, backend-connected
storefront. It works on **Vercel** or **Netlify**, with **Supabase** for
persistence and a pluggable **payment provider**.

> **Local-adapter fallback:** Cabler Parts runs with **no** environment variables.
> Every service (auth, orders, products, cart, payments) automatically falls
> back to a `localStorage` adapter and a mock payment processor when keys are
> absent. This means **preview deploys and local dev work out of the box** —
> Supabase is only required for shared, persistent, multi-device data.

---

## 0. Prerequisites

- Node.js 18+ and npm
- A [Supabase](https://supabase.com) account (free tier is fine to start)
- A [Vercel](https://vercel.com) or [Netlify](https://netlify.com) account
- (Optional) A [Moyasar](https://moyasar.com) or [Stripe](https://stripe.com)
  account for real payments

Sanity check locally first:

```bash
npm install
npm run test     # runs the Grand Tour integration test (local adapters)
npm run build    # produces dist/
npm run preview  # serves dist/ locally
```

---

## 1. Create the Supabase project

1. In the Supabase dashboard, **New project**. Pick a region close to your
   customers (GCC → Frankfurt/Bahrain are good choices) and a strong DB password.
2. Wait for provisioning to finish.

---

## 2. Run the migration + seed

Open **SQL Editor** in the Supabase dashboard and run, in order:

1. **`supabase/migrations/0001_init.sql`** — creates the `profiles`, `products`,
   `orders`, and `carts` tables, enables Row-Level Security with the launch
   policies, and installs the signup trigger that auto-creates a profile row.
2. **`supabase/seed.sql`** — inserts the launch catalog (the 14 products from
   `src/lib/data.js`). Idempotent, so it is safe to re-run.

> CLI alternative (if you use the Supabase CLI):
> ```bash
> supabase link --project-ref <your-ref>
> supabase db push          # applies migrations/0001_init.sql
> psql "$DATABASE_URL" -f supabase/seed.sql
> ```

---

## 3. Copy the API keys

Supabase dashboard → **Project Settings → API**:

- **Project URL** → `VITE_SUPABASE_URL`
- **anon / public** key → `VITE_SUPABASE_ANON_KEY`

> Use ONLY the **anon/public** key. Never expose the **service_role** key in a
> `VITE_*` variable — it is inlined into the client bundle.

---

## 4. Create the admin account

Admin is controlled two ways and you should set **both** so the storefront and
the database agree:

1. **App role (`VITE_ADMIN_EMAILS`)** — comma-separated emails that the client
   treats as admin (and the local auth adapter promotes automatically).
2. **Database role (`profiles.role`)** — the source of truth for Supabase RLS.

Steps:

1. Sign up the admin email through the app (or Supabase **Authentication →
   Users → Add user**). The signup trigger creates a matching `profiles` row.
2. In the SQL Editor, promote it:
   ```sql
   update public.profiles set role = 'admin' where email = 'admin@cablerparts.com';
   ```
3. Add that same email to `VITE_ADMIN_EMAILS` (step 5).

---

## Admin access

The admin dashboard lives at **`/admin`** (the index redirects to `/admin/orders`) and is
protected by `AdminRoute` (auth **+** the `admin` role).

- **Local / preview (LOCAL adapter, no Supabase):** sign up or sign in through the app with
  an email listed in **`VITE_ADMIN_EMAILS`** — **default `admin@cablerparts.com`** — using any
  password ≥ 6 characters. The local auth adapter promotes that email to `admin`
  automatically, and the **Admin Dashboard** entry appears in the Navbar account menu
  (desktop dropdown + mobile sheet). Then open `/admin`.
- **Production (Supabase):** set **`VITE_ADMIN_EMAILS`** (client-side role) **and** set the
  database role so RLS agrees — both, per section 4:
  ```sql
  update public.profiles set role = 'admin' where email = 'admin@cablerparts.com';
  ```
- **Guarding:** an unauthenticated visitor hitting `/admin` is redirected to `/login` (with
  `from` state so they bounce back after signing in); an authenticated **non-admin** is
  redirected to `/` (the storefront home).

| Path | What it does |
| --- | --- |
| `/admin` | Redirects to `/admin/orders` |
| `/admin/products` | Catalog CRUD (add / edit / delete) |
| `/admin/orders` | Advance order status Processing → Shipped → Delivered |

---

## 5. Set environment variables on your host

Use `.env.example` as the reference. All are **build-time public** (`VITE_`
prefix) — publishable/anon keys only.

| Variable | Required | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | for backend | From step 3 |
| `VITE_SUPABASE_ANON_KEY` | for backend | anon/public key |
| `VITE_PAYMENT_PROVIDER` | no | `mock` (default) \| `moyasar` \| `stripe` |
| `VITE_MOYASAR_PUBLISHABLE_KEY` | if moyasar | publishable key |
| `VITE_STRIPE_PUBLISHABLE_KEY` | if stripe | `pk_...` |
| `VITE_ADMIN_EMAILS` | recommended | comma-separated admin emails |

### Vercel
1. **Add New → Project**, import the repo.
2. Framework preset: **Vite**. Build command `npm run build`, output `dist`
   (also encoded in `vercel.json`, which adds the SPA rewrite).
3. **Settings → Environment Variables** → add the vars above for
   Production (and Preview if you want backend in previews).
4. **Deploy.**

### Netlify
1. **Add new site → Import an existing project.**
2. `netlify.toml` already sets build command `npm run build` and publish dir
   `dist`, plus the SPA redirect (also in `public/_redirects`).
3. **Site settings → Environment variables** → add the vars above.
4. **Deploy.**

---

## 6. Swap in a real payment provider (optional)

Out of the box `VITE_PAYMENT_PROVIDER=mock` uses the built-in test processor
(Luhn + future expiry + CVC validation, no network).

Test cards:
- `4242 4242 4242 4242` → **succeeds**
- `4000 0000 0000 0002` → **declined**
- anything failing validation → **invalid card**

To go live:
1. Set `VITE_PAYMENT_PROVIDER=moyasar` or `stripe`.
2. Add the matching publishable key (`VITE_MOYASAR_PUBLISHABLE_KEY` or
   `VITE_STRIPE_PUBLISHABLE_KEY`).
3. Real charge confirmation / webhooks must be handled **server-side** with the
   secret key (a serverless function), never in the client bundle.

---

## 7. Build & output settings (reference)

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Node version:** 18+
- **SPA routing:** handled by `vercel.json` (rewrites), `netlify.toml`, and
  `public/_redirects` — all routes fall back to `/index.html`.
- Vendor code is split into long-term-cacheable chunks (react, react-router,
  supabase) via `vite.config.js` `manualChunks`.

---

## 8. Post-deploy smoke test

Run through this on the live URL:

1. **Landing loads** in both EN (LTR) and AR (RTL); theme toggle works.
2. **Sign up** a new customer → redirected in, account menu shows the user.
3. **Browse catalog** — products load (from Supabase if configured, else local
   seed). Open a product modal; title updates the document title.
4. **Add to cart** → cart persists across a refresh (and across devices when
   Supabase is configured).
5. **Checkout** with test card `4242 4242 4242 4242` → success screen shows a
   real `order.id`. Try `4000 0000 0000 0002` → localized decline, stays on step.
6. **Track order** (`/track`) with the new order id → status **Processing**.
7. **Admin login** (admin email) → **Admin** entry appears in the account menu.
   - **/admin/products**: add / edit / delete a product; changes reflect in the
     storefront.
   - **/admin/orders**: advance the order Processing → Shipped → Delivered; the
     customer's Track Order / Order Detail reflects the new status.
8. **SEO**: view source → `<title>`, meta description, Open Graph tags present;
   `/robots.txt` and `/sitemap.xml` resolve.

If all green — you're launched. 🚀

---

## Troubleshooting

- **Everything saves but doesn't sync across devices** → Supabase env vars are
  missing/incorrect; the app is on the local adapter. Re-check step 3 & 5.
- **Admin menu missing** → email not in `VITE_ADMIN_EMAILS` (client) and/or
  `profiles.role` not set to `admin` (DB). Set both (step 4).
- **Deep links 404 on refresh** → SPA rewrite not applied; confirm
  `vercel.json` / `netlify.toml` / `public/_redirects` are deployed.
- **RLS errors on write** → the acting user isn't an admin in `profiles`, or
  is writing a row they don't own. Verify policies from `0001_init.sql` ran.
