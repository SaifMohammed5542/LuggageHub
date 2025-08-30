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

export async function POST(request) {
  try {
    await dbConnect(); // Connect to MongoDB
    

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

    // ✅ Save the booking first
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

    // ✅ Fetch station and partners
    const station = await Station.findById(stationId).populate("partners");
    let stationName = station?.name || stationId;

    // Override station name for special case
    if (stationId.toString() === "67fb37ffa0f2f5d8223497d7") {
      stationName = "EzyMart 660 Bourke street";
    }

    // ✅ Setup mail transporter
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

    // ✅ Notify partners of that station
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

    // ✅ Send admin + user emails
    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(userMailOptions);

    return NextResponse.json(
      { success: true, message: "Booking saved and emails sent" },
      { status: 200 }
    );
  } catch (error) {
  console.error("💥 Booking API Error:", error);

  // ✅ Try to extract user + station from request
  let userEmail = "Unknown";
  let stationName = "Unknown";

  try {
    // Clone request because body can only be read once
    const clonedReq = request.clone();
    const body = await clonedReq.json();

    if (body?.email) userEmail = body.email;
    if (body?.stationId) {
      try {
        // Lookup station name
        const stationDoc = await Station.findById(body.stationId);
        stationName = stationDoc?.name || body.stationId;
      } catch {
        stationName = body.stationId;
      }
    }
  } catch (parseErr) {
    console.warn("⚠️ Could not parse request body in error handler:", parseErr);
  }

  // ✅ Save error to DB
  await ErrorLog.create({
    user: userEmail,
    station: stationName,
    errorType: "BOOKING_API_ERROR",
    message: error.message,
    stack: error.stack,
  });

  // ✅ Send error alert email
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
