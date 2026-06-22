# Security

This document describes the security model for **Cabler Parts** and how to
report a vulnerability. It is intended for operators deploying the storefront
and for anyone reviewing the codebase.

## 1. Production MUST use Supabase

The app ships with two storage adapters:

- **Supabase adapter** — used when the Supabase environment keys are set
  (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). This is the **only**
  production-safe configuration. User authentication is handled by **Supabase
  Auth**, and all data access is enforced **server-side** by **PostgreSQL
  Row-Level Security (RLS)** — see `supabase/migrations/`.
- **localStorage adapter** — the fallback used when no Supabase keys are
  present. It is **DEV / PREVIEW ONLY**. It keeps all "accounts", orders, and
  admin state in the browser. There is **no server-side enforcement**: anyone
  can edit localStorage and grant themselves admin. **Never expose the
  localStorage adapter to real users or real data.**

**Rule:** any public deployment must have Supabase configured. If the Supabase
keys are missing in production, treat it as a misconfiguration.

## 2. The anon key is public — and that's fine, _with RLS_

`VITE_SUPABASE_ANON_KEY` is a **public, client-side** key by design. It is
bundled into the JavaScript and visible to every visitor. It is safe **only
because Row-Level Security restricts what it can do**:

- Public `SELECT` on `products` and `settings` (storefront needs to render).
- Users can read/write **only their own** `profiles`, `orders`, and `carts`.
- Writes to `products` and `settings` require an admin (`public.is_admin()`).
- A trigger prevents non-admins from escalating their own `profiles.role`
  (see `0002_settings_and_hardening.sql`).

**NEVER ship the `service_role` key to the client.** The service-role key
bypasses RLS entirely. It must only ever live in a trusted server environment
(e.g. a serverless function), never in any `VITE_*` variable, never in the
bundle, never in the repo.

## 3. Security response headers / CSP

Strong response headers are applied to every route by the host config:

- **Vercel** — `vercel.json` (`headers` array, source `/(.*)`).
- **Netlify** — `netlify.toml` (`[[headers]]`, `for = "/*"`).

Headers set:

- **Content-Security-Policy** — `default-src 'self'`; scripts `'self'` only.
  The policy intentionally allows: Google Fonts stylesheet
  (`https://fonts.googleapis.com`) + `'unsafe-inline'` styles, Google Fonts
  files (`https://fonts.gstatic.com`), images from `https:` (Unsplash + remote
  product imagery) and `data:` URLs (inline logo / payment-proof uploads), and
  Supabase connections (`https://*.supabase.co`, `https://*.supabase.in`).
  `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`,
  `form-action 'self'`, and `upgrade-insecure-requests` lock down the rest.
- **Strict-Transport-Security** — `max-age=63072000; includeSubDomains; preload`.
- **X-Content-Type-Options** — `nosniff`.
- **X-Frame-Options** — `DENY` (belt-and-suspenders with `frame-ancestors`).
- **Referrer-Policy** — `strict-origin-when-cross-origin`.
- **Permissions-Policy** — `camera=(), microphone=(), geolocation=()`.

## 4. Admin rich text is sanitized

Admins can author rich content for informational pages. That HTML is passed
through an **allow-list sanitizer** (`sanitizeHtml` in `src/pages/InfoPage.jsx`)
before rendering, stripping scripts, event handlers, and disallowed tags/
attributes to prevent stored XSS.

## 5. HTTPS is enforced

All traffic is served over HTTPS. **HSTS** (`Strict-Transport-Security`, above)
instructs browsers to refuse plain-HTTP connections for two years, and
`upgrade-insecure-requests` in the CSP rewrites any stray subresource URLs to
HTTPS.

## 6. Secrets live only in host environment variables

- Real configuration is provided through the deploy host's environment variable
  settings (Vercel / Netlify dashboards), **not** committed to the repo.
- `.env` is **gitignored**; only `.env.example` (with placeholders) is tracked.
- Client-exposed values are limited to `VITE_*` keys, which are public by
  nature. Anything secret (e.g. `service_role`) must never use the `VITE_`
  prefix and must never reach the client bundle.

## 7. Reporting a vulnerability

If you discover a security issue, please **do not open a public GitHub issue**.
Instead, email **security@cablerparts.com** with:

- a description of the issue and its impact,
- steps to reproduce (a proof of concept if possible),
- any relevant logs, URLs, or screenshots.

We aim to acknowledge reports within **3 business days** and will keep you
updated on remediation. Please act in good faith — avoid privacy violations,
data destruction, and service disruption while researching.
