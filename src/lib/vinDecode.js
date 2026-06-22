// -----------------------------------------------------------------------------
// Al-Meyar — real, dynamic VIN validator + decoder (ISO 3779 / ISO 3780).
//
// Pure + deterministic: NO network, NO Math.random, NO Date.now at module top.
// (The "current year" used to disambiguate the 30-year model-year cycle is read
//  inside decodeVin() at call time, never at module load.)
//
// Public API:
//   isValidVin(vin)  -> boolean   (17 chars, legal charset, valid check digit)
//   decodeVin(vin)   -> { valid, year, region, wmi, makeGuess }
//
// makeGuess is constrained to makes that actually exist in CARS (getMakes()),
// otherwise null — we never invent a make the catalog can't serve.
// -----------------------------------------------------------------------------

import { getMakes } from "./data.js";

/** Legal VIN charset: 17 chars, A–Z/0–9 excluding I, O, Q. */
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;

/**
 * Standard ISO 3779 transliteration for the check-digit calculation.
 * Digits map to themselves; letters as below (I, O, Q never appear in a VIN).
 */
const TRANSLITERATION = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9,
};

/** Positional weights for the check digit (position 9 has weight 0). */
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/**
 * Model-year code table for VIN position 10. The single character cycles every
 * 30 years; decodeVin() resolves the ambiguity to the most recent plausible
 * year <= the current year. (Letters I, O, Q, U, Z and the digit 0 are not used
 * as year codes.)
 */
const YEAR_CODES = [
  "A", "B", "C", "D", "E", "F", "G", "H", "J", "K",
  "L", "M", "N", "P", "R", "S", "T", "V", "W", "X",
  "Y", "1", "2", "3", "4", "5", "6", "7", "8", "9",
];
// Base years: code "A" => 1980 and again => 2010, "B" => 1981 / 2011, etc.
const YEAR_CYCLE_1_BASE = 1980; // 1980..2009
const YEAR_CYCLE_2_BASE = 2010; // 2010..2039

/**
 * Region / country lookup from the first VIN character (ISO 3780 WMI ranges).
 * We return a human label; finer-grained country is noted where it informs the
 * make guess (J=Japan, K=Korea, L=China, M=India...).
 */
function regionFromChar(ch) {
  // North America: 1-5
  if (ch >= "1" && ch <= "5") return "North America";
  // Oceania: 6-7
  if (ch === "6" || ch === "7") return "Oceania";
  // South America: 8-9
  if (ch === "8" || ch === "9") return "South America";
  // Africa: A-H
  if (ch >= "A" && ch <= "H") return "Africa";
  // Asia: J-R
  if (ch >= "J" && ch <= "R") return "Asia";
  // Europe: S-Z
  if (ch >= "S" && ch <= "Z") return "Europe";
  return "Unknown";
}

/**
 * WMI (first 3 chars) -> CARS make, best effort. Real-world manufacturer
 * prefixes for the makes the catalog carries. Only makes that exist in CARS are
 * ever surfaced (guarded by getMakes() in decodeVin()).
 */
const WMI_MAKE = {
  // --- Chinese makes (core business) ---
  // Chery (China, "LVV"/"LVA")
  LVV: "Chery",
  LVA: "Chery",
  // Geely (China)
  L6T: "Geely",
  LB3: "Geely",
  LJ1: "Geely",
  // Great Wall / Haval (China)
  LGW: "Haval",
  // MG / SAIC (China + UK)
  LSJ: "MG",
  SAJ: "MG",
  // Changan (China)
  LS5: "Changan",
  LDC: "Changan",
  // BYD (China)
  LGX: "BYD",
  LC0: "BYD",
  LC6: "BYD",
  // GAC (China)
  LMG: "GAC",
  LMS: "GAC",
  // --- GCC-popular makes with compatible parts ---
  // Toyota (Japan)
  JTD: "Toyota",
  JTM: "Toyota",
  JTN: "Toyota",
  JTE: "Toyota",
  // Nissan (Japan)
  JN1: "Nissan",
  JN8: "Nissan",
  JN6: "Nissan",
  // Lexus (Japan)
  JTH: "Lexus",
  JTJ: "Lexus",
  // Hyundai (Korea)
  KMH: "Hyundai",
  KM8: "Hyundai",
  KMF: "Hyundai",
  // Mitsubishi (Japan)
  JA3: "Mitsubishi",
  JMB: "Mitsubishi",
  JMY: "Mitsubishi",
};

/** Country code (first 2 chars) -> a CARS make plausible for that origin. */
const COUNTRY_MAKE_HINT = [
  // China prefixes (L*) — most likely a Chinese make from our roster.
  { test: (v) => v.startsWith("L"), make: "Chery" },
  // Japan (J*) — Toyota is the dominant Japanese make we carry.
  { test: (v) => v.startsWith("J"), make: "Toyota" },
  // Korea (K*)
  { test: (v) => v.startsWith("K"), make: "Hyundai" },
];

/** Numeric value for a single VIN character per the transliteration table. */
function transliterate(ch) {
  const v = TRANSLITERATION[ch];
  return typeof v === "number" ? v : 0;
}

/** Normalize raw input to a candidate VIN (trim + uppercase). */
function normalize(vin) {
  return typeof vin === "string" ? vin.trim().toUpperCase() : "";
}

/**
 * Compute the expected check-digit character for a 17-char VIN candidate.
 * @returns {string} "0".."9" or "X"
 */
export function computeCheckDigit(vin) {
  let sum = 0;
  for (let i = 0; i < 17; i += 1) {
    sum += transliterate(vin[i]) * WEIGHTS[i];
  }
  const remainder = sum % 11;
  return remainder === 10 ? "X" : String(remainder);
}

/**
 * Real ISO-3779 VIN validity: exactly 17 legal chars AND a correct check digit
 * at position 9 (index 8).
 */
export function isValidVin(vin) {
  const clean = normalize(vin);
  if (!VIN_RE.test(clean)) return false;
  return computeCheckDigit(clean) === clean[8];
}

/**
 * Resolve the model year from the position-10 code, choosing the most recent
 * plausible year <= currentYear across the two 30-year cycles.
 * @returns {number|null}
 */
function decodeYear(code, currentYear) {
  const idx = YEAR_CODES.indexOf(code);
  if (idx === -1) return null;
  const y1 = YEAR_CYCLE_1_BASE + idx; // 1980..2009
  const y2 = YEAR_CYCLE_2_BASE + idx; // 2010..2039
  // Prefer the second cycle when it isn't in the future; else fall back.
  if (y2 <= currentYear) return y2;
  if (y1 <= currentYear) return y1;
  return y1; // both in the future (shouldn't happen for sane inputs) — oldest.
}

/**
 * Best-effort make guess from the WMI / country, constrained to CARS makes.
 * @returns {string|null}
 */
function guessMake(vin, validMakes) {
  const wmi = vin.slice(0, 3);
  const direct = WMI_MAKE[wmi];
  if (direct && validMakes.includes(direct)) return direct;

  for (const hint of COUNTRY_MAKE_HINT) {
    if (hint.test(vin) && validMakes.includes(hint.make)) return hint.make;
  }
  return null;
}

/**
 * Decode a VIN per ISO 3779. Always returns an object; `valid` reflects whether
 * the input passed isValidVin(). When invalid, the structural fields are still
 * best-effort filled where possible (region/wmi/year) but consumers should gate
 * on `valid`.
 *
 * @returns {{ valid: boolean, year: number|null, region: string,
 *             wmi: string, makeGuess: string|null }}
 */
export function decodeVin(vin) {
  const clean = normalize(vin);
  const valid = isValidVin(clean);

  // Even for malformed input, surface what we safely can.
  const wmi = clean.length >= 3 ? clean.slice(0, 3) : clean;
  const region = clean.length >= 1 ? regionFromChar(clean[0]) : "Unknown";

  if (!valid) {
    return { valid: false, year: null, region, wmi, makeGuess: null };
  }

  const validMakes = getMakes();
  const currentYear = new Date().getFullYear(); // call-time only, never module top
  const year = decodeYear(clean[9], currentYear);
  const makeGuess = guessMake(clean, validMakes);

  return { valid: true, year, region, wmi, makeGuess };
}
