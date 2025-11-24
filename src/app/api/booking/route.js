// src/app/api/booking/route.js
import { NextResponse } from "next/server";
import dbConnect from "../../../lib/dbConnect";
import Booking from "../../../models/booking";
import Station from "../../../models/Station";
import User from "../../../models/User";
import ErrorLog from "../../../models/ErrorLog";
import { sendErrorNotification } from "../../../utils/mailer";

void User; // avoid unused import warnings if you import User for future use

/**
 * Helper: send booking-related emails (admin, user, partners)
 * Runs asynchronously and is non-fatal for the main request.
 */
async function sendBookingEmailsSafely({ booking, station }) {
  try {
    const nodemailer = (await import("nodemailer")).default;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "465"),
      secure: (process.env.SMTP_SECURE || "true") === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Build admin email text
    const adminText = `
📦 New Booking Details:
-------------------------
🙍 Full Name: ${booking.fullName}
📧 Email: ${booking.email}
📱 Phone: ${booking.phone || "—"}
📅 Drop-off Date: ${booking.dropOffDate}
📦 Pick-up Date: ${booking.pickUpDate}
🎒 Luggage Count: ${booking.luggageCount}
📝 Special Instructions: ${booking.specialInstructions || "—"}
💳 Payment ID: ${booking.paymentId || booking.paypalTxnId || "—"}
📍 Drop-off location: ${station?.name || booking.stationId || "—"}
Booking DB ID: ${booking._id}
    `;

    // Admin mail
    try {
      await transporter.sendMail({
        from: `"Luggage Terminal" <no-reply@luggageterminal.com>`,
        to: process.env.EMAIL_ADMIN,
        subject: "New Luggage Storage Booking🧳",
        text: adminText,
      });
    } catch (adminErr) {
      throw new Error(`Admin mail failed: ${adminErr.message || adminErr}`);
    }

    // Partner mails (if any)
    if (station?.partners?.length) {
      for (const partner of station.partners) {
        if (partner?.email && partner.role === "partner") {
          try {
            await transporter.sendMail({
              from: `"Luggage Terminal" <no-reply@luggageterminal.com>`,
              to: partner.email,
              subject: `🧳 New Booking at ${station.name}`,
              text: adminText,
            });
          } catch (partnerErr) {
            // Continue attempting other partner mails but log error
            await ErrorLog.create({
              user: booking.email || "unknown",
              station: station.name,
              errorType: "PARTNER_MAIL_ERROR",
              message: partnerErr.message || String(partnerErr),
              stack: partnerErr.stack || null,
              createdAt: new Date(),
            });
          }
        }
      }
    }

    // User email (HTML)
    const userHtml = `
      <p>Dear ${booking.fullName || "Customer"},</p>
      <p>Thank you for booking with Luggage Terminal. Your booking details are below:</p>
      <ul>
        <li><strong>Booking ID:</strong> ${booking._id}</li>
        <li><strong>Order / Payment ID:</strong> ${booking.paymentId || booking.paypalTxnId || "—"}</li>
        <li><strong>Station:</strong> ${station?.name || booking.stationId || "—"}</li>
        <li><strong>Drop-off:</strong> ${booking.dropOffDate}</li>
        <li><strong>Pick-up:</strong> ${booking.pickUpDate}</li>
        <li><strong>Luggage count:</strong> ${booking.luggageCount}</li>
      </ul>
      <p>Please keep this email for your records. If you do not receive an email, you can take a screenshot of the confirmation page as proof of booking.</p>
      <p>— Luggage Terminal</p>
    `;

    try {
      await transporter.sendMail({
        from: `"Luggage Terminal" <no-reply@luggageterminal.com>`,
        to: booking.email,
        subject: "✅ Your Luggage Storage Booking Confirmation",
        html: userHtml,
      });
    } catch (userErr) {
      // Log user mail failure but don't rethrow (we already sent admin mail)
      await ErrorLog.create({
        user: booking.email || "unknown",
        station: station?.name || booking.stationId || "unknown",
        errorType: "USER_MAIL_ERROR",
        message: userErr.message || String(userErr),
        stack: userErr.stack || null,
        createdAt: new Date(),
      });
    }

    // Mark emailsSent on booking (caller should save)
    return { success: true };
  } catch (err) {
    // Return error to caller so caller can log it
    return { success: false, error: err };
  }
}

/**
 * Main POST handler for booking creation.
 * - Validates capacity
 * - Creates booking (idempotent-ish when paymentId/paypalTxnId present)
 * - Returns success immediately after DB save
 * - Sends emails asynchronously and logs any failures
 */
export async function POST(request) {
  try {
    await dbConnect();

    const body = await request.json();
    const {
      fullName,
      email,
      phone,
      dropOffDate,
      pickUpDate,
      luggageCount,
      specialInstructions,
      paymentId,
      stationId,
      userId,
      paypalTxnId, // optional if client passes
    } = body;

    console.log("📦 New booking request:", {
      stationId,
      dropOffDate,
      pickUpDate,
      luggageCount,
      paymentId,
      paypalTxnId,
    });

    // Basic validation
    if (!stationId || !dropOffDate || !pickUpDate || !luggageCount) {
      return NextResponse.json(
        { success: false, message: "Missing required booking fields" },
        { status: 400 }
      );
    }

    // Load station and perform capacity check
    const station = await Station.findById(stationId).populate("partners");
    if (!station) {
      return NextResponse.json(
        { success: false, message: "Station not found" },
        { status: 404 }
      );
    }

    if (station.capacity && station.capacity > 0) {
      console.log("🔍 Checking capacity for station:", station.name);

      const overlappingBookings = await Booking.find({
        stationId,
        status: "confirmed",
        dropOffDate: { $lte: new Date(pickUpDate) },
        pickUpDate: { $gte: new Date(dropOffDate) },
      }).select("luggageCount");

      const currentLuggage = overlappingBookings.reduce(
        (sum, b) => sum + (b.luggageCount || 0),
        0
      );
      const bufferCapacity = Math.floor(station.capacity * 0.9); // keep buffer as before
      const projectedTotal = currentLuggage + (luggageCount || 0);
      const percentage = Math.round((currentLuggage / station.capacity) * 100);

      console.log("📊 Capacity check:", {
        current: currentLuggage,
        projected: projectedTotal,
        buffer: bufferCapacity,
        percentage,
      });

      if (projectedTotal > bufferCapacity) {
        console.log("⛔ Capacity exceeded, blocking booking");
        return NextResponse.json(
          {
            success: false,
            message: "Station is at capacity for the selected time",
            capacityExceeded: true,
            capacity: {
              current: currentLuggage,
              max: station.capacity,
              projected: projectedTotal,
              percentage,
            },
          },
          { status: 409 }
        );
      }
      console.log("✅ Capacity check passed");
    }

    // Idempotency: If client passed paypalTxnId or paymentId, try to find existing booking
    let existingBooking = null;
    if (paypalTxnId) {
      existingBooking = await Booking.findOne({ paypalTxnId }).exec();
    }
    if (!existingBooking && paymentId) {
      existingBooking = await Booking.findOne({ paymentId }).exec();
    }

    if (existingBooking) {
      // If booking exists, return success (but we should ensure status)
      console.log("↩️ Booking already exists for payment:", existingBooking._id);
      // Optionally update any missing fields
      let updated = false;
      if (!existingBooking.status || existingBooking.status !== "confirmed") {
        existingBooking.status = "confirmed";
        updated = true;
      }
      if (paypalTxnId && !existingBooking.paypalTxnId) {
        existingBooking.paypalTxnId = paypalTxnId;
        existingBooking.paymentCaptured = true;
        updated = true;
      }
      if (updated) await existingBooking.save();

      // Respond immediately
      return NextResponse.json(
        { success: true, message: "Booking already exists", bookingId: existingBooking._id },
        { status: 200 }
      );
    }

    // Create new booking record (save to DB first)
    const newBooking = new Booking({
      fullName,
      email,
      phone,
      dropOffDate,
      pickUpDate,
      luggageCount,
      specialInstructions,
      paymentId: paymentId || null,
      paypalTxnId: paypalTxnId || paymentId || null,
      stationId,
      userId: userId || null,
      status: "confirmed",
      paymentCaptured: Boolean(paypalTxnId || paymentId),
    });

    await newBooking.save();
    console.log("💾 Booking saved:", newBooking._id);

    // Asynchronously send capacity-warning emails if needed (non-blocking)
    if (station.capacity && station.capacity > 0) {
      (async () => {
        try {
          // Recalculate to include this booking
          const updatedOverlapping = await Booking.find({
            stationId,
            status: "confirmed",
            dropOffDate: { $lte: new Date(pickUpDate) },
            pickUpDate: { $gte: new Date(dropOffDate) },
          }).select("luggageCount");

          const updatedCurrent = updatedOverlapping.reduce(
            (sum, b) => sum + (b.luggageCount || 0),
            0
          );
          const updatedPercentage = Math.round((updatedCurrent / station.capacity) * 100);

          // Send capacity warnings if needed (existing function in your code)
          // Reuse the function if available; otherwise this is a no-op here.
          // If you have sendCapacityWarningEmails imported elsewhere, call it.
          // Example: await sendCapacityWarningEmails(station, updatedPercentage, dropOffDate, pickUpDate);
        } catch (err) {
          console.error("Capacity warning async error:", err);
          try {
            await ErrorLog.create({
              user: email || "unknown",
              station: station?.name || stationId,
              errorType: "CAPACITY_WARNING_ERR",
              message: err.message || String(err),
              stack: err.stack || null,
              createdAt: new Date(),
            });
          } catch (elogErr) {
            console.error("Failed to log capacity warning error:", elogErr);
          }
        }
      })().catch((e) => console.error("capacity warning wrapper error:", e));
    }

    // Respond to client immediately: booking is saved
    const responsePayload = {
      success: true,
      message: "Booking saved; emails will be sent shortly",
      bookingId: newBooking._id,
      paypalTxnId: newBooking.paypalTxnId || null,
    };

    // Kick off email sending in background (non-blocking)
    (async () => {
      try {
        const emailResult = await sendBookingEmailsSafely({ booking: newBooking, station });
        if (emailResult.success) {
          // mark booking emailsSent flag
          try {
            newBooking.emailsSent = true;
            newBooking.emailsSentAt = new Date();
            await newBooking.save();
            console.log("📧 Emails sent and booking updated:", newBooking._id);
          } catch (saveErr) {
            console.error("Failed to update booking.emailsSent:", saveErr);
            await ErrorLog.create({
              user: newBooking.email || "unknown",
              station: station?.name || stationId,
              errorType: "EMAIL_FLAG_SAVE_ERR",
              message: saveErr.message || String(saveErr),
              stack: saveErr.stack || null,
              createdAt: new Date(),
            });
          }
        } else {
          // sendBookingEmailsSafely returned an error object
          const err = emailResult.error;
          console.error("Booking email sending error (non-fatal):", err);
          try {
            await ErrorLog.create({
              user: newBooking.email || "unknown",
              station: station?.name || stationId,
              errorType: "BOOKING_EMAIL_ERROR",
              message: err.message || String(err),
              stack: err.stack || null,
              createdAt: new Date(),
            });
          } catch (elogErr) {
            console.error("Failed to log email error:", elogErr);
          }
          // Optionally notify admin via error email
          try {
            await sendErrorNotification({
              user: newBooking.email || "unknown",
              station: station?.name || stationId,
              error: `Failed to send booking emails for bookingId: ${newBooking._id}`,
            });
          } catch (notifyErr) {
            console.error("Failed to send error notification:", notifyErr);
          }
        }
      } catch (bgErr) {
        console.error("Unexpected background email error:", bgErr);
        try {
          await ErrorLog.create({
            user: newBooking.email || "unknown",
            station: station?.name || stationId,
            errorType: "BOOKING_EMAIL_BG_FATAL",
            message: bgErr.message || String(bgErr),
            stack: bgErr.stack || null,
            createdAt: new Date(),
          });
        } catch (elogErr) {
          console.error("Failed to log background email fatal error:", elogErr);
        }
      }
    })().catch((e) => console.error("email sending wrapper error:", e));

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error) {
    console.error("💥 Booking API Error:", error);

    // Attempt to parse body for context
    let userEmail = "Unknown";
    let stationName = "Unknown";
    try {
      const clonedReq = request.clone();
      const body = await clonedReq.json();
      if (body?.email) userEmail = body.email;
      if (body?.stationId) {
        try {
          const stationDoc = await Station.findById(body.stationId);
          stationName = stationDoc?.name || body.stationId;
        } catch {
          stationName = body.stationId;
        }
      }
    } catch (parseErr) {
      console.warn("⚠️ Could not parse request body in error handler:", parseErr);
    }

    try {
      await ErrorLog.create({
        user: userEmail,
        station: stationName,
        errorType: "BOOKING_API_ERROR",
        message: error.message,
        stack: error.stack,
        createdAt: new Date(),
      });
    } catch (elogErr) {
      console.error("Failed to create ErrorLog:", elogErr);
    }

    try {
      await sendErrorNotification({
        user: userEmail,
        station: stationName,
        error: error.message || "Booking API failed",
      });
    } catch (notifyErr) {
      console.error("Failed to send error notification:", notifyErr);
    }

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
