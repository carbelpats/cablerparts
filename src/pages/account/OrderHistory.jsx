// -----------------------------------------------------------------------------
// AL-MEYAR — OrderHistory (protected sub-page)
//
// Lists useOrders().orders (current user, newest first) as cards, each linking
// to /account/orders/:id. A card shows: the order id (mono, dir=ltr), the date,
// up to a few item thumbnails via <PartIcon>, the item count, the total via
// useGeo().format, and a localized status badge derived from getOrderStatus.
//
// Orders are split across three TABS — Active (any non-terminal stage still in
// flight: Received..OutForDelivery), Completed (Delivered), and Closed (the
// terminal off-track states: Cancelled/Returned/Refunded). Buckets are derived
// from getOrderStatus(order).delivered / .offTrack — NOT hardcoded status
// strings — each showing a live count, filtering the list to that bucket, and
// rendering its own empty state. The global "no orders yet" state still offers a
// "Start shopping" link to "/".
//
// Bilingual: own local STRINGS={en,ar} via useLang().lang. RTL via logical
// utilities; ids/dates/prices kept dir="ltr" mono tabular-nums. Mirror chevrons.
// -----------------------------------------------------------------------------

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Package, ChevronRight, ShoppingBag } from "lucide-react";
import { useOrders } from "../../context/OrdersContext";
import { useLang } from "../../context/LanguageContext";
import { useGeo } from "../../context/GeoContext";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import { PartIcon, ACCENT_GRADIENT } from "../../lib/partIcons";

const STRINGS = {
  en: {
    title: "Your orders",
    subtitle: "Track and revisit every part you've ordered.",
    empty: "No orders yet",
    emptyDesc: "When you place an order it'll show up here with live tracking.",
    startShopping: "Start shopping",
    items: (n) => `${n} item${n === 1 ? "" : "s"}`,
    total: "Total",
    viewOrder: "View order",
    status: {
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
    tabs: {
      active: "Active",
      completed: "Completed",
      closed: "Closed",
    },
    tabEmpty: {
      active: "No active orders",
      activeDesc: "Orders that are processing or on the way will appear here.",
      completed: "No completed orders",
      completedDesc: "Delivered orders will be collected here.",
      closed: "No closed orders",
      closedDesc: "Cancelled, returned, or refunded orders will be listed here.",
    },
  },
  ar: {
    title: "طلباتك",
    subtitle: "تابِع وراجِع كل قطعة طلبتها.",
    empty: "لا توجد طلبات بعد",
    emptyDesc: "عند إتمام طلب سيظهر هنا مع تتبّع مباشر.",
    startShopping: "ابدأ التسوّق",
    items: (n) => `${n} قطعة`,
    total: "الإجمالي",
    viewOrder: "عرض الطلب",
    status: {
      Received: "تم الاستلام",
      PaymentConfirmed: "تم تأكيد الدفع",
      Processing: "قيد التجهيز",
      Packed: "تم التغليف",
      Shipped: "تم الشحن",
      OutForDelivery: "قيد التوصيل",
      Delivered: "تم التوصيل",
      Cancelled: "أُلغي",
      Returned: "مُرتجَع",
      Refunded: "مُستردّ",
    },
    tabs: {
      active: "قيد التنفيذ",
      completed: "مكتملة",
      closed: "منتهية",
    },
    tabEmpty: {
      active: "لا توجد طلبات قيد التنفيذ",
      activeDesc: "ستظهر هنا الطلبات قيد التجهيز أو في الطريق إليك.",
      completed: "لا توجد طلبات مكتملة",
      completedDesc: "سيتم تجميع الطلبات التي تم توصيلها هنا.",
      closed: "لا توجد طلبات منتهية",
      closedDesc: "ستُدرج هنا الطلبات الملغاة أو المرتجعة أو المستردّة.",
    },
  },
};

// Badge tone per derived stage. Early linear stages read as "warning" (in
// progress), shipping stages as "accent" (in motion), Delivered as "success",
// and every terminal off-track state as "danger". Falls back to warning.
const BADGE_TONE = {
  Received: "bg-warning/15 text-warning",
  PaymentConfirmed: "bg-warning/15 text-warning",
  Processing: "bg-warning/15 text-warning",
  Packed: "bg-accent/15 text-accent",
  Shipped: "bg-accent/15 text-accent",
  OutForDelivery: "bg-accent/15 text-accent",
  Delivered: "bg-success/15 text-success",
  Cancelled: "bg-danger/15 text-danger",
  Returned: "bg-danger/15 text-danger",
  Refunded: "bg-danger/15 text-danger",
};

const TAB_KEYS = ["active", "completed", "closed"];

// Bucket an order's derived status object into one of the three tabs WITHOUT
// hardcoding status strings: delivered -> completed, terminal off-track
// (Cancelled/Returned/Refunded) -> closed, anything else still in the linear
// flow (Received..OutForDelivery) -> active.
function tabForStatus(status) {
  if (status?.delivered) return "completed";
  if (status?.offTrack) return "closed";
  return "active";
}

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

function StatusBadge({ stage, label }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        BADGE_TONE[stage] || BADGE_TONE.Processing,
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function OrderCard({ order }) {
  const { getOrderStatus } = useOrders();
  const { lang } = useLang();
  const { format } = useGeo();
  const t = STRINGS[lang] || STRINGS.en;

  const status = getOrderStatus(order);
  const items = Array.isArray(order.items) ? order.items : [];
  const itemCount = items.reduce((sum, it) => sum + (it.qty || 1), 0);
  const thumbs = items.slice(0, 4);
  const extra = items.length - thumbs.length;

  return (
    <Link
      to={`/account/orders/${order.id}`}
      aria-label={`${t.viewOrder} ${order.id}`}
      className="group block rounded-2xl border border-border bg-surface p-4 shadow-sm transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            dir="ltr"
            className="truncate font-mono text-sm font-semibold tabular-nums text-textPrimary text-start"
          >
            {order.id}
          </p>
          <p className="mt-0.5 text-xs text-textSecondary text-start">
            <span dir="ltr" className="tabular-nums">
              {formatDate(order.createdAt, lang)}
            </span>
          </p>
        </div>
        <StatusBadge stage={status.stage} label={t.status[status.stage]} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        {/* item thumbnails */}
        <div className="flex items-center">
          {thumbs.map((it, i) => (
            <span
              key={`${it.id}-${i}`}
              className={[
                "grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ring-1 ring-border",
                i > 0 ? "-ms-2" : "",
                ACCENT_GRADIENT[it.accent] || ACCENT_GRADIENT.primary,
              ].join(" ")}
              aria-hidden="true"
            >
              <PartIcon icon={it.icon} className="h-6 w-6" />
            </span>
          ))}
          {extra > 0 && (
            <span
              className="-ms-2 grid h-10 w-10 place-items-center rounded-xl bg-surfaceElevated text-xs font-semibold text-textSecondary ring-1 ring-border"
              aria-hidden="true"
            >
              +{extra}
            </span>
          )}
        </div>

        <div className="text-end">
          <p className="text-xs text-textSecondary">{t.items(itemCount)}</p>
          <p className="font-semibold text-textPrimary">
            <span dir="ltr" className="tabular-nums">
              {format(order.totalUSD)}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end border-t border-border pt-3 text-xs font-semibold text-primary">
        {t.viewOrder}
        <ChevronRight
          className="ms-1 h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}

function TabEmptyState({ tab, t }) {
  return (
    <section className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center shadow-sm">
      <span
        className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-surfaceElevated text-textMuted ring-1 ring-border"
        aria-hidden="true"
      >
        <Package className="h-5 w-5" />
      </span>
      <h3 className="font-display text-base font-bold text-textPrimary">
        {t.tabEmpty[tab]}
      </h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-textSecondary">
        {t.tabEmpty[`${tab}Desc`]}
      </p>
    </section>
  );
}

export default function OrderHistory() {
  const { orders, getOrderStatus } = useOrders();
  const { lang } = useLang();
  const t = STRINGS[lang] || STRINGS.en;

  useDocumentMeta({ title: t.title });

  const [activeTab, setActiveTab] = useState("active");

  // Group orders by tab once (orders are already newest-first from the service).
  const grouped = useMemo(() => {
    const buckets = { active: [], completed: [], closed: [] };
    for (const order of orders) {
      const status = getOrderStatus(order);
      buckets[tabForStatus(status)].push(order);
    }
    return buckets;
  }, [orders, getOrderStatus]);

  if (!orders.length) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-10 text-center shadow-sm">
        <span
          className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-surfaceElevated text-textMuted ring-1 ring-border"
          aria-hidden="true"
        >
          <Package className="h-6 w-6" />
        </span>
        <h2 className="font-display text-lg font-bold text-textPrimary">
          {t.empty}
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-textSecondary">
          {t.emptyDesc}
        </p>
        <Link
          to="/"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          {t.startShopping}
        </Link>
      </section>
    );
  }

  const current = grouped[activeTab] || [];

  return (
    <div className="space-y-4">
      <header>
        <h2 className="font-display text-xl font-bold text-textPrimary text-start">
          {t.title}
        </h2>
        <p className="mt-1 text-sm text-textSecondary text-start">
          {t.subtitle}
        </p>
      </header>

      {/* tabs */}
      <div
        role="tablist"
        aria-label={t.title}
        className="-mx-1 flex items-center gap-1 overflow-x-auto scrollbar-hide px-1 pb-1"
      >
        {TAB_KEYS.map((tab) => {
          const selected = activeTab === tab;
          const count = (grouped[tab] || []).length;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveTab(tab)}
              className={[
                "inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "bg-primary text-white shadow-sm"
                  : "bg-surface text-textSecondary ring-1 ring-border hover:text-textPrimary",
              ].join(" ")}
            >
              <span>{t.tabs[tab]}</span>
              <span
                className={[
                  "inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums",
                  selected
                    ? "bg-white/20 text-white"
                    : "bg-surfaceElevated text-textSecondary",
                ].join(" ")}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {current.length === 0 ? (
        <TabEmptyState tab={activeTab} t={t} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {current.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
