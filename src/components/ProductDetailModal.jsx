import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  X,
  Star,
  Plus,
  Minus,
  ShoppingCart,
  Check,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Car,
  ChevronRight,
  Sparkles,
  Truck,
  Eye,
} from "lucide-react";
import { useProductModal } from "../context/ProductModalContext";
import { useLang } from "../context/LanguageContext";
import { useGeo } from "../context/GeoContext";
import { useCart } from "../context/CartContext";
import { useGarage } from "../context/GarageContext";
import { PartIcon, ACCENT_GRADIENT } from "../lib/partIcons.jsx";
import { COMMON, CATEGORY_LABELS } from "../lib/i18n";
import Reviews from "./Reviews";
import RelatedProducts from "./RelatedProducts";

// -----------------------------------------------------------------------------
// Al-Meyar — full-screen Product Detail Modal. Reads the active product from
// ProductModalContext (null => render nothing). Renders a premium spec-sheet
// layout: a multi-angle PartIcon gallery on the inline-start, purchase + fitment
// verification on the inline-end, then localized Reviews + RelatedProducts.
// i18n via local STRINGS + COMMON + CATEGORY_LABELS; fully RTL-aware.
// -----------------------------------------------------------------------------

const STRINGS = {
  en: {
    fitment: "Fitment Verification",
    noVehiclePrompt: "Add your vehicle to confirm this part fits.",
    setUpGarage: "Set up your Garage",
    verifiedFor: "Verified fit for your",
    notConfirmed: "Not confirmed for your",
    notConfirmedHint: "Compatible with",
    highlights: "Highlights",
    specifications: "Specifications",
    reviewsCount: "reviews",
    discount: "Save",
    secureCheckout: "Secure transaction",
    freeShip: "Free GCC shipping over $120",
    watching: "people viewing now",
    only: "Only",
    left: "left in stock",
    addedToCart: "Added — view cart",
    viewDetails: "Detailed Spec Sheet",
    spec: "Spec sheet",
    closeAria: "Close product details",
  },
  ar: {
    fitment: "التحقق من التوافق",
    noVehiclePrompt: "أضف مركبتك لتأكيد توافق هذه القطعة.",
    setUpGarage: "إعداد المرآب",
    verifiedFor: "متوافق ومؤكد لـ",
    notConfirmed: "غير مؤكد لمركبتك",
    notConfirmedHint: "متوافق مع",
    highlights: "أبرز المزايا",
    specifications: "المواصفات",
    reviewsCount: "تقييم",
    discount: "وفّر",
    secureCheckout: "معاملة آمنة",
    freeShip: "شحن مجاني داخل الخليج فوق ١٢٠$",
    watching: "يشاهدون الآن",
    only: "تبقّى",
    left: "في المخزون فقط",
    addedToCart: "أُضيف — عرض السلة",
    viewDetails: "ورقة المواصفات التفصيلية",
    spec: "ورقة المواصفات",
    closeAria: "إغلاق تفاصيل المنتج",
  },
};

// Compact star row reused for the rating summary.
function Stars({ rating, size = 16 }) {
  const rounded = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={
            i < rounded
              ? "fill-warning text-warning"
              : "fill-transparent text-border"
          }
          strokeWidth={1.75}
        />
      ))}
    </span>
  );
}

export default function ProductDetailModal() {
  const { product, closeProduct } = useProductModal();
  const { lang, isRTL } = useLang();
  const { format } = useGeo();
  const { addItem, openCart } = useCart();
  const { vehicle, hasVehicle } = useGarage();

  const tx = STRINGS[lang];
  const c = COMMON[lang];

  const panelRef = useRef(null);
  const closeBtnRef = useRef(null);

  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  // 3D turntable scrubbing state. The viewer container is the drag surface.
  const viewerRef = useRef(null);
  const dragRef = useRef(null); // { pointerId, startX, startIndex } while dragging
  const [dragging, setDragging] = useState(false);

  // Reset transient UI whenever a different product opens.
  useEffect(() => {
    setActive(0);
    setQty(1);
    setAdded(false);
  }, [product?.id]);

  // Escape to close + Tab focus trap within the dialog.
  useEffect(() => {
    if (!product) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeProduct();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll(
          'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [product, closeProduct]);

  // Body scroll lock + move focus into the dialog while open.
  useEffect(() => {
    if (typeof document === "undefined" || !product) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 60);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
    };
  }, [product]);

  // ---- Fitment verification vs Garage ---------------------------------------
  // 3 states: no vehicle (prompt) | make in fitment (verified) | else (amber).
  const fitState = useMemo(() => {
    if (!product) return "none";
    if (!hasVehicle) return "none";
    return (product.fitment || []).includes(vehicle?.make)
      ? "verified"
      : "unconfirmed";
  }, [product, hasVehicle, vehicle]);

  const handleAdd = useCallback(() => {
    if (!product) return;
    for (let i = 0; i < qty; i += 1) addItem(product);
    setAdded(true);
    openCart();
  }, [product, qty, addItem, openCart]);

  const handleGarageLink = useCallback(() => {
    closeProduct();
    window.setTimeout(() => {
      const el = document.getElementById("garage");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, [closeProduct]);

  // Null product => modal closed. Keep this AFTER all hooks (Rules of Hooks).
  if (!product) return null;

  const p = product;
  const accentGrad = ACCENT_GRADIENT[p.accent] || ACCENT_GRADIENT.primary;

  const name = (lang === "ar" && p.nameAr) || p.name;
  const description =
    lang === "ar" ? p.descriptionAr : p.descriptionEn;
  const highlights =
    (lang === "ar" ? p.highlightsAr : p.highlightsEn) || [];
  const catLabel = CATEGORY_LABELS[p.category]
    ? CATEGORY_LABELS[p.category][lang]
    : p.category;

  const hasCompare = p.compareAtUSD && p.compareAtUSD > p.priceUSD;
  const discountPct = hasCompare
    ? Math.round(((p.compareAtUSD - p.priceUSD) / p.compareAtUSD) * 100)
    : 0;
  const lowStock = p.stock > 0 && p.stock <= 8;

  // --------------------------------------------------------------------------
  // Build a 4-slot turntable frame array (always exactly 4 frames) from the
  // best available source, in priority order:
  //   1) product.images (URL[])    -> real photos, up to 4 (wrap to fill 4)
  //   2) product.image  (single)   -> 4 derived angles via CSS transform/filter
  //   3) p.gallery      (SVG)      -> existing zoom/rotate angles
  // Each frame: { kind, src?, name?, transform?, filter?, ...svgShot }.
  // --------------------------------------------------------------------------
  const FRAME_COUNT = 4;

  // 4 distinct pseudo-3D angle variations used to simulate a turntable when we
  // only have a single still image. Tuned to read as "rotating" without ever
  // clipping the subject (object-cover keeps the frame full-bleed).
  const SINGLE_ANGLE_STEPS = [
    { transform: "rotateY(0deg) scale(1)", filter: "none" },
    {
      transform: "perspective(900px) rotateY(14deg) scale(1.04)",
      filter: "brightness(1.04) hue-rotate(-4deg)",
    },
    {
      transform: "perspective(900px) rotateY(-2deg) scale(1.08)",
      filter: "brightness(1.08)",
    },
    {
      transform: "perspective(900px) rotateY(-16deg) scale(1.04)",
      filter: "brightness(0.96) hue-rotate(4deg)",
    },
  ];

  let frames;
  if (Array.isArray(p.images) && p.images.length > 0) {
    const urls = p.images.slice(0, FRAME_COUNT);
    frames = Array.from({ length: FRAME_COUNT }, (_, i) => ({
      kind: "image",
      src: urls[i % urls.length],
    }));
  } else if (p.image) {
    frames = SINGLE_ANGLE_STEPS.map((step) => ({
      kind: "image",
      src: p.image,
      transform: step.transform,
      filter: step.filter,
    }));
  } else {
    const gallery =
      p.gallery && p.gallery.length ? p.gallery : [{ zoom: 1, rotate: 0 }];
    frames = Array.from({ length: FRAME_COUNT }, (_, i) => ({
      kind: "svg",
      ...gallery[i % gallery.length],
    }));
  }

  const frameCount = frames.length;
  const activeIdx = Math.min(active, frameCount - 1);
  const frame = frames[activeIdx];
  const isImageFrames = frames[0].kind === "image";

  // ---- 3D turntable drag/swipe scrubbing -----------------------------------
  // Map horizontal pointer delta to frame-index steps (~48px per frame),
  // RTL-aware (drag the other way), wrap 0..n, ignore mostly-vertical gestures
  // so the modal can still scroll. Pointer events with capture + cleanup.
  const DRAG_PX_PER_FRAME = 48;

  const handlePointerDown = (e) => {
    if (frameCount <= 1) return;
    // Only react to primary button / touch / pen.
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startIndex: activeIdx,
      axisLocked: false,
      horizontal: false,
    };
  };

  const handlePointerMove = (e) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;

    // Lock the gesture axis once it clears a small threshold. A vertical
    // gesture is released back to the page so scrolling is never hijacked.
    if (!d.axisLocked && Math.hypot(dx, dy) > 8) {
      d.axisLocked = true;
      d.horizontal = Math.abs(dx) > Math.abs(dy);
      if (d.horizontal) {
        setDragging(true);
        try {
          viewerRef.current?.setPointerCapture(e.pointerId);
        } catch {
          /* capture is best-effort */
        }
      } else {
        dragRef.current = null; // hand vertical scroll back to the page
        return;
      }
    }
    if (!d.horizontal) return;

    e.preventDefault();
    const dir = isRTL ? -1 : 1;
    const steps = Math.round((dx * dir) / DRAG_PX_PER_FRAME);
    let next = (d.startIndex + steps) % frameCount;
    if (next < 0) next += frameCount;
    if (next !== activeIdx) setActive(next);
  };

  const endDrag = (e) => {
    const d = dragRef.current;
    if (!d) return;
    if (e && e.pointerId != null && e.pointerId !== d.pointerId) return;
    if (e && viewerRef.current?.hasPointerCapture?.(d.pointerId)) {
      try {
        viewerRef.current.releasePointerCapture(d.pointerId);
      } catch {
        /* best-effort */
      }
    }
    dragRef.current = null;
    setDragging(false);
  };

  return (
    <div
      className="fixed inset-0 z-[50] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={name}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label={tx.closeAria}
        onClick={closeProduct}
        className="fixed inset-0 cursor-default bg-black/65 backdrop-blur-sm"
        tabIndex={-1}
      />

      {/* Centered panel */}
      <div className="relative flex min-h-full items-start justify-center p-3 sm:p-6">
        <div
          ref={panelRef}
          className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-surface shadow-elevated animate-garage-open"
        >
          {/* Sticky close affordance */}
          <button
            ref={closeBtnRef}
            type="button"
            onClick={closeProduct}
            aria-label={c.close}
            className="absolute end-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full border border-border bg-surface/90 text-textSecondary shadow-sm backdrop-blur transition-colors duration-150 hover:bg-border/50 hover:text-textPrimary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <X size={20} aria-hidden="true" />
          </button>

          {/* ===================== TOP: gallery + buy ===================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* ---- LEFT: multi-angle gallery ---- */}
            <div className="relative border-b border-border bg-surfaceElevated/50 p-5 sm:p-8 lg:border-b-0 lg:border-e">
              {/* Category + spec-sheet tag */}
              <div className="mb-4 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-primary ring-1 ring-inset ring-primary/25">
                  {catLabel}
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-textMuted">
                  <Sparkles size={12} aria-hidden="true" />
                  {tx.spec}
                </span>
              </div>

              {/* Big viewer — doubles as the 3D turntable drag surface.
                  Drag/swipe horizontally to scrub frames 0..3. */}
              <div
                ref={viewerRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                role="group"
                aria-roledescription={lang === "ar" ? "عرض ثلاثي الأبعاد" : "360 view"}
                aria-label={name}
                className={`relative grid aspect-square w-full touch-pan-y select-none place-items-center overflow-hidden rounded-xl bg-gradient-to-br ring-1 ring-inset ring-border ${accentGrad} ${
                  frameCount > 1
                    ? dragging
                      ? "cursor-grabbing"
                      : "cursor-grab"
                    : ""
                }`}
              >
                {/* Blueprint grid backdrop */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-[0.18]"
                  style={{
                    backgroundImage:
                      "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
                    backgroundSize: "26px 26px",
                  }}
                />

                {isImageFrames ? (
                  /* Real image (or image-derived angle). object-cover fills the
                     square; transform/filter simulate rotation for single-image
                     products. No transition while dragging keeps scrubbing
                     instant (also reduced-motion friendly). */
                  <img
                    src={frame.src}
                    alt={name}
                    loading="lazy"
                    draggable={false}
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-[transform,filter] duration-300 ease-out motion-reduce:transition-none"
                    style={{
                      transform: frame.transform || undefined,
                      filter: frame.filter || undefined,
                    }}
                  />
                ) : (
                  /* SVG gallery fallback — angle drives a numeric rotate+scale. */
                  <div
                    className="relative grid h-3/5 w-3/5 place-items-center transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                    style={{
                      transform: `rotate(${frame.rotate || 0}deg) scale(${
                        frame.zoom || 1
                      })`,
                    }}
                  >
                    <PartIcon icon={p.icon} className="h-full w-full" />
                  </div>
                )}

                {/* Caption (SVG gallery frames only) */}
                {!isImageFrames && (frame.captionEn || frame.captionAr) && (
                  <span className="absolute bottom-3 start-3 rounded-md bg-surface/80 px-2.5 py-1 font-mono text-[11px] text-textSecondary backdrop-blur">
                    {lang === "ar" ? frame.captionAr : frame.captionEn}
                  </span>
                )}

                {/* Frame position indicator (turntable dots) */}
                {frameCount > 1 && (
                  <div
                    aria-hidden="true"
                    className="absolute bottom-3 start-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-surface/70 px-2.5 py-1 backdrop-blur rtl:translate-x-1/2"
                  >
                    {frames.map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-200 ${
                          i === activeIdx
                            ? "w-4 bg-primary"
                            : "w-1.5 bg-textMuted/50"
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Discount flag */}
                {discountPct > 0 && (
                  <span className="absolute end-3 top-3 rounded-md bg-danger px-2 py-1 font-mono text-xs font-bold text-white shadow-sm">
                    -{discountPct}%
                  </span>
                )}
              </div>

              {/* Thumbnail strip — the 4 turntable frames; click sets index. */}
              <div className="mt-4 flex gap-2.5">
                {frames.map((g, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`${tx.spec} ${i + 1}`}
                    aria-pressed={i === activeIdx}
                    className={`relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br ring-1 ring-inset transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${accentGrad} ${
                      i === activeIdx
                        ? "ring-2 ring-primary scale-[1.03]"
                        : "ring-border opacity-70 hover:opacity-100"
                    }`}
                  >
                    {g.kind === "image" ? (
                      <img
                        src={g.src}
                        alt=""
                        loading="lazy"
                        draggable={false}
                        className="absolute inset-0 h-full w-full object-cover"
                        style={{ filter: g.filter || undefined }}
                      />
                    ) : (
                      <PartIcon icon={p.icon} className="h-3/5 w-3/5" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* ---- RIGHT: identity + buy ---- */}
            <div className="flex flex-col p-5 sm:p-8">
              {/* Brand + SKU */}
              <div className="flex items-center justify-between gap-3">
                <span className="font-display text-sm font-bold uppercase tracking-wide text-primary">
                  {p.brand}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-wider text-textMuted tabular-nums">
                  {p.id}
                </span>
              </div>

              {/* Title */}
              <h2 className="mt-2 font-display text-2xl font-extrabold leading-tight text-textPrimary sm:text-3xl">
                {name}
              </h2>

              {/* Rating */}
              <div className="mt-3 flex items-center gap-2.5">
                <Stars rating={p.rating} />
                <span className="font-mono text-sm font-semibold tabular-nums text-textPrimary">
                  {p.rating.toFixed(1)}
                </span>
                <span className="font-sans text-sm text-textMuted">
                  ({p.reviews} {tx.reviewsCount})
                </span>
              </div>

              {/* Price */}
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <span className="font-display text-3xl font-extrabold tabular-nums text-textPrimary">
                  {format(p.priceUSD)}
                </span>
                {hasCompare && (
                  <span className="font-mono text-lg tabular-nums text-textMuted line-through">
                    {format(p.compareAtUSD)}
                  </span>
                )}
                {discountPct > 0 && (
                  <span className="rounded-md bg-success/15 px-2 py-0.5 font-mono text-xs font-bold text-success ring-1 ring-inset ring-success/30">
                    {tx.discount} {discountPct}% {c.off}
                  </span>
                )}
              </div>

              {/* Short description */}
              {description && (
                <p className="mt-3 font-sans text-sm leading-relaxed text-textSecondary">
                  {description}
                </p>
              )}

              {/* Scarcity / social proof */}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-sans text-xs">
                {lowStock && (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-warning">
                    <AlertTriangle size={13} aria-hidden="true" />
                    {tx.only} {p.stock} {tx.left}
                  </span>
                )}
                {p.viewing > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-textMuted">
                    <Eye size={13} aria-hidden="true" />
                    <span className="tabular-nums">{p.viewing}</span>{" "}
                    {tx.watching}
                  </span>
                )}
              </div>

              {/* ---- FITMENT VERIFICATION ---- */}
              <div className="mt-5">
                <p className="mb-2 font-display text-xs font-bold uppercase tracking-wider text-textMuted">
                  {tx.fitment}
                </p>

                {fitState === "none" && (
                  <button
                    type="button"
                    onClick={handleGarageLink}
                    className="group flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surfaceElevated px-4 py-3 text-start transition-all duration-200 hover:border-primary/50 hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <span className="flex items-center gap-2.5">
                      <Car size={18} aria-hidden="true" className="text-primary" />
                      <span>
                        <span className="block font-sans text-sm font-semibold text-textPrimary">
                          {tx.setUpGarage}
                        </span>
                        <span className="block font-sans text-xs text-textSecondary">
                          {tx.noVehiclePrompt}
                        </span>
                      </span>
                    </span>
                    <ChevronRight
                      size={18}
                      aria-hidden="true"
                      className="shrink-0 text-textMuted transition-transform duration-200 group-hover:translate-x-0.5 rtl:-scale-x-100"
                    />
                  </button>
                )}

                {fitState === "verified" && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-success/40 bg-success/10 px-4 py-3">
                    <CheckCircle2
                      size={18}
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 text-success"
                    />
                    <p className="font-sans text-sm text-textPrimary">
                      <span className="font-semibold text-success">
                        {tx.verifiedFor}
                      </span>{" "}
                      <span className="font-semibold tabular-nums">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </span>
                    </p>
                  </div>
                )}

                {fitState === "unconfirmed" && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3">
                    <AlertTriangle
                      size={18}
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 text-warning"
                    />
                    <div className="font-sans text-sm text-textPrimary">
                      <p className="font-semibold text-warning">
                        {tx.notConfirmed} {vehicle.make}
                      </p>
                      {(p.fitment || []).length > 0 && (
                        <p className="mt-0.5 text-xs text-textSecondary">
                          {tx.notConfirmedHint}: {p.fitment.join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ---- Quantity + Add to Cart ---- */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div
                  className="inline-flex items-center self-start rounded-xl border border-border bg-surfaceElevated"
                  role="group"
                  aria-label={c.quantity}
                >
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="grid h-12 w-12 place-items-center rounded-s-xl text-textSecondary transition-colors duration-150 hover:bg-primary/10 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <Minus size={16} aria-hidden="true" />
                  </button>
                  <span
                    className="min-w-[3rem] text-center font-mono text-base font-semibold tabular-nums text-textPrimary"
                    aria-live="polite"
                  >
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setQty((q) => Math.min(Math.max(1, p.stock || 99), q + 1))
                    }
                    aria-label="Increase quantity"
                    className="grid h-12 w-12 place-items-center rounded-e-xl text-textSecondary transition-colors duration-150 hover:bg-primary/10 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <Plus size={16} aria-hidden="true" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAdd}
                  className="group relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-6 py-3.5 font-display text-base font-bold uppercase tracking-wide text-white shadow-glow transition-all duration-300 hover:bg-primaryHover hover:shadow-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full rtl:translate-x-full rtl:group-hover:-translate-x-full"
                  />
                  {added ? (
                    <>
                      <Check size={18} aria-hidden="true" />
                      {tx.addedToCart}
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={18} aria-hidden="true" />
                      {c.addToCart}
                    </>
                  )}
                </button>
              </div>

              {/* Trust line */}
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 font-sans text-xs text-textMuted">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={14} aria-hidden="true" className="text-success" />
                  {tx.secureCheckout}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Truck size={14} aria-hidden="true" className="text-accent" />
                  {tx.freeShip}
                </span>
              </div>
            </div>
          </div>

          {/* ===================== Highlights + Specs ===================== */}
          <div className="grid grid-cols-1 gap-px border-t border-border bg-border/60 md:grid-cols-2">
            {/* Highlights */}
            {highlights.length > 0 && (
              <section className="bg-surface p-5 sm:p-8">
                <h3 className="mb-4 font-display text-lg font-bold text-textPrimary">
                  {tx.highlights}
                </h3>
                <ul className="space-y-3">
                  {highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success/15 text-success">
                        <Check size={13} aria-hidden="true" strokeWidth={3} />
                      </span>
                      <span className="font-sans text-sm leading-relaxed text-textSecondary">
                        {h}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Specs table */}
            {p.specs && p.specs.length > 0 && (
              <section className="bg-surface p-5 sm:p-8">
                <h3 className="mb-4 font-display text-lg font-bold text-textPrimary">
                  {tx.specifications}
                </h3>
                <dl className="overflow-hidden rounded-xl border border-border">
                  {p.specs.map((s, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between gap-4 px-4 py-2.5 ${
                        i % 2 === 0 ? "bg-surfaceElevated/40" : "bg-surface"
                      }`}
                    >
                      <dt className="font-sans text-sm text-textSecondary">
                        {lang === "ar" ? s.labelAr : s.labelEn}
                      </dt>
                      <dd className="text-end font-mono text-sm font-medium tabular-nums text-textPrimary">
                        {s.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>

          {/* ===================== Reviews ===================== */}
          <div className="border-t border-border p-5 sm:p-8">
            <Reviews product={p} />
          </div>

          {/* ===================== Related ===================== */}
          <div className="border-t border-border bg-surfaceElevated/30 p-5 sm:p-8">
            <RelatedProducts product={p} />
          </div>
        </div>
      </div>
    </div>
  );
}
