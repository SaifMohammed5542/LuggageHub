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

export async function POST(req) {
  try {
    const { amount } = await req.json();
    if (!amount || isNaN(amount)) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const accessToken = await getAccessToken();

    const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          amount: {
            currency_code: "AUD",
            value: Number(amount).toFixed(2),
          },
        }],
        application_context: {
          shipping_preference: "NO_SHIPPING",
        },
      }),
    });

    const order = await res.json();
    if (!order.id) {
      console.error("PayPal create-order failed:", order);
      throw new Error(order?.details?.[0]?.description || "Order creation failed");
    }

    return NextResponse.json({ id: order.id });
  } catch (err) {
    console.error("PayPal create-order error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
