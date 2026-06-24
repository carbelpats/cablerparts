// -----------------------------------------------------------------------------
// AL-MEYAR — Orders service (dual adapter)
//
// LOCAL adapter  -> localStorage "almeyar:orders" (reuses the original order
//                   logic: MR- ids, per-user filter, deterministic demo track).
// SUPABASE adapter -> `orders` table (items/status_history/contact/shipping as
//                     jsonb).
//
// Status is now ADMIN-CONTROLLED (not elapsed-time):
//   placeOrder        -> status "Processing", statusHistory:[{status,at}]
//   updateOrderStatus -> sets a new status + appends to statusHistory
//
// Order = {
//   id, userId, createdAt, status, statusHistory:[{status,at}],
//   items, subtotalUSD, discountUSD, shippingUSD, totalUSD,
//   contact, shipping, paymentId
// }
//
// All exports are async. import.meta.env via optional chaining (Node/Vitest ok).
// -----------------------------------------------------------------------------

import { isSupabaseConfigured, getSupabase } from "./supabaseClient";

const ORDERS_KEY = "almeyar:orders";

// Progress statuses — the realistic, sequential fulfilment lifecycle that drives
// the dynamic timeline + the deterministic demo track. Order is load-bearing:
// the index in this array IS the stage progression.
//
//   Received         -> we received the order (set at placeOrder)
//   PaymentConfirmed -> payment captured / confirmed
//   Processing       -> picking + preparing the parts
//   Packed           -> packed and ready to hand to the courier
//   Shipped          -> handed to the courier, tracking number issued
//   OutForDelivery   -> on the delivery vehicle
//   Delivered        -> delivered to the customer
//
// Back-compat: the legacy statuses "Processing"/"Shipped"/"Delivered" remain in
// this array (at indices 2/4/6) so already-persisted orders keep mapping.
export const ORDER_STATUSES = [
  "Received",
  "PaymentConfirmed",
  "Processing",
  "Packed",
  "Shipped",
  "OutForDelivery",
  "Delivered",
];

// Terminal, OFF-track statuses — each ends the order outside the linear flow and
// renders as a distinct badge everywhere (never as a progress dot).
export const CANCELLED_STATUS = "Cancelled";
export const RETURNED_STATUS = "Returned";
export const REFUNDED_STATUS = "Refunded";
export const TERMINAL_STATUSES = [
  CANCELLED_STATUS,
  RETURNED_STATUS,
  REFUNDED_STATUS,
];

// Every status an admin may set / persist.
export const ALL_ORDER_STATUSES = [...ORDER_STATUSES, ...TERMINAL_STATUSES];

// The first linear stage — new orders start here.
const INITIAL_STATUS = ORDER_STATUSES[0]; // "Received"
const HOUR = 60 * 60 * 1000;

// ---- id / hash helpers ------------------------------------------------------
function shortToken() {
  return Math.random().toString(36).slice(2, 6);
}

function makeOrderId(createdAt) {
  return (
    "MR-" +
    createdAt.toString(36).toUpperCase() +
    "-" +
    shortToken().toUpperCase()
  );
}

function hashId(str) {
  let h = 5381;
  const s = String(str || "");
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return h >>> 0;
}

// Normalize an order payload into the canonical Order shape.
function normalizeOrder(payload = {}, { id, createdAt } = {}) {
  const at = createdAt ?? Date.now();
  const status = payload.status || INITIAL_STATUS;
  const statusHistory =
    Array.isArray(payload.statusHistory) && payload.statusHistory.length
      ? payload.statusHistory
      : [{ status, at }];
  return {
    id: id || payload.id || makeOrderId(at),
    userId: payload.userId ?? null,
    createdAt: at,
    status,
    statusHistory,
    items: Array.isArray(payload.items) ? payload.items : [],
    subtotalUSD: payload.subtotalUSD ?? 0,
    discountUSD: payload.discountUSD ?? 0,
    shippingUSD: payload.shippingUSD ?? 0,
    totalUSD: payload.totalUSD ?? 0,
    contact: payload.contact || { name: "", email: "", phone: "" },
    shipping: payload.shipping || { address: "", city: "", regionCode: "" },
    paymentId: payload.paymentId ?? null,
    // Payment + fulfilment metadata (all nullable; admin/courier fill them in).
    paymentMethod: payload.paymentMethod ?? null,
    paymentStatus: payload.paymentStatus ?? null,
    shippingMethod: payload.shippingMethod ?? null,
    courierProvider: payload.courierProvider ?? null,
    trackingNumber: payload.trackingNumber ?? null,
    estimatedDeliveryDate: payload.estimatedDeliveryDate ?? null,
    actualDeliveryDate: payload.actualDeliveryDate ?? null,
  };
}

// Fields a later update is allowed to patch onto an order (besides status).
const PATCHABLE_FIELDS = [
  "paymentMethod",
  "paymentStatus",
  "shippingMethod",
  "courierProvider",
  "trackingNumber",
  "estimatedDeliveryDate",
  "actualDeliveryDate",
];

// Keep only known, defined patch fields (so an admin form can't inject keys).
function pickPatch(fields = {}) {
  const out = {};
  for (const key of PATCHABLE_FIELDS) {
    if (fields[key] !== undefined) out[key] = fields[key];
  }
  return out;
}

// ===========================================================================
// LOCAL adapter (localStorage)
// ===========================================================================
function readAllOrders() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAllOrders(orders) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  } catch {
    /* ignore quota / privacy errors */
  }
}

const localAdapter = {
  async listOrders(userId) {
    if (!userId) return [];
    return readAllOrders()
      .filter((o) => o.userId === userId)
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  async placeOrder(order) {
    const createdAt = Date.now();
    const record = normalizeOrder(order, { createdAt });
    const all = readAllOrders();
    writeAllOrders([...all, record]);
    return record;
  },

  async getOrder(id, userId) {
    const found = readAllOrders().find(
      (o) => String(o.id).toLowerCase() === String(id).toLowerCase()
    );
    if (!found) return null;
    if (userId != null && found.userId !== userId) return null;
    return found;
  },

  async getAllOrders() {
    return readAllOrders()
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  async updateOrderStatus(id, status) {
    if (!ALL_ORDER_STATUSES.includes(status)) {
      throw new Error("invalid_status");
    }
    const all = readAllOrders();
    let updated = null;
    const next = all.map((o) => {
      if (String(o.id).toLowerCase() !== String(id).toLowerCase()) return o;
      const history = Array.isArray(o.statusHistory)
        ? o.statusHistory.slice()
        : [];
      history.push({ status, at: Date.now() });
      // When an order is marked Delivered, stamp the actual delivery date if it
      // hasn't been set yet — keeps the timeline + tracking page honest.
      const deliveredPatch =
        status === "Delivered" && !o.actualDeliveryDate
          ? { actualDeliveryDate: Date.now() }
          : {};
      updated = { ...o, status, statusHistory: history, ...deliveredPatch };
      return updated;
    });
    if (!updated) throw new Error("order_not_found");
    writeAllOrders(next);
    return updated;
  },

  async updateOrderFields(id, fields) {
    const patch = pickPatch(fields);
    const all = readAllOrders();
    let updated = null;
    const next = all.map((o) => {
      if (String(o.id).toLowerCase() !== String(id).toLowerCase()) return o;
      updated = { ...o, ...patch };
      return updated;
    });
    if (!updated) throw new Error("order_not_found");
    writeAllOrders(next);
    return updated;
  },

  async trackById(id) {
    const norm = String(id || "").trim();
    if (!norm) return { found: false, isDemo: false };
    const real = readAllOrders().find(
      (o) => String(o.id).toLowerCase() === norm.toLowerCase()
    );
    if (real) return { found: true, order: real, isDemo: false };
    // deterministic demo: derive a stable stage from the id hash so a given id
    // always renders the same plausible status.
    const h = hashId(norm);
    const status = ORDER_STATUSES[h % ORDER_STATUSES.length];
    const createdAt = Date.now() - (h % (48 * HOUR));
    const demo = normalizeOrder(
      { id: norm.toUpperCase(), status },
      { id: norm.toUpperCase(), createdAt }
    );
    return { found: false, order: demo, isDemo: true };
  },
};

// ===========================================================================
// SUPABASE adapter — `orders` table
// ===========================================================================
// DB row <-> Order mapping. Items/status_history/contact/shipping are jsonb.
function rowToOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id ?? null,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    status: row.status || INITIAL_STATUS,
    statusHistory: Array.isArray(row.status_history) ? row.status_history : [],
    items: Array.isArray(row.items) ? row.items : [],
    subtotalUSD: row.subtotal_usd ?? 0,
    discountUSD: row.discount_usd ?? 0,
    shippingUSD: row.shipping_usd ?? 0,
    totalUSD: row.total_usd ?? 0,
    contact: row.contact || { name: "", email: "", phone: "" },
    shipping: row.shipping || { address: "", city: "", regionCode: "" },
    paymentId: row.payment_id ?? null,
    paymentMethod: row.payment_method ?? null,
    paymentStatus: row.payment_status ?? null,
    shippingMethod: row.shipping_method ?? null,
    courierProvider: row.courier_provider ?? null,
    trackingNumber: row.tracking_number ?? null,
    estimatedDeliveryDate: row.estimated_delivery_date
      ? new Date(row.estimated_delivery_date).getTime()
      : null,
    actualDeliveryDate: row.actual_delivery_date
      ? new Date(row.actual_delivery_date).getTime()
      : null,
  };
}

// ms epoch (or null) -> ISO string (or null) for timestamptz columns.
function msToIso(ms) {
  return ms == null ? null : new Date(ms).toISOString();
}

function orderToRow(order) {
  return {
    id: order.id,
    user_id: order.userId,
    status: order.status,
    status_history: order.statusHistory,
    items: order.items,
    subtotal_usd: order.subtotalUSD,
    discount_usd: order.discountUSD,
    shipping_usd: order.shippingUSD,
    total_usd: order.totalUSD,
    contact: order.contact,
    shipping: order.shipping,
    payment_id: order.paymentId,
    payment_method: order.paymentMethod ?? null,
    payment_status: order.paymentStatus ?? null,
    shipping_method: order.shippingMethod ?? null,
    courier_provider: order.courierProvider ?? null,
    tracking_number: order.trackingNumber ?? null,
    estimated_delivery_date: msToIso(order.estimatedDeliveryDate),
    actual_delivery_date: msToIso(order.actualDeliveryDate),
    created_at: new Date(order.createdAt).toISOString(),
  };
}

// Translate a canonical-field patch into snake_case DB columns (for updates).
function patchToRow(patch = {}) {
  const out = {};
  if (patch.paymentMethod !== undefined) out.payment_method = patch.paymentMethod;
  if (patch.paymentStatus !== undefined) out.payment_status = patch.paymentStatus;
  if (patch.shippingMethod !== undefined)
    out.shipping_method = patch.shippingMethod;
  if (patch.courierProvider !== undefined)
    out.courier_provider = patch.courierProvider;
  if (patch.trackingNumber !== undefined)
    out.tracking_number = patch.trackingNumber;
  if (patch.estimatedDeliveryDate !== undefined)
    out.estimated_delivery_date = msToIso(patch.estimatedDeliveryDate);
  if (patch.actualDeliveryDate !== undefined)
    out.actual_delivery_date = msToIso(patch.actualDeliveryDate);
  return out;
}

const supabaseAdapter = {
  async listOrders(userId) {
    if (!userId) return [];
    const sb = await getSupabase();
    const { data, error } = await sb
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(rowToOrder);
  },

  async placeOrder(order) {
    const sb = await getSupabase();
    const record = normalizeOrder(order, { createdAt: Date.now() });
    const { data, error } = await sb
      .from("orders")
      .insert(orderToRow(record))
      .select()
      .single();
    if (error) throw error;
    return rowToOrder(data);
  },

  async getOrder(id, userId) {
    const sb = await getSupabase();
    let q = sb.from("orders").select("*").eq("id", id);
    if (userId != null) q = q.eq("user_id", userId);
    const { data, error } = await q.maybeSingle();
    if (error) throw error;
    return rowToOrder(data);
  },

  async getAllOrders() {
    const sb = await getSupabase();
    const { data, error } = await sb
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(rowToOrder);
  },

  async updateOrderStatus(id, status) {
    if (!ALL_ORDER_STATUSES.includes(status)) throw new Error("invalid_status");
    const sb = await getSupabase();
    // read current history, append, write back
    const { data: cur, error: readErr } = await sb
      .from("orders")
      .select("status_history")
      .eq("id", id)
      .single();
    if (readErr) throw readErr;
    const history = Array.isArray(cur?.status_history)
      ? cur.status_history.slice()
      : [];
    history.push({ status, at: Date.now() });
    const update = { status, status_history: history };
    if (status === "Delivered") update.actual_delivery_date = msToIso(Date.now());
    const { data, error } = await sb
      .from("orders")
      .update(update)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return rowToOrder(data);
  },

  async updateOrderFields(id, fields) {
    const sb = await getSupabase();
    const row = patchToRow(pickPatch(fields));
    const { data, error } = await sb
      .from("orders")
      .update(row)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return rowToOrder(data);
  },

  async trackById(id) {
    const norm = String(id || "").trim();
    if (!norm) return { found: false, isDemo: false };
    const sb = await getSupabase();
    const { data } = await sb
      .from("orders")
      .select("*")
      .eq("id", norm)
      .maybeSingle();
    if (data) return { found: true, order: rowToOrder(data), isDemo: false };
    // deterministic demo fallback (no real row)
    const h = hashId(norm);
    const status = ORDER_STATUSES[h % ORDER_STATUSES.length];
    const createdAt = Date.now() - (h % (48 * HOUR));
    const demo = normalizeOrder(
      { id: norm.toUpperCase(), status },
      { id: norm.toUpperCase(), createdAt }
    );
    return { found: false, order: demo, isDemo: true };
  },
};

// ===========================================================================
// Adapter selection + public API
// ===========================================================================
const adapter = isSupabaseConfigured ? supabaseAdapter : localAdapter;

export async function listOrders(userId) {
  return adapter.listOrders(userId);
}
export async function placeOrder(order) {
  return adapter.placeOrder(order);
}
export async function getOrder(id, userId) {
  return adapter.getOrder(id, userId);
}
export async function getAllOrders() {
  return adapter.getAllOrders();
}
export async function updateOrderStatus(id, status) {
  return adapter.updateOrderStatus(id, status);
}
export async function updateOrderFields(id, fields) {
  return adapter.updateOrderFields(id, fields);
}
export async function trackById(id) {
  return adapter.trackById(id);
}
