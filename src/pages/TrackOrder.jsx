// -----------------------------------------------------------------------------
// AL-MEYAR — TrackOrder (PUBLIC /track)
//
// A hero-style "Track My Order" page. The Order ID input prefills from the
// ?id= query (useSearchParams) and the Track button calls
// useOrders().trackById(id):
//   - found real order   -> render OrderStatusTimeline (with order summary)
//   - not found          -> a DETERMINISTIC demo status (isDemo:true) is still
//                           returned, shown with a subtle "sample tracking" note
//   - empty / no result  -> a friendly empty/not-found state
//
// Tracking is id-scoped (not user-scoped), so this is fully public. We still
// surface helpful auth-aware hints: a link to /login for full history when
// signed out, and a "view all your orders" hint when signed in.
//
// Bilingual: own local STRINGS={en,ar} selected by useLang().lang. RTL via
// logical utilities (ps/pe, text-start, mirrored arrow). Latin order ids stay
// dir="ltr" mono tabular-nums. a11y: labelled input, aria-invalid/describedby,
// role=alert/status feedback, focus-visible rings. No Date.now / Math.random at
// module top level.
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  PackageSearch,
  Search,
  ArrowRight,
  PackageX,
  Info,
  LogIn,
  ListOrdered,
  Truck,
  Hash,
  CalendarClock,
  CalendarCheck2,
} from "lucide-react";
import { useLang } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { useOrders } from "../context/OrdersContext";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import OrderStatusTimeline from "../components/order/OrderStatusTimeline";

const STRINGS = {
  en: {
    metaTitle: "Track my order",
    metaDescription:
      "Track your Cabler Parts order in real time — enter your order ID to follow your shipment from our GCC hub to your door.",
    eyebrow: "Order tracking",
    title: "Track my order",
    subtitle:
      "Enter your order ID to see real-time status — from preparation in our GCC hub to delivery at your door.",
    label: "Order ID",
    placeholder: "MR-XXXXXX-XXXX",
    track: "Track",
    tracking: "Tracking…",
    emptyHint: "Tip: your order ID starts with “MR-” and is on your receipt.",
    requiredError: "Please enter an order ID.",
    resultFor: "Tracking",
    foundNote: "We found your order.",
    demoNote:
      "Sample tracking — we couldn’t find that exact ID, so here’s a representative status. Double-check your ID for live tracking.",
    notFoundTitle: "No order to track yet",
    notFoundBody:
      "Enter a valid order ID above to follow your shipment in real time.",
    items: "Items",
    placed: "Placed",
    // shipment tracking
    trackingNo: "Tracking number",
    courier: "Courier",
    estDelivery: "Estimated delivery",
    deliveredOn: "Delivered on",
    // auth hints
    signedOutHint: "Want all your orders in one place?",
    signInLink: "Sign in to view your history",
    signedInHint: "Signed in —",
    allOrdersLink: "view all your orders",
  },
  ar: {
    metaTitle: "تتبّع طلبي",
    metaDescription:
      "تتبّع طلبك من كابلر بارتس لحظة بلحظة — أدخل رقم طلبك لمتابعة شحنتك من مركزنا الخليجي حتى بابك.",
    eyebrow: "تتبّع الطلب",
    title: "تتبّع طلبي",
    subtitle:
      "أدخل رقم طلبك لمتابعة الحالة لحظة بلحظة — من التجهيز في مركزنا الخليجي حتى التوصيل إلى بابك.",
    label: "رقم الطلب",
    placeholder: "MR-XXXXXX-XXXX",
    track: "تتبّع",
    tracking: "جارٍ التتبّع…",
    emptyHint: "ملاحظة: يبدأ رقم طلبك بـ «MR-» وتجده في إيصالك.",
    requiredError: "يرجى إدخال رقم الطلب.",
    resultFor: "تتبّع",
    foundNote: "وجدنا طلبك.",
    demoNote:
      "تتبّع تجريبي — لم نعثر على هذا الرقم تحديدًا، وهذه حالة تمثيلية. تأكّد من رقمك للتتبّع المباشر.",
    notFoundTitle: "لا يوجد طلب لتتبّعه بعد",
    notFoundBody: "أدخل رقم طلب صحيحًا بالأعلى لمتابعة شحنتك لحظة بلحظة.",
    items: "القطع",
    placed: "تاريخ الطلب",
    // shipment tracking
    trackingNo: "رقم التتبّع",
    courier: "شركة الشحن",
    estDelivery: "موعد التوصيل المتوقّع",
    deliveredOn: "تم التوصيل في",
    // auth hints
    signedOutHint: "تريد كل طلباتك في مكان واحد؟",
    signInLink: "سجّل الدخول لعرض سجلّك",
    signedInHint: "مُسجّل الدخول —",
    allOrdersLink: "عرض كل طلباتك",
  },
};

function formatDate(ms, lang) {
  if (!ms) return "";
  try {
    return new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(ms));
  } catch {
    return "";
  }
}

// Has the order reached the "Shipped" stage (or beyond)? Derived from the
// status steps (no hardcoded index): the Shipped step being done/current, or the
// order already delivered. Returns false for terminal off-track states.
function isShippedOrLater(status) {
  if (!status || status.offTrack) return false;
  if (status.delivered) return true;
  const steps = Array.isArray(status.steps) ? status.steps : [];
  const shipped = steps.find((s) => s.key === "Shipped");
  return !!(shipped && (shipped.done || shipped.current));
}

export default function TrackOrder() {
  const { lang } = useLang();
  const t = STRINGS[lang] || STRINGS.en;
  useDocumentMeta({ title: t.metaTitle, description: t.metaDescription });
  const { isAuthed } = useAuth();
  const { trackById } = useOrders();
  const [searchParams, setSearchParams] = useSearchParams();

  const [value, setValue] = useState(() => searchParams.get("id") || "");
  const [result, setResult] = useState(null); // { found, order?, status?, isDemo } | null
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const ranInitial = useRef(false);

  // Run a lookup for a given id, updating result + URL query.
  function runTrack(rawId, { syncUrl = true } = {}) {
    const id = String(rawId || "").trim();
    if (!id) {
      setError(true);
      setResult(null);
      if (syncUrl) {
        const next = new URLSearchParams(searchParams);
        next.delete("id");
        setSearchParams(next, { replace: true });
      }
      return;
    }
    setError(false);
    setBusy(true);
    // brief async feel so the loading state reads (handler-scope timers OK)
    window.setTimeout(async () => {
      try {
        const res = await trackById(id);
        setResult(res);
      } finally {
        setBusy(false);
      }
    }, 350);
    if (syncUrl) {
      const next = new URLSearchParams(searchParams);
      next.set("id", id);
      setSearchParams(next, { replace: true });
    }
  }

  // Auto-track once on mount if an ?id= was provided.
  useEffect(() => {
    if (ranInitial.current) return;
    ranInitial.current = true;
    const initial = searchParams.get("id");
    if (initial && initial.trim()) {
      runTrack(initial, { syncUrl: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(e) {
    e.preventDefault();
    runTrack(value);
  }

  const showResult = !!result && !busy;
  const isFound = showResult && result.found;
  const isDemo = showResult && !result.found && result.isDemo;
  const hasStatus = showResult && !!result.status;

  // Surface live shipment details only for a found, real order that has shipped
  // (or beyond) AND carries a tracking number. The demo order has no real
  // trackingNumber, so this stays hidden for sample tracking.
  const trackedOrder = isFound ? result.order : null;
  const showTracking =
    isFound &&
    isShippedOrLater(result.status) &&
    !!trackedOrder?.trackingNumber;

  return (
    <main className="relative isolate min-h-[70vh] overflow-hidden bg-bg">
      {/* ---- Layered ambient background (Midnight-Tachometer) ---- */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute -left-1/4 -top-1/3 h-[48rem] w-[48rem] rounded-full bg-primary/15 blur-[120px] motion-safe:animate-glow-pulse" />
        <div className="absolute -right-1/4 top-1/4 h-[40rem] w-[40rem] rounded-full bg-accent/10 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "linear-gradient(rgb(var(--border) / 0.16) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--border) / 0.16) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 25%, black 30%, transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 60% at 50% 25%, black 30%, transparent 80%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
      </div>

      <div className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-20">
        {/* ---- Hero header ---- */}
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-[0.7rem] uppercase tracking-widest text-primary">
            <PackageSearch className="h-3.5 w-3.5" aria-hidden="true" />
            {t.eyebrow}
          </span>
          <h1 className="mt-5 font-display text-3xl font-700 tracking-tight text-textPrimary text-balance sm:text-4xl lg:text-5xl">
            {t.title}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-textSecondary text-balance">
            {t.subtitle}
          </p>
        </div>

        {/* ---- Search card ---- */}
        <form
          onSubmit={onSubmit}
          noValidate
          className="mt-9 rounded-2xl border border-border bg-surface/70 p-5 shadow-elevated backdrop-blur sm:p-6"
        >
          <label
            htmlFor="track-order-id"
            className="block text-sm font-600 text-textPrimary text-start"
          >
            {t.label}
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <div className="relative flex-1">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 start-3 h-5 w-5 -translate-y-1/2 text-textMuted"
              />
              <input
                id="track-order-id"
                type="text"
                inputMode="text"
                autoComplete="off"
                dir="ltr"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (error) setError(false);
                }}
                placeholder={t.placeholder}
                aria-invalid={error || undefined}
                aria-describedby={error ? "track-order-error" : "track-order-hint"}
                className="w-full rounded-xl border border-border bg-bg/60 py-3 ps-10 pe-3 font-mono text-base md:text-sm tabular-nums text-textPrimary placeholder:text-textMuted/70 transition-colors focus:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-display text-base font-600 text-bg shadow-glow transition-all duration-300 hover:bg-primaryHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-60 motion-safe:active:scale-[0.98]"
            >
              {busy ? (
                <>
                  <Truck
                    aria-hidden="true"
                    className="h-5 w-5 motion-safe:animate-pulse rtl:-scale-x-100"
                  />
                  {t.tracking}
                </>
              ) : (
                <>
                  {t.track}
                  <ArrowRight
                    aria-hidden="true"
                    className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1"
                  />
                </>
              )}
            </button>
          </div>

          {error ? (
            <p
              id="track-order-error"
              role="alert"
              className="mt-2 text-sm text-danger text-start"
            >
              {t.requiredError}
            </p>
          ) : (
            <p
              id="track-order-hint"
              className="mt-2 text-xs text-textMuted text-start"
            >
              {t.emptyHint}
            </p>
          )}
        </form>

        {/* ---- Result ---- */}
        <div aria-live="polite" className="mt-8">
          {showResult && hasStatus ? (
            <section className="rounded-2xl border border-border bg-surface/70 p-5 shadow-elevated backdrop-blur sm:p-6">
              {/* Header: tracked id + note */}
              <div className="mb-5 flex flex-col gap-1 text-start">
                <span className="text-xs font-600 uppercase tracking-wide text-textMuted">
                  {t.resultFor}
                </span>
                <span
                  dir="ltr"
                  className="font-mono text-base font-700 tabular-nums text-textPrimary text-start"
                >
                  {result.found ? result.order.id : value.trim()}
                </span>
                {isFound && (
                  <span className="mt-1 inline-flex items-center gap-1.5 text-sm text-success">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-success motion-safe:animate-ping" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                    </span>
                    {t.foundNote}
                  </span>
                )}
              </div>

              {/* Demo / sample note */}
              {isDemo && (
                <div
                  role="status"
                  className="mb-5 flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-start"
                >
                  <Info
                    className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                    aria-hidden="true"
                  />
                  <p className="text-sm leading-relaxed text-textSecondary">
                    {t.demoNote}
                  </p>
                </div>
              )}

              {/* Timeline */}
              <OrderStatusTimeline status={result.status} />

              {/* Live shipment tracking — only once shipped, with a real number */}
              {showTracking && (
                <div className="mt-6 rounded-xl border border-accent/40 bg-accent/10 p-4 text-start">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-2 text-sm font-600 text-textPrimary">
                      <Truck
                        className="h-4 w-4 text-accent rtl:-scale-x-100"
                        aria-hidden="true"
                      />
                      <span className="uppercase tracking-wide text-xs text-textMuted">
                        {t.trackingNo}
                      </span>
                    </span>
                    <span
                      dir="ltr"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-bg/60 px-2.5 py-1 font-mono text-sm font-700 tracking-wide tabular-nums text-textPrimary ring-1 ring-border"
                    >
                      <Hash className="h-3.5 w-3.5 text-textMuted" aria-hidden="true" />
                      {trackedOrder.trackingNumber}
                    </span>
                    {trackedOrder.courierProvider && (
                      <span className="text-sm text-textSecondary">
                        {t.courier}:{" "}
                        <span dir="ltr" className="font-600 text-textPrimary">
                          {trackedOrder.courierProvider}
                        </span>
                      </span>
                    )}
                  </div>

                  {(trackedOrder.actualDeliveryDate ||
                    trackedOrder.estimatedDeliveryDate) && (
                    <p className="mt-3 inline-flex items-center gap-1.5 text-sm">
                      {trackedOrder.actualDeliveryDate ? (
                        <>
                          <CalendarCheck2
                            className="h-4 w-4 text-success"
                            aria-hidden="true"
                          />
                          <span className="text-textSecondary">
                            {t.deliveredOn}:
                          </span>
                          <span
                            dir="ltr"
                            className="font-600 tabular-nums text-success"
                          >
                            {formatDate(trackedOrder.actualDeliveryDate, lang)}
                          </span>
                        </>
                      ) : (
                        <>
                          <CalendarClock
                            className="h-4 w-4 text-accent"
                            aria-hidden="true"
                          />
                          <span className="text-textSecondary">
                            {t.estDelivery}:
                          </span>
                          <span
                            dir="ltr"
                            className="font-600 tabular-nums text-textPrimary"
                          >
                            {formatDate(trackedOrder.estimatedDeliveryDate, lang)}
                          </span>
                        </>
                      )}
                    </p>
                  )}
                </div>
              )}

              {/* Real-order summary */}
              {isFound && (
                <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5 text-start">
                  <div>
                    <dt className="text-xs font-600 uppercase tracking-wide text-textMuted">
                      {t.items}
                    </dt>
                    <dd className="mt-1 font-mono text-sm tabular-nums text-textPrimary">
                      {(result.order.items || []).reduce(
                        (n, it) => n + (it.qty || 0),
                        0
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-600 uppercase tracking-wide text-textMuted">
                      {t.placed}
                    </dt>
                    <dd
                      dir="ltr"
                      className="mt-1 font-mono text-sm tabular-nums text-textPrimary text-start"
                    >
                      {formatDate(result.order.createdAt, lang)}
                    </dd>
                  </div>
                </dl>
              )}
            </section>
          ) : showResult ? (
            // result present but no status (e.g. empty id edge) -> friendly empty
            <section className="rounded-2xl border border-dashed border-border bg-surface/40 p-8 text-center">
              <PackageX
                className="mx-auto h-10 w-10 text-textMuted"
                aria-hidden="true"
              />
              <h2 className="mt-4 font-display text-lg font-600 text-textPrimary">
                {t.notFoundTitle}
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-textSecondary">
                {t.notFoundBody}
              </p>
            </section>
          ) : null}
        </div>

        {/* ---- Auth-aware footer hint ---- */}
        <p className="mt-8 text-center text-sm text-textSecondary">
          {isAuthed ? (
            <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
              <ListOrdered
                className="h-4 w-4 text-accent"
                aria-hidden="true"
              />
              <span>{t.signedInHint}</span>
              <Link
                to="/account/orders"
                className="font-600 text-primary underline-offset-4 transition-colors hover:text-primaryHover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                {t.allOrdersLink}
              </Link>
            </span>
          ) : (
            <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
              <LogIn className="h-4 w-4 text-accent" aria-hidden="true" />
              <span>{t.signedOutHint}</span>
              <Link
                to="/login"
                state={{ from: { pathname: "/track" } }}
                className="font-600 text-primary underline-offset-4 transition-colors hover:text-primaryHover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                {t.signInLink}
              </Link>
            </span>
          )}
        </p>
      </div>
    </main>
  );
}
