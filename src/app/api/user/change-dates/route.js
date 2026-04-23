// app/api/user/change-dates/route.js
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import dbConnect from "@/lib/dbConnect";
import Booking from "@/models/booking";
import Payment from "@/models/Payment";
import Station from "@/models/Station";
import { verifyJWT } from "@/lib/auth";
import { generatePaymentReference } from "@/utils/generateReference";

void Station;

// Returns a fake-UTC Date where UTC hours = Melbourne wall-clock hours, for comparing against stored dates
function getMelbourneNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const get = t => parts.find(p => p.type === t).value;
  const hour = get('hour') === '24' ? '00' : get('hour');
  return new Date(`${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}:00.000Z`);
}

export async function POST(request) {
  try {
    await dbConnect();

    // Verify JWT
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyJWT(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { bookingId, newDropOffDate, newPickUpDate, paymentData } = await request.json();

    // Validate inputs
    if (!bookingId || !newDropOffDate || !newPickUpDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Find booking
    const booking = await Booking.findById(bookingId).populate("stationId");
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Bug 3 fix: only allow date changes on active bookings
    if (!['pending', 'confirmed', 'stored'].includes(booking.status)) {
      return NextResponse.json(
        { error: `Cannot change dates on a booking with status "${booking.status}"` },
        { status: 400 }
      );
    }

    // Verify ownership
    const userIdMatch = booking.userId?.toString() === decoded.userId;
    const emailMatch = booking.email === decoded.email;
    if (!userIdMatch && !emailMatch) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const requestedDropOff = new Date(newDropOffDate);
    const requestedPickUp = new Date(newPickUpDate);
    const currentDropOff = new Date(booking.dropOffDate);
    const currentPickUp = new Date(booking.pickUpDate);

    // ✅ VALIDATION
    if (requestedDropOff >= requestedPickUp) {
      return NextResponse.json(
        { error: "Drop-off must be before pick-up" },
        { status: 400 }
      );
    }

    if (requestedPickUp < currentPickUp) {
      return NextResponse.json(
        { error: "Cannot move pick-up earlier (no refunds for early pickup)" },
        { status: 400 }
      );
    }

    const now = getMelbourneNow();
    if (requestedDropOff < currentDropOff) {
      const hoursUntilNewDropOff = (requestedDropOff - now) / (1000 * 60 * 60);
      if (hoursUntilNewDropOff < 2) {
        return NextResponse.json(
          { error: "Drop-off must be at least 2 hours from now" },
          { status: 400 }
        );
      }
    }

    if (requestedPickUp > currentPickUp) {
      const hoursFromCurrentPickUp = (requestedPickUp - currentPickUp) / (1000 * 60 * 60); // both fake-UTC, diff is real
      if (hoursFromCurrentPickUp < 1) {
        return NextResponse.json(
          { error: "Pick-up extension must be at least 1 hour later" },
          { status: 400 }
        );
      }
    }

    // ✅ CALCULATE CHARGES
    const currentDays = Math.ceil((currentPickUp - currentDropOff) / (1000 * 60 * 60 * 24));
    const newDays = Math.ceil((requestedPickUp - requestedDropOff) / (1000 * 60 * 60 * 24));
    const daysDifference = newDays - currentDays;

    const dailyRate =
      (booking.smallBagCount || 0) * 3.99 +
      (booking.largeBagCount || 0) * 8.49;

    let extraCharge = 0;

    if (daysDifference > 0) {
      extraCharge = dailyRate * daysDifference;
    }

    // ✅ VALIDATE PAYMENT
    if (extraCharge > 0) {
      if (!paymentData) {
        return NextResponse.json(
          { error: "Payment required for extra days" },
          { status: 400 }
        );
      }

      if (Math.abs(paymentData.amount - extraCharge) > 0.01) {
        return NextResponse.json(
          { error: "Payment amount mismatch" },
          { status: 400 }
        );
      }
    }

    // ✅ UPDATE BOOKING
    booking.dropOffDate = requestedDropOff;
    booking.pickUpDate = requestedPickUp;
    booking.totalAmount = (booking.totalAmount || 0) + extraCharge;
    await booking.save();

    // ✅ SAVE PAYMENT RECORD
    if (extraCharge > 0 && paymentData) {
      const payment = new Payment({
        paymentReference: generatePaymentReference(),
        bookingId: booking._id,
        amount: extraCharge,
        currency: paymentData.currency || "AUD",
        paymentMethod: "paypal",
        status: "completed",
        paypalOrderId: paymentData.paypalOrderId,
        paypalTransactionId: paymentData.paypalTransactionId,
        payerEmail: paymentData.payerEmail,
        payerName: paymentData.payerName,
        payerId: paymentData.payerId,
        paypalResponse: paymentData.fullPayPalResponse,
      });
      await payment.save();
    }

    // Send confirmation email
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: process.env.SMTP_PORT === "465",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const fmtDate = (d) => {
        const dt = new Date(d);
        const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const h = dt.getUTCHours() % 12 || 12;
        const m = String(dt.getUTCMinutes()).padStart(2, '0');
        return `${DAYS[dt.getUTCDay()]}, ${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}, ${h}:${m} ${dt.getUTCHours() >= 12 ? 'pm' : 'am'}`;
      };

      const chargeNote =
        extraCharge > 0
          ? `<p><strong>Additional charge:</strong> A$${extraCharge.toFixed(2)}</p>
             <p><strong>New total paid:</strong> A$${booking.totalAmount.toFixed(2)}</p>`
          : `<p>No additional charge applied.</p>`;

      await transporter.sendMail({
        from: `"Luggage Terminal" <${process.env.EMAIL_USER}>`,
        to: booking.email,
        subject: `📅 Booking Dates Updated — ${booking.bookingReference}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0284C7;">📅 Your Booking Dates Have Been Updated</h2>
            <p>Hi ${booking.fullName},</p>
            <p>Your luggage storage booking dates have been successfully changed.</p>

            <div style="background: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #0284C7;">
              <h3 style="margin-top: 0; color: #0369a1;">Booking Reference: ${booking.bookingReference}</h3>
              <p><strong>New Drop-off:</strong> ${fmtDate(requestedDropOff)}</p>
              <p><strong>New Pick-up:</strong> ${fmtDate(requestedPickUp)}</p>
              <p><strong>New Duration:</strong> ${newDays} day${newDays === 1 ? "" : "s"}</p>
              ${chargeNote}
            </div>

            <p style="color: #666; font-size: 13px;">If you did not make this change, please contact us immediately at support@luggageterminal.com</p>
          </div>
        `,
      });
    } catch (emailError) {
      // Non-fatal — booking is already updated, just log the failure
      console.error("Date change email failed:", emailError.message);
    }

    return NextResponse.json({
      success: true,
      message: "Booking dates updated successfully",
      booking: {
        newDropOffDate: requestedDropOff,
        newPickUpDate: requestedPickUp,
        newDays,
        daysDifference,
        charge: extraCharge,
        newTotalAmount: booking.totalAmount,
      },
    });

  } catch (error) {
    console.error("Date change error:", error);
    return NextResponse.json(
      { error: "Failed to update dates" },
      { status: 500 }
    );
  }
}