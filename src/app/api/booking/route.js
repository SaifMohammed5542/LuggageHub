// /app/api/booking/route.js
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import dbConnect from "../../../lib/dbConnect";
import Booking from "../../../models/booking";
import Station from "../../../models/Station";
// eslint-disable-next-line no-unused-vars
import User from "../../../models/User";
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

    // ✅ Fetch station and partners once
    const station = await Station.findById(stationId).populate("partners");

    let stationName = station?.name || stationId;

// 🔹 Override for one specific station
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

❓ For any admin inquiries, reach out to support@luggageterminal.com
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
        <p>🙍 <strong>Full Name:</strong> ${fullName}</p>
        <p>📧 <strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p>📱 <strong>Phone:</strong> ${phone}</p>
        <p>📅 <strong>Drop-off Date:</strong> ${dropOffDate}</p>
        <p>📦 <strong>Pick-up Date:</strong> ${pickUpDate}</p>
        <p>🎒 <strong>Luggage Count:</strong> ${luggageCount}</p>
        <p>📝 <strong>Special Instructions:</strong> ${specialInstructions}</p>
        <p>💳 <strong>Payment ID:</strong> ${paymentId}</p>
        <p>📍 <strong>Drop-off location:</strong> ${stationName}</p>

        <hr />
        <p>⭐️ <strong>We’d love your feedback!</strong></p>
        <p>
          👉 <a href="https://www.trustpilot.com/review/luggageterminal.com" target="_blank"
          style="background-color: #00b67a; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
            Leave a Review on Trustpilot
          </a>
        </p>

        <p>❓ If you have any questions, feel free to contact us at 
        <a href="mailto:support@luggageterminal.com">support@luggageterminal.com</a>.</p>
        <p>Best regards,<br/>🧳 <strong>Your Luggage Terminal Team</strong></p>
      `,
    };

    // ✅ Email to all partners of that station
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

    // ✅ Send admin and user emails
    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(userMailOptions);

    return NextResponse.json(
      { success: true, message: "Booking saved and emails sent" },
      { status: 200 }
    );
  } catch (error) {
    console.error("💥 Booking API Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Internal Server Error",
        stack: error.stack, // only keep during debugging
      },
      { status: 500 }
    );
  }
}
