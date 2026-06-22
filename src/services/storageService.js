// -----------------------------------------------------------------------------
// CABLER PARTS — Storage adapter (Supabase Storage, with a local data-URL mode)
//
// One entry point, uploadImage(file), that works in BOTH app modes:
//
//   • SUPABASE — when isSupabaseConfigured (VITE_SUPABASE_* set): upload the file
//     to the public "media" bucket and return its public URL. The image then
//     lives in cloud storage and is referenced by a small https URL (NOT a giant
//     base64 string), so Settings / Products documents stay tiny.
//
//   • LOCAL    — otherwise: fall back to a FileReader base64 data URL, exactly
//     like the admin pages did before. Local/dev/preview keeps working with no
//     Supabase project and no network.
//
// Validation (both modes): the file must be an image/* and <= 2 MB.
//
// NOTE: no Math.random()/Date.now() at module top — the unique name is derived
// inside the handler from a runtime counter + Date.now() at call time, so the
// module is deterministic to import (safe under SSR/Vitest).
// -----------------------------------------------------------------------------

import { isSupabaseConfigured, getSupabase } from "./supabaseClient";

// Cloud mode mirrors the configured flag — handy for UI ("uploads go to cloud").
export const isCloudStorage = isSupabaseConfigured;

// Bucket created by supabase/migrations/0003_storage.sql (public read, admin write).
const BUCKET = "media";
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

// Monotonic per-session counter — combined with Date.now() inside the handler to
// avoid collisions when several files are uploaded in the same millisecond.
let _uploadSeq = 0;

// Read a File into a base64 data URL (local-mode fallback / preview source).
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("read_failed"));
    reader.readAsDataURL(file);
  });
}

// Build a collision-resistant, URL/path-safe object name for the bucket.
// Derived at call time (NOT at module load) per the no-Date.now-at-top rule.
function buildSafeName(file) {
  _uploadSeq += 1;
  const stamp = `${Date.now()}-${_uploadSeq}`;
  const original = String(file?.name || "image");
  const dot = original.lastIndexOf(".");
  const rawExt = dot >= 0 ? original.slice(dot + 1) : "";
  // keep a short, sanitized extension; default to a generic one if missing
  const ext = (rawExt.match(/[a-z0-9]+/i)?.[0] || "img").toLowerCase().slice(0, 8);
  return `${stamp}.${ext}`;
}

// -----------------------------------------------------------------------------
// uploadImage(file, { folder })
//   -> { ok: true,  url: string }          on success
//   -> { ok: false, error: string }        on validation / upload failure
//
// `folder` namespaces objects within the bucket (e.g. "logos", "products").
// -----------------------------------------------------------------------------
export async function uploadImage(file, { folder = "uploads" } = {}) {
  // --- validation (both modes) ---------------------------------------------
  if (!file) return { ok: false, error: "no_file" };
  if (!file.type || !file.type.startsWith("image/")) {
    return { ok: false, error: "not_an_image" };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "file_too_large" };
  }

  // --- LOCAL mode: base64 data URL -----------------------------------------
  if (!isSupabaseConfigured) {
    try {
      const url = await readFileAsDataUrl(file);
      return { ok: true, url };
    } catch {
      return { ok: false, error: "read_failed" };
    }
  }

  // --- SUPABASE mode: upload to the "media" bucket -------------------------
  try {
    const sb = await getSupabase();
    if (!sb) {
      // Configured flag was true but client failed to resolve — degrade safely.
      const url = await readFileAsDataUrl(file);
      return { ok: true, url };
    }

    const safeName = buildSafeName(file);
    const cleanFolder = String(folder || "uploads").replace(/^\/+|\/+$/g, "");
    const path = `${cleanFolder}/${safeName}`;

    const { error: uploadError } = await sb.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
    if (uploadError) {
      return { ok: false, error: uploadError.message || "upload_failed" };
    }

    const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
    const url = data?.publicUrl;
    if (!url) return { ok: false, error: "no_public_url" };
    return { ok: true, url };
  } catch (err) {
    return { ok: false, error: err?.message || "upload_failed" };
  }
}
