// -----------------------------------------------------------------------------
// AL-MEYAR — AdminOrders (role-protected order book)
//
// A table of useOrders().allOrders (id, date, customer email, item count, total
// via useGeo().format, current status). Each row carries a status control that
// advances Processing -> Shipped -> Delivered by calling useOrders().updateStatus
// — the change reflects in the customer Track Order / OrderDetail (same store).
// Filter by status; sort newest-first by default.
//
// Bilingual: own local STRINGS={en,ar} via useLang().lang. RTL via logical
// utilities; ids/emails/dates/prices kept dir="ltr" mono tabular-nums. a11y.
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronDown,
  Truck,
} from "lucide-react";
import { useOrders } from "../../context/OrdersContext";
import { useLang } from "../../context/LanguageContext";
import { useGeo } from "../../context/GeoContext";
import { ALL_ORDER_STATUSES } from "../../services/ordersService";

// Full lifecycle (in-track + terminal) imported from the service so the admin
// can drive an order through every stage and the off-track terminal states.
const STATUSES = ALL_ORDER_STATUSES;

// Statuses at/after which a tracking number is meaningful (Shipped onward).
const SHIPPED_OR_BEYOND = new Set([
  "Shipped",
  "OutForDelivery",
  "Delivered",
]);

const STRINGS = {
  en: {
    title: "Orders",
    subtitle: "Advance fulfilment status — customers see updates instantly.",
    empty: "No orders yet",
    emptyDesc: "Customer orders will appear here as they come in.",
    noResults: "No orders match this filter.",
    filterAll: "All",
    filterBy: "Filter by status",
    // table headers
    order: "Order",
    date: "Date",
    customer: "Customer",
    items: "Items",
    total: "Total",
    status: "Status",
    itemsCount: (n) => `${n} item${n === 1 ? "" : "s"}`,
    setStatus: "Set status",
    guest: "Guest",
    updating: "Updating…",
    updated: "Status updated.",
    errorGeneric: "Couldn't update the status. Please try again.",
    // tracking
    tracking: "Tracking",
    trackingNumber: "Tracking number",
    courier: "Courier",
    saveTracking: "Save",
    savingTracking: "Saving…",
    trackingSaved: "Tracking saved.",
    trackingError: "Couldn't save tracking. Please try again.",
    noTracking: "No tracking yet.",
    statusLabel: {
      Received: "Received",
      PaymentConfirmed: "Payment confirmed",
      Processing: "Processing",
      Packed: "Packed",
      Shipped: "Shipped",
      OutForDelivery: "Out for delivery",
      Delivered: "Delivered",
      Cancelled: "Cancelled",
      Returned: "Returned",
      Refunded: "Refunded",
    },
  },
  ar: {
    title: "الطلبات",
    subtitle: "حدّث حالة التجهيز — يرى العملاء التحديثات فوراً.",
    empty: "لا توجد طلبات بعد",
    emptyDesc: "ستظهر طلبات العملاء هنا فور ورودها.",
    noResults: "لا توجد طلبات تطابق هذا التصفية.",
    filterAll: "الكل",
    filterBy: "تصفية حسب الحالة",
    order: "الطلب",
    date: "التاريخ",
    customer: "العميل",
    items: "القطع",
    total: "الإجمالي",
    status: "الحالة",
    itemsCount: (n) => `${n} قطعة`,
    setStatus: "تعيين الحالة",
    guest: "زائر",
    updating: "جارٍ التحديث…",
    updated: "تم تحديث الحالة.",
    errorGeneric: "تعذّر تحديث الحالة. حاول مرة أخرى.",
    // tracking
    tracking: "التتبّع",
    trackingNumber: "رقم التتبّع",
    courier: "شركة الشحن",
    saveTracking: "حفظ",
    savingTracking: "جارٍ الحفظ…",
    trackingSaved: "تم حفظ التتبّع.",
    trackingError: "تعذّر حفظ التتبّع. حاول مرة أخرى.",
    noTracking: "لا يوجد تتبّع بعد.",
    statusLabel: {
      Received: "تم الاستلام",
      PaymentConfirmed: "تأكيد الدفع",
      Processing: "قيد التجهيز",
      Packed: "تم التغليف",
      Shipped: "تم الشحن",
      OutForDelivery: "خارج للتوصيل",
      Delivered: "تم التوصيل",
      Cancelled: "ملغي",
      Returned: "مرتجع",
      Refunded: "مسترد",
    },
  },
};

// Tone groups: early stages = warning/accent, shipping = accent,
// delivered = success, cancelled/returned = danger, refunded = warning.
const BADGE_TONE = {
  Received: "bg-warning/15 text-warning",
  PaymentConfirmed: "bg-accent/15 text-accent",
  Processing: "bg-warning/15 text-warning",
  Packed: "bg-accent/15 text-accent",
  Shipped: "bg-accent/15 text-accent",
  OutForDelivery: "bg-accent/15 text-accent",
  Delivered: "bg-success/15 text-success",
  Cancelled: "bg-danger/15 text-danger",
  Returned: "bg-danger/15 text-danger",
  Refunded: "bg-warning/15 text-warning",
};

const DOT_TONE = {
  Received: "bg-warning",
  PaymentConfirmed: "bg-accent",
  Processing: "bg-warning",
  Packed: "bg-accent",
  Shipped: "bg-accent",
  OutForDelivery: "bg-accent",
  Delivered: "bg-success",
  Cancelled: "bg-danger",
  Returned: "bg-danger",
  Refunded: "bg-warning",
};

function formatDate(ms, lang) {
  if (!ms) return "—";
  try {
    return new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(ms));
  } catch {
    return "—";
  }
}

function itemCountOf(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  return items.reduce((sum, it) => sum + (Number(it.qty) || 1), 0);
}

// inline status select per row
function StatusControl({ order, onChange, busy }) {
  const { lang } = useLang();
  const t = STRINGS[lang] || STRINGS.en;
  const current = STATUSES.includes(order.status) ? order.status : "Processing";

  return (
    <div className="relative inline-flex items-center">
      <span
        className={[
          "pointer-events-none absolute start-2 h-2 w-2 rounded-full",
          DOT_TONE[current] || "bg-warning",
        ].join(" ")}
        aria-hidden="true"
      />
      <select
        aria-label={`${t.setStatus} — ${order.id}`}
        value={current}
        disabled={busy}
        onChange={(e) => onChange(order, e.target.value)}
        className="appearance-none rounded-lg border border-border bg-surface ps-6 pe-8 py-1.5 text-base md:text-xs font-semibold text-textPrimary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {t.statusLabel[s]}
          </option>
        ))}
      </select>
      {busy ? (
        <Loader2
          className="pointer-events-none absolute end-2 h-3.5 w-3.5 animate-spin text-textMuted"
          aria-hidden="true"
        />
      ) : (
        <ChevronDown
          className="pointer-events-none absolute end-2 h-3.5 w-3.5 text-textMuted"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const { lang } = useLang();
  const t = STRINGS[lang] || STRINGS.en;
  const s = STATUSES.includes(status) ? status : "Processing";
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        BADGE_TONE[s],
      ].join(" ")}
    >
      {t.statusLabel[s]}
    </span>
  );
}

// Inline tracking editor — a tracking-number input + courier input + Save that
// patches the order via updateTracking. Shows the current value if present and
// reseeds whenever the order's stored tracking changes. Used in both the
// desktop table (compact) and the mobile cards.
function TrackingControl({ order, onSave, compact = false }) {
  const { lang } = useLang();
  const t = STRINGS[lang] || STRINGS.en;
  const [trackingNumber, setTrackingNumber] = useState(
    order.trackingNumber || ""
  );
  const [courier, setCourier] = useState(order.courierProvider || "");
  const [saving, setSaving] = useState(false);

  // Reseed local inputs when the persisted order fields change (e.g. after a
  // successful save elsewhere or a refresh).
  useEffect(() => {
    setTrackingNumber(order.trackingNumber || "");
    setCourier(order.courierProvider || "");
  }, [order.trackingNumber, order.courierProvider]);

  const trimmedTn = trackingNumber.trim();
  const trimmedCourier = courier.trim();
  const dirty =
    trimmedTn !== (order.trackingNumber || "") ||
    trimmedCourier !== (order.courierProvider || "");

  async function handleSave() {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      await onSave(order, {
        trackingNumber: trimmedTn,
        courierProvider: trimmedCourier,
      });
    } finally {
      setSaving(false);
    }
  }

  const tnId = `track-num-${order.id}`;
  const courierId = `track-courier-${order.id}`;

  return (
    <div className={compact ? "" : "mt-2"}>
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-textMuted text-start">
        <Truck className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{t.tracking}</span>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor={tnId} className="sr-only">
            {`${t.trackingNumber} — ${order.id}`}
          </label>
          <input
            id={tnId}
            type="text"
            dir="ltr"
            value={trackingNumber}
            placeholder={t.trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-base md:text-xs font-mono tabular-nums text-textPrimary placeholder:font-sans placeholder:text-textMuted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          />
        </div>
        <div className="min-w-0 sm:w-28">
          <label htmlFor={courierId} className="sr-only">
            {`${t.courier} — ${order.id}`}
          </label>
          <input
            id={courierId}
            type="text"
            value={courier}
            placeholder={t.courier}
            onChange={(e) => setCourier(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-base md:text-xs text-textPrimary placeholder:text-textMuted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          />
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          aria-label={`${t.saveTracking} — ${order.id}`}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : null}
          {saving ? t.savingTracking : t.saveTracking}
        </button>
      </div>
      {!order.trackingNumber && (
        <p className="mt-1 text-[11px] text-textMuted text-start">
          {t.noTracking}
        </p>
      )}
    </div>
  );
}

function Toast({ tone, message }) {
  if (!message) return null;
  const ok = tone === "success";
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 end-5 z-[60] flex max-w-sm items-center gap-2.5 rounded-xl border border-border bg-surfaceElevated px-4 py-3 shadow-elevated"
    >
      {ok ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
      ) : (
        <AlertTriangle className="h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
      )}
      <span className="text-sm font-medium text-textPrimary">{message}</span>
    </div>
  );
}

export default function AdminOrders() {
  const { allOrders, updateStatus, updateTracking } = useOrders();
  const { lang } = useLang();
  const { format } = useGeo();
  const t = STRINGS[lang] || STRINGS.en;

  const [filter, setFilter] = useState("All");
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState({ tone: "success", message: "" });

  const showToast = (tone, message) => {
    setToast({ tone, message });
    // auto-dismiss
    if (typeof window !== "undefined") {
      window.setTimeout(() => setToast((tp) => ({ ...tp, message: "" })), 3200);
    }
  };

  const sorted = useMemo(() => {
    const list = Array.isArray(allOrders) ? [...allOrders] : [];
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return list;
  }, [allOrders]);

  const filtered = useMemo(() => {
    if (filter === "All") return sorted;
    return sorted.filter(
      (o) => (STATUSES.includes(o.status) ? o.status : "Processing") === filter
    );
  }, [sorted, filter]);

  async function handleChange(order, nextStatus) {
    if (nextStatus === order.status) return;
    setBusyId(order.id);
    try {
      await updateStatus(order.id, nextStatus);
      showToast("success", t.updated);
    } catch {
      showToast("error", t.errorGeneric);
    } finally {
      setBusyId(null);
    }
  }

  async function handleSaveTracking(order, fields) {
    try {
      await updateTracking(order.id, fields);
      showToast("success", t.trackingSaved);
    } catch {
      showToast("error", t.trackingError);
    }
  }

  return (
    <section>
      {/* header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-textPrimary text-start">
            {t.title}
          </h1>
          <p className="mt-1 text-sm text-textSecondary text-start">
            {t.subtitle}
          </p>
        </div>

        {/* status filter */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t.filterBy}>
          {["All", ...STATUSES].map((s) => {
            const active = filter === s;
            const label = s === "All" ? t.filterAll : t.statusLabel[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => setFilter(s)}
                aria-pressed={active}
                className={[
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                  active
                    ? "bg-primary/15 text-primary ring-1 ring-primary/40"
                    : "bg-surface text-textSecondary ring-1 ring-border hover:text-textPrimary",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center shadow-sm">
          <span
            className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-surfaceElevated text-textMuted ring-1 ring-border"
            aria-hidden="true"
          >
            <ClipboardList className="h-6 w-6" />
          </span>
          <h2 className="font-display text-lg font-bold text-textPrimary">
            {t.empty}
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-textSecondary">
            {t.emptyDesc}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-textSecondary shadow-sm">
          {t.noResults}
        </p>
      ) : (
        <>
          {/* table (md+) */}
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-surface shadow-sm md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surfaceElevated text-textSecondary">
                  <th className="px-4 py-3 text-start font-semibold">{t.order}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t.date}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t.customer}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t.items}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t.total}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t.status}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => {
                  const email = order.contact?.email || order.userId || "";
                  return (
                    <tr
                      key={order.id}
                      className="border-b border-border last:border-0 transition-colors hover:bg-surfaceElevated/50"
                    >
                      <td className="px-4 py-3">
                        <span
                          dir="ltr"
                          className="font-mono text-xs font-semibold tabular-nums text-textPrimary"
                        >
                          {order.id}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-textSecondary">
                        <span dir="ltr" className="tabular-nums">
                          {formatDate(order.createdAt, lang)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {email ? (
                          <span
                            dir="ltr"
                            className="block max-w-[12rem] truncate font-mono text-xs text-textSecondary text-start"
                            title={email}
                          >
                            {email}
                          </span>
                        ) : (
                          <span className="text-xs text-textMuted">
                            {t.guest}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-textSecondary">
                        {t.itemsCount(itemCountOf(order))}
                      </td>
                      <td className="px-4 py-3 text-end font-semibold text-textPrimary">
                        <span dir="ltr" className="tabular-nums">
                          {format(order.totalUSD || 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <StatusControl
                              order={order}
                              onChange={handleChange}
                              busy={busyId === order.id}
                            />
                          </div>
                          {SHIPPED_OR_BEYOND.has(order.status) && (
                            <div className="min-w-[16rem] max-w-sm">
                              <TrackingControl
                                order={order}
                                onSave={handleSaveTracking}
                                compact
                              />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* cards (mobile) */}
          <div className="grid gap-3 md:hidden">
            {filtered.map((order) => {
              const email = order.contact?.email || order.userId || "";
              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-border bg-surface p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span
                        dir="ltr"
                        className="block truncate font-mono text-sm font-semibold tabular-nums text-textPrimary text-start"
                      >
                        {order.id}
                      </span>
                      <span className="mt-0.5 block text-xs text-textSecondary text-start">
                        <span dir="ltr" className="tabular-nums">
                          {formatDate(order.createdAt, lang)}
                        </span>
                      </span>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>

                  <div className="mt-3 space-y-1 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-textMuted">{t.customer}</span>
                      {email ? (
                        <span
                          dir="ltr"
                          className="max-w-[12rem] truncate font-mono text-textSecondary"
                          title={email}
                        >
                          {email}
                        </span>
                      ) : (
                        <span className="text-textMuted">{t.guest}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-textMuted">{t.items}</span>
                      <span className="text-textSecondary">
                        {t.itemsCount(itemCountOf(order))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-textMuted">{t.total}</span>
                      <span className="font-semibold text-textPrimary">
                        <span dir="ltr" className="tabular-nums">
                          {format(order.totalUSD || 0)}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-border pt-3">
                    <StatusControl
                      order={order}
                      onChange={handleChange}
                      busy={busyId === order.id}
                    />
                    {SHIPPED_OR_BEYOND.has(order.status) && (
                      <TrackingControl
                        order={order}
                        onSave={handleSaveTracking}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <Toast tone={toast.tone} message={toast.message} />
    </section>
  );
}
