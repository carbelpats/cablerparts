// paymentService — provider-agnostic payment layer designed to swap the built-in
// MOCK processor for a real PSP (Moyasar / Stripe / HyperPay …) with no UI churn.
//
// Provider is read from import.meta.env?.VITE_PAYMENT_PROVIDER (default "mock").
// All exports are async where they hit a "processor"; the validators are sync.
// No real network calls are made in mock mode, so previews/CI stay deterministic.
//
// Card validation: Luhn check + future expiry + 3-4 digit CVC. This module is the
// SINGLE SOURCE of card validation — src/lib/validation.js re-exports these.
//
// Documented TEST CARDS (mock mode):
//   4242 4242 4242 4242 -> { ok:true,  id, status:"paid" }   (Visa)
//   5555 5555 5555 4444 -> { ok:true,  id, status:"paid" }   (Mastercard)
//   4000 0000 0000 0002 -> { ok:false, error:"card_declined" }
//   anything invalid     -> { ok:false, error:"invalid_card" }
//
// ---- WIRING A REAL GATEWAY (see .env.example + README "Payments") -------------
// 1. Create a merchant account (Moyasar recommended for KSA — supports mada,
//    Apple Pay, STC Pay, Visa/Mastercard; Tamara/Tabby for BNPL).
// 2. Put the PUBLISHABLE key in VITE_MOYASAR_PUBLISHABLE_KEY (client-safe) and
//    set VITE_PAYMENT_PROVIDER=moyasar.
// 3. The SECRET key + the actual charge/capture + webhooks live SERVER-SIDE
//    (a serverless function / your backend) — NEVER ship a secret in a VITE_*
//    var. Tokenize the card client-side, send only the token to your server.
// 4. Implement the provider branch in `createPayment` below to call your
//    tokenization endpoint; the mock stays as the local/preview fallback.
// -----------------------------------------------------------------------------

const provider = (import.meta.env?.VITE_PAYMENT_PROVIDER || "mock").toLowerCase();

export const PAYMENT_PROVIDER = provider;

/* ------------------------------------------------------------------ *
 * Payment methods (drive the checkout method selector). `card` covers
 * Visa/Mastercard; mada is KSA's domestic scheme (also a card form).
 * `needsCard` => the card form is shown; otherwise an alternative flow.
 * ------------------------------------------------------------------ */
export const PAYMENT_METHODS = [
  { id: "mada", needsCard: true, kind: "card", region: "SA" },
  { id: "card", needsCard: true, kind: "card", region: "*" },
  { id: "applepay", needsCard: false, kind: "wallet", region: "*" },
  { id: "stcpay", needsCard: false, kind: "wallet", region: "SA" },
  { id: "tabby", needsCard: false, kind: "bnpl", region: "*" },
  { id: "tamara", needsCard: false, kind: "bnpl", region: "*" },
  { id: "cod", needsCard: false, kind: "cod", region: "*" },
];

// Exposed for the checkout UI hint.
export const PAYMENT_TEST_CARDS = [
  { number: "4242 4242 4242 4242", outcome: "success", label: "Visa — success" },
  { number: "5555 5555 5555 4444", outcome: "success", label: "Mastercard — success" },
  { number: "4000 0000 0000 0002", outcome: "declined", label: "Card declined" },
];

const TEST_CARD_SUCCESS = "4242424242424242";
const TEST_CARD_DECLINE = "4000000000000002";

/* ------------------------------------------------------------------ *
 * Validation helpers
 * ------------------------------------------------------------------ */

function digits(value) {
  return String(value == null ? "" : value).replace(/\D/g, "");
}

// Luhn (mod 10) checksum.
export function luhnValid(num) {
  const s = digits(num);
  if (s.length < 12 || s.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let d = Number(s[i]);
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/**
 * Detect the card brand from its (partial) number. Mada is matched via a small,
 * representative BIN prefix set (the official list is larger; this covers the
 * common ranges + is easy to extend). Returns one of:
 *   "mada" | "visa" | "mastercard" | "amex" | "unknown"
 */
export function detectCardBrand(number) {
  const s = digits(number);
  if (!s) return "unknown";
  // A representative subset of mada BINs (Saudi domestic scheme).
  const MADA_BINS = [
    "440647", "440795", "446404", "457865", "468540", "468541", "468542",
    "468543", "417633", "446393", "636120", "968201", "588845", "588848",
    "440533", "489318", "489319", "445564", "968208", "636120", "417633",
    "423766",
  ];
  if (MADA_BINS.some((bin) => s.startsWith(bin))) return "mada";
  if (/^4/.test(s)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(s)) return "mastercard";
  if (/^3[47]/.test(s)) return "amex";
  return "unknown";
}

// Accepts "MM/YY", "MM/YYYY", "MMYY", "MM YY". Returns true when not yet expired.
export function expiryValid(expiry) {
  if (!expiry) return false;
  const cleaned = String(expiry).replace(/\s/g, "");
  const m = cleaned.match(/^(\d{1,2})\/?(\d{2}|\d{4})$/);
  if (!m) return false;
  const month = Number(m[1]);
  if (month < 1 || month > 12) return false;
  let year = Number(m[2]);
  if (m[2].length === 2) year += 2000;

  // Date.now() inside a runtime handler — allowed (never at module top level).
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1; // 1-12
  if (year < curYear) return false;
  if (year === curYear && month < curMonth) return false;
  if (year > curYear + 20) return false; // reject absurd far-future expiry
  return true;
}

// CVC: 3 digits, or 4 for Amex.
export function cvcValid(cvc, number) {
  const s = digits(cvc);
  const brand = number ? detectCardBrand(number) : null;
  if (brand === "amex") return s.length === 4;
  // Visa/Mastercard/mada CVCs are exactly 3 digits; tolerate 4 only when the
  // brand is unknown (could be an unrecognised Amex BIN).
  if (brand === "unknown") return s.length === 3 || s.length === 4;
  return s.length === 3;
}

// Just the card-number rule (Luhn + length), without expiry/cvc.
export function cardNumberValid(number) {
  return luhnValid(number);
}

/**
 * validateCard(card) -> { ok, error? }
 * error codes: invalid_card
 */
export async function validateCard(card) {
  const number = digits(card?.number);
  if (!luhnValid(number)) return { ok: false, error: "invalid_card" };
  if (!expiryValid(card?.expiry)) return { ok: false, error: "invalid_card" };
  if (!cvcValid(card?.cvc, number)) return { ok: false, error: "invalid_card" };
  return { ok: true };
}

/* ------------------------------------------------------------------ *
 * Mock processor
 * ------------------------------------------------------------------ */

function genPaymentId(prefix = "pay") {
  // Runtime handler use of Date.now — allowed.
  return (
    prefix +
    "_" +
    Date.now().toString(36) +
    Math.floor(Date.now() % 1000).toString(36)
  );
}

async function mockChargeCard({ card }) {
  const number = digits(card?.number);

  // Structural validation first — invalid cards never reach the processor.
  const valid = await validateCard(card);
  if (!valid.ok) return { ok: false, error: "invalid_card" };

  if (number === TEST_CARD_DECLINE) {
    return { ok: false, error: "card_declined" };
  }

  // 4242… / any other Luhn-valid card succeeds in the mock processor.
  if (number === TEST_CARD_SUCCESS || luhnValid(number)) {
    return { ok: true, id: genPaymentId(), status: "paid" };
  }

  return { ok: false, error: "invalid_card" };
}

// Alternative (non-card) methods resolve deterministically in mock mode.
function mockAlternative(method) {
  switch (method) {
    case "cod":
      // Cash on delivery — no upfront charge; settled on hand-off.
      return { ok: true, id: genPaymentId("cod"), status: "cod_pending" };
    case "applepay":
    case "stcpay":
      return { ok: true, id: genPaymentId("wal"), status: "paid" };
    case "tabby":
    case "tamara":
      // Buy-now-pay-later — a real integration redirects to the provider and
      // confirms via webhook; the mock approves the plan immediately.
      return { ok: true, id: genPaymentId("bnpl"), status: "bnpl_approved" };
    default:
      return { ok: false, error: "unsupported_method" };
  }
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

/**
 * createPayment({ method, amountUSD, currency, card:{number,expiry,cvc,name} })
 *   -> { ok, id?, status?, error? }
 *
 * `method` is one of PAYMENT_METHODS ids (default "card"). Card methods
 * (card/mada) require a `card`; alternative methods don't. Swappable by
 * VITE_PAYMENT_PROVIDER. Real providers (moyasar/stripe) call their
 * publishable-key tokenization flow here; until wired they fall back to the
 * deterministic mock so previews stay fully functional.
 */
export async function createPayment({
  method = "card",
  amountUSD,
  currency,
  card,
} = {}) {
  const methodDef = PAYMENT_METHODS.find((m) => m.id === method);
  const isCard = methodDef ? methodDef.needsCard : true;

  // Real-provider branch — wire your PSP here. Until then we use the mock so the
  // app is always runnable without server-side payment wiring.
  switch (provider) {
    case "moyasar":
    case "stripe":
    case "hyperpay":
    case "tap":
      // A real PSP requires a SERVER-SIDE tokenize + charge + webhook (see the
      // header). Until that endpoint is wired, FAIL LOUDLY — never silently fall
      // back to the mock, or orders would record as "paid" with no money taken.
      return { ok: false, error: "provider_not_configured" };
    case "mock":
    default:
      return isCard
        ? mockChargeCard({ amountUSD, currency, card })
        : mockAlternative(method);
  }
}

export default {
  createPayment,
  validateCard,
  cardNumberValid,
  expiryValid,
  cvcValid,
  luhnValid,
  detectCardBrand,
  PAYMENT_METHODS,
  PAYMENT_TEST_CARDS,
  PAYMENT_PROVIDER,
};
