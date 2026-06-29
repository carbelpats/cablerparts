import { useMemo } from "react";
import { useCatalog } from "../context/CatalogContext";
import { useLang } from "../context/LanguageContext";
import { useProducts } from "../context/ProductsContext";
import { CATEGORY_LABELS } from "../lib/i18n";
import { PartIcon, CATEGORY_ICON } from "../lib/partIcons.jsx";

// -----------------------------------------------------------------------------
// Cabler Parts — VisualCategoryBar. An icon quick-filter rail that shares ONE
// artwork source with the product cards (lib/partIcons): each category renders
// the same line-art PartIcon the card placeholders use, so the whole catalog
// reads as a single, consistent, on-brand set.
//
// Slots are DERIVED from the live catalog (categories that actually have
// products), in canonical CATEGORY_LABELS order — so an empty category never
// shows and a newly stocked one appears automatically. Clicking a category
// drives useCatalog().setCategory + focusCatalog(); clicking the active one
// resets to "All". The active icon gets a glowing Cabler-Orange under-bar.
//
// Desktop: centered row. Mobile (<768px): horizontal scroll carousel. RTL-aware
// (the flex row mirrors under dir=rtl). The localized category name shows under
// every icon and is mirrored into aria-label/title.
// -----------------------------------------------------------------------------

const STRINGS = {
  en: { aria: "Browse parts by category" },
  ar: { aria: "تصفّح القطع حسب الفئة" },
};

// Canonical display order (CATEGORY_LABELS order, minus the "All" pseudo-entry).
const CANONICAL_ORDER = Object.keys(CATEGORY_LABELS).filter((k) => k !== "All");

export default function VisualCategoryBar() {
  const { category, setCategory, focusCatalog } = useCatalog();
  const { lang } = useLang();
  const { products } = useProducts();
  const tx = STRINGS[lang] || STRINGS.en;

  // Only show categories that actually have products, in canonical order.
  const slots = useMemo(() => {
    const present = new Set((products || []).map((p) => p.category));
    return CANONICAL_ORDER.filter((c) => present.has(c));
  }, [products]);

  const handleClick = (cat) => {
    // Toggle: clicking the already-active icon deselects back to "All".
    setCategory(category === cat ? "All" : cat);
    focusCatalog();
  };

  if (slots.length === 0) return null;

  return (
    <section
      aria-label={tx.aria}
      className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8"
    >
      <div
        role="group"
        aria-label={tx.aria}
        className="flex flex-nowrap items-center gap-4 overflow-x-auto scrollbar-hide py-2 md:justify-center"
      >
        {slots.map((cat) => {
          const active = category === cat;
          const label =
            (CATEGORY_LABELS[cat] && CATEGORY_LABELS[cat][lang]) || cat;
          const iconKey = CATEGORY_ICON[cat] || "brake";
          return (
            <button
              key={cat}
              type="button"
              onClick={() => handleClick(cat)}
              title={label}
              aria-label={label}
              aria-pressed={active}
              className={
                "group relative flex min-w-[4.75rem] shrink-0 flex-col items-center justify-start rounded-2xl border p-2 transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg motion-reduce:transition-none sm:min-w-[5.25rem] " +
                (active
                  ? "border-primary/40 bg-surfaceElevated"
                  : "border-transparent hover:-translate-y-0.5 hover:bg-surface motion-reduce:hover:translate-y-0")
              }
            >
              {/* Shared part artwork — same source as the product cards. The
                  rounded tile + accent tint keep the rail app-like and on-brand. */}
              <span
                className={
                  "flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ease-out group-hover:scale-105 motion-reduce:transform-none sm:h-14 sm:w-14 " +
                  (active
                    ? "bg-primary/15 text-primary"
                    : "bg-surfaceElevated text-textSecondary group-hover:text-primary")
                }
              >
                <PartIcon icon={iconKey} className="h-8 w-8 sm:h-9 sm:w-9" />
              </span>
              {/* Text label under every icon — icons alone are ambiguous for
                  navigation, so the localized category name is always shown. */}
              <span
                className={
                  "mt-1.5 w-full text-center text-[11px] font-600 leading-tight transition-colors duration-300 sm:text-xs " +
                  (active ? "text-primary" : "text-textSecondary")
                }
              >
                {label}
              </span>
              {/* glowing orange bottom accent under-bar (active only) */}
              <span
                aria-hidden="true"
                className={
                  "mt-1 h-1 rounded-full bg-primary transition-all duration-300 ease-out " +
                  (active
                    ? "w-8 opacity-100 shadow-glow drop-shadow-[0_0_8px_rgb(var(--primary))]"
                    : "w-0 opacity-0")
                }
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
