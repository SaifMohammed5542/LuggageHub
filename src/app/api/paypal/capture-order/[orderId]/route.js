import { NextResponse } from "next/server";

const PAYPAL_BASE = process.env.PAYPAL_MODE === "sandbox"
  ? "https://api-m.sandbox.paypal.com"
  : "https://api-m.paypal.com";

async function getAccessToken() {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
  ).toString("base64");

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to get PayPal access token");
  return data.access_token;
}

export async function POST(req, { params }) {
  try {
    const { orderId } = params;
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const accessToken = await getAccessToken();

    const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const details = await res.json();

    if (details.status === "COMPLETED") {
      return NextResponse.json(details);
    }

    // Card declined or other failure
    console.error("PayPal capture failed:", details);
    const errorDetail = details?.details?.[0];
    const message = errorDetail?.description || details?.message || "Payment capture failed";
    return NextResponse.json({ error: message, details }, { status: 422 });
  } catch (err) {
    console.error("PayPal capture-order error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
