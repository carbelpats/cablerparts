import { useEffect, useId, useRef, useState } from "react";
import {
  Search,
  X,
  SlidersHorizontal,
  LayoutGrid,
  List,
  RotateCcw,
  Check,
  ArrowDownUp,
} from "lucide-react";
import { useGeo } from "../context/GeoContext";
import { useLang } from "../context/LanguageContext";

// -----------------------------------------------------------------------------
// Al-Meyar — CatalogToolbar. Sits above the product grid and drives the browse
// experience: a high-end live search bar, an Advanced Filters slide-over drawer
// (price slider, brand checkboxes, in-stock toggle), and a grid/list view
// switcher. All state is owned by ProductGrid and passed down via props so the
// filtering logic lives in one place. Fully localized (en/ar) + RTL via logical
// utilities; the drawer slides from the inline-end side and respects RTL.
// -----------------------------------------------------------------------------

const STRINGS = {
  en: {
    searchLabel: "Search parts",
    searchPlaceholder: "Search by name or brand…",
    clearSearch: "Clear search",
    advancedFilters: "Advanced Filters",
    filtersTitle: "Advanced Filters",
    closeFilters: "Close filters",
    priceRange: "Price Range",
    brands: "Brands",
    inStockOnly: "In-Stock Only",
    reset: "Reset",
    apply: "Apply",
    viewGrid: "Grid view",
    viewList: "List view",
    activeFilters: (n) => `${n} active`,
    minPrice: "Min",
    maxPrice: "Max",
    sortLabel: "Sort products",
    sort: {
      relevance: "Sort: Popularity",
      priceAsc: "Price: Low to High",
      priceDesc: "Price: High to Low",
      ratingDesc: "Rating: Highest",
      ratingAsc: "Rating: Lowest",
      popularity: "Popularity",
    },
  },
  ar: {
    searchLabel: "البحث عن قطع",
    searchPlaceholder: "ابحث بالاسم أو الماركة…",
    clearSearch: "مسح البحث",
    advancedFilters: "تصفية متقدمة",
    filtersTitle: "تصفية متقدمة",
    closeFilters: "إغلاق التصفية",
    priceRange: "نطاق السعر",
    brands: "الماركات",
    inStockOnly: "المتوفر فقط",
    reset: "إعادة تعيين",
    apply: "تطبيق",
    viewGrid: "عرض شبكي",
    viewList: "عرض قائمة",
    activeFilters: (n) => `${n} مفعّلة`,
    minPrice: "الأدنى",
    maxPrice: "الأعلى",
    sortLabel: "ترتيب القطع",
    sort: {
      relevance: "الترتيب: الأكثر رواجاً",
      priceAsc: "السعر: من الأقل للأعلى",
      priceDesc: "السعر: من الأعلى للأقل",
      ratingDesc: "التقييم: الأعلى",
      ratingAsc: "التقييم: الأدنى",
      popularity: "الأكثر رواجاً",
    },
  },
};

export default function CatalogToolbar({
  searchQuery,
  setSearchQuery,
  priceBounds, // { min, max } over the catalog (USD)
  priceRange, // { min, max } current selection (USD)
  setPriceRange,
  allBrands, // string[]
  selectedBrands, // string[]
  setSelectedBrands,
  inStockOnly,
  setInStockOnly,
  viewMode, // "grid" | "list"
  setViewMode,
  sortBy, // "relevance" | "priceAsc" | "priceDesc" | "ratingDesc" | "ratingAsc" | "popularity"
  setSortBy,
}) {
  const { format } = useGeo();
  const { lang } = useLang();
  const tx = STRINGS[lang];

  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef(null);
  const closeBtnRef = useRef(null);
  const titleId = useId();

  // Count of active advanced filters (badge on the trigger button).
  const activeCount =
    (selectedBrands.length > 0 ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (priceRange.min > priceBounds.min || priceRange.max < priceBounds.max
      ? 1
      : 0);

  // Escape to close + scroll-lock while the drawer is open.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Move focus into the drawer for accessibility.
    closeBtnRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [drawerOpen]);

  const toggleBrand = (brand) => {
    setSelectedBrands(
      selectedBrands.includes(brand)
        ? selectedBrands.filter((b) => b !== brand)
        : [...selectedBrands, brand]
    );
  };

  const resetFilters = () => {
    setSelectedBrands([]);
    setInStockOnly(false);
    setPriceRange({ min: priceBounds.min, max: priceBounds.max });
  };

  // Price slider handlers — keep min <= max.
  const onMinChange = (e) => {
    const v = Math.min(Number(e.target.value), priceRange.max);
    setPriceRange({ min: v, max: priceRange.max });
  };
  const onMaxChange = (e) => {
    const v = Math.max(Number(e.target.value), priceRange.min);
    setPriceRange({ min: priceRange.min, max: v });
  };

  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Search bar */}
      <div className="relative min-w-0 flex-1">
        <span
          className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-textMuted"
          aria-hidden="true"
        >
          <Search className="h-4 w-4" strokeWidth={2} />
        </span>
        <input
          id="catalog-search"
          name="catalog-search"
          type="text"
          inputMode="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={tx.searchPlaceholder}
          aria-label={tx.searchLabel}
          className="w-full rounded-xl border border-border bg-surface py-2.5 ps-10 pe-10 text-base text-textPrimary placeholder:text-textMuted shadow-elevated transition-colors duration-200 focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg md:text-sm"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            aria-label={tx.clearSearch}
            className="absolute inset-y-0 end-2 my-auto flex h-7 w-7 items-center justify-center rounded-full text-textMuted transition-colors duration-200 hover:bg-surfaceElevated hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </button>
        )}
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:flex-nowrap">
        {/* Sort control */}
        <div className="relative min-w-0 flex-1 sm:flex-initial">
          <span
            className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-textMuted"
            aria-hidden="true"
          >
            <ArrowDownUp className="h-4 w-4" strokeWidth={2} />
          </span>
          <select
            id="catalog-sort"
            name="catalog-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label={tx.sortLabel}
            className="w-full min-w-0 appearance-none truncate rounded-xl border border-border bg-surface py-2.5 ps-9 pe-8 text-base font-600 text-textPrimary shadow-elevated transition-colors duration-200 hover:border-primary/40 focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg md:text-sm"
          >
            <option value="relevance">{tx.sort.relevance}</option>
            <option value="priceAsc">{tx.sort.priceAsc}</option>
            <option value="priceDesc">{tx.sort.priceDesc}</option>
            <option value="ratingDesc">{tx.sort.ratingDesc}</option>
            <option value="ratingAsc">{tx.sort.ratingAsc}</option>
            <option value="popularity">{tx.sort.popularity}</option>
          </select>
          <span
            className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-textMuted"
            aria-hidden="true"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m4 6 4 4 4-4" />
            </svg>
          </span>
        </div>

        {/* Advanced Filters trigger */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={drawerOpen}
          className="relative flex shrink-0 items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 font-display text-sm font-600 text-textPrimary shadow-elevated transition-colors duration-200 hover:border-primary/40 hover:bg-surfaceElevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg sm:px-3.5"
          title={tx.advancedFilters}
        >
          <SlidersHorizontal className="h-4 w-4 shrink-0" strokeWidth={2} />
          <span className="whitespace-nowrap">{tx.advancedFilters}</span>
          {activeCount > 0 && (
            <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 font-mono text-[11px] font-bold tabular-nums text-white">
              {activeCount}
            </span>
          )}
        </button>

        {/* Grid / List view switcher (mobile-first) */}
        <div
          className="flex shrink-0 items-center rounded-xl border border-border bg-surface p-1 shadow-elevated"
          role="group"
          aria-label={tx.viewGrid + " / " + tx.viewList}
        >
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            aria-pressed={viewMode === "grid"}
            aria-label={tx.viewGrid}
            title={tx.viewGrid}
            className={
              "flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
              (viewMode === "grid"
                ? "bg-primary text-white shadow-glow"
                : "text-textSecondary hover:text-textPrimary")
            }
          >
            <LayoutGrid className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            aria-pressed={viewMode === "list"}
            aria-label={tx.viewList}
            title={tx.viewList}
            className={
              "flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
              (viewMode === "list"
                ? "bg-primary text-white shadow-glow"
                : "text-textSecondary hover:text-textPrimary")
            }
          >
            <List className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Advanced Filters drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50" role="presentation">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-bg/70 backdrop-blur-sm motion-safe:animate-fade-up"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          {/* panel — slides from the inline-end side (RTL-aware) */}
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute end-0 top-0 flex h-full w-full max-w-sm flex-col border-s border-border bg-surface shadow-elevated motion-safe:animate-slide-in-right rtl:[animation:none]"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2
                id={titleId}
                className="flex items-center gap-2 font-display text-lg font-700 text-textPrimary"
              >
                <SlidersHorizontal className="h-5 w-5 text-primary" strokeWidth={2} />
                {tx.filtersTitle}
              </h2>
              <button
                type="button"
                ref={closeBtnRef}
                onClick={() => setDrawerOpen(false)}
                aria-label={tx.closeFilters}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-textSecondary transition-colors duration-200 hover:bg-surfaceElevated hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {/* Price slider */}
              <fieldset className="border-0 p-0">
                <legend className="mb-3 font-display text-sm font-600 uppercase tracking-wide text-textPrimary">
                  {tx.priceRange}
                </legend>
                <div className="mb-3 flex items-center justify-between font-mono text-sm tabular-nums text-textSecondary">
                  <span>
                    <span className="text-textMuted">{tx.minPrice} </span>
                    {format(priceRange.min)}
                  </span>
                  <span>
                    <span className="text-textMuted">{tx.maxPrice} </span>
                    {format(priceRange.max)}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="sr-only">{tx.minPrice}</span>
                    <input
                      type="range"
                      min={priceBounds.min}
                      max={priceBounds.max}
                      value={priceRange.min}
                      onChange={onMinChange}
                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surfaceElevated accent-primary"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="sr-only">{tx.maxPrice}</span>
                    <input
                      type="range"
                      min={priceBounds.min}
                      max={priceBounds.max}
                      value={priceRange.max}
                      onChange={onMaxChange}
                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surfaceElevated accent-primary"
                    />
                  </label>
                </div>
              </fieldset>

              {/* Brands */}
              <fieldset className="mt-7 border-0 p-0">
                <legend className="mb-3 font-display text-sm font-600 uppercase tracking-wide text-textPrimary">
                  {tx.brands}
                </legend>
                <div className="flex flex-col gap-1">
                  {allBrands.map((brand) => {
                    const checked = selectedBrands.includes(brand);
                    return (
                      <label
                        key={brand}
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-150 hover:bg-surfaceElevated"
                      >
                        <span
                          className={
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors duration-150 " +
                            (checked
                              ? "border-primary bg-primary text-white"
                              : "border-border bg-surface")
                          }
                          aria-hidden="true"
                        >
                          {checked && (
                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                          )}
                        </span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleBrand(brand)}
                          className="sr-only"
                        />
                        <span className="text-sm text-textPrimary">{brand}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {/* In-stock only toggle */}
              <div className="mt-7">
                <button
                  type="button"
                  onClick={() => setInStockOnly(!inStockOnly)}
                  aria-pressed={inStockOnly}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surfaceElevated px-4 py-3 text-start transition-colors duration-200 hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="font-display text-sm font-600 text-textPrimary">
                    {tx.inStockOnly}
                  </span>
                  <span
                    className={
                      "inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-300 " +
                      (inStockOnly ? "bg-accent" : "bg-border")
                    }
                    aria-hidden="true"
                  >
                    <span
                      className={
                        "h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ease-out " +
                        (inStockOnly
                          ? "translate-x-5 rtl:-translate-x-5"
                          : "translate-x-0")
                      }
                    />
                  </span>
                </button>
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex items-center gap-3 border-t border-border px-5 py-4">
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 font-display text-sm font-600 text-textSecondary transition-colors duration-200 hover:border-primary/40 hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <RotateCcw className="h-4 w-4" strokeWidth={2} />
                {tx.reset}
              </button>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex flex-1 items-center justify-center rounded-lg bg-primary px-4 py-2.5 font-display text-sm font-600 text-white transition-colors duration-200 hover:bg-primaryHover hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {tx.apply}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
