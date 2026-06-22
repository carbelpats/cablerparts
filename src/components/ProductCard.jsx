import { useEffect, useRef, useState } from "react";
import { Star, Eye, Check, Plus, ShoppingCart, ArrowUpRight } from "lucide-react";
import { useGeo } from "../context/GeoContext";
import { useGarage } from "../context/GarageContext";
import { useCart } from "../context/CartContext";
import { useLang } from "../context/LanguageContext";
import { useProductModal } from "../context/ProductModalContext";
import { PartIcon, ACCENT_GRADIENT } from "../lib/partIcons.jsx";

// -----------------------------------------------------------------------------
// Al-Meyar — ProductCard. The WHOLE card is a button that opens the product
// detail modal (click / Enter / Space); the Add-to-Cart control stops
// propagation so it never triggers the modal. Part artwork now comes from the
// shared partIcons module. Fully localized (en/ar) and RTL-aware via logical
// utilities + isRTL branching where physical direction matters.
// -----------------------------------------------------------------------------

const STRINGS = {
  en: {
    reviews: (n) => `(${n} reviews)`,
    viewingNow: (n) => `${n} viewing now`,
    fitsYour: (make) => `Fits your ${make}`,
    onlyLeft: (n) => `Only ${n} left`,
    addToCart: "Add to Cart",
    added: "Added",
    addAria: (name) => `Add ${name} to cart`,
    addedLive: (name) => `${name} added to cart`,
    viewDetails: "View details",
    openAria: (name) => `View details for ${name}`,
    partIllustration: (cat) => `${cat} part illustration`,
  },
  ar: {
    reviews: (n) => `(${n} تقييم)`,
    viewingNow: (n) => `${n} يشاهدون الآن`,
    fitsYour: (make) => `يناسب سيارتك ${make}`,
    onlyLeft: (n) => `بقي ${n} فقط`,
    addToCart: "أضف إلى السلة",
    added: "أُضيف",
    addAria: (name) => `أضف ${name} إلى السلة`,
    addedLive: (name) => `أُضيف ${name} إلى السلة`,
    viewDetails: "عرض التفاصيل",
    openAria: (name) => `عرض تفاصيل ${name}`,
    partIllustration: (cat) => `رسم توضيحي لقطعة ${cat}`,
  },
};

function Stars({ rating }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < full;
        const isHalf = i === full && half;
        return (
          <Star
            key={i}
            className={
              "h-3.5 w-3.5 " +
              (filled || isHalf ? "fill-warning text-warning" : "text-border")
            }
            strokeWidth={1.5}
          />
        );
      })}
    </span>
  );
}

export default function ProductCard({ product, view = "grid" }) {
  const { format } = useGeo();
  const { vehicle, hasVehicle } = useGarage();
  const { addItem } = useCart();
  const { lang, isRTL } = useLang();
  const { openProduct } = useProductModal();
  const tx = STRINGS[lang];

  const [added, setAdded] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const name = lang === "ar" && product.nameAr ? product.nameAr : product.name;

  const handleAdd = (e) => {
    // Never let the cart action bubble up and open the detail modal.
    e.stopPropagation();
    addItem(product);
    setAdded(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAdded(false), 1200);
  };

  const handleOpen = () => openProduct(product);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openProduct(product);
    }
  };

  const accentPanel = ACCENT_GRADIENT[product.accent] || ACCENT_GRADIENT.primary;

  const fitsVehicle =
    hasVehicle && vehicle && product.fitment.includes(vehicle.make);

  const lowStock = product.stock <= 6;
  const discountPct =
    product.compareAtUSD && product.compareAtUSD > product.priceUSD
      ? Math.round(
          ((product.compareAtUSD - product.priceUSD) / product.compareAtUSD) *
            100
        )
      : 0;

  const shownBadges = (product.badges || []).slice(0, 2);

  // -------------------------------------------------------------------------
  // LIST VIEW — horizontal card with a small fixed media thumb on the start
  // side and the info beside it. Used by the catalog list-mode switcher.
  // -------------------------------------------------------------------------
  if (view === "list") {
    return (
      <article
        role="button"
        tabIndex={0}
        onClick={handleOpen}
        onKeyDown={handleKeyDown}
        aria-label={tx.openAria(name)}
        className="group relative flex h-full w-full cursor-pointer flex-row items-center gap-3 overflow-hidden rounded-2xl border border-border bg-surface p-3 shadow-elevated transition-all duration-300 ease-out hover:border-primary/30 hover:shadow-glow focus-within:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg motion-reduce:transition-none"
      >
        {/* media thumb */}
        <div
          className={
            "relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br sm:h-28 sm:w-28 " +
            accentPanel
          }
        >
          {product.image ? (
            <img
              src={product.image}
              alt={name}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transform-none"
            />
          ) : (
            <span className="absolute inset-0 m-auto flex h-fit w-fit items-center justify-center rounded-full bg-primary/10 p-4 text-primary">
              <PartIcon icon={product.icon} className="h-8 w-8" />
            </span>
          )}
          {/* top-START: fits-your-vehicle badge — opposite corner from the
              discount, compact + truncating so a long make never spills. */}
          {fitsVehicle && (
            <span className="absolute start-1.5 top-1.5 z-10 flex max-w-[calc(100%-0.75rem)] items-center gap-0.5 rounded-md bg-success/90 px-1 py-0.5 text-[9px] font-semibold text-white shadow-glow-accent">
              <Check className="h-2.5 w-2.5 shrink-0" strokeWidth={3} />
              <span className="truncate">{tx.fitsYour(vehicle.make)}</span>
            </span>
          )}
          {/* top-END: discount badge — opposite corner from the fits badge. */}
          {discountPct > 0 && (
            <span className="absolute end-1.5 top-1.5 z-10 shrink-0 rounded-md bg-primary px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums text-white shadow-glow">
              -{discountPct}%
            </span>
          )}
        </div>

        {/* info */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-mono text-[11px] uppercase tracking-wider text-textMuted">
              {product.brand}
            </span>
          </div>

          <h3 className="line-clamp-2 font-display text-sm font-600 leading-snug text-textPrimary text-start">
            {name}
          </h3>

          <div className="flex items-center gap-2">
            <Stars rating={product.rating} />
            <span className="font-mono text-xs tabular-nums text-textSecondary">
              {product.rating.toFixed(1)}
            </span>
            {lowStock && (
              <span className="ms-auto flex items-center gap-1 text-[11px] font-medium text-warning">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning/70 motion-reduce:hidden" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-warning" />
                </span>
                {tx.onlyLeft(product.stock)}
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center justify-between gap-2">
            <div className="flex items-end gap-2">
              <span className="font-display text-lg font-700 tabular-nums text-textPrimary">
                {format(product.priceUSD)}
              </span>
              {product.compareAtUSD && (
                <span className="pb-0.5 font-mono text-xs tabular-nums text-textMuted line-through">
                  {format(product.compareAtUSD)}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleAdd}
              aria-label={tx.addAria(name)}
              className={
                "flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 font-display text-xs font-600 uppercase tracking-wide transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface " +
                (added
                  ? "bg-success text-white shadow-glow-accent"
                  : "bg-primary text-white hover:bg-primaryHover hover:shadow-glow active:scale-[0.98]")
              }
            >
              {added ? (
                <>
                  <Check className="h-4 w-4" strokeWidth={3} />
                  {tx.added}
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" strokeWidth={2.25} />
                  {tx.addToCart}
                </>
              )}
            </button>
          </div>
        </div>
        <span className="sr-only" aria-live="polite">
          {added ? tx.addedLive(name) : ""}
        </span>
      </article>
    );
  }

  // -------------------------------------------------------------------------
  // GRID VIEW (default) — uniform vertical card with locked equal heights.
  // -------------------------------------------------------------------------
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      aria-label={tx.openAria(name)}
      className="group relative flex h-full w-full cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface shadow-elevated transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/30 hover:shadow-glow focus-within:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg motion-reduce:transform-none motion-reduce:transition-none"
    >
      {/* Image / illustration panel — fixed aspect ratio keeps every card's
          media region identical regardless of source (URL image or PartIcon). */}
      <div
        className={
          "relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-gradient-to-br " +
          accentPanel
        }
      >
        {/* subliminal speed-hatch texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, currentColor 0 1px, transparent 1px 11px)",
          }}
          aria-hidden="true"
        />
        {/* hover sheen sweep */}
        <div
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full motion-reduce:hidden"
          aria-hidden="true"
        />

        {product.image ? (
          <img
            src={product.image}
            alt={name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transform-none"
          />
        ) : (
          <span className="absolute inset-0 m-auto flex h-fit w-fit items-center justify-center rounded-full bg-primary/10 p-4 text-primary transition-transform duration-500 ease-out group-hover:scale-110 group-hover:-rotate-3 motion-reduce:transform-none">
            <PartIcon
              icon={product.icon}
              className="h-14 w-14 drop-shadow-[0_2px_10px_rgba(0,0,0,0.25)]"
            />
          </span>
        )}

        {/* top-START: fits-your-vehicle endowment badge — opposite corner from
            the discount so the two can never collide; truncates a long make
            name instead of spilling across the media panel. */}
        {fitsVehicle && (
          <span className="absolute start-2 top-2 z-10 flex max-w-[60%] items-center gap-1 rounded-md bg-success/90 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-glow-accent">
            <Check className="h-3 w-3 shrink-0" strokeWidth={3} />
            <span className="truncate">{tx.fitsYour(vehicle.make)}</span>
          </span>
        )}

        {/* top-END: discount badge — compact, lives in the opposite corner. */}
        {discountPct > 0 && (
          <span className="absolute end-2 top-2 z-10 shrink-0 rounded-md bg-primary px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums text-white shadow-glow">
            -{discountPct}%
          </span>
        )}

        {/* bottom-start: viewing-now social proof */}
        <span className="absolute bottom-3 start-3 flex items-center gap-1.5 rounded-md bg-bg/60 px-2 py-1 font-mono text-[11px] tabular-nums text-textSecondary backdrop-blur-sm">
          <Eye className="h-3 w-3" strokeWidth={2} />
          {tx.viewingNow(product.viewing)}
        </span>

        {/* bottom-end: subtle "view details" affordance, surfaces on hover/focus */}
        <span className="pointer-events-none absolute bottom-3 end-3 flex items-center gap-1 rounded-md bg-bg/70 px-2 py-1 text-[11px] font-semibold text-textPrimary opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none">
          {tx.viewDetails}
          <ArrowUpRight className="h-3 w-3 rtl:-scale-x-100" strokeWidth={2.5} />
        </span>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-2.5 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-[11px] uppercase tracking-wider text-textMuted">
            {product.brand}
          </span>
          <span className="shrink-0 font-mono text-[10px] tabular-nums text-textMuted">
            {product.id}
          </span>
        </div>

        <h3 className="line-clamp-2 min-h-[2.75rem] font-display text-sm font-600 leading-snug text-textPrimary text-start sm:text-base">
          {name}
        </h3>

        {/* rating + reviews (social proof) */}
        <div className="flex items-center gap-2">
          <Stars rating={product.rating} />
          <span className="font-mono text-xs tabular-nums text-textSecondary">
            {product.rating.toFixed(1)}
          </span>
          <span className="text-xs text-textMuted">
            {tx.reviews(product.reviews)}
          </span>
        </div>

        {/* badges — reserved min-height so badge-less cards keep the same
            vertical rhythm as cards with badges */}
        <div className="flex min-h-[1.5rem] flex-wrap gap-1.5">
          {shownBadges.map((b) => (
            <span
              key={b}
              className="rounded border border-border bg-surfaceElevated px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-textSecondary"
            >
              {b}
            </span>
          ))}
        </div>

        {/* scarcity — reserved min-height so the bottom-pinned price/CTA aligns
            whether or not a scarcity line is shown */}
        <div className="flex min-h-[1.25rem] items-center gap-1.5 text-xs font-medium text-warning">
          {lowStock && (
            <>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning/70 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-warning" />
              </span>
              {tx.onlyLeft(product.stock)}
            </>
          )}
        </div>

        {/* price */}
        <div className="mt-auto flex items-end gap-2 pt-1">
          <span className="font-display text-xl font-700 tabular-nums text-textPrimary">
            {format(product.priceUSD)}
          </span>
          {product.compareAtUSD && (
            <span className="pb-0.5 font-mono text-sm tabular-nums text-textMuted line-through">
              {format(product.compareAtUSD)}
            </span>
          )}
        </div>

        {/* add-to-cart — stops propagation so the card click/modal never fires */}
        <button
          type="button"
          onClick={handleAdd}
          aria-label={tx.addAria(name)}
          className={
            "relative mt-1 flex min-h-[44px] items-center justify-center gap-2 overflow-hidden rounded-lg px-4 py-3 font-display text-sm font-600 uppercase tracking-wide transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:py-2.5 " +
            (added
              ? "bg-success text-white shadow-glow-accent"
              : "bg-primary text-white hover:bg-primaryHover hover:shadow-glow active:scale-[0.98]")
          }
        >
          {/* fill sweep on hover */}
          {!added && (
            <span
              className="pointer-events-none absolute inset-0 -translate-x-full bg-white/15 transition-transform duration-500 ease-out group-hover:translate-x-0 motion-reduce:hidden"
              aria-hidden="true"
            />
          )}
          {/* ripple on success */}
          {added && (
            <span
              className="pointer-events-none absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/30 motion-safe:animate-ripple motion-reduce:hidden"
              aria-hidden="true"
            />
          )}
          <span className="relative flex items-center gap-2">
            {added ? (
              <>
                <Check
                  className="h-4 w-4 motion-safe:animate-confetti-pop"
                  strokeWidth={3}
                />
                {tx.added}
                <span className="font-mono text-xs">+1</span>
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" strokeWidth={2.25} />
                {tx.addToCart}
                <Plus className="h-3.5 w-3.5 opacity-70" strokeWidth={3} />
              </>
            )}
          </span>
        </button>
        {/* a11y live region for the added state */}
        <span className="sr-only" aria-live="polite">
          {added ? tx.addedLive(name) : ""}
        </span>
      </div>
    </article>
  );
}
