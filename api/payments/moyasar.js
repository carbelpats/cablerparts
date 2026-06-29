// -----------------------------------------------------------------------------
// Vercel Serverless Function — Moyasar payment VERIFICATION (server-side).
//
// PCI/secret separation: the browser collects/creates the payment with the
// PUBLISHABLE key (Moyasar.js); this endpoint confirms the charge with the
// SECRET key before the order is ever trusted as "paid". The secret key must
// live ONLY here (Vercel env var MOYASAR_SECRET_KEY) — never in a VITE_* var.
//
// READY-TO-WIRE: until MOYASAR_SECRET_KEY is set in Vercel, this returns
// { configured: false } so the app keeps working in its current mode. Once the
// key is added (and the Moyasar account is live), it verifies real payments.
//
// POST { paymentId } -> { configured, paid, status, amount, currency, id }
// -----------------------------------------------------------------------------
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const secret = process.env.MOYASAR_SECRET_KEY;
  if (!secret) {
    // Integration point ready, key not provided yet.
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
    const payment = await r.json();

    res.status(200).json({
      configured: true,
      paid: payment && payment.status === "paid",
      status: payment?.status || null,
      amount: payment?.amount ?? null,
      currency: payment?.currency || null,
      id: payment?.id || null,
    });
  } catch (err) {
    res.status(500).json({ error: "verify_failed" });
  }
}
