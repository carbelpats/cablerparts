# Cabler Parts — The Standard in Auto Parts

A premium GCC auto-parts storefront. Cabler Parts ("كابلر بارتس" — *the standard*) reframes
Chinese-brand performance parts as **engineered-to-standard**, targeting Gulf premium
buyers with a fast, bilingual-ready, conversion-focused single-page storefront.

Built with **Vite + React 18 + Tailwind CSS v3** and `lucide-react` icons.

---

## Design summary — "Midnight Tachometer"

The visual language is a moonlit performance garage rendered as an instrument cluster.

- **Palette** — deep obsidian surfaces (`#0B0E11`) with a single molten-amber "signal"
  accent (`#FF7A1A`) that behaves like a tachometer needle, plus a teal instrument-cluster
  readout accent (`#28E0C8`). Dark mode is the default; light mode is fully supported and
  equally polished. All color is driven by CSS variables (space-separated RGB triplets)
  composed through Tailwind's `rgb(var(--token) / <alpha-value>)` pattern, so the entire UI
  re-themes by toggling the `dark` class on `<html>`.
- **Typography** — **Saira** (display, wide machined numerals for headlines + prices),
  **IBM Plex Sans** with its Arabic sibling (body, bilingual GCC trust), and
  **JetBrains Mono** (part numbers, VINs, spec values — tabular and traceable).
- **Layout** — strict 12-column rhythm on an 8px baseline; depth comes from elevation and
  hairline borders rather than heavy outlines. Order itself reads as manufacturing tolerance.
- **Motion** — weighted and confident, like well-damped suspension. Entrances use
  `cubic-bezier(0.22, 1, 0.36, 1)`; micro-feedback is 120–180ms, reveals 320–420ms. A
  `prefers-reduced-motion` cap replaces sweeps and spins with short opacity fades. Nothing
  loops or bounces cheaply.

---

## Conversion psychology built in

- **The Garage (endowment effect).** A persistent Make → Model → Year selector styled as an
  ignition panel. Once set, copy reframes to *"Fits your 2021 Patrol — verified,"* and the
  vehicle persists across sessions, raising switching cost and perceived ownership.
- **Visual dopamine micro-interactions.** Add-to-cart fires a single-shot success state and
  ripple; the cart badge pops; counters spin up like a gauge on load — brief, tactile,
  never confetti-spam.
- **Zeigarnik open loops.** A free-shipping progress gauge in the cart nags pleasantly until
  closed ("You are X away from FREE GCC shipping"), and a build-progress bar tracks the
  Garage setup steps.
- **Scarcity + social proof, tastefully.** Quiet mono inventory lines ("Only 4 left"), a
  calm live-activity ticker, ISO/OEM trust seals, and aggregate spec-agreement stats —
  popularity framed as engineering consensus, not hype.
- **Geo pricing.** Prices are stored in USD and localized live to **two** currencies —
  **SAR** (Saudi Arabia) and **USD** (United States) — with correct symbols and en-US
  grouping to two decimals.
- **Reviews & recommendations.** The product modal shows a rating summary with a 5-star
  distribution, a verified review list, an optimistic write-a-review form, and a curated
  "frequently bought together" rail driven by a deterministic scoring engine.

---

## Phase 2 — bilingual (AR/RTL), detail modal

Phase 2 layers a second language and a product-detail experience onto the storefront.

- **Bilingual EN ⇄ AR with full RTL.** A one-tap language toggle flips the entire
  storefront. `LanguageContext` reflects `lang`/`dir` onto `<html>` and persists the
  choice. Every component carries its own local `STRINGS = { en, ar }` dict; only the two
  shared dictionaries (`CATEGORY_LABELS`, `COMMON`) live in `src/lib/i18n.js`. Layout uses
  logical Tailwind utilities (`ps-/pe-`, `ms-/me-`, `start-/end-`, `text-start/end`,
  `border-s/e`) and mirrors directional glyphs with `rtl:-scale-x-100`. SKUs, part numbers,
  phone numbers and prices stay latin/`tabular-nums` in both languages.
- **Currencies reduced to SAR + USD.** `geoPricing.js` exports exactly two `REGIONS`;
  `format()` returns `symbol number` (en-US grouping, 2 decimals; unknown code → SA). The
  footer's payment marks adapt to the active region.
- **Product Detail Modal.** A full-screen, accessible dialog (`role="dialog"`,
  `aria-modal`, Escape to close, body scroll-lock, focus trap, backdrop click) with a
  multi-angle `PartIcon` gallery, brand/SKU/price/discount, a three-state **fitment
  verification** panel against the Garage (no vehicle → prompt; make matches → green
  "verified fit"; else → amber "not confirmed"), highlights, a specs table, a quantity
  stepper + Add to Cart, then embedded Reviews and RelatedProducts. Rendered at the root;
  `z-[50]` so the cart drawer (`z-[60]`) overlays it.
- **Reviews.** Rating summary, computed 5-star distribution bars, localized review list,
  and a star-picker write-a-review form that optimistically prepends a new review
  ("Just now" / "الآن", `verified:false`).
- **RelatedProducts.** Scores candidates over `PRODUCTS` — same category `+3`, each shared
  fitment make `+2`, price within ~40% `+1` — excludes self, takes the top 4, and renders
  compact clickable tiles that open the modal.
- **Enriched data.** Every product gains `nameAr`, `descriptionEn/Ar`, `highlightsEn/Ar`,
  `specs`, `gallery`, and `reviewList`; each `category` is one of 10 canonical strings.

---

## Phase 3 — VIN/plate decode, real checkout

Phase 3 turns the storefront into a fully shoppable experience.

- **VIN / license-plate decode.** `src/lib/vinDecode.js` exports `isValidVin`, `decodeVin`,
  `decodePlate`, plus `SAMPLE_VINS` / `SAMPLE_PLATES`. The mapping is **deterministic and
  offline** (no network, no `Math.random` / `Date.now`): a WMI/keyword table resolves a make
  that exists in `CARS`, then a stable string hash picks a valid model + year, and the final
  triple is always re-validated against `getMakes/getModels/getYears` (returns `null` if it
  can't resolve). `VinDecoder.jsx` is a two-mode (VIN | Plate) segmented input with sample
  hint chips and an "Add to Garage" confirm. `GarageSelector` gains a **Manual | VIN / Plate**
  toggle in its unset state (default Manual); the cascade, owned state, and celebration are
  preserved.

- **Real checkout (boost-gauge stepper).** `CheckoutContext` exposes
  `{ isOpen, openCheckout, closeCheckout }`. `CheckoutModal.jsx` is a `z-[70]` full-screen
  `role="dialog"` (Escape + backdrop close, body scroll-lock, focus moved in) with a 3-step
  flow — **Contact → Shipping → Payment** (payment is **mock only**, masked, never real) —
  gated by per-step validation. The stepper is a **turbo boost gauge**: an SVG semicircular
  RPM arc whose amber fill + needle sweep up as steps complete (single-shot, reduced-motion
  safe). A persistent order summary shows line items (PartIcon mini-thumbs) with
  subtotal/discount/shipping/total via `useGeo().format`. "Place Order" lands a celebratory
  success state with a **deterministic** order number (derived from cart count + rounded
  subtotal + item count — never `Date.now`/`Math.random`), then clears the cart. The cart
  drawer's "Secure Checkout" button now calls `openCheckout()` and closes the drawer.
  Z-order: `CheckoutModal` (`z-[70]`) over `CartDrawer` (`z-[60]`) over
  `ProductDetailModal` (`z-[50]`).

---

## Phase 4 — accounts, routing, real orders, verified reviews

Phase 4 makes the storefront a multi-page app with client-side accounts and a real
order lifecycle. **`react-router-dom@6`** drives navigation; everything renders inside a
persistent `<StorefrontLayout>` (Navbar + `<ScrollToHash/>` + `<Outlet/>` + Footer + the
three overlays). Heavier routes (`account/*`, `AuthPage`, `TrackOrder`) are
`React.lazy()`-loaded behind a `<Suspense>` fallback so the landing stays light.

- **Client-side mock auth.** `AuthContext` (`useAuth()`) is a **local/demo-only**
  authentication layer — *not* real backend security. Users are persisted to
  `localStorage` (`almeyar:users`) with a non-crypto `djb2 → base36` password hash; the
  session userId lives in `almeyar:session`. `signIn` / `signUp` validate email regex,
  password length ≥ 6, required name, and duplicate-email, surfacing stable English error
  **codes** (`AUTH_ERRORS`) that pages localize. `status` flips to `"loading"` during a
  short awaited delay. SSR-safe + try/catch; default signed-out.
- **Real orders.** `OrdersContext` (`useOrders()`, nested **inside** `AuthProvider`)
  persists all orders to `almeyar:orders`. `placeOrder()` stamps a `userId`, an
  `"MR-…"` id, and `createdAt`. `getOrderStatus()` is **dynamic** from elapsed time —
  Processing → Shipped (~4h) → Delivered (~36h) — with projected step timestamps.
  `hasPurchased()` powers verified reviews; `trackById()` searches **all** orders by id
  (tracking is id-scoped) and falls back to a **deterministic demo** status (hash of the
  id) so any well-formed id shows a plausible timeline.
- **Routing + protected account area.** A public `/`, `/login`, and `/track`, plus a
  `/account` shell gated by `<ProtectedRoute>` (redirects to `/login` with `from`
  state) containing Profile, Orders, and Order-detail nested routes. `ScrollToHash`
  reproduces the old smooth-anchor behavior under the router (reduced-motion aware,
  re-runs on dir change).
- **Auth-gated checkout → real orders.** `CheckoutModal` prefills contact from the
  signed-in user; the final step requires auth (otherwise a sign-in gate), then calls
  `placeOrder()` and shows the success state with the **real** order id plus
  "Track order" / "Continue shopping".
- **Verified-purchase reviews.** The write-a-review form in `Reviews.jsx` is gated:
  signed-out → sign-in CTA; signed-in non-purchaser → a tasteful "verified buyers only"
  panel; verified purchaser → the form. Submissions are `verified:true`, authored by the
  user, persisted to `almeyar:reviews:<id>`, and merged newest-first onto the product's
  reviews.
- **Order timeline.** `OrderStatusTimeline.jsx` is a presentational 3-stage tracker
  (Processing = Package, Shipped = Truck, Delivered = CheckCircle2) with an amber
  connecting fill, a pulsing current stage (reduced-motion safe), localized labels +
  projected dates, and RTL-aware direction.

> The 3D Vehicle Explorer and the `three` / `@react-three/*` stack have been **removed**.
> There is no `#explorer` section any more.

---

## Phase 5 — launch-ready (real backend, payments, admin, SEO, deploy)

Phase 5 turns the demo into a **deployable product**. A service layer abstracts all
persistence behind a **dual adapter**: every service auto-selects a **Supabase**
adapter when keys are present, and otherwise falls back to a **localStorage** adapter —
so the app is a real backend the moment env vars are set, and stays fully runnable and
testable (including under Vitest/Node) without them.

### Backend adapter pattern (`src/services/`)

All env is read with optional chaining (`import.meta.env?.VITE_X`) so the modules also
run under Node. Every public export is `async`.

- **`supabaseClient.js`** — `isSupabaseConfigured` (`Boolean(url && key)`) + a memoized
  `getSupabase()` that **dynamically imports** `@supabase/supabase-js` only when
  configured, keeping it out of the main bundle (it builds as a separate
  `supabase-vendor` chunk, loaded on demand).
- **`authService.js`** — `signUp/signIn/signOut/getCurrentUser/onAuthChange/updateProfile`;
  `user = { id, name, email, role }`; errors are stable `AUTH_ERRORS` codes. LOCAL adapter
  reuses the `almeyar:users` / `almeyar:session` djb2 logic and derives `role: "admin"`
  when the email is in `VITE_ADMIN_EMAILS` (default `admin@cablerparts.com`). SUPABASE adapter
  uses `supabase.auth.*` + a `profiles` table.
- **`productsService.js`** — `listProducts/getProduct/createProduct/updateProduct/deleteProduct`.
  LOCAL adapter persists to `almeyar:products`, **seeded** from `data.js PRODUCTS` on first
  load. SUPABASE adapter maps to a `products` table.
- **`ordersService.js`** — `listOrders/placeOrder/getOrder/getAllOrders/updateOrderStatus/trackById`.
  Status is now **admin-controlled** (`placeOrder` → `Processing`, advanced via
  `updateOrderStatus`), with a `statusHistory:[{status,at}]` timeline. LOCAL → `almeyar:orders`;
  SUPABASE → an `orders` table (items/history/contact/shipping as jsonb).
- **`cartService.js`** — `loadCart/saveCart` keyed by user id (anon fallback). LOCAL →
  `almeyar:cart:<id>`; SUPABASE → a `carts` table (one jsonb row per user).
- **`paymentService.js`** — a **mock processor** designed to swap for Moyasar/Stripe
  (`VITE_PAYMENT_PROVIDER`). `createPayment(...)` + `validateCard(...)` run Luhn + future-expiry
  + CVC checks. **Test cards:** `4242 4242 4242 4242` → paid, `4000 0000 0000 0002` → declined,
  anything invalid → `invalid_card`. `PAYMENT_TEST_CARDS` is exported for the checkout hint.
  No real network calls.

The contexts (`AuthContext`, `OrdersContext`, the new **`ProductsContext`**, `CartContext`)
now consume these services while keeping their hook surfaces stable + additive — e.g.
`useAuth()` gains `role` / `isAdmin`, `useOrders()` gains `allOrders` / `updateStatus`.

### Payments in checkout

`CheckoutModal`'s Payment step shows the test-card hint and, on **Place Order**:
(1) gates on auth, (2) calls `paymentService.createPayment(...)` — on decline/invalid it
shows a localized `role="alert"` error and **stays on the step** — and (3) on success calls
`useOrders().placeOrder({ ..., paymentId })`, landing the success screen with the **real**
order id.

### Payments — swapping in a real provider

The mock processor is a drop-in seam, not a dead end. `paymentService.js` exposes
`PAYMENT_METHODS` (mada, Visa/Mastercard via `card`, Apple Pay, STC Pay, Tamara, Tabby,
and COD) and a single `createPayment({ method, amountUSD, currency, card })` entry point.
To go live:

1. **Create a merchant account** with a processor — `moyasar`, `stripe`, `hyperpay`, or
   `tap` (Moyasar/HyperPay/Tap have first-class mada + STC Pay + Apple Pay coverage for KSA;
   Stripe is the global fallback). Enable the methods you want in their dashboard.
2. **Put the PUBLISHABLE key in env** — set `VITE_PAYMENT_PROVIDER` and the matching
   `VITE_MOYASAR_PUBLISHABLE_KEY` / `VITE_STRIPE_PUBLISHABLE_KEY` (see `.env.example`).
   Only the publishable key goes on the client.
3. **Implement the provider branch** in `createPayment` (`src/services/paymentService.js`):
   load the provider SDK, **tokenize the card client-side** (the raw PAN never hits our
   servers — PCI), then hand the one-time token to your backend.
4. **Server-side secret + webhooks** — the actual charge/capture, refunds, and the
   payment-status webhook live in a serverless function holding the **secret** key, never
   in the bundle. The webhook flips the order's `paymentStatus` and can advance its status.

> Cards are tokenized and **never stored**. Treat every `VITE_*` value as public.

### Shipping — connecting a courier

`shippingService.js` mirrors the same seam. `SHIPPING_METHODS` defines **Standard**
(Aramex, 1–3 days) and **Express** (SMSA, next-day); `createShipment(order)` returns
`{ trackingNumber, courierProvider, estimatedDeliveryDate }`. To connect a real courier:

1. **Create a courier account** — `aramex`, `smsa`, `tryoto`, or `imile` (TryOTO is an
   aggregator that fans out to several couriers from one integration).
2. **Put the rate/read key in env** — set `VITE_SHIPPING_PROVIDER` and, *only if it is a
   read-only quote key*, `VITE_SHIPPING_API_KEY`. A key that **creates** shipments is a
   write credential and must be **server-side / proxied**, never client-side.
3. **Implement the provider branch** in `createShipment` (`src/services/shippingService.js`):
   call the courier to book the shipment and return its real tracking number, courier name,
   and ETA. Rate/ETA quotes may run client-side; label/booking calls go through the server.
4. Admin then patches the order via `useOrders().updateTracking(id, { trackingNumber,
   courierProvider, shippingMethod, estimatedDeliveryDate })`, which the customer's Track
   Order page reflects live.

### Order lifecycle

Orders now progress through a richer on-track timeline (index = progression):
**Received → PaymentConfirmed → Processing → Packed → Shipped → OutForDelivery →
Delivered**. Three terminal off-track states exist alongside it — **Cancelled**,
**Returned**, **Refunded**. New orders start at **Received**; admins advance status from
**Admin → Orders**, and each order also carries `paymentMethod`, `paymentStatus`,
`shippingMethod`, `courierProvider`, `trackingNumber`, `estimatedDeliveryDate`, and
`actualDeliveryDate` (see `src/services/ordersService.js`).

### Compliance & legal

Trust/compliance fields are **CMS-editable** in **Admin → Settings → Compliance** and
render in the footer: the registered **domain**, **CR** (commercial registration) number,
**VAT** number, the **Maroof** verification URL + badge, and a list of **licenses**
(name/number/badge). These ship blank — **fill in real values before launch**. Two new
legal pages back this up: **`/pdpl`** (Saudi Personal Data Protection Law notice) and
**`/disclaimer`**, both bilingual and editable via the `pages.pdpl` / `pages.disclaimer`
settings.

### Admin dashboard (`/admin`, role-gated)

A separate route group `<AdminRoute><AdminLayout/></AdminRoute>` (lazy-loaded), mounted
**inside every provider** but with its own "Cabler Parts · Control" chrome:

| Path | Element |
| --- | --- |
| `/admin` (index) | `<Navigate to="orders" replace/>` |
| `/admin/products` | `<AdminProducts/>` — catalog CRUD (add/edit/delete, optimistic, confirm-gated) |
| `/admin/orders` | `<AdminOrders/>` — advance `Processing → Shipped → Delivered` (reflects live in Track Order) |

`AdminRoute` shows a spinner while the session resolves, then bounces non-admins
(`!isAuthed` → `/login`, signed-in non-admin → `/`). The Navbar account menu shows an
explicit **Admin Dashboard** entry (→ `/admin`) when `useAuth().isAdmin`.

#### Admin access

- **URL:** `/admin` (index redirects to `/admin/orders`).
- **Locally / on a preview (LOCAL adapter):** sign up or sign in with an email that is
  listed in `VITE_ADMIN_EMAILS` — **default `admin@cablerparts.com`** — with any password
  ≥ 6 characters. The local auth adapter promotes that email to the `admin` role
  automatically, and the **Admin Dashboard** entry appears in the account menu (desktop
  dropdown + mobile sheet).
- **In production (Supabase):** set `VITE_ADMIN_EMAILS` to your admin email(s) **and** set
  the matching `profiles.role = 'admin'` row in Supabase (the DB is the source of truth for
  RLS). See `DEPLOYMENT.md` → *Admin access* for the exact SQL.
- **Guarding:** unauthenticated visitors hitting `/admin` are redirected to `/login` (with
  `from` state so they bounce back after signing in); authenticated **non-admins** are
  redirected to `/` (the storefront home).

### SEO & performance

- Enriched `index.html` head (title, description, keywords, theme-color, Open Graph +
  Twitter, canonical). Per-route titles via the dependency-free
  **`src/hooks/useDocumentMeta.js`** (`document.title` + meta description, restored on
  cleanup), applied on Landing, Auth, Track, account, admin, and product-modal open.
- `public/robots.txt` (allows all, disallows `/account` + `/admin`) + `public/sitemap.xml`
  (public routes only).
- `vite.config.js` `manualChunks` splits `react-vendor` / `router-vendor` /
  `supabase-vendor` for cache-friendly long-term caching. Admin pages (and account/auth/track)
  are `React.lazy` behind `<Suspense>`.

### Deployment

- **`.env.example`** documents every `VITE_` var (all build-time **public** — use only
  anon/publishable keys; secrets stay server-side).
- SPA hosting configs: `vercel.json`, `netlify.toml`, `public/_redirects`.
- **`supabase/migrations/0001_init.sql`** (tables + RLS policies + a signup→profile
  trigger) and **`supabase/seed.sql`** (the catalog + an admin-promotion note).
- **`DEPLOYMENT.md`** — step-by-step launch checklist + post-deploy smoke test, noting the
  local-adapter fallback for previews.

### Testing

A Vitest + jsdom **Grand Tour** integration test
(`src/__tests__/grandTour.test.js`, run with `npm run test`) exercises the real service
functions over the LOCAL adapter end-to-end: customer sign-up/sign-in → seeded catalog →
admin product create → payment success/decline → place order (Processing) → admin
`Shipped`/`Delivered` → `trackById` reflects Delivered → `hasPurchased` is true.

---

## Run it

Requires Node.js 18+ and npm.

```bash
npm install      # install dependencies
npm run dev      # start the Vite dev server (default http://localhost:5173)
```

Other scripts:

```bash
npm run build    # production build to dist/
npm run preview  # preview the production build locally
npm run test     # run the Vitest Grand Tour integration test (LOCAL adapter)
```

> **Optional backend.** Copy `.env.example` → `.env` and set `VITE_SUPABASE_URL` +
> `VITE_SUPABASE_ANON_KEY` to switch every service from the localStorage adapter to
> Supabase (see `DEPLOYMENT.md`). Without them the app runs fully on the local adapter.

---

## Architecture

State lives in **eleven** nested React contexts. **The nesting order is load-bearing** —
`OrdersProvider` + `ProductsProvider` depend on `useAuth`, so they sit inside
`AuthProvider`; `CartProvider` reads `useGarage` (coupons can require a saved vehicle), so
it sits inside `GarageProvider`; and `CheckoutModal` reads `useCart` totals + `clearCart`,
so `CheckoutProvider` sits inside `CartProvider`:

```
ThemeProvider → AuthProvider → LanguageProvider → GeoProvider → GarageProvider →
CartProvider → CheckoutProvider → OrdersProvider → ProductsProvider →
CatalogProvider → ProductModalProvider → <Routes>
```

`<BrowserRouter>` wraps `<App/>` in `main.jsx`. The route table has two groups inside the
same `<Routes>` (both within every provider): the **storefront** group renders inside a
persistent `<StorefrontLayout>` = `Navbar` + `<ScrollToHash/>` + `<Outlet/>` + `Footer`
(with `CartDrawer`, `ProductDetailModal`, **and** `CheckoutModal` mounted once at its
root), and the lazy **`/admin`** group renders inside `<AdminRoute><AdminLayout/></AdminRoute>`
with its own control chrome. `ProductsProvider` wraps both so the storefront and admin
share one live product store.

### Route table

| Path | Element |
| --- | --- |
| `/` | `<Landing/>` (Hero, SocialProof, GarageSelector, ProductGrid; `#catalog` / `#garage` hash-scroll) |
| `/login` | `<AuthPage/>` (sign-in + sign-up; redirects when already authed) |
| `/track` | `<TrackOrder/>` (**public**) |
| `/about` `/contact` `/support` `/returns` `/shipping` `/privacy` `/terms` | `<InfoPage slug=…/>` — one bilingual content page driven by slug (lazy) |
| `/account` | `<ProtectedRoute><AccountLayout/></ProtectedRoute>` |
| `/account` (index) | `<Navigate to="orders" replace/>` |
| `/account/profile` | `<ProfileSettings/>` |
| `/account/orders` | `<OrderHistory/>` |
| `/account/orders/:orderId` | `<OrderDetail/>` |
| `/admin` | `<AdminRoute><AdminLayout/></AdminRoute>` (role-gated, lazy) |
| `/admin` (index) | `<Navigate to="orders" replace/>` |
| `/admin/products` | `<AdminProducts/>` |
| `/admin/orders` | `<AdminOrders/>` |
| `*` | `<Navigate to="/" replace/>` |

- **ThemeContext** — `useTheme()` → `{ theme, toggleTheme, setTheme }`. Persists
  `almeyar-theme`; toggles the `dark` class on `<html>`. Default dark.
- **AuthContext** — `useAuth()` → `{ user, isAuthed, role, isAdmin, status, error, signIn,
  signUp, signOut, updateProfile, clearError }`. Backed by `authService` (Supabase when
  configured, else the localStorage demo adapter — `almeyar:users` / `almeyar:session`,
  non-crypto `djb2 → base36` hash). `role`/`isAdmin` come from `VITE_ADMIN_EMAILS` (local)
  or the `profiles` table (Supabase). Errors are stable codes (`AUTH_ERRORS`). `status`
  stays `"loading"` until the initial session restore resolves. Default signed-out.
- **LanguageContext** — `useLang()` → `{ lang, dir, isRTL, toggleLang, setLang }`. Reflects
  `lang`/`dir` onto `<html>`; persists `almeyar-lang`. Default English (LTR).
- **GeoContext** — `useGeo()` → `{ region, setRegion, regions, format, convert }`. Money is
  USD internally; `format()` / `convert()` localize to SAR or USD. Persists
  `almeyar-region`. Default Saudi Arabia.
- **GarageContext** — `useGarage()` → `{ vehicle, setVehicle, clearGarage, hasVehicle }`.
  Persists `almeyar-garage`.
- **CartContext** — `useCart()` → items, `addItem`/`removeItem`/`updateQty`/`clearCart`,
  drawer `isOpen`/`openCart`/`closeCart`, plus derived `count`, `subtotalUSD`, coupon
  handling, `discountUSD`, `shippingUSD`, `totalUSD`, and `freeShippingRemainingUSD`.
  Persists `almeyar-cart`.
- **CheckoutContext** — `useCheckout()` → `{ isOpen, openCheckout, closeCheckout }`.
  Drives the full-screen `CheckoutModal`. SSR-safe; no persistence.
- **OrdersContext** — `useOrders()` → `{ orders, loading, placeOrder, getOrder,
  getOrderStatus, hasPurchased, trackById, refresh, allOrders, updateStatus }`. Backed by
  `ordersService` (Supabase/local). Status is **admin-controlled**: `placeOrder` stamps
  `Processing`, `updateStatus` advances it; `getOrderStatus` derives the 3-step timeline
  from `order.status` + `statusHistory` timestamps (not elapsed time). `allOrders` /
  `updateStatus` power the admin order book; `trackById` is async with a deterministic
  demo fallback.
- **ProductsContext** — `useProducts()` → `{ products, loading, error, getProduct,
  createProduct, updateProduct, deleteProduct, refresh }`. Backed by `productsService`
  (Supabase/local, seeded from `data.js`). Admin mutations are optimistic (update in place,
  reconcile with the server record, roll back + rethrow on failure). Sits inside
  `AuthProvider` and wraps both the storefront grid and the admin catalog.
- **CatalogContext** — `useCatalog()` → `{ category, setCategory, fitsOnly, setFitsOnly,
  focusNonce, focusCatalog }`. Shared browse state consumed by the ProductGrid.
  `focusCatalog()` bumps a nonce so consumers scroll `#catalog` into view.
- **ProductModalContext** — `useProductModal()` → `{ product, openProduct, closeProduct }`.
  Holds the product shown in the full-screen detail modal (`null` = closed).

All `localStorage` access is SSR-safe (`typeof window` guarded) and try/catch-wrapped.
There is no `Math.random` / `Date.now` at module top level (deterministic first paint).

---

## File structure

```
cabler-parts/
├─ index.html                 # rich SEO head (title, OG/Twitter, canonical, theme-color), #root, /src/main.jsx
├─ package.json               # type:module; dev/build/preview/test scripts; react, react-router-dom, supabase, lucide; vite, vitest, jsdom, tailwind
├─ vite.config.js             # @vitejs/plugin-react + manualChunks vendor split
├─ vitest.config.js           # jsdom environment, globals:true (Grand Tour test)
├─ postcss.config.js          # tailwindcss + autoprefixer (ESM)
├─ tailwind.config.js         # darkMode:"class", semantic tokens, keyframes, shadows
├─ .env.example               # all VITE_ vars (build-time public; anon/publishable only)
├─ vercel.json / netlify.toml # SPA hosting (rewrites/redirects)
├─ DEPLOYMENT.md              # launch checklist + post-deploy smoke test
├─ supabase/
│  ├─ migrations/0001_init.sql  # profiles/products/orders/carts + RLS + signup trigger
│  └─ seed.sql                  # catalog seed + admin-promotion note
├─ public/
│  ├─ robots.txt / sitemap.xml  # public routes only
│  └─ _redirects                # SPA fallback (/* /index.html 200)
├─ .gitignore
├─ README.md
└─ src/
   ├─ main.jsx                # React 18 createRoot + StrictMode, wrapped in <BrowserRouter>
   ├─ index.css               # font import, @tailwind layers, :root/.dark tokens, base styles
   ├─ App.jsx                 # 11 providers + <Routes> (storefront + lazy /admin group) + StorefrontLayout + overlays
   ├─ __tests__/
   │  └─ grandTour.test.js    # Vitest end-to-end service-layer integration test
   ├─ hooks/
   │  └─ useDocumentMeta.js   # dependency-free per-route <title>/description
   ├─ services/               # dual-adapter persistence (Supabase when configured, else localStorage)
   │  ├─ supabaseClient.js    # isSupabaseConfigured + memoized dynamic-import getSupabase()
   │  ├─ authService.js       # signUp/signIn/signOut/getCurrentUser/onAuthChange/updateProfile; AUTH_ERRORS; role
   │  ├─ productsService.js   # list/get/create/update/delete; seeded from data.js
   │  ├─ ordersService.js     # list/place/get/getAll/updateOrderStatus/trackById; admin-controlled status
   │  ├─ cartService.js       # loadCart/saveCart keyed by user id
   │  └─ paymentService.js    # mock createPayment/validateCard (Luhn); PAYMENT_TEST_CARDS
   ├─ lib/
   │  ├─ data.js              # CARS, getMakes/getModels/getYears, PRODUCTS (enriched), COUPONS, constants
   │  ├─ geoPricing.js        # REGIONS (SAR + USD only), convert(), formatPrice()
   │  ├─ i18n.js              # CATEGORY_LABELS + COMMON shared dictionaries (en/ar)
   │  ├─ partIcons.jsx        # PART_ICONS map, ACCENT_GRADIENT, <PartIcon/>
   │  └─ vinDecode.js         # deterministic VIN/plate decode → CARS; SAMPLE_VINS/SAMPLE_PLATES
   ├─ context/
   │  ├─ ThemeContext.jsx
   │  ├─ AuthContext.jsx      # useAuth() — DEMO mock auth; AUTH_ERRORS; almeyar:users/session
   │  ├─ LanguageContext.jsx  # useLang() — lang/dir/isRTL/toggleLang/setLang
   │  ├─ GeoContext.jsx
   │  ├─ GarageContext.jsx
   │  ├─ CartContext.jsx
   │  ├─ CheckoutContext.jsx  # useCheckout() — isOpen/openCheckout/closeCheckout
   │  ├─ OrdersContext.jsx    # useOrders() — placeOrder/updateStatus/allOrders/trackById (via ordersService)
   │  ├─ ProductsContext.jsx  # useProducts() — products + optimistic create/update/delete (via productsService)
   │  ├─ CatalogContext.jsx   # useCatalog() — category/fitsOnly/focusCatalog
   │  └─ ProductModalContext.jsx  # useProductModal() — open/close detail modal
   ├─ pages/
   │  ├─ Landing.jsx          # Hero, SocialProof, GarageSelector, ProductGrid (route "/")
   │  ├─ AuthPage.jsx         # sign-in | sign-up tabs (lazy)
   │  ├─ TrackOrder.jsx       # public order tracker via trackById (lazy)
   │  ├─ InfoPage.jsx         # bilingual content/legal pages (about/contact/support/returns/shipping/privacy/terms), slug-driven (lazy)
   │  ├─ account/
   │  │  ├─ AccountLayout.jsx     # protected shell: side nav + <Outlet/> (lazy)
   │  │  ├─ ProfileSettings.jsx   # edit name/email + preferences (lazy)
   │  │  ├─ OrderHistory.jsx      # order cards → /account/orders/:id (lazy)
   │  │  └─ OrderDetail.jsx       # timeline + line items + totals (lazy)
   │  └─ admin/                   # role-gated dashboard (lazy)
   │     ├─ AdminLayout.jsx       # "Cabler Parts · Control" chrome: nav + <Outlet/>
   │     ├─ AdminProducts.jsx     # catalog CRUD (add/edit/delete, optimistic)
   │     └─ AdminOrders.jsx       # advance order status Processing→Shipped→Delivered
   └─ components/
      ├─ Navbar.jsx           # router nav, account menu (+ Admin entry when isAdmin), region/language/theme toggle, Garage chip, cart
      ├─ AdminRoute.jsx       # role gate → spinner / <Navigate to="/login"|"/"/>
      ├─ Hero.jsx             # garage-aware headline, CTAs, hero rotor, stat strip
      ├─ SocialProof.jsx      # trust marquee, live-activity ticker, aggregate stats
      ├─ GarageSelector.jsx   # Make→Model→Year ignition panel + Manual|VIN/Plate toggle (#garage)
      ├─ VinDecoder.jsx       # VIN | Plate segmented decode → Add to Garage
      ├─ ProtectedRoute.jsx   # auth gate → <Navigate to="/login" state={{from}}/>
      ├─ order/
      │  └─ OrderStatusTimeline.jsx  # presentational 3-stage tracker (Processing/Shipped/Delivered)
      ├─ ProductGrid.jsx      # category chips + fits-my-vehicle filter via CatalogContext (#catalog)
      ├─ ProductCard.jsx      # clickable part card → opens detail modal; add-to-cart + fitment badge
      ├─ ProductDetailModal.jsx  # full-screen dialog (z-[50]): gallery, fitment, specs, reviews, related
      ├─ Reviews.jsx          # rating summary + distribution + list + verified-purchase review form
      ├─ RelatedProducts.jsx  # scored "frequently bought together" rail
      ├─ CartDrawer.jsx       # slide-in cart (z-[60]), coupons, free-shipping gauge, Secure Checkout → openCheckout
      └─ CheckoutModal.jsx    # full-screen checkout (z-[70]): auth-gated, places real orders
```

### Page anchors

`ScrollToHash` (in `App.jsx`) wires smooth-scroll anchor behavior (respecting
`prefers-reduced-motion`) and `scroll-padding-top` to clear the sticky navbar; it re-runs
on direction change so it survives an LTR ⇄ RTL switch, and scrolls to `location.hash` on
navigation. The landing exposes `#top`, `#garage`, and `#catalog`; the navbar and footer
link to these via `/#hash` — and `ScrollToHash` retries across a few frames so a
cross-route jump (e.g. `/about` → `/#catalog`) lands correctly once the landing mounts.
Every other footer/nav link resolves to a **real router route** (`/track`, `/contact`,
`/returns`, `/shipping`, `/privacy`, `/terms`, `/about`, `/support`) — no dead anchors.

---

© 2026 Cabler Parts — The Standard
