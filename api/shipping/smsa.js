// -----------------------------------------------------------------------------
// Vercel Serverless Function — SMSA shipping (server-side).
//
// Fetches a live shipping rate and/or creates a shipment via the SMSA API using
// the SERVER-SIDE key (Vercel env var SMSA_API_KEY) — a write key must never sit
// in the browser. The app's client-side computeShipping() gives an instant
// weight-based estimate; this endpoint is for the AUTHORITATIVE rate + real
// AWB/label once the SMSA account is live.
//
// READY-TO-WIRE: until SMSA_API_KEY is set in Vercel, returns
// { configured: false } so the client falls back to the local weight estimate.
//
// POST { action: "rate" | "create", toCity, weightKg, order } -> rate / AWB
// -----------------------------------------------------------------------------
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const apiKey = process.env.SMSA_API_KEY;
  if (!apiKey) {
    res.status(200).json({ configured: false });
    return;
  }

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const { action = "rate" } = body;

    // TODO (when the SMSA account + endpoints are confirmed): call the SMSA API
    // with `apiKey`. Keep these response shapes so the client stays unchanged:
    //   rate   -> { configured:true, costSAR, etaDays:[min,max], currency:"SAR" }
    //   create -> { configured:true, trackingNumber, labelUrl, courierProvider:"SMSA" }
    res.status(200).json({
      configured: true,
      pending: true,
      action,
      note: "SMSA API key detected — implement the SMSA rate/AWB call here.",
    });
  } catch (err) {
    res.status(500).json({ error: "smsa_failed" });
  }
}
