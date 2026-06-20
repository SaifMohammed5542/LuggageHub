import { NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "../../../../lib/dbConnect";
import Payment from "../../../../models/Payment";
import Booking from "../../../../models/booking";
import ErrorLog from "../../../../models/ErrorLog";
import { sendErrorNotification } from "../../../../utils/mailer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await dbConnect();

    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object;
      const payment = await Payment.findOne({ stripePaymentIntentId: intent.id });

      if (payment && payment.status !== "completed") {
        payment.status = "completed";
        await payment.save();

        const booking = await Booking.findById(payment.bookingId);
        if (booking && booking.status !== "confirmed") {
          booking.status = "confirmed";
          await booking.save();
        }
        console.log("Stripe webhook: payment completed", intent.id);
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object;
      const payment = await Payment.findOne({ stripePaymentIntentId: intent.id });

      if (payment) {
        payment.status = "failed";
        payment.errorDetails = intent.last_payment_error?.message || "Payment failed";
        await payment.save();

        await Booking.findByIdAndUpdate(payment.bookingId, { status: "cancelled" });

        await ErrorLog.create({
          user: intent.receipt_email || "Unknown",
          station: "Unknown",
          errorType: "STRIPE_PAYMENT_FAILED",
          message: intent.last_payment_error?.message || "Payment failed",
        });

        await sendErrorNotification({
          user: intent.receipt_email || "Unknown",
          station: "Unknown",
          error: `Stripe payment failed: ${intent.id} — ${intent.last_payment_error?.message}`,
        });
      }
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object;
      const intentId = charge.payment_intent;
      const payment = await Payment.findOne({ stripePaymentIntentId: intentId });

      if (payment) {
        const refundedAmountCents = charge.amount_refunded;
        const refundedAmount = refundedAmountCents / 100;

        await payment.addRefund({
          refundId: charge.id,
          amount: refundedAmount,
          reason: "Stripe refund webhook",
        });
        console.log("Stripe webhook: refund recorded", intentId, refundedAmount);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("Stripe webhook processing error:", err);
    try {
      await ErrorLog.create({
        user: "System",
        station: "Unknown",
        errorType: "STRIPE_WEBHOOK_ERROR",
        message: err.message,
        stack: err.stack,
      });
    } catch {}
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
