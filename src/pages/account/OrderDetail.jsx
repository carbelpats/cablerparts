// -----------------------------------------------------------------------------
// AL-MEYAR — OrderDetail (protected sub-page)
//
// Reads useParams().orderId -> useOrders().getOrder(orderId). If null, shows a
// friendly not-found with a back link. Otherwise renders:
//   - <OrderStatusTimeline status={getOrderStatus(order)} /> (full 7-stage life-
//     cycle, handled by the timeline component)
//   - the line items (PartIcon, name by lang, qty, line total)
//   - the totals breakdown (subtotal / discount / shipping / total via useGeo)
//   - a SHIPPING & TRACKING block: localized shipping method, courier, tracking
//     number (dir=ltr mono) + estimated/actual delivery date — or a subtle hint
//     that the tracking number appears after the order ships
//   - shipping address + contact summary
//   - a back link to /account/orders
//
// Bilingual: own local STRINGS={en,ar} via useLang().lang. RTL via logical
// utilities; ids/prices/email/phone kept dir="ltr" mono tabular-nums. Mirror
// the back chevron.
// -----------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ChevronLeft,
  PackageX,
  MapPin,
  UserRound,
  Mail,
  Phone,
  Loader2,
  Truck,
  Hash,
  CalendarClock,
  CalendarCheck2,
} from "lucide-react";
import { useOrders } from "../../context/OrdersContext";
import { useLang } from "../../context/LanguageContext";
import { useGeo } from "../../context/GeoContext";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";
import { PartIcon, ACCENT_GRADIENT } from "../../lib/partIcons";
import { getShippingMethod } from "../../services/shippingService";
import OrderStatusTimeline from "../../components/order/OrderStatusTimeline";

const STRINGS = {
  en: {
    back: "Back to orders",
    notFound: "Order not found",
    notFoundDesc:
      "We couldn't find that order on your account. It may belong to a different account.",
    orderId: "Order",
    placed: "Placed",
    terminalBadge: {
      Cancelled: "Cancelled",
      Returned: "Returned",
      Refunded: "Refunded",
    },
    items: "Items",
    qty: "Qty",
    subtotal: "Subtotal",
    discount: "Discount",
    shipping: "Shipping",
    free: "Free",
    total: "Total",
    shippingTo: "Shipping to",
    contact: "Contact",
    // shipping & tracking
    tracking: "Shipping & tracking",
    method: "Shipping method",
    courier: "Courier",
    trackingNo: "Tracking number",
    trackingPending: "Tracking number appears after shipping.",
    estDelivery: "Estimated delivery",
    deliveredOn: "Delivered on",
  },
  ar: {
    back: "العودة إلى الطلبات",
    notFound: "الطلب غير موجود",
    notFoundDesc:
      "تعذّر العثور على هذا الطلب في حسابك. قد يعود إلى حساب آخر.",
    orderId: "الطلب",
    placed: "تاريخ الطلب",
    terminalBadge: {
      Cancelled: "أُلغي",
      Returned: "مُرتجَع",
      Refunded: "مُستردّ",
    },
    items: "القطع",
    qty: "الكمية",
    subtotal: "المجموع الفرعي",
    discount: "الخصم",
    shipping: "الشحن",
    free: "مجاني",
    total: "الإجمالي",
    shippingTo: "الشحن إلى",
    contact: "بيانات التواصل",
    // shipping & tracking
    tracking: "الشحن والتتبّع",
    method: "طريقة الشحن",
    courier: "شركة الشحن",
    trackingNo: "رقم التتبّع",
    trackingPending: "سيظهر رقم التتبّع بعد الشحن.",
    estDelivery: "موعد التوصيل المتوقّع",
    deliveredOn: "تم التوصيل في",
  },
};

function formatDate(ms, lang) {
  if (!ms) return "";
  try {
    return new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(ms));
  } catch {
    return "";
  }
}

// Date-only formatter for delivery dates (no time component).
function formatDeliveryDate(ms, lang) {
  if (!ms) return "";
  try {
    return new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(ms));
  } catch {
    return "";
  }
}

function regionLabel(code) {
  return code || "";
}

export default function OrderDetail() {
  const { orderId } = useParams();
  const { getOrder, getOrderStatus, orders } = useOrders();
  const { lang } = useLang();
  const { format } = useGeo();

  const t = STRINGS[lang] || STRINGS.en;

  // getOrder may return a resolved order (just-placed, already in memory) OR a
  // Promise (cold deep-link / refresh before the user's orders have loaded) —
  // resolve uniformly. Re-runs when the id changes or the orders list hydrates.
  const [order, setOrder] = useState(null);
  const [resolving, setResolving] = useState(true);
  useEffect(() => {
    let live = true;
    setResolving(true);
    Promise.resolve(getOrder(orderId))
      .then((o) => {
        if (live) {
          setOrder(o || null);
          setResolving(false);
        }
      })
      .catch(() => {
        if (live) {
          setOrder(null);
          setResolving(false);
        }
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, orders]);

  useDocumentMeta({
    title: `${t.orderId} ${order?.id || orderId || ""}`.trim(),
  });

  const BackLink = (
    <Link
      to="/account/orders"
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-textSecondary transition-colors hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
    >
      <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
      {t.back}
    </Link>
  );

  if (resolving) {
    return (
      <div className="space-y-5">
        {BackLink}
        <section className="grid place-items-center rounded-2xl border border-border bg-surface p-16 shadow-sm">
          <Loader2
            className="h-6 w-6 animate-spin text-primary motion-reduce:animate-none"
            aria-hidden="true"
          />
        </section>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-5">
        {BackLink}
        <section className="rounded-2xl border border-border bg-surface p-10 text-center shadow-sm">
          <span
            className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-surfaceElevated text-textMuted ring-1 ring-border"
            aria-hidden="true"
          >
            <PackageX className="h-6 w-6" />
          </span>
          <h2 className="font-display text-lg font-bold text-textPrimary">
            {t.notFound}
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-textSecondary">
            {t.notFoundDesc}
          </p>
        </section>
      </div>
    );
  }

  const status = getOrderStatus(order);
  const items = Array.isArray(order.items) ? order.items : [];
  const shippingFree = !order.shippingUSD || order.shippingUSD <= 0;

  // ---- Shipping & tracking (any of these may be null) ----------------------
  const methodId = order.shippingMethod;
  // Localized method name when the id is known; otherwise show the raw id.
  const methodName = methodId
    ? getShippingMethod(methodId).name?.[lang] || methodId
    : null;
  const courier = order.courierProvider || null;
  const trackingNumber = order.trackingNumber || null;
  const estDelivery = order.estimatedDeliveryDate || null;
  const actualDelivery = order.actualDeliveryDate || null;
  // Render the block whenever there's anything shipping-related to show.
  const hasShippingInfo =
    !!(methodName || courier || trackingNumber || estDelivery || actualDelivery);

  return (
    <div className="space-y-6">
      {BackLink}

      {/* header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-textMuted text-start">
            {t.orderId}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <h1
              dir="ltr"
              className="font-mono text-xl font-bold tabular-nums text-textPrimary text-start"
            >
              {order.id}
            </h1>
            {status.offTrack && (
              <span className="inline-flex items-center rounded-full bg-danger/15 px-2.5 py-0.5 text-xs font-semibold text-danger">
                {t.terminalBadge[status.terminalStatus] || status.terminalStatus}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-textSecondary text-start">
            {t.placed}:{" "}
            <span dir="ltr" className="tabular-nums">
              {formatDate(order.createdAt, lang)}
            </span>
          </p>
        </div>
      </header>

      {/* status tracker — prominently at the top (handles cancelled too) */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <OrderStatusTimeline status={status} />
      </section>

      {/* line items */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 font-display text-lg font-bold text-textPrimary text-start">
          {t.items}
        </h2>
        <ul className="divide-y divide-border">
          {items.map((it, i) => {
            const qty = it.qty || 1;
            const name = lang === "ar" && it.nameAr ? it.nameAr : it.name;
            const lineTotal = (it.priceUSD || 0) * qty;
            return (
              <li
                key={`${it.id}-${i}`}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span
                  className={[
                    "grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br ring-1 ring-border",
                    ACCENT_GRADIENT[it.accent] || ACCENT_GRADIENT.primary,
                  ].join(" ")}
                  aria-hidden="true"
                >
                  <PartIcon icon={it.icon} className="h-7 w-7" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-textPrimary text-start">
                    {name}
                  </p>
                  {it.brand && (
                    <p
                      dir="ltr"
                      className="truncate text-xs text-textSecondary text-start"
                    >
                      {it.brand}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-textMuted text-start">
                    {t.qty}:{" "}
                    <span dir="ltr" className="tabular-nums">
                      {qty}
                    </span>
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-textPrimary">
                  <span dir="ltr" className="tabular-nums">
                    {format(lineTotal)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>

        {/* totals */}
        <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-textSecondary">{t.subtotal}</dt>
            <dd className="text-textPrimary">
              <span dir="ltr" className="tabular-nums">
                {format(order.subtotalUSD)}
              </span>
            </dd>
          </div>
          {order.discountUSD > 0 && (
            <div className="flex items-center justify-between">
              <dt className="text-textSecondary">{t.discount}</dt>
              <dd className="text-success">
                −
                <span dir="ltr" className="tabular-nums">
                  {format(order.discountUSD)}
                </span>
              </dd>
            </div>
          )}
          <div className="flex items-center justify-between">
            <dt className="text-textSecondary">{t.shipping}</dt>
            <dd className={shippingFree ? "text-success" : "text-textPrimary"}>
              {shippingFree ? (
                t.free
              ) : (
                <span dir="ltr" className="tabular-nums">
                  {format(order.shippingUSD)}
                </span>
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold">
            <dt className="text-textPrimary">{t.total}</dt>
            <dd className="text-primary">
              <span dir="ltr" className="tabular-nums">
                {format(order.totalUSD)}
              </span>
            </dd>
          </div>
        </dl>
      </section>

      {/* shipping & tracking */}
      {hasShippingInfo && (
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 inline-flex items-center gap-2 font-display text-lg font-bold text-textPrimary text-start">
            <Truck
              className="h-5 w-5 text-textMuted rtl:-scale-x-100"
              aria-hidden="true"
            />
            {t.tracking}
          </h2>

          <dl className="grid gap-4 sm:grid-cols-2">
            {methodName && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-textMuted text-start">
                  {t.method}
                </dt>
                <dd className="mt-1 text-sm font-semibold text-textPrimary text-start">
                  {methodName}
                </dd>
              </div>
            )}

            {courier && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-textMuted text-start">
                  {t.courier}
                </dt>
                <dd className="mt-1 text-sm font-semibold text-textPrimary text-start">
                  <span dir="ltr">{courier}</span>
                </dd>
              </div>
            )}

            <div className="sm:col-span-2">
              <dt className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-textMuted text-start">
                <Hash className="h-3.5 w-3.5" aria-hidden="true" />
                {t.trackingNo}
              </dt>
              {trackingNumber ? (
                <dd className="mt-1">
                  <span
                    dir="ltr"
                    className="inline-flex items-center rounded-lg bg-surfaceElevated px-2.5 py-1 font-mono text-sm font-semibold tracking-wide tabular-nums text-textPrimary ring-1 ring-border"
                  >
                    {trackingNumber}
                  </span>
                </dd>
              ) : (
                <dd className="mt-1 text-sm text-textMuted text-start">
                  {t.trackingPending}
                </dd>
              )}
            </div>

            {estDelivery && (
              <div>
                <dt className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-textMuted text-start">
                  <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.estDelivery}
                </dt>
                <dd className="mt-1 text-sm font-semibold text-textPrimary text-start">
                  <span dir="ltr" className="tabular-nums">
                    {formatDeliveryDate(estDelivery, lang)}
                  </span>
                </dd>
              </div>
            )}

            {actualDelivery && (
              <div>
                <dt className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-success text-start">
                  <CalendarCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.deliveredOn}
                </dt>
                <dd className="mt-1 text-sm font-semibold text-success text-start">
                  <span dir="ltr" className="tabular-nums">
                    {formatDeliveryDate(actualDelivery, lang)}
                  </span>
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {/* shipping + contact */}
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <h2 className="mb-3 inline-flex items-center gap-2 font-display text-base font-bold text-textPrimary">
            <MapPin className="h-4 w-4 text-textMuted" aria-hidden="true" />
            {t.shippingTo}
          </h2>
          <address className="space-y-0.5 text-sm not-italic text-textSecondary text-start">
            {order.shipping?.address && <p>{order.shipping.address}</p>}
            {order.shipping?.city && <p>{order.shipping.city}</p>}
            {order.shipping?.regionCode && (
              <p>{regionLabel(order.shipping.regionCode)}</p>
            )}
          </address>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <h2 className="mb-3 inline-flex items-center gap-2 font-display text-base font-bold text-textPrimary">
            <UserRound className="h-4 w-4 text-textMuted" aria-hidden="true" />
            {t.contact}
          </h2>
          <ul className="space-y-1.5 text-sm text-textSecondary text-start">
            {order.contact?.name && (
              <li className="text-textPrimary">{order.contact.name}</li>
            )}
            {order.contact?.email && (
              <li className="inline-flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-textMuted" aria-hidden="true" />
                <span dir="ltr" className="font-mono text-xs">
                  {order.contact.email}
                </span>
              </li>
            )}
            {order.contact?.phone && (
              <li className="inline-flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-textMuted" aria-hidden="true" />
                <span dir="ltr" className="font-mono text-xs tabular-nums">
                  {order.contact.phone}
                </span>
              </li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
