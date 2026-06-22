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

import { useMemo, useState } from "react";
import {
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { useOrders } from "../../context/OrdersContext";
import { useLang } from "../../context/LanguageContext";
import { useGeo } from "../../context/GeoContext";

const STATUSES = ["Processing", "Shipped", "Delivered", "Cancelled"];

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
    statusLabel: {
      Processing: "Processing",
      Shipped: "Shipped",
      Delivered: "Delivered",
      Cancelled: "Cancelled",
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
    statusLabel: {
      Processing: "قيد التجهيز",
      Shipped: "تم الشحن",
      Delivered: "تم التوصيل",
      Cancelled: "ملغي",
    },
  },
};

const BADGE_TONE = {
  Processing: "bg-warning/15 text-warning",
  Shipped: "bg-accent/15 text-accent",
  Delivered: "bg-success/15 text-success",
  Cancelled: "bg-danger/15 text-danger",
};

const DOT_TONE = {
  Processing: "bg-warning",
  Shipped: "bg-accent",
  Delivered: "bg-success",
  Cancelled: "bg-danger",
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
  const { allOrders, updateStatus } = useOrders();
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
                        <div className="flex items-center gap-2">
                          <StatusControl
                            order={order}
                            onChange={handleChange}
                            busy={busyId === order.id}
                          />
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
