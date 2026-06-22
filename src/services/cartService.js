// -----------------------------------------------------------------------------
// AL-MEYAR — Cart service (dual adapter)
//
// LOCAL adapter  -> localStorage. Keyed per user ("almeyar:cart:"+userId),
//                   falling back to "almeyar:cart" for an anonymous cart.
// SUPABASE adapter -> `carts` table (one row per user, data as jsonb).
//
// Shape persisted/returned: { items, coupon }  (coupon may be null).
//
// All exports are async. import.meta.env via optional chaining (Node/Vitest ok).
// -----------------------------------------------------------------------------

import { isSupabaseConfigured, getSupabase } from "./supabaseClient";

const ANON_KEY = "almeyar:cart";

function keyFor(userId) {
  return userId ? "almeyar:cart:" + userId : ANON_KEY;
}

const EMPTY = { items: [], coupon: null };

function normalize(parsed) {
  if (!parsed || typeof parsed !== "object") return { ...EMPTY };
  return {
    items: Array.isArray(parsed.items) ? parsed.items : [],
    coupon: parsed.coupon && parsed.coupon.code ? parsed.coupon : null,
  };
}

// ===========================================================================
// LOCAL adapter (localStorage)
// ===========================================================================
const localAdapter = {
  async loadCart(userId) {
    if (typeof window === "undefined") return { ...EMPTY };
    try {
      const raw = window.localStorage.getItem(keyFor(userId));
      if (!raw) return { ...EMPTY };
      return normalize(JSON.parse(raw));
    } catch {
      return { ...EMPTY };
    }
  },

  async saveCart(userId, cart) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        keyFor(userId),
        JSON.stringify(normalize(cart))
      );
    } catch {
      /* ignore quota / privacy errors */
    }
  },
};

// ===========================================================================
// SUPABASE adapter — `carts` table (user_id pk, data jsonb)
// ===========================================================================
const supabaseAdapter = {
  async loadCart(userId) {
    // anon cart has no user row — keep it in localStorage
    if (!userId) return localAdapter.loadCart(null);
    try {
      const sb = await getSupabase();
      const { data, error } = await sb
        .from("carts")
        .select("data")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return normalize(data?.data);
    } catch {
      return { ...EMPTY };
    }
  },

  async saveCart(userId, cart) {
    if (!userId) return localAdapter.saveCart(null, cart);
    try {
      const sb = await getSupabase();
      await sb.from("carts").upsert(
        {
          user_id: userId,
          data: normalize(cart),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    } catch {
      /* ignore */
    }
  },
};

// ===========================================================================
// Adapter selection + public API
// ===========================================================================
const adapter = isSupabaseConfigured ? supabaseAdapter : localAdapter;

export async function loadCart(userId) {
  return adapter.loadCart(userId);
}
export async function saveCart(userId, cart) {
  return adapter.saveCart(userId, cart);
}
