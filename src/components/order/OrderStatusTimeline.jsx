// -----------------------------------------------------------------------------
// AL-MEYAR — OrderStatusTimeline (presentational)
//
// A clear 3-STEP visual tracker:  Order Placed -> Processing -> Delivered.
//   step 1  Order Placed  = ALWAYS complete (at order.createdAt)
//   step 2  Processing    = complete once Shipped/Delivered; current while
//                           Processing/Shipped
//   step 3  Delivered     = complete only when Delivered
// A success/primary fill connects completed steps; the current step pulses
// (reduced-motion safe). RTL-aware via logical utilities + mirrored glyphs.
//
// When the order is CANCELLED, the progress dots are replaced by a distinct,
// danger-toned terminal state.
//
// Props:
//   status -> the object returned by useOrders().getOrderStatus(order):
//             { stage, stageIndex, steps:[{key,at,done,current}],
//               delivered, cancelled, cancelledAt }
//   compact -> optional; tighter layout (smaller nodes, hides descriptions)
//
// Purely presentational — no orders/auth logic. Uses useLang only for labels
// and direction.
// -----------------------------------------------------------------------------

import { ClipboardCheck, Package, CheckCircle2, XCircle } from "lucide-react";
import { useLang } from "../../context/LanguageContext";

const STRINGS = {
  en: {
    title: "Order status",
    placed: "Order Placed",
    processing: "Processing",
    delivered: "Delivered",
    placedDesc: "We received your order.",
    processingDesc: "We're preparing your parts.",
    deliveredDesc: "Delivered. Enjoy the upgrade.",
    cancelled: "Order Cancelled",
    cancelledDesc: "This order has been cancelled.",
    done: "Done",
    on: "On",
  },
  ar: {
    title: "حالة الطلب",
    placed: "تم استلام الطلب",
    processing: "قيد التجهيز",
    delivered: "تم التوصيل",
    placedDesc: "استلمنا طلبك.",
    processingDesc: "نُجهّز قطعك الآن.",
    deliveredDesc: "تم التوصيل. استمتع بالترقية.",
    cancelled: "تم إلغاء الطلب",
    cancelledDesc: "تم إلغاء هذا الطلب.",
    done: "اكتمل",
    on: "بتاريخ",
  },
};

function formatDate(ms, lang) {
  if (!ms) return "";
  try {
    return new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en", {
      month: "short",
      day: "numeric",
    }).format(new Date(ms));
  } catch {
    return "";
  }
}

// Map the linear order status into the fixed 3-step tracker model.
function buildTrackerSteps(status, t) {
  const linear = Array.isArray(status?.steps) ? status.steps : [];
  const byKey = (k) => linear.find((s) => s.key === k) || {};
  const processing = byKey("Processing");
  const shipped = byKey("Shipped");
  const delivered = byKey("Delivered");

  const isDelivered = !!status?.delivered;
  // "Processing" tracker step is complete once the order has been Shipped or
  // Delivered (i.e. moved past Processing).
  const processingDone = isDelivered || !!shipped.done || !!shipped.current;
  // current Processing tracker step = order is Processing or Shipped but not yet
  // Delivered.
  const processingCurrent = !isDelivered;

  return [
    {
      key: "placed",
      Icon: ClipboardCheck,
      label: t.placed,
      desc: t.placedDesc,
      at: processing.at ?? null, // Processing.at falls back to createdAt
      done: true,
      current: false,
      mirror: false,
    },
    {
      key: "processing",
      Icon: Package,
      label: t.processing,
      desc: t.processingDesc,
      at: shipped.at ?? processing.at ?? null,
      done: processingDone,
      current: processingCurrent,
      mirror: false,
    },
    {
      key: "delivered",
      Icon: CheckCircle2,
      label: t.delivered,
      desc: t.deliveredDesc,
      at: delivered.at ?? null,
      done: isDelivered,
      current: false,
      mirror: false,
    },
  ];
}

export default function OrderStatusTimeline({ status, compact = false }) {
  const { lang } = useLang();
  const t = STRINGS[lang] || STRINGS.en;

  if (!status) return null;

  // ---- Cancelled: distinct danger-toned terminal state ----------------------
  if (status.cancelled) {
    const at = status.cancelledAt;
    return (
      <section className="w-full" aria-label={t.title} role="group">
        {!compact && (
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-textSecondary text-start">
            {t.title}
          </h3>
        )}
        <div
          className={[
            "flex items-center gap-3 rounded-2xl border border-danger/40 bg-danger/10",
            compact ? "px-3 py-2.5" : "px-4 py-4",
          ].join(" ")}
          role="status"
        >
          <span
            className={[
              "grid shrink-0 place-items-center rounded-full bg-danger/15 text-danger",
              compact ? "h-9 w-9" : "h-11 w-11",
            ].join(" ")}
            aria-hidden="true"
          >
            <XCircle className={compact ? "h-5 w-5" : "h-6 w-6"} />
          </span>
          <div className="min-w-0 text-start">
            <p className="text-sm font-semibold text-danger">{t.cancelled}</p>
            {!compact && (
              <p className="mt-0.5 text-xs text-textSecondary">
                {t.cancelledDesc}
                {at ? (
                  <>
                    {" · "}
                    <span dir="ltr" className="font-mono tabular-nums">
                      {formatDate(at, lang)}
                    </span>
                  </>
                ) : null}
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

  // ---- Active 3-step tracker -------------------------------------------------
  const steps = buildTrackerSteps(status, t);
  const lastIndex = steps.length - 1;
  // count fully-completed steps to drive the connecting fill (0..100%)
  const reachedIndex = steps.reduce(
    (acc, s, i) => (s.done || s.current ? i : acc),
    0
  );
  const fillPct =
    lastIndex <= 0 ? 0 : Math.min(100, (reachedIndex / lastIndex) * 100);

  return (
    <section className="w-full" aria-label={t.title} role="group">
      {!compact && (
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-textSecondary text-start">
          {t.title}
        </h3>
      )}

      <ol className="relative flex items-start justify-between gap-2">
        {/* connecting track (background) — sits behind the nodes */}
        <div
          className="pointer-events-none absolute top-5 start-0 end-0 z-0 h-1 rounded-full bg-border"
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full bg-success transition-[width] duration-500 motion-reduce:transition-none"
            style={{ width: `${fillPct}%` }}
          />
        </div>

        {steps.map((step) => {
          const { Icon } = step;
          const reached = step.done || step.current;
          const isCurrent = step.current;
          return (
            <li
              key={step.key}
              className="relative z-10 flex min-w-0 flex-1 flex-col items-center text-center"
              aria-current={isCurrent ? "step" : undefined}
            >
              {/* node */}
              <span
                className={[
                  "relative grid place-items-center rounded-full border-2 transition-colors",
                  compact ? "h-9 w-9" : "h-10 w-10",
                  step.done
                    ? "border-success bg-success/15 text-success"
                    : isCurrent
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-surface text-textMuted",
                ].join(" ")}
              >
                {isCurrent && (
                  <span
                    className="absolute inset-0 rounded-full bg-primary/30 motion-safe:animate-ping motion-reduce:hidden"
                    aria-hidden="true"
                  />
                )}
                <Icon
                  className={[
                    compact ? "h-4 w-4" : "h-5 w-5",
                    "relative",
                    step.mirror ? "rtl:-scale-x-100" : "",
                  ].join(" ")}
                  aria-hidden="true"
                />
              </span>

              {/* label */}
              <span
                className={[
                  "mt-2 text-xs font-semibold sm:text-sm",
                  reached ? "text-textPrimary" : "text-textMuted",
                ].join(" ")}
              >
                {step.label}
              </span>

              {!compact && (
                <>
                  <span className="mt-0.5 hidden max-w-[16ch] text-[11px] leading-snug text-textMuted sm:block">
                    {step.desc}
                  </span>
                  {step.at ? (
                    <span className="mt-1 text-[11px] text-textSecondary">
                      {step.done ? `${t.done} · ` : `${t.on} · `}
                      <span dir="ltr" className="font-mono tabular-nums">
                        {formatDate(step.at, lang)}
                      </span>
                    </span>
                  ) : null}
                </>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
