// app/api/paypal/webhook/route.js - CORRECTED & COMPLETE VERSION
import { NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "../../../../lib/dbConnect";
import ErrorLog from "../../../../models/ErrorLog";
import Payment from "../../../../models/Payment";
import Booking from "../../../../models/booking";
import { sendErrorNotification } from "../../../../utils/mailer";

export async function POST(req) {
  try {
    await dbConnect();

    const bodyText = await req.text();
    const body = JSON.parse(bodyText);

    // ✅ PayPal headers
    const transmissionId = req.headers.get("paypal-transmission-id");
    const transmissionTime = req.headers.get("paypal-transmission-time");
    const certUrl = req.headers.get("paypal-cert-url");
    const authAlgo = req.headers.get("paypal-auth-algo");
    const transmissionSig = req.headers.get("paypal-transmission-sig");
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;

    // ✅ Build expected string for signature verification
    const expected = `${transmissionId}|${transmissionTime}|${webhookId}|${crypto
      .createHash("sha256")
      .update(bodyText)
      .digest("hex")}`;

    // ✅ Verify PayPal signature
    const verifier = crypto.createVerify(authAlgo);
    verifier.update(expected);
    verifier.end();

    const isValid = verifier.verify(certUrl, transmissionSig, "base64");
    if (!isValid) {
      console.error("⚠️ Invalid PayPal webhook signature");
      return NextResponse.json({ status: "invalid signature" }, { status: 400 });
    }

    // ✅ Extract event details
    const eventType = body.event_type;
    const userEmail = body?.resource?.payer?.email_address || "Unknown";
    const paypalTransactionId = body?.resource?.id || null;
    const paypalOrderId = body?.resource?.supplementary_data?.related_ids?.order_id || null;

    console.log("📨 PayPal Webhook Event Received:", {
      eventType,
      transactionId: paypalTransactionId,
      orderId: paypalOrderId,
      email: userEmail
    });

    // ✅ Handle successful payment completion
    if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      if (!paypalTransactionId) {
        console.error("❌ Missing PayPal transaction ID in webhook");
        return NextResponse.json({ status: "missing transaction id" }, { status: 400 });
      }

      // Find payment record using PayPal transaction ID
      const payment = await Payment.findOne({ paypalTransactionId });

      if (!payment) {
        console.error("❌ Payment not found for transaction:", paypalTransactionId);
        
        // Log this - webhook might arrive before our booking API completes
        await ErrorLog.create({
          user: userEmail,
          station: "Unknown",
          errorType: "WEBHOOK_PAYMENT_NOT_FOUND",
          message: `Webhook received but payment not found. Transaction: ${paypalTransactionId}, Order: ${paypalOrderId}`,
        });
        
        return NextResponse.json({ status: "payment not found" }, { status: 404 });
      }

      // Update payment status if not already completed
      if (payment.status !== "completed") {
        payment.status = "completed";
        await payment.save();
        console.log("✅ Payment marked as completed:", payment.paymentReference);
      }

      // Confirm the booking if not already confirmed
      const booking = await Booking.findById(payment.bookingId);
      if (booking && booking.status !== "confirmed") {
        booking.status = "confirmed";
        await booking.save();
        console.log("✅ Booking confirmed via webhook:", booking.bookingReference);
      }

      console.log("✅ Webhook processed successfully:", {
        bookingRef: booking?.bookingReference,
        paymentRef: payment.paymentReference,
        transactionId: paypalTransactionId
      });
    }

    // ✅ Handle payment failures/denials
    if (
      eventType === "PAYMENT.CAPTURE.DENIED" ||
      eventType === "PAYMENT.CAPTURE.CANCELLED" ||
      eventType === "PAYMENT.CAPTURE.DECLINED"
    ) {
      console.log("⚠️ Payment failure event:", eventType);

      // Try to find and update payment status
      if (paypalTransactionId) {
        const payment = await Payment.findOne({ paypalTransactionId });
        if (payment) {
          payment.status = "failed";
          payment.errorDetails = `PayPal event: ${eventType}`;
          await payment.save();
          console.log("⚠️ Payment marked as failed:", payment.paymentReference);

          // Also update booking status
          await Booking.findByIdAndUpdate(payment.bookingId, {
            status: "cancelled"
          });
        }
      }

      // Log the error
      await ErrorLog.create({
        user: userEmail,
        station: "Unknown",
        errorType: eventType,
        message: JSON.stringify(body),
        createdAt: new Date(),
      });

      // Send notification
      await sendErrorNotification({
        user: userEmail,
        station: "Unknown",
        error: `PayPal Webhook: ${eventType} (Order: ${paypalOrderId}, Transaction: ${paypalTransactionId})`,
      });
    }

    // ✅ Handle refunds
    if (eventType === "PAYMENT.CAPTURE.REFUNDED") {
      console.log("💰 Refund event received");

      if (paypalTransactionId) {
        const payment = await Payment.findOne({ paypalTransactionId });
        if (payment) {
          const refundAmount = body?.resource?.amount?.value || 0;
          
          await payment.addRefund({
            refundId: body?.resource?.id,
            amount: parseFloat(refundAmount),
            reason: "PayPal refund webhook"
          });

          console.log("✅ Refund recorded:", {
            paymentRef: payment.paymentReference,
            amount: refundAmount
          });
        }
      }
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (err) {
    console.error("💥 Webhook processing error:", err);
    
    // Log system errors
    try {
      await ErrorLog.create({
        user: "System",
        station: "Unknown",
        errorType: "WEBHOOK_ERROR",
        message: err.message,
        stack: err.stack,
      });
    } catch (logError) {
      console.error("Failed to log webhook error:", logError);
    }
    
    return NextResponse.json({ status: "error", message: err.message }, { status: 500 });
  }
}