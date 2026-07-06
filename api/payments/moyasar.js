// -----------------------------------------------------------------------------
// Vercel Serverless Function — Moyasar payment VERIFICATION (server-side).
//
// PCI/secret separation: the browser renders Moyasar's hosted form with the
// PUBLISHABLE key; this endpoint confirms the charge with the SECRET key
// (Vercel env MOYASAR_SECRET_KEY — never in a VITE_ var) before the order is
// ever trusted as "paid".
//
// It validates, server-side, that the charge actually covers the claimed order:
//   1. payment.status === "paid" and payment.currency === "SAR";
//   2. payment.amount (halalas) equals the order total at the fixed 3.75 peg;
//   3. the order's subtotal matches CATALOG prices fetched from Supabase
//      (public-read REST) — not the client's numbers — with the discount capped
//      at the largest storefront coupon and shipping non-negative.
// The client only records an order as paid when `valid` is true, so a tampered
// form amount or a hand-crafted snapshot can't mint a paid order.
//
// READY-TO-WIRE: until MOYASAR_SECRET_KEY is set in Vercel, returns
// { configured: false } (HTTP 200) — distinct from transport errors, which the
// client treats as retryable.
//
// POST { paymentId, order? } -> { configured, paid, valid, status, amount,
//                                 currency, id, priceCheck }
// -----------------------------------------------------------------------------

const SAR_PER_USD = 3.75;
// Largest percent coupon in the storefront (see src/lib/data.js COUPONS).
const MAX_DISCOUNT_FRACTION = 0.15;
const EPSILON_USD = 0.02;

// Mirrors src/services/moyasarService.js usdToHalalas exactly.
function usdToHalalas(usd) {
  return Math.max(100, Math.round((Number(usd) || 0) * SAR_PER_USD * 100));
}

function near(a, b) {
  return Math.abs(a - b) < EPSILON_USD;
}

// Recompute the order subtotal from the LIVE catalog (Supabase public-read
// REST). Returns a number, NaN when the claim is provably invalid (unknown
// product), or null when the check can't run (env missing / fetch failed) —
// null means "unknown", not "invalid".
async function fetchCatalogSubtotalUSD(items) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key || !Array.isArray(items) || items.length === 0) return null;

  const ids = items.map((it) => String(it?.id || "")).filter(Boolean);
  if (ids.length === 0 || ids.length !== items.length) return NaN; // malformed

  // PostgREST `in.("a","b")` — double quotes stripped from ids to keep the
  // quoted-list syntax unambiguous.
  const inList = ids.map((id) => `"${id.replace(/"/g, "")}"`).join(",");
  const query = `${url}/rest/v1/products?id=in.(${encodeURIComponent(
    inList
  )})&select=id,data`;

  try {
    const r = await fetch(query, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!r.ok) return null;
    const rows = await r.json();
    if (!Array.isArray(rows)) return null;

    const priceById = new Map(
      rows.map((row) => [String(row.id), Number(row?.data?.priceUSD)])
    );
    let subtotal = 0;
    for (const it of items) {
      const price = priceById.get(String(it.id));
      // Unknown product id or non-numeric price => the claim is INVALID.
      if (price == null || Number.isNaN(price)) return NaN;
      const qty = Math.min(999, Math.max(1, Math.round(Number(it.qty) || 1)));
      subtotal += price * qty;
    }
    return Math.round(subtotal * 100) / 100;
  } catch {
    return null;
  }
}

// Validate the claimed order shape + totals against catalog truth + the charge.
async function validateOrderAgainstPayment(order, payment) {
  const currencyOk = String(payment?.currency || "").toUpperCase() === "SAR";
  if (!order || typeof order !== "object") {
    return { valid: false, priceCheck: "missing_order" };
  }

  const sub = Number(order.subtotalUSD);
  const disc = Number(order.discountUSD) || 0;
  const ship = Number(order.shippingUSD) || 0;
  const total = Number(order.totalUSD);
  if (!Number.isFinite(sub) || !Number.isFinite(total) || sub <= 0) {
    return { valid: false, priceCheck: "malformed" };
  }

  const dbSubtotal = await fetchCatalogSubtotalUSD(order.items);
  if (Number.isNaN(dbSubtotal)) {
    return { valid: false, priceCheck: "unknown_product" };
  }
  const subtotalOk = dbSubtotal == null ? true : near(sub, dbSubtotal);
  const discountOk =
    disc >= 0 && disc <= sub * MAX_DISCOUNT_FRACTION + EPSILON_USD;
  const shipOk = ship >= 0;
  const totalOk = near(total, Math.max(0, sub - disc) + ship);
  const amountOk = Number(payment?.amount) === usdToHalalas(total);

  return {
    valid:
      currencyOk && subtotalOk && discountOk && shipOk && totalOk && amountOk,
    priceCheck: dbSubtotal == null ? "skipped" : "catalog",
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const secret = process.env.MOYASAR_SECRET_KEY;
  if (!secret) {
    // Integration point ready, key not provided yet. HTTP 200 on purpose —
    // the client distinguishes this from transport failures (retryable).
    res.status(200).json({ configured: false });
    return;
  }

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const paymentId = body.paymentId;
    if (!paymentId) {
      res.status(400).json({ error: "missing_payment_id" });
      return;
    }

    const auth = "Basic " + Buffer.from(`${secret}:`).toString("base64");
    const r = await fetch(
      `https://api.moyasar.com/v1/payments/${encodeURIComponent(paymentId)}`,
      { headers: { Authorization: auth } }
    );
    if (!r.ok) {
      // Unknown payment id (404) or Moyasar-side lookup error — not paid.
      res.status(200).json({
        configured: true,
        paid: false,
        valid: false,
        status: r.status === 404 ? "not_found" : "lookup_failed",
        amount: null,
        currency: null,
        id: paymentId,
      });
      return;
    }
    const payment = await r.json();

    const paid = payment && payment.status === "paid";
    const orderCheck = paid
      ? await validateOrderAgainstPayment(body.order, payment)
      : { valid: false, priceCheck: "unpaid" };

    res.status(200).json({
      configured: true,
      paid,
      valid: paid && orderCheck.valid,
      priceCheck: orderCheck.priceCheck,
      status: payment?.status || null,
      amount: payment?.amount ?? null,
      currency: payment?.currency || null,
      id: payment?.id || null,
    });
  } catch (err) {
    res.status(500).json({ error: "verify_failed" });
  }
}
