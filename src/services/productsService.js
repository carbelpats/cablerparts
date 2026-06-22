// productsService — abstracts product persistence.
// Auto-selects a Supabase adapter when configured, else a LOCAL (localStorage)
// adapter seeded from data.js PRODUCTS. All exports are async.
//
// Product shape = existing data.js PRODUCTS item + optional `image: string` (URL).

import { PRODUCTS } from "../lib/data.js";
import { isSupabaseConfigured, getSupabase } from "./supabaseClient.js";

const STORAGE_KEY = "almeyar:products";

/* ------------------------------------------------------------------ *
 * Local (localStorage) adapter
 * ------------------------------------------------------------------ */

function hasStorage() {
  try {
    return typeof localStorage !== "undefined" && localStorage !== null;
  } catch {
    return false;
  }
}

// In-memory fallback for environments without localStorage (defensive).
let memoryStore = null;

function readRaw() {
  if (hasStorage()) {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      /* fall through to memory */
    }
  }
  return memoryStore;
}

function writeRaw(value) {
  if (hasStorage()) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
      return;
    } catch {
      /* fall through to memory */
    }
  }
  memoryStore = value;
}

function seedProducts() {
  // Deep clone the seed so callers can never mutate the data.js source array.
  return PRODUCTS.map((p) => ({ ...p }));
}

function loadLocal() {
  const raw = readRaw();
  if (raw == null) {
    const seeded = seedProducts();
    writeRaw(JSON.stringify(seeded));
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* corrupt — reseed */
  }
  const seeded = seedProducts();
  writeRaw(JSON.stringify(seeded));
  return seeded;
}

function saveLocal(list) {
  writeRaw(JSON.stringify(list));
}

function genId() {
  // Deterministic-enough unique id for the local adapter. Date.now is used in a
  // runtime handler (never at module top level), which the contract allows.
  return "PRD-" + Date.now().toString(36).toUpperCase();
}

const localAdapter = {
  async listProducts() {
    return loadLocal();
  },

  async getProduct(id) {
    const list = loadLocal();
    return list.find((p) => String(p.id) === String(id)) || null;
  },

  async createProduct(p) {
    const list = loadLocal();
    const id = p?.id != null && String(p.id).trim() !== "" ? p.id : genId();
    const product = { ...p, id };
    list.push(product);
    saveLocal(list);
    return product;
  },

  async updateProduct(id, patch) {
    const list = loadLocal();
    const idx = list.findIndex((p) => String(p.id) === String(id));
    if (idx === -1) throw new Error("product_not_found");
    const updated = { ...list[idx], ...patch, id: list[idx].id };
    list[idx] = updated;
    saveLocal(list);
    return updated;
  },

  async deleteProduct(id) {
    const list = loadLocal();
    const next = list.filter((p) => String(p.id) !== String(id));
    saveLocal(next);
  },
};

/* ------------------------------------------------------------------ *
 * Supabase adapter (products table: id text pk, data jsonb)
 * ------------------------------------------------------------------ */

const supabaseAdapter = {
  async listProducts() {
    const sb = await getSupabase();
    const { data, error } = await sb
      .from("products")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data || []).map(rowToProduct);
  },

  async getProduct(id) {
    const sb = await getSupabase();
    const { data, error } = await sb
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToProduct(data) : null;
  },

  async createProduct(p) {
    const sb = await getSupabase();
    const id =
      p?.id != null && String(p.id).trim() !== "" ? p.id : genId();
    const product = { ...p, id };
    const { data, error } = await sb
      .from("products")
      .insert(productToRow(product))
      .select("*")
      .single();
    if (error) throw error;
    return rowToProduct(data);
  },

  async updateProduct(id, patch) {
    const sb = await getSupabase();
    const existing = await this.getProduct(id);
    if (!existing) throw new Error("product_not_found");
    const updated = { ...existing, ...patch, id: existing.id };
    const { data, error } = await sb
      .from("products")
      .update(productToRow(updated))
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return rowToProduct(data);
  },

  async deleteProduct(id) {
    const sb = await getSupabase();
    const { error } = await sb.from("products").delete().eq("id", id);
    if (error) throw error;
  },
};

// Supabase row <-> Product mappers. We store the full product object in `data`
// (jsonb) and mirror the id column so it can be the primary key.
function productToRow(product) {
  const { id, ...rest } = product;
  return { id, data: rest };
}

function rowToProduct(row) {
  if (row && row.data && typeof row.data === "object") {
    return { id: row.id, ...row.data };
  }
  // Tolerate a typed-column layout too.
  return { ...row };
}

/* ------------------------------------------------------------------ *
 * Public API (adapter selection)
 * ------------------------------------------------------------------ */

function adapter() {
  return isSupabaseConfigured ? supabaseAdapter : localAdapter;
}

export async function listProducts() {
  return adapter().listProducts();
}

export async function getProduct(id) {
  return adapter().getProduct(id);
}

export async function createProduct(p) {
  return adapter().createProduct(p);
}

export async function updateProduct(id, patch) {
  return adapter().updateProduct(id, patch);
}

export async function deleteProduct(id) {
  return adapter().deleteProduct(id);
}

export default {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
