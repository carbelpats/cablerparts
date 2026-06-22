// paymentService — MOCK payment processor designed to swap for Moyasar/Stripe.
// Provider is read from import.meta.env?.VITE_PAYMENT_PROVIDER (default "mock").
// All exports are async. No real network calls.
//
// Validation: Luhn check + future expiry + 3-4 digit CVC.
// Documented TEST CARDS:
//   4242 4242 4242 4242 -> { ok:true,  id, status:"paid" }
//   4000 0000 0000 0002 -> { ok:false, error:"card_declined" }
//   anything invalid     -> { ok:false, error:"invalid_card" }

const provider = (import.meta.env?.VITE_PAYMENT_PROVIDER || "mock").toLowerCase();

// Exposed for the checkout UI hint.
export const PAYMENT_TEST_CARDS = [
  { number: "4242 4242 4242 4242", outcome: "success", label: "Successful payment" },
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
function luhnValid(num) {
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

// Accepts "MM/YY", "MM/YYYY", "MMYY", "MM YY". Returns true when not yet expired.
function expiryValid(expiry) {
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
  return true;
}

function cvcValid(cvc) {
  const s = digits(cvc);
  return s.length >= 3 && s.length <= 4;
}

/**
 * validateCard(card) -> { ok, error? }
 * error codes: invalid_card
 */
export async function validateCard(card) {
  const number = digits(card?.number);
  if (!luhnValid(number)) return { ok: false, error: "invalid_card" };
  if (!expiryValid(card?.expiry)) return { ok: false, error: "invalid_card" };
  if (!cvcValid(card?.cvc)) return { ok: false, error: "invalid_card" };
  return { ok: true };
}

/* ------------------------------------------------------------------ *
 * Mock processor
 * ------------------------------------------------------------------ */

function genPaymentId() {
  // Runtime handler use of Date.now — allowed.
  return "pay_" + Date.now().toString(36) + Math.floor(Date.now() % 1000).toString(36);
}

async function mockCreatePayment({ card }) {
  const number = digits(card?.number);

  // Structural validation first — invalid cards never reach the processor.
  const valid = await validateCard(card);
  if (!valid.ok) return { ok: false, error: "invalid_card" };

  if (number === TEST_CARD_DECLINE) {
    return { ok: false, error: "card_declined" };
  }

  // 4242… and any other Luhn-valid card succeed in the mock processor.
  if (number === TEST_CARD_SUCCESS || luhnValid(number)) {
    return { ok: true, id: genPaymentId(), status: "paid" };
  }

  return { ok: false, error: "invalid_card" };
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

/**
 * createPayment({ amountUSD, currency, card:{number,expiry,cvc,name} })
 *   -> { ok, id?, status?, error? }
 *
 * Swappable by VITE_PAYMENT_PROVIDER. Real providers (moyasar/stripe) would
 * call their publishable-key tokenization flow here; until wired they fall
 * back to the deterministic mock so previews stay fully functional.
 */
export async function createPayment({ amountUSD, currency, card } = {}) {
  switch (provider) {
    case "moyasar":
    case "stripe":
      // Placeholder for real-provider integration. Falls back to mock so the
      // app remains runnable without server-side payment wiring.
      return mockCreatePayment({ amountUSD, currency, card });
    case "mock":
    default:
      return mockCreatePayment({ amountUSD, currency, card });
  }
}

export default {
  createPayment,
  validateCard,
  PAYMENT_TEST_CARDS,
};
