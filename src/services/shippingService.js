// -----------------------------------------------------------------------------
// Caliber Parts — Shipping service.
//
// Owns the shipping METHODS shown at checkout (cost + ETA), the delivery-date
// estimate, and tracking-number generation. Built as a thin, provider-agnostic
// layer so a real courier/aggregator (Aramex / SMSA / iMile / Tryoto) can be
// wired later without touching the checkout UI.
//
// ---- WIRING A REAL COURIER (see .env.example + README "Shipping") ------------
// 1. Pick a courier or an aggregator and create an account (e.g. Tryoto/Shipa
//    aggregate several couriers behind one API; Aramex/SMSA are direct).
// 2. Put the API base + key in VITE_SHIPPING_PROVIDER / VITE_SHIPPING_API_KEY.
//    A WRITE key that creates shipments must live SERVER-SIDE — expose only a
//    read/rate key to the client, or proxy createShipment() through your backend.
// 3. Replace the stubbed `createShipment` below with the provider call; keep the
//    returned shape { trackingNumber, courierProvider, estimatedDeliveryDate }.
// -----------------------------------------------------------------------------

import { SHIPPING_FLAT_USD } from "../lib/data";

const provider = (import.meta.env?.VITE_SHIPPING_PROVIDER || "mock").toLowerCase();
export const SHIPPING_PROVIDER = provider;

const DAY = 24 * 60 * 60 * 1000;

/**
 * Shipping methods. `priceUSD` is added on top of the cart's own free-shipping
 * logic for the chosen tier (express always costs; standard is free above the
 * cart threshold). `etaDays` is an inclusive [min,max] business-day range.
 * `courier` is the carrier the order is handed to for that tier.
 */
export const SHIPPING_METHODS = [
  {
    id: "standard",
    name: { en: "Standard", ar: "قياسي" },
    desc: {
      en: "Tracked GCC delivery in 1–3 business days.",
      ar: "توصيل متتبَّع داخل الخليج خلال 1–3 أيام عمل.",
    },
    etaDays: [1, 3],
    priceUSD: SHIPPING_FLAT_USD,
    courier: "Aramex",
  },
  {
    id: "express",
    name: { en: "Express", ar: "سريع" },
    desc: {
      en: "Next-business-day delivery in major GCC cities.",
      ar: "توصيل في يوم العمل التالي في المدن الخليجية الكبرى.",
    },
    etaDays: [1, 1],
    priceUSD: SHIPPING_FLAT_USD + 10,
    courier: "SMSA",
  },
];

export function getShippingMethods() {
  return SHIPPING_METHODS;
}

export function getShippingMethod(id) {
  return SHIPPING_METHODS.find((m) => m.id === id) || SHIPPING_METHODS[0];
}

/**
 * estimateDelivery(methodId, fromMs?) -> ms epoch
 * Uses the upper bound of the method's ETA range. fromMs defaults to "now"
 * (callers in a handler pass Date.now()); never called at module top level.
 */
export function estimateDelivery(methodId, fromMs) {
  const method = getShippingMethod(methodId);
  const base = fromMs == null ? Date.now() : fromMs;
  const maxDays = method.etaDays[1] || method.etaDays[0] || 3;
  return base + maxDays * DAY;
}

/**
 * generateTrackingNumber(courier) -> string
 * A plausible carrier-prefixed tracking id for the mock flow. A real courier
 * returns its own; this is only used until createShipment is wired.
 */
export function generateTrackingNumber(courier = "CP") {
  const prefix = String(courier || "CP")
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 3)
    .toUpperCase() || "CP";
  const body =
    Date.now().toString(36).toUpperCase() +
    Math.floor((Date.now() % 100000)).toString(36).toUpperCase();
  return `${prefix}${body}`;
}

/**
 * createShipment(order) -> Promise<{ trackingNumber, courierProvider, estimatedDeliveryDate }>
 * MOCK: derives a tracking number + ETA locally. Replace with the real courier
 * call (keep the return shape) to issue actual shipments.
 */
export async function createShipment(order = {}) {
  const method = getShippingMethod(order.shippingMethod);
  switch (provider) {
    case "aramex":
    case "smsa":
    case "tryoto":
    case "imile":
      // TODO: call the courier API to create a shipment and read back its real
      // tracking number + promised delivery date. Falls back to the mock for now.
      return {
        trackingNumber: generateTrackingNumber(method.courier),
        courierProvider: method.courier,
        estimatedDeliveryDate: estimateDelivery(method.id, Date.now()),
      };
    case "mock":
    default:
      return {
        trackingNumber: generateTrackingNumber(method.courier),
        courierProvider: method.courier,
        estimatedDeliveryDate: estimateDelivery(method.id, Date.now()),
      };
  }
}

export default {
  SHIPPING_METHODS,
  SHIPPING_PROVIDER,
  getShippingMethods,
  getShippingMethod,
  estimateDelivery,
  generateTrackingNumber,
  createShipment,
};
