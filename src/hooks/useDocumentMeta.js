// -----------------------------------------------------------------------------
// CABLER PARTS — useDocumentMeta
//
// A tiny, dependency-free document-head manager (no react-helmet). Sets
// document.title (with the " — Cabler Parts" brand suffix) and the
// <meta name="description"> content for the lifetime of the calling component,
// then restores the previous values on cleanup. Safe under SSR / Vitest (guards
// on `document`), and idempotent across re-renders (re-applies only when the
// resolved title/description actually change).
//
// Usage:
//   useDocumentMeta({ title: "Track my order" });
//   useDocumentMeta({ title: product.name, description: product.descriptionEn });
//
// Pass `title: null`/`undefined` to leave the title untouched (e.g. while a
// dynamic value is still loading) — the brand suffix is only added to a real
// title string.
// -----------------------------------------------------------------------------

import { useEffect } from "react";

const BRAND = "Cabler Parts";
const SUFFIX = ` — ${BRAND}`;

/** Compose the full <title>, appending the brand suffix unless already present. */
function withBrand(title) {
  const base = String(title || "").trim();
  if (!base) return BRAND;
  if (base === BRAND || base.endsWith(SUFFIX)) return base;
  return `${base}${SUFFIX}`;
}

/** Find (or lazily create) the <meta name="description"> element. */
function getDescriptionMeta() {
  if (typeof document === "undefined") return null;
  let el = document.querySelector('meta[name="description"]');
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", "description");
    document.head.appendChild(el);
  }
  return el;
}

/**
 * useDocumentMeta({ title, description? })
 *
 * Applies the page title + meta description on mount / when they change, and
 * restores the prior values on unmount. Both fields are optional: omit `title`
 * to leave the document title as-is, omit `description` to leave the meta
 * description untouched.
 */
export function useDocumentMeta({ title, description } = {}) {
  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const hasTitle = title != null && String(title).trim() !== "";
    const hasDescription =
      description != null && String(description).trim() !== "";

    // Snapshot prior values so we can restore them on cleanup.
    const prevTitle = document.title;
    const metaEl = hasDescription ? getDescriptionMeta() : null;
    const prevDescription = metaEl ? metaEl.getAttribute("content") : null;

    if (hasTitle) {
      document.title = withBrand(title);
    }
    if (metaEl && hasDescription) {
      metaEl.setAttribute("content", String(description).trim());
    }

    return () => {
      if (hasTitle) {
        document.title = prevTitle;
      }
      if (metaEl && hasDescription) {
        if (prevDescription == null) {
          metaEl.setAttribute("content", "");
        } else {
          metaEl.setAttribute("content", prevDescription);
        }
      }
    };
  }, [title, description]);
}

export default useDocumentMeta;
