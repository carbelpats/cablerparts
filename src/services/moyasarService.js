// -----------------------------------------------------------------------------
// CABLER PARTS — Moyasar payment-form integration (client side).
//
// Uses Moyasar's hosted Payment Form (mpf): the form is rendered by Moyasar's
// own script with the PUBLISHABLE key, card data goes directly from the
// customer's browser to api.moyasar.com (it NEVER touches our code or servers),
// and after 3-D Secure the customer lands back on /pay/callback?id=<payment_id>.
// The callback page then confirms the charge SERVER-SIDE via
// /api/payments/moyasar (secret key, Vercel env) before the order is created.
//
// Activation (all in Vercel env vars — see .env.example):
//   VITE_PAYMENT_PROVIDER=moyasar
//   VITE_MOYASAR_PUBLISHABLE_KEY=pk_test_… (then pk_live_… to go live)
//   MOYASAR_SECRET_KEY=sk_test_…           (server-only, NOT a VITE_ var)
//
// Charges are always in SAR (halalas) — Cabler's Moyasar account settles in
// SAR; the storefront's display currency converts from USD at the fixed peg.
// -----------------------------------------------------------------------------

const MPF_VERSION = "1.16.0";
export const MOYASAR_SCRIPT_URL = `https://cdn.moyasar.com/mpf/${MPF_VERSION}/moyasar.js`;
export const MOYASAR_CSS_URL = `https://cdn.moyasar.com/mpf/${MPF_VERSION}/moyasar.css`;

const provider = (import.meta.env?.VITE_PAYMENT_PROVIDER || "mock").toLowerCase();
export const MOYASAR_PUBLISHABLE_KEY =
  import.meta.env?.VITE_MOYASAR_PUBLISHABLE_KEY || "";

// True only when the provider is moyasar AND a publishable key is present —
// the checkout renders the hosted form only in this mode; otherwise it keeps
// the built-in mock (previews) or fails loudly (moyasar without a key).
export const isMoyasarConfigured =
  provider === "moyasar" && MOYASAR_PUBLISHABLE_KEY.startsWith("pk_");

// USD -> SAR at the fixed peg (same constant the admin settings editor uses).
export const SAR_PER_USD = 3.75;

export function usdToSAR(usd) {
  return Math.round((Number(usd) || 0) * SAR_PER_USD * 100) / 100;
}

// Moyasar amounts are integers in the smallest unit (halalas). Minimum 100.
export function usdToHalalas(usd) {
  return Math.max(100, Math.round((Number(usd) || 0) * SAR_PER_USD * 100));
}

/* ------------------------------------------------------------------ *
 * Script/CSS loader — idempotent; resolves window.Moyasar.
 * ------------------------------------------------------------------ */
let mpfPromise = null;

export function loadMoyasarForm() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("no_window"));
  }
  if (window.Moyasar) return Promise.resolve(window.Moyasar);
  if (mpfPromise) return mpfPromise;

  mpfPromise = new Promise((resolve, reject) => {
    // Stylesheet (fire-and-forget; the form works unstyled if it fails).
    if (!document.querySelector(`link[href="${MOYASAR_CSS_URL}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = MOYASAR_CSS_URL;
      document.head.appendChild(link);
    }

    const script = document.createElement("script");
    script.src = MOYASAR_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      if (window.Moyasar) resolve(window.Moyasar);
      else reject(new Error("moyasar_load_failed"));
    };
    script.onerror = () => {
      mpfPromise = null; // allow a retry on the next call
      reject(new Error("moyasar_load_failed"));
    };
    document.head.appendChild(script);
  });
  return mpfPromise;
}

/* ------------------------------------------------------------------ *
 * Server-side verification — POST /api/payments/moyasar { paymentId, order }.
 *   -> { configured, paid, valid, status, amount, currency, id, priceCheck }
 * `order` is the pending snapshot's order payload: the server re-checks its
 * subtotal against CATALOG prices and the charged amount/currency, and only
 * `valid:true` lets the client record a paid order.
 *
 * Two distinct failure shapes, deliberately kept apart:
 *   { configured:false }                    — HTTP 200 from the endpoint: the
 *     secret key isn't set in Vercel. Not retryable by the customer.
 *   { configured:false, unavailable:true }  — transport/HTTP failure (network,
 *     500, endpoint missing in local dev). Retryable.
 * NEITHER is ever treated as proof of payment by the caller.
 * ------------------------------------------------------------------ */
export async function verifyMoyasarPayment(paymentId, order = null) {
  try {
    const res = await fetch("/api/payments/moyasar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, order }),
    });
    if (!res.ok)
      return { configured: false, unavailable: true, error: "verify_unavailable" };
    const data = await res.json();
    return data && typeof data === "object"
      ? data
      : { configured: false, unavailable: true, error: "verify_unavailable" };
  } catch {
    return { configured: false, unavailable: true, error: "verify_unavailable" };
  }
}

/* ------------------------------------------------------------------ *
 * Pending checkout — survives the 3-D Secure redirect.
 * The payment step snapshots everything the order needs into sessionStorage;
 * /pay/callback restores it, verifies the charge, and places the order.
 * sessionStorage (not localStorage): scoped to the tab, auto-cleared when the
 * browser session ends, never synced anywhere.
 * ------------------------------------------------------------------ */
const PENDING_KEY = "almeyar:pending-checkout";

export function savePendingCheckout(payload) {
  try {
    window.sessionStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ v: 1, ...payload })
    );
  } catch {
    /* storage unavailable (private mode quota) — callback degrades gracefully */
  }
}

export function readPendingCheckout() {
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && data.v === 1 ? data : null;
  } catch {
    return null;
  }
}

export function clearPendingCheckout() {
  try {
    window.sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}
