// -----------------------------------------------------------------------------
// Caliber Parts — shared input validation.
//
// One place for the rules the checkout + auth forms enforce, so every surface
// validates phone / email / password / card identically. Card validation is NOT
// re-implemented here — it re-exports the single source in paymentService.js.
//
// Every validator returns a small, serializable result:
//   { ok: boolean, error?: string, ...extra }
// `error` is a STABLE CODE (not display text); the calling component maps the
// code to localized copy via its own STRINGS dict.
// -----------------------------------------------------------------------------

import {
  cardNumberValid,
  expiryValid,
  cvcValid,
  detectCardBrand,
  validateCard,
} from "../services/paymentService";

// Re-export the card validators so callers import everything from one module.
export { cardNumberValid, expiryValid, cvcValid, detectCardBrand, validateCard };

/* ------------------------------------------------------------------ *
 * Email
 * ------------------------------------------------------------------ */

// Pragmatic, stricter-than-naive email check: local + "@" + domain with a TLD of
// at least 2 letters, no spaces, no consecutive dots. Rejects "user@.c" and
// "a@b" which the old permissive regex accepted.
const EMAIL_RE =
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export function validateEmail(value) {
  const v = String(value == null ? "" : value).trim();
  if (!v) return { ok: false, error: "required" };
  if (v.length > 254) return { ok: false, error: "format" };
  if (v.includes("..")) return { ok: false, error: "format" };
  if (!EMAIL_RE.test(v)) return { ok: false, error: "format" };
  return { ok: true, value: v };
}

/* ------------------------------------------------------------------ *
 * Phone — GCC mobile numbers
 * ------------------------------------------------------------------ */

// Per-country GCC mobile rules. `local` matches the national number after the
// dialing code / leading 0 is stripped; `cc` is the country calling code.
const GCC_PHONE = {
  SA: { cc: "966", local: /^5\d{8}$/ }, // Saudi: 5XXXXXXXX (9 digits)
  AE: { cc: "971", local: /^5\d{8}$/ }, // UAE: 5XXXXXXXX
  KW: { cc: "965", local: /^[569]\d{7}$/ }, // Kuwait: 8 digits
  QA: { cc: "974", local: /^[3567]\d{7}$/ }, // Qatar: 8 digits
  BH: { cc: "973", local: /^[36]\d{7}$/ }, // Bahrain: 8 digits
  OM: { cc: "968", local: /^[79]\d{7}$/ }, // Oman: 8 digits
};

// Strip a country code / leading zero to get the bare national number.
function toNationalNumber(rawDigits, cc) {
  let d = rawDigits;
  if (d.startsWith("00")) d = d.slice(2); // 00 international prefix
  if (cc && d.startsWith(cc)) d = d.slice(cc.length);
  if (d.startsWith("0")) d = d.slice(1); // national trunk 0
  return d;
}

/**
 * validatePhone(value, country="SA")
 *   -> { ok, error?, e164?, country? }
 * error codes: required | format
 * Accepts inputs with spaces, dashes, "+", a leading 0, or the full country
 * code. Returns the normalized E.164 form (e.g. "+9665XXXXXXXX") on success.
 */
export function validatePhone(value, country = "SA") {
  const raw = String(value == null ? "" : value);
  if (!raw.trim()) return { ok: false, error: "required" };
  const onlyDigits = raw.replace(/[^\d]/g, "");
  if (!onlyDigits) return { ok: false, error: "format" };

  const rule = GCC_PHONE[country] || GCC_PHONE.SA;
  const national = toNationalNumber(onlyDigits, rule.cc);

  if (rule.local.test(national)) {
    return { ok: true, e164: `+${rule.cc}${national}`, country };
  }

  // Fallback: try every GCC country so a UAE number entered while region=SA
  // still validates (the storefront serves the whole GCC).
  for (const [code, r] of Object.entries(GCC_PHONE)) {
    const n = toNationalNumber(onlyDigits, r.cc);
    if (r.local.test(n)) return { ok: true, e164: `+${r.cc}${n}`, country: code };
  }
  return { ok: false, error: "format" };
}

/* ------------------------------------------------------------------ *
 * Password strength
 * ------------------------------------------------------------------ */

/**
 * passwordChecks(value) -> { length, lower, upper, number, symbol }
 * Booleans for each rule; used to render a live requirement checklist.
 */
export function passwordChecks(value, { min = 8 } = {}) {
  const v = String(value == null ? "" : value);
  return {
    length: v.length >= min,
    lower: /[a-z]/.test(v),
    upper: /[A-Z]/.test(v),
    number: /\d/.test(v),
    symbol: /[^A-Za-z0-9]/.test(v),
  };
}

/**
 * passwordStrength(value) -> { score: 0..4, label: "weak"|"fair"|"good"|"strong" }
 * Score = how many of {length, mixed-case, number, symbol} are satisfied.
 */
export function passwordStrength(value, opts = {}) {
  const c = passwordChecks(value, opts);
  let score = 0;
  if (c.length) score += 1;
  if (c.lower && c.upper) score += 1;
  if (c.number) score += 1;
  if (c.symbol) score += 1;
  const label =
    score <= 1 ? "weak" : score === 2 ? "fair" : score === 3 ? "good" : "strong";
  return { score, label };
}

/**
 * validatePassword(value, { min=8, requireStrong=true })
 *   -> { ok, error?, score, checks }
 * error codes: required | too_short | weak
 * A valid password is at least `min` chars AND (when requireStrong) satisfies at
 * least 3 of the 4 strength dimensions.
 */
export function validatePassword(value, { min = 8, requireStrong = true } = {}) {
  const v = String(value == null ? "" : value);
  const checks = passwordChecks(v, { min });
  const { score } = passwordStrength(v, { min });
  if (!v) return { ok: false, error: "required", score, checks };
  if (v.length < min) return { ok: false, error: "too_short", score, checks };
  if (requireStrong && score < 3) {
    return { ok: false, error: "weak", score, checks };
  }
  return { ok: true, score, checks };
}

/**
 * validateRequired(value) -> { ok, error? }  — generic non-empty text field.
 */
export function validateRequired(value) {
  return String(value == null ? "" : value).trim()
    ? { ok: true }
    : { ok: false, error: "required" };
}
