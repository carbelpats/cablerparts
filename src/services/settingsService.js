// -----------------------------------------------------------------------------
// CABLER PARTS — Site Settings service (dual adapter)
//
// A small CMS layer that lets an admin edit the storefront's contact details,
// brand/hero logo, marketing copy and the payment-provider row WITHOUT touching
// code. Same adapter pattern as the other services:
//
//   LOCAL adapter    -> localStorage "almeyar:settings"
//   SUPABASE adapter -> single-row `settings` table (id text pk = "site",
//                       data jsonb)
//
// getSettings()  -> Settings  (always deep-merged over DEFAULT_SETTINGS so any
//                    missing/new key resolves to a sensible default)
// saveSettings() -> Settings  (deep-merges the patch/full object over the
//                    current settings, persists, and returns the merged result)
//
// DEFAULT_SETTINGS mirrors the CURRENT hardcoded storefront values (Dammam
// address, +966 800 000 000, support@cablerparts.com, the footer tagline, and the
// payments list [Apple Pay, mada, Visa, Mastercard, Tabby, Tamara] each with
// logoUrl:null so the consuming components render their built-in inline-SVG
// fallback).
//
// Images (brand.logoUrl / payment.logoUrl) may be an http(s) URL OR a base64
// `data:` URL produced by a file upload — no external storage needed locally.
//
// All exports are async (except DEFAULT_SETTINGS). import.meta.env is read via
// optional chaining (so the module also runs under Node / Vitest).
// -----------------------------------------------------------------------------

import { isSupabaseConfigured, getSupabase } from "./supabaseClient";

// NOTE: "almeyar:*" localStorage keys are legacy-internal and intentionally
// left unchanged across the Cabler Parts rebrand (renaming them would drop
// already-persisted data). They are invisible to users.
const SETTINGS_KEY = "almeyar:settings";
const ROW_ID = "site";

// ---------------------------------------------------------------------------
// DEFAULT_SETTINGS — mirrors the current hardcoded values across the storefront.
// ---------------------------------------------------------------------------
export const DEFAULT_SETTINGS = {
  contact: {
    phone: "+966 800 000 000",
    email: "support@cablerparts.com",
    address: {
      en: "Cabler Parts Distribution Center, Dammam, Eastern Province, KSA",
      ar: "مركز كابلر بارتس للتوزيع، الدمّام، المنطقة الشرقية، السعودية",
    },
    hours: {
      en: "Sun–Thu, 9:00–18:00 (AST)",
      ar: "الأحد–الخميس، 9:00–18:00 (بتوقيت السعودية)",
    },
  },
  brand: {
    logoUrl: null,
    useLogoInHero: false,
    tagline: {
      en: "The Standard for Gulf performance parts.",
      ar: "المرجع لقطع الأداء في الخليج.",
    },
  },
  promo: {
    en: "Guaranteed-fit pricing across the GCC — verified by part number.",
    ar: "أسعار بتوافق مضمون في جميع أنحاء الخليج — موثّقة برقم القطعة.",
  },
  footer: {
    tagline: {
      en: "Engineered-to-standard performance parts for the Gulf. Every component is traceable by part number, verified for fitment, and backed across the GCC.",
      ar: "قطع أداء مهندَسة بمعايير الوكالة لمنطقة الخليج. كل قطعة قابلة للتتبّع برقمها، موثّقة التوافق، ومدعومة في جميع أنحاء دول الخليج.",
    },
  },
  payments: [
    { id: "apple-pay", name: "Apple Pay", logoUrl: null },
    { id: "mada", name: "mada", logoUrl: null },
    { id: "visa", name: "Visa", logoUrl: null },
    { id: "mastercard", name: "Mastercard", logoUrl: null },
    { id: "tabby", name: "Tabby", logoUrl: null },
    { id: "tamara", name: "Tamara", logoUrl: null },
  ],
  // Legal / regulatory compliance shown across the storefront (footer trust row
  // + the /compliance page). Empty strings render nothing — the admin fills the
  // real values before launch. `licenses` mirrors the `payments` array pattern
  // (each row optionally carries an uploaded/linked logo).
  compliance: {
    // Domain the store legally operates under — used in the ownership pledge.
    domain: "cablerparts.com",
    // Saudi Commercial Registration number (رقم السجل التجاري).
    crNumber: "",
    // VAT registration number (الرقم الضريبي).
    vatNumber: "",
    // "Maroof" is the Saudi Ministry of Commerce trust platform.
    maroof: { url: "", logoUrl: null },
    // Additional licenses/certifications: [{ id, name:{en,ar}, number, url, logoUrl }]
    licenses: [],
  },
  // Social media profile URLs. Empty string => the link is hidden in the footer.
  social: {
    instagram: "",
    x: "",
    youtube: "",
    tiktok: "",
    snapchat: "",
    whatsapp: "",
    facebook: "",
  },
  // Rich-text (HTML) policy/content pages, per language. Empty string => the
  // InfoPage renders an editable "coming soon" fallback for that slug.
  pages: {
    privacy: { en: "", ar: "" },
    pdpl: { en: "", ar: "" },
    terms: { en: "", ar: "" },
    disclaimer: { en: "", ar: "" },
    warranty: { en: "", ar: "" },
    shipping: { en: "", ar: "" },
    about: { en: "", ar: "" },
    support: { en: "", ar: "" },
  },
};

// ---------------------------------------------------------------------------
// Deep-merge helpers. Plain objects merge recursively; arrays and primitives
// are REPLACED wholesale (so editing the payments list, including reordering or
// removing rows, behaves intuitively). null/undefined patch values fall back to
// the base value for that key.
// ---------------------------------------------------------------------------
function isPlainObject(v) {
  return (
    v !== null &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    Object.prototype.toString.call(v) === "[object Object]"
  );
}

function deepMerge(base, patch) {
  if (patch === undefined || patch === null) return clone(base);
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    // arrays / primitives -> patch wins (clone so callers can't mutate state)
    return clone(patch);
  }
  const out = { ...base };
  for (const key of Object.keys(patch)) {
    const next = patch[key];
    if (next === undefined) continue;
    out[key] =
      isPlainObject(base[key]) && isPlainObject(next)
        ? deepMerge(base[key], next)
        : clone(next);
  }
  return out;
}

function clone(v) {
  if (Array.isArray(v)) return v.map((item) => clone(item));
  if (isPlainObject(v)) {
    const out = {};
    for (const key of Object.keys(v)) out[key] = clone(v[key]);
    return out;
  }
  return v;
}

// Always return a complete Settings object regardless of what was persisted.
function withDefaults(partial) {
  return deepMerge(DEFAULT_SETTINGS, partial || {});
}

// ===========================================================================
// LOCAL adapter (localStorage)
// ===========================================================================
function hasStorage() {
  try {
    return typeof localStorage !== "undefined" && localStorage !== null;
  } catch {
    return false;
  }
}

// In-memory fallback for environments without localStorage (SSR / Vitest).
let memoryStore = null;

function readRaw() {
  if (hasStorage()) {
    try {
      return localStorage.getItem(SETTINGS_KEY);
    } catch {
      /* fall through to memory */
    }
  }
  return memoryStore;
}

function writeRaw(value) {
  if (hasStorage()) {
    try {
      localStorage.setItem(SETTINGS_KEY, value);
      return;
    } catch {
      /* fall through to memory */
    }
  }
  memoryStore = value;
}

function loadLocal() {
  const raw = readRaw();
  if (raw == null) return withDefaults({});
  try {
    const parsed = JSON.parse(raw);
    return withDefaults(parsed);
  } catch {
    return withDefaults({});
  }
}

const localAdapter = {
  async getSettings() {
    return loadLocal();
  },

  async saveSettings(next) {
    const merged = deepMerge(loadLocal(), next || {});
    writeRaw(JSON.stringify(merged));
    return merged;
  },
};

// ===========================================================================
// SUPABASE adapter — single-row `settings` table { id text pk, data jsonb }
// ===========================================================================
const supabaseAdapter = {
  async getSettings() {
    const sb = await getSupabase();
    const { data, error } = await sb
      .from("settings")
      .select("data")
      .eq("id", ROW_ID)
      .maybeSingle();
    if (error) throw error;
    return withDefaults(data?.data);
  },

  async saveSettings(next) {
    const sb = await getSupabase();
    // read current, deep-merge the patch over it, upsert the full object
    const { data: cur, error: readErr } = await sb
      .from("settings")
      .select("data")
      .eq("id", ROW_ID)
      .maybeSingle();
    if (readErr) throw readErr;
    const merged = deepMerge(withDefaults(cur?.data), next || {});
    const { data, error } = await sb
      .from("settings")
      .upsert({ id: ROW_ID, data: merged })
      .select("data")
      .single();
    if (error) throw error;
    return withDefaults(data?.data);
  },
};

// ===========================================================================
// Adapter selection + public API
// ===========================================================================
const adapter = isSupabaseConfigured ? supabaseAdapter : localAdapter;

export async function getSettings() {
  return adapter.getSettings();
}

export async function saveSettings(next) {
  return adapter.saveSettings(next);
}
