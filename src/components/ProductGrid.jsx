import { useEffect, useMemo, useRef, useState } from "react";
import { Car, CheckCircle2, PackageX, ChevronRight } from "lucide-react";
import { useGarage } from "../context/GarageContext";
import { useCatalog } from "../context/CatalogContext";
import { useLang } from "../context/LanguageContext";
import { useProducts } from "../context/ProductsContext";
import { CATEGORY_LABELS } from "../lib/i18n";
import ProductCard from "./ProductCard";
import CatalogToolbar from "./CatalogToolbar";

// -----------------------------------------------------------------------------
// Al-Meyar — ProductGrid. Browse state (category, fitsOnly, focusNonce) lives
// in CatalogContext so any component can drive this section. Chips
// render from CATEGORY_LABELS; a focusNonce effect scrolls #catalog into view
// when another component requests focus. Fully localized (en/ar) + RTL via
// logical utilities.
// -----------------------------------------------------------------------------

// Categories actually present in the catalog, in canonical CATEGORY_LABELS
// order (so chips read consistently regardless of data ordering).
const CANONICAL_ORDER = Object.keys(CATEGORY_LABELS).filter((k) => k !== "All");

function derivePresentCategories(products) {
  const present = new Set((products || []).map((p) => p.category));
  return CANONICAL_ORDER.filter((c) => present.has(c));
}

const STRINGS = {
  en: {
    eyebrow: "The Catalog",
    heading: "Engineered to the Standard",
    blurb:
      "Track-tested, OEM-grade parts with verified fitment. Every component is traceable by part number and inspected before dispatch.",
    partsCount: (shown, total) => `${shown} / ${total} parts`,
    fitsMy: (make) => `Fits my ${make}`,
    fitsMyVehicle: "Fits my vehicle",
    fitsPrompt: "Set up your Garage to filter for guaranteed-fit parts",
    filterAria: "Filter parts by category",
    emptyTitle: "No parts match this filter",
    emptyFits: (cat, make) =>
      `We don't stock ${cat} for your ${make} yet. Try another category.`,
    emptyGeneric: "Try a different category to see more of the catalog.",
    partsLower: "parts",
    clearCategory: "Clear category",
    showAllVehicles: "Show all vehicles",
    loadingAria: "Loading parts",
  },
  ar: {
    eyebrow: "الكتالوج",
    heading: "مهندَسة بمعايير الوكالة",
    blurb:
      "قطع بمستوى الوكالة مُختبَرة على الحلبة مع توافق موثّق. كل قطعة قابلة للتتبّع برقمها وتُفحَص قبل الشحن.",
    partsCount: (shown, total) => `${shown} / ${total} قطعة`,
    fitsMy: (make) => `يناسب سيارتي ${make}`,
    fitsMyVehicle: "يناسب سيارتي",
    fitsPrompt: "أنشئ مرآبك لتصفية القطع المضمونة التوافق",
    filterAria: "تصفية القطع حسب الفئة",
    emptyTitle: "لا توجد قطع تطابق هذا التصفية",
    emptyFits: (cat, make) =>
      `لا نوفّر ${cat} لسيارتك ${make} بعد. جرّب فئة أخرى.`,
    emptyGeneric: "جرّب فئة مختلفة لرؤية المزيد من الكتالوج.",
    partsLower: "القطع",
    clearCategory: "إلغاء الفئة",
    showAllVehicles: "عرض كل السيارات",
    loadingAria: "جارٍ تحميل القطع",
  },
};

export default function ProductGrid() {
  const { vehicle, hasVehicle } = useGarage();
  const { category, setCategory, fitsOnly, setFitsOnly, focusNonce } =
    useCatalog();
  const { lang } = useLang();
  const { products, loading } = useProducts();
  const tx = STRINGS[lang];

  const sectionRef = useRef(null);
  const categories = useMemo(
    () => derivePresentCategories(products),
    [products]
  );

  // Toolbar state — search, advanced filters (price/brand/in-stock), view mode.
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  // Sort: relevance (popularity) | priceAsc | priceDesc | ratingDesc | ratingAsc | popularity
  const [sortBy, setSortBy] = useState("relevance");

  // Price bounds derived from the full catalog (USD, integer-rounded).
  const priceBounds = useMemo(() => {
    const prices = (products || []).map((p) => p.priceUSD);
    if (prices.length === 0) return { min: 0, max: 0 };
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
  }, [products]);

  // Current price selection, initialised to the full range and re-synced when
  // the catalog (and thus its bounds) loads/changes.
  const [priceRange, setPriceRange] = useState({ min: 0, max: 0 });
  useEffect(() => {
    setPriceRange({ min: priceBounds.min, max: priceBounds.max });
  }, [priceBounds.min, priceBounds.max]);

  // Brands present in the catalog, alphabetical.
  const allBrands = useMemo(() => {
    const set = new Set((products || []).map((p) => p.brand).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  // When the garage is cleared, the fits-only filter is meaningless — ignore it.
  const fitsActive = fitsOnly && hasVehicle && !!vehicle;

  // Scroll #catalog into view whenever another component bumps focusNonce.
  // Skip the initial render (nonce starts at 0) so the page doesn't auto-jump.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const el = sectionRef.current;
    if (!el) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [focusNonce]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (products || []).filter((p) => {
      if (category !== "All" && p.category !== category) return false;
      if (fitsActive && !(p.fitment || []).includes(vehicle.make)) return false;
      // live search by name / nameAr / brand
      if (q) {
        const hay = [p.name, p.nameAr, p.brand]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      // advanced: price range
      if (p.priceUSD < priceRange.min || p.priceUSD > priceRange.max)
        return false;
      // advanced: brand checkboxes
      if (selectedBrands.length > 0 && !selectedBrands.includes(p.brand))
        return false;
      // advanced: in-stock only
      if (inStockOnly && !(p.stock > 0)) return false;
      return true;
    });
  }, [
    products,
    category,
    fitsActive,
    vehicle,
    searchQuery,
    priceRange,
    selectedBrands,
    inStockOnly,
  ]);

  // Apply the chosen sort to the filtered set. Default ("relevance") and
  // "popularity" both rank by reviews count desc — a sensible relevance proxy.
  const sorted = useMemo(() => {
    const list = filtered.slice();
    const num = (v) => (typeof v === "number" && !Number.isNaN(v) ? v : 0);
    switch (sortBy) {
      case "priceAsc":
        list.sort((a, b) => num(a.priceUSD) - num(b.priceUSD));
        break;
      case "priceDesc":
        list.sort((a, b) => num(b.priceUSD) - num(a.priceUSD));
        break;
      case "ratingDesc":
        list.sort(
          (a, b) => num(b.rating) - num(a.rating) || num(b.reviews) - num(a.reviews)
        );
        break;
      case "ratingAsc":
        list.sort(
          (a, b) => num(a.rating) - num(b.rating) || num(a.reviews) - num(b.reviews)
        );
        break;
      case "popularity":
      case "relevance":
      default:
        list.sort(
          (a, b) => num(b.reviews) - num(a.reviews) || num(b.rating) - num(a.rating)
        );
        break;
    }
    return list;
  }, [filtered, sortBy]);

  const activeCatLabel =
    category === "All"
      ? tx.partsLower
      : (CATEGORY_LABELS[category] && CATEGORY_LABELS[category][lang]) ||
        category;

  return (
    <section
      id="catalog"
      ref={sectionRef}
      aria-labelledby="catalog-heading"
      className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8"
    >
      {/* Heading */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="text-start">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            {tx.eyebrow}
          </span>
          <h2
            id="catalog-heading"
            className="mt-1 font-display text-3xl font-700 text-textPrimary sm:text-4xl"
          >
            {tx.heading}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-textSecondary">{tx.blurb}</p>
        </div>
        <span className="font-mono text-sm tabular-nums text-textMuted">
          {tx.partsCount(filtered.length, (products || []).length)}
        </span>
      </div>

      {/* Filter row */}
      <div className="mt-8 flex flex-col gap-4">
        {/* "Fits my vehicle" toggle — the endowment hook */}
        {hasVehicle && vehicle ? (
          <button
            type="button"
            onClick={() => setFitsOnly(!fitsActive)}
            aria-pressed={fitsActive}
            className={
              "group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-start transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg sm:w-auto " +
              (fitsActive
                ? "border-accent/50 bg-accent/10 shadow-glow-accent"
                : "border-border bg-surface hover:border-accent/40 hover:bg-surfaceElevated")
            }
          >
            <span
              className={
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-300 " +
                (fitsActive
                  ? "bg-accent text-bg"
                  : "bg-surfaceElevated text-accent")
              }
            >
              {fitsActive ? (
                <CheckCircle2 className="h-5 w-5" strokeWidth={2.25} />
              ) : (
                <Car className="h-5 w-5" strokeWidth={2} />
              )}
            </span>
            <span className="flex flex-col text-start">
              <span className="font-display text-sm font-600 text-textPrimary">
                {tx.fitsMy(vehicle.make)}
              </span>
              <span className="font-mono text-[11px] tabular-nums text-textMuted">
                {vehicle.make} {vehicle.model} · {vehicle.year}
              </span>
            </span>
            <span
              className={
                "ms-2 inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-300 " +
                (fitsActive ? "bg-accent" : "bg-border")
              }
              aria-hidden="true"
            >
              <span
                className={
                  "h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ease-out " +
                  (fitsActive
                    ? "translate-x-5 rtl:-translate-x-5"
                    : "translate-x-0")
                }
              />
            </span>
          </button>
        ) : (
          <a
            href="#garage"
            className="group flex w-full items-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-start transition-all duration-300 ease-out hover:border-primary/60 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg sm:w-auto"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surfaceElevated text-primary motion-safe:animate-glow-pulse">
              <Car className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className="flex flex-col text-start">
              <span className="font-display text-sm font-600 text-textPrimary">
                {tx.fitsMyVehicle}
              </span>
              <span className="text-[11px] text-textMuted">{tx.fitsPrompt}</span>
            </span>
            <ChevronRight className="ms-1 h-4 w-4 text-primary transition-transform duration-300 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
          </a>
        )}

        {/* Category chips */}
        <div
          className="-mx-1 flex min-w-0 max-w-full snap-x gap-2 overflow-x-auto scrollbar-hide px-1 pb-1"
          role="group"
          aria-label={tx.filterAria}
        >
          {["All", ...categories].map((cat) => {
            const active = category === cat;
            const label =
              (CATEGORY_LABELS[cat] && CATEGORY_LABELS[cat][lang]) || cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                aria-pressed={active}
                className={
                  "shrink-0 snap-start whitespace-nowrap rounded-full border px-3.5 py-1.5 font-mono text-xs uppercase tracking-wide transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg " +
                  (active
                    ? "border-primary bg-primary text-white shadow-glow"
                    : "border-border bg-surface text-textSecondary hover:border-primary/40 hover:text-textPrimary")
                }
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Search + advanced filters + grid/list switcher */}
        <CatalogToolbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          priceBounds={priceBounds}
          priceRange={priceRange}
          setPriceRange={setPriceRange}
          allBrands={allBrands}
          selectedBrands={selectedBrands}
          setSelectedBrands={setSelectedBrands}
          inStockOnly={inStockOnly}
          setInStockOnly={setInStockOnly}
          viewMode={viewMode}
          setViewMode={setViewMode}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />
      </div>

      {/* Loading skeleton / Grid / empty state */}
      {loading ? (
        <div
          className="mt-8 grid grid-cols-2 items-stretch gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4"
          role="status"
          aria-live="polite"
          aria-label={tx.loadingAria}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-border bg-surface shadow-elevated"
              aria-hidden="true"
            >
              <div className="aspect-[5/4] w-full animate-pulse bg-surfaceElevated" />
              <div className="flex flex-col gap-3 p-4">
                <div className="h-3 w-1/3 animate-pulse rounded bg-surfaceElevated" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-surfaceElevated" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-surfaceElevated" />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="h-5 w-1/3 animate-pulse rounded bg-surfaceElevated" />
                  <div className="h-8 w-1/4 animate-pulse rounded-lg bg-surfaceElevated" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : sorted.length > 0 ? (
        <div
          className={
            "mt-8 " +
            (viewMode === "list"
              ? "flex flex-col gap-3"
              : "grid grid-cols-2 items-stretch gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4")
          }
        >
          {sorted.map((product, i) => (
            <div
              key={product.id}
              className="h-full motion-safe:animate-fade-up"
              style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
            >
              <ProductCard product={product} view={viewMode} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-12 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surfaceElevated text-textMuted">
            <PackageX className="h-7 w-7" strokeWidth={1.75} />
          </span>
          <h3 className="font-display text-lg font-600 text-textPrimary">
            {tx.emptyTitle}
          </h3>
          <p className="max-w-sm text-sm text-textSecondary">
            {fitsActive
              ? tx.emptyFits(activeCatLabel, vehicle.make)
              : tx.emptyGeneric}
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {category !== "All" && (
              <button
                type="button"
                onClick={() => setCategory("All")}
                className="rounded-lg border border-border bg-surfaceElevated px-4 py-2 font-display text-sm font-600 text-textPrimary transition-colors duration-200 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                {tx.clearCategory}
              </button>
            )}
            {fitsActive && (
              <button
                type="button"
                onClick={() => setFitsOnly(false)}
                className="rounded-lg border border-border bg-surfaceElevated px-4 py-2 font-display text-sm font-600 text-textPrimary transition-colors duration-200 hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                {tx.showAllVehicles}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
