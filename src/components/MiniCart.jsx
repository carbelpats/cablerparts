// -----------------------------------------------------------------------------
// Caliber Parts — MiniCart (add-to-cart confirmation toast)
//
// A small, FIXED, NON-MODAL popup that appears whenever a product is added to
// the cart. No backdrop, no scroll-lock, no focus-trap — it's a toast, not a
// dialog. Pinned to the TOP-END corner just under the sticky navbar.
//
// It subscribes to useCart().lastAdded (a { nonce, item } snapshot that changes
// on EVERY add, including repeat adds of the same product). A new nonce opens
// the popup with the latest snapshot and (re)starts a ~5s auto-dismiss timer.
// The timer pauses while hovered. Closing clears lastAdded.
//
// Suppressed while the full CartDrawer (useCart().isOpen) or the CheckoutModal
// (useCheckout().isOpen) is open — those already show the cart.
//
// Z-INDEX: z-[55], deliberately BELOW the drawer (z-[60]) and checkout (z-[70]).
//
// Visual language mirrors CartDrawer's line card: an accent-themed media tile
// (PartIcon) on the inline-start, then name / brand / qty / price.
//
// Uses useLang only for copy + direction; useGeo().format for money. Purely a
// presentational subscriber — it owns no cart state of its own.
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState, useCallback } from "react";
import { CheckCircle2, X, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useCheckout } from "../context/CheckoutContext";
import { useGeo } from "../context/GeoContext";
import { useLang } from "../context/LanguageContext";
import { PartIcon, ACCENT_GRADIENT } from "../lib/partIcons.jsx";

const AUTO_DISMISS_MS = 5000;

// ---- Localized copy (component-local per project convention) ----------------
const STRINGS = {
  en: {
    added: "Added to cart",
    close: "Dismiss",
    continue: "Continue shopping",
    checkout: "Checkout",
    viewCart: "View cart",
    // thin summary line: "{count} in cart · {subtotal}"
    summary: (count, subtotal) => `${count} in cart · ${subtotal}`,
    region: "Add-to-cart confirmation",
  },
  ar: {
    added: "أُضيف إلى السلة",
    close: "إغلاق",
    continue: "متابعة التسوق",
    checkout: "إتمام الشراء",
    viewCart: "عرض السلة",
    summary: (count, subtotal) => `${count} في السلة · ${subtotal}`,
    region: "تأكيد الإضافة إلى السلة",
  },
};

export default function MiniCart() {
  const {
    lastAdded,
    clearLastAdded,
    count,
    subtotalUSD,
    isOpen: cartOpen,
    openCart,
    closeCart,
  } = useCart();
  const { openCheckout, isOpen: checkoutOpen } = useCheckout();
  const { format } = useGeo();
  const { lang, isRTL } = useLang();
  const tx = STRINGS[lang] || STRINGS.en;

  // The frozen snapshot currently shown (so an exit animation can finish even
  // after lastAdded is cleared).
  const [snapshot, setSnapshot] = useState(null);
  const [visible, setVisible] = useState(false);
  const hoveredRef = useRef(false);
  const timerRef = useRef(null);
  const exitTimerRef = useRef(null);

  // Suppress entirely while the full drawer or checkout owns the screen.
  const suppressed = cartOpen || checkoutOpen;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    if (hoveredRef.current) return; // don't run while hovered
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      close();
    }, AUTO_DISMISS_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearTimer]);

  // Begin the exit transition, then drop the snapshot + clear lastAdded.
  const close = useCallback(() => {
    clearTimer();
    setVisible(false);
    if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    exitTimerRef.current = window.setTimeout(() => {
      exitTimerRef.current = null;
      setSnapshot(null);
    }, 240);
    clearLastAdded?.();
  }, [clearTimer, clearLastAdded]);

  // Open / re-open on each new add (keyed by nonce). Suppressed → ignore but
  // still consume the signal so it doesn't pop the moment the drawer closes.
  useEffect(() => {
    if (!lastAdded?.item) return;
    if (suppressed) {
      clearLastAdded?.();
      return;
    }
    if (exitTimerRef.current) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    setSnapshot(lastAdded.item);
    setVisible(true);
    startTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastAdded?.nonce, suppressed]);

  // If the drawer/checkout opens while the popup is up, hide it immediately.
  useEffect(() => {
    if (suppressed && (visible || snapshot)) {
      clearTimer();
      setVisible(false);
      setSnapshot(null);
      clearLastAdded?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suppressed]);

  // Cleanup on unmount.
  useEffect(
    () => () => {
      clearTimer();
      if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    },
    [clearTimer]
  );

  const handleMouseEnter = useCallback(() => {
    hoveredRef.current = true;
    clearTimer(); // pause auto-dismiss while hovered
  }, [clearTimer]);

  const handleMouseLeave = useCallback(() => {
    hoveredRef.current = false;
    if (visible) startTimer(); // resume countdown
  }, [visible, startTimer]);

  const handleContinue = useCallback(() => close(), [close]);

  const handleCheckout = useCallback(() => {
    close();
    closeCart?.();
    openCheckout();
  }, [close, closeCart, openCheckout]);

  const handleViewCart = useCallback(() => {
    close();
    openCart();
  }, [close, openCart]);

  if (!snapshot) return null;

  const item = snapshot;
  const gradient = ACCENT_GRADIENT[item.accent] || ACCENT_GRADIENT.primary;
  const name = lang === "ar" && item.nameAr ? item.nameAr : item.name;

  // Anchored to the inline-END corner. Branch the physical side in JS per the
  // RTL rule; slide in from that same edge.
  const sideClass = isRTL ? "left-4" : "right-4";
  const enterTranslate = isRTL ? "-translate-x-3" : "translate-x-3";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={tx.region}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={[
        "fixed top-20 z-[55] w-[calc(100vw-2rem)] max-w-sm",
        sideClass,
        "rounded-2xl border border-border bg-surface shadow-elevated",
        "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        visible
          ? "translate-x-0 translate-y-0 opacity-100"
          : `pointer-events-none opacity-0 ${enterTranslate} -translate-y-1`,
      ].join(" ")}
    >
      {/* Header: success check + title + close */}
      <div className="flex items-center justify-between gap-3 px-4 pt-3.5">
        <div className="flex items-center gap-2">
          <span
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-success/15 text-success"
            aria-hidden="true"
          >
            <CheckCircle2 size={15} />
          </span>
          <p className="font-display text-sm font-bold text-textPrimary">
            {tx.added}
          </p>
        </div>
        <button
          type="button"
          onClick={handleContinue}
          aria-label={tx.close}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-textMuted transition-colors duration-150 hover:bg-border/50 hover:text-textPrimary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      {/* Added product — horizontal RECTANGULAR card (mirrors CartDrawer line) */}
      <div className="px-4 pt-3">
        <div className="flex gap-3 rounded-xl border border-border/70 bg-surfaceElevated p-2.5">
          <div
            className={`grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-gradient-to-br ring-1 ring-inset ring-border/60 ${gradient}`}
          >
            <PartIcon icon={item.icon} className="h-9 w-9" />
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-sans text-sm font-semibold leading-tight text-textPrimary">
                {name}
              </p>
              <p className="mt-0.5 truncate font-mono text-[11px] uppercase tracking-wide text-textMuted">
                {item.brand}
                <span className="mx-1.5 text-border">·</span>
                <span className="tabular-nums">×{item.qty}</span>
              </p>
            </div>
            <p className="shrink-0 font-mono text-sm font-semibold tabular-nums text-textPrimary">
              {format(item.priceUSD)}
            </p>
          </div>
        </div>
      </div>

      {/* Thin summary line: count + subtotal */}
      <div className="flex items-center gap-2 px-4 pt-2.5 text-textSecondary">
        <ShoppingBag size={13} aria-hidden="true" className="shrink-0" />
        <p className="font-sans text-xs">
          {tx.summary(count, format(subtotalUSD))}
        </p>
      </div>

      {/* Actions: Continue shopping (secondary) + Checkout (primary) */}
      <div className="flex items-center gap-2 px-4 pb-2.5 pt-3">
        <button
          type="button"
          onClick={handleContinue}
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 font-sans text-sm font-semibold text-textPrimary transition-all duration-200 hover:border-primary/50 hover:bg-primary/10 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {tx.continue}
        </button>
        <button
          type="button"
          onClick={handleCheckout}
          className="group flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 font-sans text-sm font-bold text-white shadow-glow transition-all duration-300 hover:bg-primaryHover hover:shadow-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          {tx.checkout}
          <ArrowRight
            size={15}
            aria-hidden="true"
            className="transition-transform duration-300 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
          />
        </button>
      </div>

      {/* View cart text link */}
      <div className="px-4 pb-3.5 text-center">
        <button
          type="button"
          onClick={handleViewCart}
          className="rounded font-sans text-xs font-medium text-textSecondary underline-offset-4 transition-colors duration-150 hover:text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {tx.viewCart}
        </button>
      </div>
    </div>
  );
}
