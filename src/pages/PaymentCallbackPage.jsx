import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  PartyPopper,
  ShieldAlert,
  Loader2,
  Check,
  Copy,
  Truck,
} from "lucide-react";
import { useLang } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useOrders } from "../context/OrdersContext";
import {
  verifyMoyasarPayment,
  readPendingCheckout,
  clearPendingCheckout,
} from "../services/moyasarService";
import Celebration from "../components/Celebration";

// -----------------------------------------------------------------------------
// CABLER PARTS — /pay/callback. Moyasar redirects here after the customer
// completes (or fails) 3-D Secure: ?id=<payment_id>&status=paid|failed&message=….
//
// Flow: verify the charge SERVER-SIDE (/api/payments/moyasar, secret key) →
// cross-check the charged amount against the pending order snapshot → place the
// order → clear the cart + snapshot → show the order number. The redirect's own
// query params are never trusted for "paid" when server verification is
// available. Failures keep the cart intact so the customer can retry.
// -----------------------------------------------------------------------------

// Remembers the last successfully placed payment so a back-button revisit of
// the callback URL re-shows success instead of "details missing".
const LAST_PLACED_KEY = "almeyar:last-placed-order";

const STRINGS = {
  en: {
    verifying: "Confirming your payment…",
    verifyingHint: "Don't close this page.",
    successTitle: "Payment confirmed — order placed!",
    successBody: "Your parts are being prepared for dispatch.",
    orderNo: "Order number",
    copyOrder: "Copy order number",
    copyDone: "Copied",
    trackOrder: "Track order",
    continueShopping: "Continue shopping",
    failedTitle: "Payment not completed",
    failedBody:
      "Your card was not charged successfully. No order was placed — your cart is untouched, so you can try again.",
    failedReason: (m) => `Gateway message: ${m}`,
    tryAgain: "Back to the store",
    paymentRef: "Payment reference",
    unverifiableTitle: "Payment can't be confirmed right now",
    unverifiableBody:
      "We couldn't reach the payment verification service, so no order was placed yet. If you completed the payment, your money is safe with the gateway — try again in a moment, or contact support with the reference below.",
    retryVerify: "Try verification again",
    mismatchTitle: "Payment needs a manual check",
    mismatchBody:
      "The payment went through but didn't match this order. Please contact support with the payment reference below — nothing was lost.",
    orphanTitle: "Payment received — order details missing",
    orphanBody:
      "The payment succeeded, but this browser no longer holds the order details (the session was cleared mid-payment). Contact support with the payment reference below and we'll complete the order.",
    signedOutTitle: "Payment received — sign in to finish",
    signedOutBody:
      "The payment succeeded but your session ended during the redirect. Sign in with the same account and contact support with the payment reference below.",
    signIn: "Sign in",
    invalidTitle: "Nothing to confirm",
    invalidBody: "This page is only used to confirm payments after checkout.",
  },
  ar: {
    verifying: "جارٍ تأكيد عملية الدفع…",
    verifyingHint: "لا تغلق هذه الصفحة.",
    successTitle: "تم تأكيد الدفع — وتسجيل طلبك!",
    successBody: "يتم تجهيز قطعك للشحن.",
    orderNo: "رقم الطلب",
    copyOrder: "نسخ رقم الطلب",
    copyDone: "تم النسخ",
    trackOrder: "تتبّع الطلب",
    continueShopping: "متابعة التسوّق",
    failedTitle: "لم تكتمل عملية الدفع",
    failedBody:
      "لم يتم الخصم من بطاقتك. لم يُسجَّل أي طلب — سلّتك كما هي ويمكنك المحاولة مجدداً.",
    failedReason: (m) => `رسالة البوابة: ${m}`,
    tryAgain: "العودة للمتجر",
    paymentRef: "مرجع الدفع",
    unverifiableTitle: "تعذّر تأكيد الدفع حالياً",
    unverifiableBody:
      "لم نتمكن من الوصول لخدمة التحقق من الدفع، فلم يُسجَّل أي طلب بعد. إذا أكملت الدفع فمبلغك محفوظ لدى البوابة — أعد المحاولة بعد قليل أو تواصل مع الدعم مع المرجع أدناه.",
    retryVerify: "إعادة محاولة التحقق",
    mismatchTitle: "الدفعة تحتاج مراجعة يدوية",
    mismatchBody:
      "تم الدفع لكنه لا يطابق هذا الطلب. تواصل مع الدعم مع مرجع الدفع أدناه — لن يضيع منك شيء.",
    orphanTitle: "تم استلام الدفعة — تفاصيل الطلب مفقودة",
    orphanBody:
      "نجحت عملية الدفع، لكن المتصفح لم يعد يحتفظ بتفاصيل الطلب. تواصل مع الدعم مع مرجع الدفع أدناه وسنكمل الطلب.",
    signedOutTitle: "تم استلام الدفعة — سجّل الدخول للإكمال",
    signedOutBody:
      "نجح الدفع لكن جلستك انتهت أثناء التحويل. سجّل الدخول بنفس الحساب وتواصل مع الدعم مع مرجع الدفع أدناه.",
    signIn: "تسجيل الدخول",
    invalidTitle: "لا يوجد ما يتم تأكيده",
    invalidBody: "تُستخدم هذه الصفحة لتأكيد الدفع بعد إتمام الشراء فقط.",
  },
};

// Copyable mono reference chip (order number / payment id).
function RefChip({ label, value, copyLabel, copiedLabel }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    try {
      navigator.clipboard?.writeText(String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };
  if (!value) return null;
  return (
    <div className="mt-5 rounded-xl border border-border bg-surfaceElevated px-5 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-textMuted">
        {label}
      </p>
      <div className="mt-1 flex items-center justify-center gap-2">
        <p
          className="break-all font-mono text-lg font-bold tracking-wide text-primary"
          dir="ltr"
        >
          {value}
        </p>
        <button
          type="button"
          onClick={copy}
          aria-label={copyLabel}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-textMuted transition-colors hover:bg-surface hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          {copied ? (
            <Check size={14} aria-hidden="true" className="text-success" />
          ) : (
            <Copy size={14} aria-hidden="true" />
          )}
        </button>
      </div>
      {copied && (
        <p className="mt-1 font-sans text-[11px] font-semibold text-success">
          {copiedLabel}
        </p>
      )}
    </div>
  );
}

export default function PaymentCallbackPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const { lang } = useLang();
  const { isAuthed, status: authStatus } = useAuth();
  const { clearCart } = useCart();
  const { placeOrder } = useOrders();
  const navigate = useNavigate();
  const tx = STRINGS[lang] || STRINGS.en;

  const paymentId = params.get("id") || "";
  const redirectStatus = (params.get("status") || "").toLowerCase();
  const gatewayMessage = params.get("message") || "";

  // phase: verifying | success | failed | mismatch | orphan | signedout |
  //        unverifiable | invalid
  const [phase, setPhase] = useState(paymentId ? "verifying" : "invalid");
  const [order, setOrder] = useState(null);
  // Bumped by the retry button (unverifiable) and by a late sign-in
  // (signedout) to re-run the verification flow.
  const [attempt, setAttempt] = useState(0);
  // One run per payment id per attempt (guards StrictMode double-invoke and
  // re-renders after the flow already completed).
  const ranRef = useRef(false);

  // Late session restore: the auth adapter can report signed-out first and
  // deliver the user moments later — retry instead of dead-ending a real
  // payment in the signed-out state.
  useEffect(() => {
    if (phase === "signedout" && isAuthed) {
      ranRef.current = false;
      setPhase("verifying");
      setAttempt((n) => n + 1);
    }
  }, [phase, isAuthed]);

  const retryVerification = () => {
    ranRef.current = false;
    setPhase("verifying");
    setAttempt((n) => n + 1);
  };

  useEffect(() => {
    if (!paymentId || authStatus === "loading" || ranRef.current) return;
    ranRef.current = true;

    (async () => {
      // Back-button / refresh on an already-completed payment: the snapshot is
      // gone (cleared on success), so re-show the success screen instead of
      // the scary "details missing" state — and never place a second order.
      try {
        const last = JSON.parse(
          window.sessionStorage.getItem(LAST_PLACED_KEY) || "null"
        );
        if (last && last.paymentId === paymentId) {
          setOrder({ id: last.orderId });
          setPhase("success");
          return;
        }
      } catch {
        /* ignore */
      }

      const pending = readPendingCheckout();
      const verify = await verifyMoyasarPayment(paymentId, pending?.order || null);

      // SERVER verification is the ONLY source of truth for "paid" — the
      // redirect query params are attacker-typeable and are never trusted.
      // Transport failures / missing secret key land in a retryable
      // "can't confirm" state instead of minting an order.
      if (!verify.configured) {
        setPhase("unverifiable");
        return;
      }
      // A lookup that couldn't run (bad server key / Moyasar outage) is NOT a
      // declined payment — the charge may exist. Send it to the retryable
      // "can't confirm" state instead of telling the customer it failed.
      if (verify.lookup === "unauthorized" || verify.lookup === "lookup_error") {
        setPhase("unverifiable");
        return;
      }
      if (!verify.paid) {
        setPhase("failed");
        return;
      }
      // Paid but this browser no longer holds the order snapshot (session
      // wiped mid-redirect / site data cleared): that's the ORPHAN state —
      // "payment received, order details missing" — NOT a scary manual-review
      // mismatch. The server reports it as priceCheck "missing_order".
      if (!pending?.order || verify.priceCheck === "missing_order") {
        setPhase("orphan");
        return;
      }
      // `valid` = server re-checked currency (SAR), the charged amount vs the
      // order total at the peg, and the subtotal vs CATALOG prices. A paid but
      // non-matching charge goes to manual review — never into a wrong order.
      if (!verify.valid) {
        setPhase("mismatch");
        return;
      }
      // The URL's payment id must be the SAME payment this snapshot initiated
      // (bound in on_completed). Blocks replaying an old paid id against a
      // rebuilt cart, and defense-in-depth re-checks the amount client-side.
      if (
        !pending.paymentId ||
        pending.paymentId !== paymentId ||
        (pending.amountHalalas != null &&
          verify.amount != null &&
          Number(verify.amount) !== Number(pending.amountHalalas))
      ) {
        setPhase("mismatch");
        return;
      }
      if (!isAuthed) {
        setPhase("signedout");
        return;
      }

      try {
        const placed = await placeOrder({
          ...pending.order,
          paymentId,
          paymentStatus: "paid",
          estimatedDeliveryDate:
            Date.now() +
            (pending.etaDays?.[1] ?? 3) * 24 * 60 * 60 * 1000,
        });
        clearPendingCheckout();
        clearCart();
        try {
          window.sessionStorage.setItem(
            LAST_PLACED_KEY,
            JSON.stringify({ paymentId, orderId: placed?.id || null })
          );
        } catch {
          /* ignore */
        }
        setOrder(placed);
        setPhase("success");
      } catch {
        // Payment is real but the order write failed — manual review path.
        setPhase("orphan");
      }
    })();
  }, [
    paymentId,
    authStatus,
    isAuthed,
    attempt,
    placeOrder,
    clearCart,
  ]);

  const heroBtn =
    "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-display text-sm font-bold uppercase tracking-wide text-white shadow-glow transition-all duration-300 hover:bg-primaryHover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
  const quietBtn =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-6 py-3 font-display text-sm font-bold uppercase tracking-wide text-textSecondary transition-colors duration-200 hover:border-primary/40 hover:text-textPrimary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      {phase === "verifying" && (
        <>
          <Loader2
            className="h-10 w-10 animate-spin text-primary motion-reduce:animate-none"
            aria-hidden="true"
          />
          <h1 className="mt-5 font-display text-xl font-bold text-textPrimary">
            {tx.verifying}
          </h1>
          <p className="mt-2 font-sans text-sm text-textMuted">
            {tx.verifyingHint}
          </p>
        </>
      )}

      {phase === "success" && (
        <>
          {/* Confetti + success chime on the confirmed order */}
          <Celebration active />
          <span className="grid h-20 w-20 place-items-center rounded-full bg-success/15 text-success ring-1 ring-inset ring-success/30">
            <PartyPopper size={40} aria-hidden="true" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-extrabold text-textPrimary">
            {tx.successTitle}
          </h1>
          <p className="mt-2 font-sans text-sm text-textSecondary">
            {tx.successBody}
          </p>
          <RefChip
            label={tx.orderNo}
            value={order?.id}
            copyLabel={tx.copyOrder}
            copiedLabel={tx.copyDone}
          />
          <div className="mt-6 flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() =>
                navigate(
                  order?.id ? `/account/orders/${order.id}` : "/account/orders"
                )
              }
              className={heroBtn}
            >
              <Truck size={16} aria-hidden="true" className="rtl:-scale-x-100" />
              {tx.trackOrder}
            </button>
            <Link to="/" className={quietBtn}>
              {tx.continueShopping}
            </Link>
          </div>
        </>
      )}

      {(phase === "failed" ||
        phase === "mismatch" ||
        phase === "orphan" ||
        phase === "signedout" ||
        phase === "unverifiable" ||
        phase === "invalid") && (
        <>
          <span className="grid h-20 w-20 place-items-center rounded-full bg-danger/10 text-danger ring-1 ring-inset ring-danger/30">
            <ShieldAlert size={40} aria-hidden="true" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-extrabold text-textPrimary">
            {phase === "failed"
              ? tx.failedTitle
              : phase === "mismatch"
              ? tx.mismatchTitle
              : phase === "orphan"
              ? tx.orphanTitle
              : phase === "signedout"
              ? tx.signedOutTitle
              : phase === "unverifiable"
              ? tx.unverifiableTitle
              : tx.invalidTitle}
          </h1>
          <p className="mt-2 max-w-md font-sans text-sm text-textSecondary">
            {phase === "failed"
              ? tx.failedBody
              : phase === "mismatch"
              ? tx.mismatchBody
              : phase === "orphan"
              ? tx.orphanBody
              : phase === "signedout"
              ? tx.signedOutBody
              : phase === "unverifiable"
              ? tx.unverifiableBody
              : tx.invalidBody}
          </p>
          {phase === "failed" && gatewayMessage && (
            <p className="mt-2 font-mono text-xs text-textMuted" dir="ltr">
              {tx.failedReason(gatewayMessage)}
            </p>
          )}
          {phase !== "invalid" && phase !== "failed" && (
            <RefChip
              label={tx.paymentRef}
              value={paymentId}
              copyLabel={tx.copyOrder}
              copiedLabel={tx.copyDone}
            />
          )}
          <div className="mt-6 flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
            {phase === "signedout" && (
              // Round-trip: after signing in, AuthPage sends the user straight
              // back to THIS callback URL (query intact), the flow re-runs and
              // the order completes — no manual steps, no lost payment.
              <Link
                to="/login"
                state={{
                  from: {
                    pathname: location.pathname,
                    search: location.search,
                  },
                }}
                className={heroBtn}
              >
                {tx.signIn}
              </Link>
            )}
            {phase === "unverifiable" && (
              <button type="button" onClick={retryVerification} className={heroBtn}>
                {tx.retryVerify}
              </button>
            )}
            <Link
              to="/"
              className={
                phase === "signedout" || phase === "unverifiable"
                  ? quietBtn
                  : heroBtn
              }
            >
              {tx.tryAgain}
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
