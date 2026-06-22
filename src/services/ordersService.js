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

// Progress statuses (drive the 3-step tracker + the deterministic demo track).
// "Cancelled" is a terminal off-track status handled separately everywhere.
export const ORDER_STATUSES = ["Processing", "Shipped", "Delivered"];
export const CANCELLED_STATUS = "Cancelled";
// Every status an admin may set / persist.
export const ALL_ORDER_STATUSES = [...ORDER_STATUSES, CANCELLED_STATUS];
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
  const status = payload.status || "Processing";
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
  };
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
      updated = { ...o, status, statusHistory: history };
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
    status: row.status || "Processing",
    statusHistory: Array.isArray(row.status_history) ? row.status_history : [],
    items: Array.isArray(row.items) ? row.items : [],
    subtotalUSD: row.subtotal_usd ?? 0,
    discountUSD: row.discount_usd ?? 0,
    shippingUSD: row.shipping_usd ?? 0,
    totalUSD: row.total_usd ?? 0,
    contact: row.contact || { name: "", email: "", phone: "" },
    shipping: row.shipping || { address: "", city: "", regionCode: "" },
    paymentId: row.payment_id ?? null,
  };
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
    created_at: new Date(order.createdAt).toISOString(),
  };
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
    const { data, error } = await sb
      .from("orders")
      .update({ status, status_history: history })
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
export async function trackById(id) {
  return adapter.trackById(id);
}
