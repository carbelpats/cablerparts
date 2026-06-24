// -----------------------------------------------------------------------------
// Caliber Parts — OrderStatusTimeline (presentational)
//
// Renders the FULL dynamic order lifecycle from `status.steps` — one node per
// ORDER_STATUSES stage (7 today: Received -> PaymentConfirmed -> Processing ->
// Packed -> Shipped -> OutForDelivery -> Delivered). It is count-AGNOSTIC: add
// or remove a stage in the service and this tracker follows automatically.
//
//   - md+        HORIZONTAL connected tracker: N evenly-spaced nodes with a
//                success fill bar behind. Labels under each node; short
//                descriptions hidden when `compact` (or on small widths).
//   - mobile     VERTICAL stacked timeline: a start-rail with dots + label +
//                date so all stages stay readable when there are many of them.
//
// A success/primary fill connects completed steps; the current step pulses
// (reduced-motion safe). RTL-aware via logical utilities + mirrored glyphs.
//
// When the order is OFF-TRACK (Cancelled / Returned / Refunded) we replace the
// tracker with a distinct terminal card toned per outcome.
//
// Props (UNCHANGED API):
//   status -> the object returned by useOrders().getOrderStatus(order):
//             { stage, stageIndex, steps:[{key,at,done,current}],
//               delivered, offTrack, terminalStatus, terminalAt,
//               cancelled, cancelledAt }
//   compact -> optional; tighter layout (smaller nodes, hides descriptions),
//              used inside order cards.
//
// Purely presentational — no orders/auth logic. Uses useLang only.
// -----------------------------------------------------------------------------

import {
  ClipboardCheck,
  CreditCard,
  Wrench,
  PackageCheck,
  Truck,
  Navigation,
  CheckCircle2,
  XCircle,
  RotateCcw,
  BadgeDollarSign,
} from "lucide-react";
import { useLang } from "../../context/LanguageContext";

// ---- Per-stage presentation, keyed by ORDER_STATUSES key --------------------
// icon + bilingual label + bilingual short description. `mirror` flags glyphs
// that imply a direction of travel (so they flip under RTL).
const STAGES = {
  Received: {
    Icon: ClipboardCheck,
    label: { en: "Order received", ar: "تم استلام الطلب" },
    desc: { en: "We got your order.", ar: "استلمنا طلبك." },
  },
  PaymentConfirmed: {
    Icon: CreditCard,
    label: { en: "Payment confirmed", ar: "تأكيد الدفع" },
    desc: { en: "Payment verified.", ar: "تم تأكيد الدفع." },
  },
  Processing: {
    Icon: Wrench,
    label: { en: "Processing", ar: "قيد التجهيز" },
    desc: { en: "Preparing your parts.", ar: "نُجهّز قطعك الآن." },
  },
  Packed: {
    Icon: PackageCheck,
    label: { en: "Packed", ar: "تم التغليف" },
    desc: { en: "Boxed and ready to ship.", ar: "تم التغليف والتجهيز للشحن." },
  },
  Shipped: {
    Icon: Truck,
    label: { en: "Shipped", ar: "تم الشحن" },
    desc: { en: "Handed to the courier.", ar: "تم تسليمه للناقل." },
    mirror: true,
  },
  OutForDelivery: {
    Icon: Navigation,
    label: { en: "Out for delivery", ar: "خارج للتوصيل" },
    desc: { en: "On the way to you.", ar: "في الطريق إليك." },
    mirror: true,
  },
  Delivered: {
    Icon: CheckCircle2,
    label: { en: "Delivered", ar: "تم التوصيل" },
    desc: { en: "Enjoy the upgrade.", ar: "استمتع بالترقية." },
  },
};

// ---- Terminal (off-track) presentation, keyed by terminalStatus -------------
const TERMINALS = {
  Cancelled: {
    Icon: XCircle,
    tone: "danger",
    label: { en: "Order cancelled", ar: "تم إلغاء الطلب" },
    desc: { en: "This order has been cancelled.", ar: "تم إلغاء هذا الطلب." },
  },
  Returned: {
    Icon: RotateCcw,
    tone: "danger",
    label: { en: "Order returned", ar: "تم إرجاع الطلب" },
    desc: { en: "This order has been returned.", ar: "تم إرجاع هذا الطلب." },
    mirror: true,
  },
  Refunded: {
    Icon: BadgeDollarSign,
    tone: "warning",
    label: { en: "Amount refunded", ar: "تم استرداد المبلغ" },
    desc: { en: "Your payment has been refunded.", ar: "تم استرداد دفعتك." },
  },
};

const STRINGS = {
  en: { title: "Order status", done: "Done", on: "On" },
  ar: { title: "حالة الطلب", done: "اكتمل", on: "بتاريخ" },
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

// Resolve a step (from status.steps) into its presentation. Falls back to the
// raw key for any stage we don't have art for, so the tracker never breaks.
function present(step, lang) {
  const s = STAGES[step.key];
  const label = s ? s.label[lang] || s.label.en : step.key;
  const desc = s ? s.desc[lang] || s.desc.en : "";
  return {
    Icon: s ? s.Icon : ClipboardCheck,
    label,
    desc,
    mirror: !!(s && s.mirror),
  };
}

export default function OrderStatusTimeline({ status, compact = false }) {
  const { lang } = useLang();
  const t = STRINGS[lang] || STRINGS.en;

  if (!status) return null;

  // ---- Off-track: distinct toned terminal card ------------------------------
  // Prefer the new terminalStatus; fall back to the legacy `cancelled` flag.
  const offTrack = status.offTrack ?? status.cancelled;
  if (offTrack) {
    const key = status.terminalStatus || "Cancelled";
    const term = TERMINALS[key] || TERMINALS.Cancelled;
    const { Icon } = term;
    const at = status.terminalAt ?? status.cancelledAt;
    const isWarning = term.tone === "warning";
    // tone -> token set
    const ring = isWarning ? "border-warning/40" : "border-danger/40";
    const bg = isWarning ? "bg-warning/10" : "bg-danger/10";
    const badge = isWarning
      ? "bg-warning/15 text-warning"
      : "bg-danger/15 text-danger";
    const titleColor = isWarning ? "text-warning" : "text-danger";

    return (
      <section className="w-full" aria-label={t.title} role="group">
        {!compact && (
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-textSecondary text-start">
            {t.title}
          </h3>
        )}
        <div
          className={[
            "flex items-center gap-3 rounded-2xl border",
            ring,
            bg,
            compact ? "px-3 py-2.5" : "px-4 py-4",
          ].join(" ")}
          role="status"
        >
          <span
            className={[
              "grid shrink-0 place-items-center rounded-full",
              badge,
              compact ? "h-9 w-9" : "h-11 w-11",
            ].join(" ")}
            aria-hidden="true"
          >
            <Icon
              className={[
                compact ? "h-5 w-5" : "h-6 w-6",
                term.mirror ? "rtl:-scale-x-100" : "",
              ].join(" ")}
            />
          </span>
          <div className="min-w-0 text-start">
            <p className={["text-sm font-semibold", titleColor].join(" ")}>
              {term.label[lang] || term.label.en}
            </p>
            {!compact && (
              <p className="mt-0.5 text-xs text-textSecondary">
                {term.desc[lang] || term.desc.en}
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

  // ---- Active lifecycle tracker (dynamic length) ----------------------------
  const steps = Array.isArray(status.steps) ? status.steps : [];
  if (steps.length === 0) return null;

  const lastIndex = steps.length - 1;
  // Drive the connecting fill: index of the furthest reached (done/current) node.
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

      {/* ---- HORIZONTAL tracker (md+) ---- */}
      <ol className="relative hidden items-start justify-between gap-1 md:flex">
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
          const { Icon, label, desc, mirror } = present(step, lang);
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
                    mirror ? "rtl:-scale-x-100" : "",
                  ].join(" ")}
                  aria-hidden="true"
                />
              </span>

              {/* label */}
              <span
                className={[
                  "mt-2 text-[11px] font-semibold leading-tight lg:text-xs",
                  reached ? "text-textPrimary" : "text-textMuted",
                ].join(" ")}
              >
                {label}
              </span>

              {!compact && (
                <>
                  <span className="mt-0.5 hidden max-w-[14ch] text-[11px] leading-snug text-textMuted lg:block">
                    {desc}
                  </span>
                  {step.at ? (
                    <span className="mt-1 text-[10px] text-textSecondary lg:text-[11px]">
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

      {/* ---- VERTICAL timeline (mobile) ---- */}
      <ol className="relative md:hidden">
        {steps.map((step, i) => {
          const { Icon, label, desc, mirror } = present(step, lang);
          const reached = step.done || step.current;
          const isCurrent = step.current;
          const isLast = i === lastIndex;
          // The rail segment below this node is "filled" once we've reached the
          // NEXT node (i.e. this node is done).
          const segmentFilled = step.done;
          return (
            <li
              key={step.key}
              className="relative flex gap-3 pb-4 last:pb-0"
              aria-current={isCurrent ? "step" : undefined}
            >
              {/* start rail + node */}
              <div className="relative flex shrink-0 flex-col items-center">
                {/* connecting segment to the next node */}
                {!isLast && (
                  <span
                    className={[
                      "absolute top-9 h-[calc(100%-1.25rem)] w-0.5 rounded-full",
                      segmentFilled ? "bg-success" : "bg-border",
                    ].join(" ")}
                    aria-hidden="true"
                  />
                )}
                <span
                  className={[
                    "relative z-10 grid h-9 w-9 place-items-center rounded-full border-2 transition-colors",
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
                      "relative h-4 w-4",
                      mirror ? "rtl:-scale-x-100" : "",
                    ].join(" ")}
                    aria-hidden="true"
                  />
                </span>
              </div>

              {/* label + (date / desc) */}
              <div className="min-w-0 flex-1 pt-1 text-start">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={[
                      "text-sm font-semibold",
                      reached ? "text-textPrimary" : "text-textMuted",
                    ].join(" ")}
                  >
                    {label}
                  </span>
                  {step.at ? (
                    <span className="shrink-0 text-[11px] text-textSecondary">
                      <span dir="ltr" className="font-mono tabular-nums">
                        {formatDate(step.at, lang)}
                      </span>
                    </span>
                  ) : null}
                </div>
                {!compact && desc ? (
                  <p className="mt-0.5 text-xs leading-snug text-textMuted">
                    {desc}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
