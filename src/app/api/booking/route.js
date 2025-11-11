// /app/api/booking/route.js
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import dbConnect from "../../../lib/dbConnect";
import Booking from "../../../models/booking";
import Station from "../../../models/Station";
import User from "../../../models/User";
import ErrorLog from "../../../models/ErrorLog"; // ✅ new model
import { sendErrorNotification } from "../../../utils/mailer"; // ✅ new util

void User;

// ✅ Helper function for capacity warnings
async function sendCapacityWarningEmails(station, capacityPercentage, dropOffDate, pickUpDate) {
  if (capacityPercentage < 85) return; // Only send at 85%, 90%, 95%

  try {
    const nodemailer = (await import("nodemailer")).default;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const warningLevel =
      capacityPercentage >= 95
        ? "full"
        : capacityPercentage >= 90
        ? "critical"
        : "warning";
    const icon =
      warningLevel === "full"
        ? "⛔"
        : warningLevel === "critical"
        ? "🔴"
        : "🟡";

    const subject = `${icon} ${station.name} - Capacity Alert (${capacityPercentage}%)`;

    const message = `
${icon} CAPACITY ALERT
========================

Station: ${station.name}
Location: ${station.location}

Current Status: ${capacityPercentage}% Full
Time Period: ${new Date(dropOffDate).toLocaleString()} - ${new Date(pickUpDate).toLocaleString()}

${warningLevel === "full" ? "⛔ NO MORE BOOKINGS CAN BE ACCEPTED for this time period." : ""}
${warningLevel === "critical" ? "🔴 Approaching maximum capacity." : ""}
${warningLevel === "warning" ? "🟡 Station is filling up." : ""}
    `;

    // Send to admin
    await transporter.sendMail({
      from: `"Luggage Terminal" <no-reply@luggageterminal.com>`,
      to: process.env.EMAIL_ADMIN,
      subject,
      text: message,
    });

    // Send to partners
    if (station?.partners?.length) {
      for (const partner of station.partners) {
        if (partner?.email && partner.role === "partner") {
          await transporter.sendMail({
            from: `"Luggage Terminal" <no-reply@luggageterminal.com>`,
            to: partner.email,
            subject,
            text: message,
          });
        }
      }
    }

    console.log(`📧 Capacity warning emails sent for ${station.name}`);
  } catch (error) {
    console.error("Failed to send capacity warning emails:", error);
  }
}

// ✅ Main POST function
export async function POST(request) {
  try {
    await dbConnect();

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
    } = await request.json();

    console.log("📦 New booking request:", {
      stationId,
      dropOffDate,
      pickUpDate,
      luggageCount,
    });

    // 🚨 CAPACITY CHECK - NEW SECTION
    const station = await Station.findById(stationId).populate("partners");
    if (!station) {
      return NextResponse.json(
        { success: false, message: "Station not found" },
        { status: 404 }
      );
    }

    // Check capacity if station has limits
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
      const bufferCapacity = Math.floor(station.capacity * 0.9);
      const projectedTotal = currentLuggage + luggageCount;
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
    // ✅ END CAPACITY CHECK

    // ✅ Save the booking
    const newBooking = new Booking({
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
      status: "confirmed",
    });

    await newBooking.save();
    console.log("💾 Booking saved:", newBooking._id);

    let stationName = station?.name || stationId;

    if (stationId.toString() === "67fb37ffa0f2f5d8223497d7") {
      stationName = "EzyMart 660 Bourke street";
    }

    // 📧 Send capacity warning emails if needed
    if (station.capacity && station.capacity > 0) {
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
      const updatedPercentage = Math.round(
        (updatedCurrent / station.capacity) * 100
      );

      await sendCapacityWarningEmails(
        station,
        updatedPercentage,
        dropOffDate,
        pickUpDate
      );
    }

    // ✅ Send booking emails
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // ✅ Email to admin
    const adminMailOptions = {
      from: `"Luggage Terminal" <no-reply@luggageterminal.com>`,
      to: process.env.EMAIL_ADMIN,
      subject: "New Luggage Storage Booking🧳",
      text: `
📦 New Booking Details:
-------------------------
🙍 Full Name: ${fullName}
📧 Email: ${email}
📱 Phone: ${phone}
📅 Drop-off Date: ${dropOffDate}
📦 Pick-up Date: ${pickUpDate}
🎒 Luggage Count: ${luggageCount}
📝 Special Instructions: ${specialInstructions}
💳 Payment ID: ${paymentId}
📍 Drop-off location: ${stationName}
      `,
    };

    // ✅ Email to user
    const userMailOptions = {
      from: `"Luggage Terminal" <no-reply@luggageterminal.com>`,
      to: email,
      subject: "✅ Your Luggage Storage Booking Confirmation",
      html: `
        <p>Dear ${fullName},</p>
        <p>🙏 Thank you for booking with us! Here are your booking details:</p>
        <p>📅 <strong>Drop-off:</strong> ${dropOffDate}</p>
        <p>📦 <strong>Pick-up:</strong> ${pickUpDate}</p>
        <p>🎒 <strong>Luggage Count:</strong> ${luggageCount}</p>
        <p>💳 <strong>Payment ID:</strong> ${paymentId}</p>
        <p>📍 <strong>Drop-off location:</strong> ${stationName}</p>
      `,
    };

    // ✅ Notify partners
    if (station?.partners?.length) {
      for (const partner of station.partners) {
        if (partner?.email && partner.role === "partner") {
          await transporter.sendMail({
            from: `"Luggage Terminal" <no-reply@luggageterminal.com>`,
            to: partner.email,
            subject: "🧳 New Luggage Storage Booking at Your Station",
            text: adminMailOptions.text,
          });
        }
      }
    }

    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(userMailOptions);

    return NextResponse.json(
      { success: true, message: "Booking saved and emails sent" },
      { status: 200 }
    );
  } catch (error) {
    console.error("💥 Booking API Error:", error);

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

    await ErrorLog.create({
      user: userEmail,
      station: stationName,
      errorType: "BOOKING_API_ERROR",
      message: error.message,
      stack: error.stack,
    });

    await sendErrorNotification({
      user: userEmail,
      station: stationName,
      error: error.message,
    });

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
