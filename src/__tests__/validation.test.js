// -----------------------------------------------------------------------------
// Caliber Parts — validation unit tests.
//
// Locks in the shared input-validation rules used by checkout + auth: GCC phone
// formats, stricter email, password strength, and card-brand detection.
// -----------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import {
  validateEmail,
  validatePhone,
  validatePassword,
  passwordStrength,
  detectCardBrand,
  cardNumberValid,
  expiryValid,
  cvcValid,
} from "../lib/validation";

describe("validateEmail", () => {
  it("accepts well-formed addresses", () => {
    expect(validateEmail("khalid@example.com").ok).toBe(true);
    expect(validateEmail("a.b-c@sub.domain.sa").ok).toBe(true);
  });
  it("rejects empty and malformed addresses", () => {
    expect(validateEmail("").error).toBe("required");
    expect(validateEmail("bad@.c").ok).toBe(false); // old regex used to pass this
    expect(validateEmail("nope").ok).toBe(false);
    expect(validateEmail("a@b").ok).toBe(false);
    expect(validateEmail("a@@b.com").ok).toBe(false);
  });
});

describe("validatePhone (GCC)", () => {
  it("accepts Saudi mobiles in several input forms", () => {
    expect(validatePhone("0512345678", "SA")).toMatchObject({
      ok: true,
      e164: "+966512345678",
    });
    expect(validatePhone("+966512345678", "SA").ok).toBe(true);
    expect(validatePhone("966 51 234 5678", "SA").ok).toBe(true);
    expect(validatePhone("512345678", "SA").ok).toBe(true);
  });
  it("falls back across GCC countries", () => {
    // a UAE number entered while region=SA still validates
    expect(validatePhone("+971501234567", "SA")).toMatchObject({ ok: true });
  });
  it("rejects empty and too-short / malformed numbers", () => {
    expect(validatePhone("", "SA").error).toBe("required");
    expect(validatePhone("123", "SA").ok).toBe(false);
    expect(validatePhone("0412345678", "SA").ok).toBe(false); // SA mobile must start with 5
  });
});

describe("validatePassword", () => {
  it("requires a minimum length", () => {
    expect(validatePassword("aB3$").error).toBe("too_short");
  });
  it("rejects weak but long passwords when strong is required", () => {
    expect(validatePassword("aaaaaaaa").error).toBe("weak");
  });
  it("accepts a strong password", () => {
    const r = validatePassword("Control123!");
    expect(r.ok).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(3);
  });
  it("scores strength on a 0..4 scale", () => {
    expect(passwordStrength("a").score).toBeLessThanOrEqual(1);
    expect(passwordStrength("Control123!").label).toBe("strong");
  });
});

describe("card validators", () => {
  it("detects brands from BIN ranges", () => {
    expect(detectCardBrand("4242424242424242")).toBe("visa");
    expect(detectCardBrand("5555555555554444")).toBe("mastercard");
    expect(detectCardBrand("371449635398431")).toBe("amex");
    expect(detectCardBrand("4406470000000000")).toBe("mada");
  });
  it("validates number / expiry / cvc", () => {
    expect(cardNumberValid("4242424242424242")).toBe(true);
    expect(cardNumberValid("1234")).toBe(false);
    expect(expiryValid("12/40")).toBe(true);
    expect(expiryValid("13/40")).toBe(false);
    expect(cvcValid("123", "4242424242424242")).toBe(true);
    expect(cvcValid("123", "371449635398431")).toBe(false); // amex needs 4
    expect(cvcValid("1234", "371449635398431")).toBe(true);
  });
});
