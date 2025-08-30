import { NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "../../../../lib/dbConnect";
import ErrorLog from "../../../../models/ErrorLog";
import { sendErrorNotification } from "../../../../utils/mailer";

export async function POST(req) {
  try {
    await dbConnect();

    // 👇 raw body required for signature verification
    const bodyText = await req.text();
    const body = JSON.parse(bodyText);

    // ✅ PayPal headers
    const transmissionId = req.headers.get("paypal-transmission-id");
    const transmissionTime = req.headers.get("paypal-transmission-time");
    const certUrl = req.headers.get("paypal-cert-url");
    const authAlgo = req.headers.get("paypal-auth-algo");
    const transmissionSig = req.headers.get("paypal-transmission-sig");
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;

    // ✅ Build expected string
    const expected = `${transmissionId}|${transmissionTime}|${webhookId}|${crypto
      .createHash("sha256")
      .update(bodyText)
      .digest("hex")}`;

    // ✅ Verify signature
    const verifier = crypto.createVerify(authAlgo);
    verifier.update(expected);
    verifier.end();

    const isValid = verifier.verify(certUrl, transmissionSig, "base64");
    if (!isValid) {
      console.error("⚠️ Invalid PayPal webhook signature");
      return NextResponse.json({ status: "invalid signature" }, { status: 400 });
    }

    // ✅ Handle event
    const eventType = body.event_type;
    const userEmail = body?.resource?.payer?.email_address || "Unknown";
    const paypalOrderId = body?.resource?.id || "N/A";

    if (
      eventType === "PAYMENT.CAPTURE.DENIED" ||
      eventType === "PAYMENT.CAPTURE.CANCELLED"
    ) {
      await ErrorLog.create({
        user: userEmail,
        station: "Unknown",
        errorType: eventType,
        message: JSON.stringify(body),
        createdAt: new Date(),
      });

      await sendErrorNotification({
        user: userEmail,
        station: "Unknown",
        error: `PayPal Webhook: ${eventType} (Order ID: ${paypalOrderId})`,
      });
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
