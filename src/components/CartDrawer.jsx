import { useEffect, useRef, useState, useCallback } from "react";
import {
  X,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Lock,
  Tag,
  Sparkles,
  Truck,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  Disc3,
  Filter as FilterIcon,
  Zap,
  BatteryCharging,
  MoveVertical,
  GitCommitVertical,
  Gauge,
  Lightbulb,
  CircleDot,
  Wind,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { useCheckout } from "../context/CheckoutContext";
import { useGeo } from "../context/GeoContext";
import { useGarage } from "../context/GarageContext";
import { useLang } from "../context/LanguageContext";
import { COMMON } from "../lib/i18n";
import { COUPONS, FREE_SHIPPING_USD } from "../lib/data";

// Map catalog icon keys -> lucide glyphs (mirrors product mini-thumb language).
const ICON_MAP = {
  brake: Disc3,
  filter: FilterIcon,
  spark: Zap,
  battery: BatteryCharging,
  suspension: MoveVertical,
  belt: GitCommitVertical,
  pump: Gauge,
  light: Lightbulb,
  tire: CircleDot,
  exhaust: Wind,
};

// Accent token -> gradient classes for the icon thumb.
const ACCENT_THUMB = {
  primary: "from-primary/25 to-primary/5 text-primary ring-primary/30",
  accent: "from-accent/25 to-accent/5 text-accent ring-accent/30",
  success: "from-success/25 to-success/5 text-success ring-success/30",
};

// ---- Localized copy (component-local per project convention) ----------------
const STRINGS = {
  en: {
    cartTitle: "Your Garage Cart",
    item: "item",
    items: "items",
    closeCart: "Close cart",
    shopCart: "Shopping cart",
    // free-shipping Zeigarnik loop
    freeUnlocked: "Free GCC shipping unlocked!",
    youAre: "You are",
    awayFrom: "away from",
    freeShipping: "FREE GCC shipping",
    shipProgressLabel: "Progress toward free shipping",
    // empty state
    emptyTitle: "Your garage is idling",
    emptyBody:
      "No parts staged yet. Find OEM-grade upgrades verified to fit your build.",
    browse: "Browse the catalog",
    // coupon
    exclusiveUnlocked: "Exclusive unlocked",
    couponPlaceholder: "Coupon code",
    couponLabel: "Coupon code",
    apply: "Apply",
    removeCoupon: (c) => `Remove coupon ${c}`,
    teaserMember: "Members of the Garage",
    teaserFirst: "First-order reward",
    // summary
    subtotal: "Subtotal",
    discount: "Discount",
    shipping: "Shipping",
    total: "Total",
    free: "Free",
    each: "ea",
    // checkout + trust
    secureCheckout: "Secure Checkout",
    securePayment: "Secure payment",
    gccReturns: "GCC returns",
    // a11y line item
    removeItem: (n) => `Remove ${n} from cart`,
    qtyFor: (n) => `Quantity for ${n}`,
    decrease: "Decrease quantity",
    increase: "Increase quantity",
  },
  ar: {
    cartTitle: "سلة كراجك",
    item: "قطعة",
    items: "قطعة",
    closeCart: "إغلاق السلة",
    shopCart: "سلة التسوّق",
    // free-shipping Zeigarnik loop
    freeUnlocked: "تم تفعيل الشحن المجاني لدول الخليج!",
    youAre: "يفصلك",
    awayFrom: "عن",
    freeShipping: "الشحن المجاني لدول الخليج",
    shipProgressLabel: "التقدّم نحو الشحن المجاني",
    // empty state
    emptyTitle: "كراجك في وضع الانتظار",
    emptyBody:
      "لم تُضف أي قطع بعد. اكتشف ترقيات بمستوى الوكالة موثّقة لتناسب سيارتك.",
    browse: "تصفّح الكتالوج",
    // coupon
    exclusiveUnlocked: "عرض حصري مُفعّل",
    couponPlaceholder: "رمز الخصم",
    couponLabel: "رمز الخصم",
    apply: "تطبيق",
    removeCoupon: (c) => `إزالة الكوبون ${c}`,
    teaserMember: "أعضاء الكراج",
    teaserFirst: "مكافأة الطلب الأول",
    // summary
    subtotal: "المجموع الفرعي",
    discount: "الخصم",
    shipping: "الشحن",
    total: "الإجمالي",
    free: "مجاني",
    each: "للقطعة",
    // checkout + trust
    secureCheckout: "إتمام شراء آمن",
    securePayment: "دفع آمن",
    gccReturns: "إرجاع داخل الخليج",
    // a11y line item
    removeItem: (n) => `إزالة ${n} من السلة`,
    qtyFor: (n) => `كمية ${n}`,
    decrease: "تقليل الكمية",
    increase: "زيادة الكمية",
  },
};

function CartLine({ item, format, onQty, onRemove, tx, isRTL }) {
  const [exiting, setExiting] = useState(false);
  const Icon = ICON_MAP[item.icon] || Disc3;
  const thumb = ACCENT_THUMB[item.accent] || ACCENT_THUMB.primary;
  const name = isRTL && item.nameAr ? item.nameAr : item.name;

  const handleRemove = useCallback(() => {
    setExiting(true);
    // Allow the collapse/fade transition to play before the line is removed.
    window.setTimeout(() => onRemove(item.id), 260);
  }, [item.id, onRemove]);

  // Slide-out direction follows the inline-end so removal feels native in both dirs.
  const exitTranslate = isRTL ? "-translate-x-4" : "translate-x-4";

  return (
    <li
      className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        exiting
          ? `max-h-0 opacity-0 ${exitTranslate}`
          : "max-h-40 opacity-100 translate-x-0"
      }`}
    >
      <div className="flex gap-3 rounded-xl border border-border/70 bg-surfaceElevated p-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevated">
        <div
          className={`grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-gradient-to-br ring-1 ring-inset ${thumb}`}
        >
          <Icon size={24} strokeWidth={1.75} aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-sans text-sm font-semibold leading-tight text-textPrimary">
                {name}
              </p>
              <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-textMuted">
                {item.brand}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              aria-label={tx.removeItem(name)}
              className="shrink-0 rounded-md p-1.5 text-textMuted transition-colors duration-150 hover:bg-danger/10 hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/50"
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            {/* Qty stepper */}
            <div
              className="inline-flex items-center rounded-lg border border-border bg-surface"
              role="group"
              aria-label={tx.qtyFor(name)}
            >
              <button
                type="button"
                onClick={() => onQty(item.id, item.qty - 1)}
                aria-label={tx.decrease}
                className="grid h-8 w-8 place-items-center rounded-s-lg text-textSecondary transition-colors duration-150 hover:bg-primary/10 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <Minus size={14} aria-hidden="true" />
              </button>
              <span
                className="min-w-[2rem] text-center font-mono text-sm tabular-nums text-textPrimary"
                aria-live="polite"
              >
                {item.qty}
              </span>
              <button
                type="button"
                onClick={() => onQty(item.id, item.qty + 1)}
                aria-label={tx.increase}
                className="grid h-8 w-8 place-items-center rounded-e-lg text-textSecondary transition-colors duration-150 hover:bg-primary/10 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <Plus size={14} aria-hidden="true" />
              </button>
            </div>

            <div className="text-end">
              <p className="font-mono text-sm font-semibold tabular-nums text-textPrimary">
                {format(item.priceUSD * item.qty)}
              </p>
              {item.qty > 1 && (
                <p className="font-mono text-[11px] tabular-nums text-textMuted">
                  {format(item.priceUSD)} {tx.each}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

export default function CartDrawer() {
  const {
    items,
    updateQty,
    removeItem,
    isOpen,
    closeCart,
    count,
    subtotalUSD,
    coupon,
    couponError,
    applyCoupon,
    removeCoupon,
    discountUSD,
    shippingUSD,
    totalUSD,
    freeShippingRemainingUSD,
  } = useCart();
  const { openCheckout } = useCheckout();
  const { format } = useGeo();
  const { hasVehicle } = useGarage();
  const { lang, isRTL } = useLang();
  const tx = STRINGS[lang] || STRINGS.en;
  const c = COMMON[lang] || COMMON.en;

  const panelRef = useRef(null);
  const closeBtnRef = useRef(null);
  const [code, setCode] = useState("");
  const [justUnlocked, setJustUnlocked] = useState(false);

  // Escape to close + basic focus trap (Tab cycles within the panel).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeCart();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll(
          'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])'
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
  }, [isOpen, closeCart]);

  // Body scroll lock while open.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      // Move focus into the drawer for keyboard users.
      const t = window.setTimeout(() => closeBtnRef.current?.focus(), 60);
      return () => {
        document.body.style.overflow = prev;
        window.clearTimeout(t);
      };
    }
  }, [isOpen]);

  // Fire the "Exclusive unlocked" celebration once when a coupon becomes active.
  useEffect(() => {
    if (coupon) {
      setJustUnlocked(true);
      const t = window.setTimeout(() => setJustUnlocked(false), 1600);
      return () => window.clearTimeout(t);
    }
  }, [coupon]);

  const handleApply = useCallback(
    (e) => {
      if (e) e.preventDefault();
      if (applyCoupon(code)) setCode("");
    },
    [applyCoupon, code]
  );

  const handleCheckout = useCallback(() => {
    openCheckout();
    closeCart();
  }, [openCheckout, closeCart]);

  const handleBrowse = useCallback(() => {
    closeCart();
    window.setTimeout(() => {
      const el = document.getElementById("catalog");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, [closeCart]);

  // ---- Zeigarnik free-shipping progress -------------------------------------
  const shipUnlocked = subtotalUSD > 0 && freeShippingRemainingUSD <= 0;
  const progressPct =
    subtotalUSD <= 0
      ? 0
      : Math.min(100, (subtotalUSD / FREE_SHIPPING_USD) * 100);

  // ---- Tasteful suggested exclusive coupon ----------------------------------
  // Garage members get the premium GARAGE15 teaser; everyone else gets MEYAR10.
  const teaser = COUPONS.find((cp) =>
    hasVehicle ? cp.code === "GARAGE15" : cp.code === "MEYAR10"
  );
  const showTeaser = !coupon && teaser && items.length > 0;

  // ---- RTL anchoring --------------------------------------------------------
  // The drawer lives on the inline-END: right under LTR, left under RTL. Branch
  // in JS to choose the physical side, the border side, and the off-screen
  // translate-x sign for the open/closed slide.
  const sideClass = isRTL ? "left-0" : "right-0";
  const borderClass = isRTL ? "border-r" : "border-l";
  const closedTranslate = isRTL ? "-translate-x-full" : "translate-x-full";

  return (
    <div
      aria-hidden={!isOpen}
      className={`fixed inset-0 z-[60] ${
        isOpen ? "" : "pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div
        onClick={closeCart}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={tx.shopCart}
        className={`absolute ${sideClass} top-0 flex h-full w-full max-w-md flex-col ${borderClass} border-border bg-surface shadow-elevated transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen ? "translate-x-0" : closedTranslate
        }`}
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="relative grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/30">
              <ShoppingCart size={18} aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold leading-none text-textPrimary">
                {tx.cartTitle}
              </h2>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-textMuted">
                <span className="tabular-nums">{count}</span>{" "}
                {count === 1 ? tx.item : tx.items}
              </p>
            </div>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={closeCart}
            aria-label={tx.closeCart}
            className="grid h-9 w-9 place-items-center rounded-lg text-textSecondary transition-colors duration-150 hover:bg-border/50 hover:text-textPrimary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        {/* Free-shipping progress (Zeigarnik open loop) */}
        {items.length > 0 && (
          <div
            className={`border-b border-border px-5 py-3.5 transition-colors duration-300 ${
              shipUnlocked ? "bg-accent/5" : "bg-surfaceElevated/40"
            }`}
          >
            <div className="mb-2 flex items-center gap-2">
              <Truck
                size={15}
                aria-hidden="true"
                className={`shrink-0 rtl:-scale-x-100 ${
                  shipUnlocked ? "text-accent" : "text-primary"
                }`}
              />
              <p className="font-sans text-xs font-medium text-textSecondary">
                {shipUnlocked ? (
                  <span className="font-semibold text-accent">
                    {tx.freeUnlocked}
                  </span>
                ) : (
                  <>
                    {tx.youAre}{" "}
                    <span className="font-mono font-semibold tabular-nums text-primary">
                      {format(freeShippingRemainingUSD)}
                    </span>{" "}
                    {tx.awayFrom}{" "}
                    <span className="font-semibold text-textPrimary">
                      {tx.freeShipping}
                    </span>
                  </>
                )}
              </p>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-border/60"
              role="progressbar"
              aria-valuenow={Math.round(progressPct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={tx.shipProgressLabel}
            >
              {/* Width-based bar fills from the inline-start automatically under dir=rtl. */}
              <div
                className={`h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  shipUnlocked
                    ? "bg-gradient-to-r from-accent/80 to-accent shadow-glow-accent"
                    : "bg-gradient-to-r from-primary/70 to-primary shadow-glow"
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-16 text-center">
              <div className="relative mb-5 grid h-24 w-24 place-items-center rounded-2xl bg-surfaceElevated ring-1 ring-inset ring-border">
                <ShoppingCart
                  size={40}
                  strokeWidth={1.25}
                  aria-hidden="true"
                  className="text-textMuted"
                />
                <span className="absolute -end-1.5 -top-1.5 grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-primary ring-1 ring-inset ring-primary/30">
                  <Gauge size={15} aria-hidden="true" />
                </span>
              </div>
              <h3 className="font-display text-lg font-bold text-textPrimary">
                {tx.emptyTitle}
              </h3>
              <p className="mt-1.5 max-w-[16rem] font-sans text-sm text-textMuted">
                {tx.emptyBody}
              </p>
              <button
                type="button"
                onClick={handleBrowse}
                className="group mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-sans text-sm font-semibold text-white shadow-glow transition-all duration-300 hover:bg-primaryHover hover:shadow-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                {tx.browse}
                <Sparkles
                  size={15}
                  aria-hidden="true"
                  className="transition-transform duration-300 group-hover:rotate-12"
                />
              </button>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {items.map((item) => (
                <CartLine
                  key={item.id}
                  item={item}
                  format={format}
                  onQty={updateQty}
                  onRemove={removeItem}
                  tx={tx}
                  isRTL={isRTL}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Footer: coupon + summary + checkout */}
        {items.length > 0 && (
          <footer className="border-t border-border bg-surfaceElevated/50 px-5 pb-5 pt-4">
            {/* SMART COUPON */}
            <div className="mb-4">
              {coupon ? (
                <div
                  className={`relative overflow-hidden rounded-xl border border-accent/40 bg-accent/5 p-3 ${
                    justUnlocked ? "animate-glow-pulse" : ""
                  }`}
                >
                  {justUnlocked && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-accent/25 to-transparent"
                      style={{ backgroundSize: "200% 100%" }}
                    />
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2
                        size={18}
                        aria-hidden="true"
                        className="shrink-0 text-accent"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-sm font-bold tracking-wide text-textPrimary">
                            {coupon.code}
                          </span>
                          {coupon.exclusive && (
                            <span className="rounded-full bg-accent/15 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-accent ring-1 ring-inset ring-accent/30">
                              {tx.exclusiveUnlocked}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 font-sans text-xs text-textSecondary">
                          {coupon.label}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      aria-label={tx.removeCoupon(coupon.code)}
                      className="shrink-0 rounded-md p-1.5 text-textMuted transition-colors duration-150 hover:bg-danger/10 hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/50"
                    >
                      <X size={15} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <form onSubmit={handleApply} className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag
                        size={15}
                        aria-hidden="true"
                        className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-textMuted"
                      />
                      <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder={tx.couponPlaceholder}
                        aria-label={tx.couponLabel}
                        aria-invalid={!!couponError}
                        className="w-full rounded-lg border border-border bg-surface py-2.5 ps-9 pe-3 font-mono text-base md:text-sm uppercase tracking-wide text-textPrimary placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-textMuted focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring/40"
                      />
                    </div>
                    <button
                      type="submit"
                      className="rounded-lg border border-border bg-surface px-4 py-2.5 font-sans text-sm font-semibold text-textPrimary transition-all duration-200 hover:border-primary/50 hover:bg-primary/10 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      {tx.apply}
                    </button>
                  </form>

                  {couponError && (
                    <p
                      role="alert"
                      className="mt-2 font-sans text-xs font-medium text-danger"
                    >
                      {couponError}
                    </p>
                  )}

                  {/* Tasteful exclusive teaser */}
                  {showTeaser && !couponError && (
                    <button
                      type="button"
                      onClick={() => applyCoupon(teaser.code)}
                      className="group mt-2.5 flex w-full items-center justify-between gap-3 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-transparent px-3 py-2.5 text-start transition-all duration-300 hover:border-primary/50 hover:shadow-glow focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      <span className="flex items-center gap-2.5">
                        <Sparkles
                          size={16}
                          aria-hidden="true"
                          className="shrink-0 text-primary transition-transform duration-300 group-hover:rotate-12"
                        />
                        <span>
                          <span className="block font-sans text-xs font-semibold text-textPrimary">
                            {hasVehicle ? tx.teaserMember : tx.teaserFirst}
                          </span>
                          <span className="block font-sans text-[11px] text-textSecondary">
                            {teaser.label}
                          </span>
                        </span>
                      </span>
                      <span className="shrink-0 rounded-md bg-primary/15 px-2.5 py-1 font-mono text-[11px] font-bold tracking-wide text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-white">
                        {teaser.code}
                      </span>
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Summary */}
            <dl className="space-y-1.5 border-t border-border/60 pt-3">
              <div className="flex items-center justify-between">
                <dt className="font-sans text-sm text-textSecondary">
                  {tx.subtotal}
                </dt>
                <dd className="font-mono text-sm tabular-nums text-textPrimary">
                  {format(subtotalUSD)}
                </dd>
              </div>

              {discountUSD > 0 && (
                <div className="flex items-center justify-between">
                  <dt className="font-sans text-sm text-success">
                    {tx.discount}
                  </dt>
                  <dd className="font-mono text-sm font-semibold tabular-nums text-success">
                    -{format(discountUSD)}
                  </dd>
                </div>
              )}

              <div className="flex items-center justify-between">
                <dt className="font-sans text-sm text-textSecondary">
                  {tx.shipping}
                </dt>
                <dd
                  className={`font-mono text-sm tabular-nums ${
                    shippingUSD === 0
                      ? "font-semibold text-accent"
                      : "text-textPrimary"
                  }`}
                >
                  {shippingUSD === 0 ? tx.free : format(shippingUSD)}
                </dd>
              </div>

              <div className="mt-1 flex items-center justify-between border-t border-border/60 pt-2.5">
                <dt className="font-display text-base font-bold text-textPrimary">
                  {tx.total}
                </dt>
                <dd className="font-display text-xl font-extrabold tabular-nums text-textPrimary">
                  {format(totalUSD)}
                </dd>
              </div>
            </dl>

            {/* Secure Checkout CTA */}
            <button
              type="button"
              onClick={handleCheckout}
              className="group relative mt-4 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-6 py-3.5 font-display text-base font-bold uppercase tracking-wide text-white shadow-glow transition-all duration-300 hover:bg-primaryHover hover:shadow-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full rtl:[--tw-translate-x:100%] rtl:group-hover:[--tw-translate-x:-100%]"
              />
              <Lock size={17} aria-hidden="true" />
              {tx.secureCheckout}
            </button>

            {/* Trust line */}
            <div className="mt-3 flex items-center justify-center gap-4 font-sans text-[11px] text-textMuted">
              <span className="flex items-center gap-1.5">
                <ShieldCheck
                  size={13}
                  aria-hidden="true"
                  className="text-success"
                />
                {tx.securePayment}
              </span>
              <span className="flex items-center gap-1.5">
                <RotateCcw
                  size={13}
                  aria-hidden="true"
                  className="text-accent"
                />
                {tx.gccReturns}
              </span>
            </div>
          </footer>
        )}
      </aside>
    </div>
  );
}
