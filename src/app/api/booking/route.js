// /app/api/booking/route.js
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import dbConnect from "../../../lib/dbConnect";
import Booking from "../../../models/booking";
import Station from "../../../models/Station";
// eslint-disable-next-line no-unused-vars
import User from "../../../models/User";


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
📍 Station ID: ${stationId}

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
        <p>📍 <strong>Station ID:</strong> ${stationId}</p>
        <p>❓ If you have any questions, feel free to contact us at 
        <a href="mailto:support@luggageterminal.com">support@luggageterminal.com</a>.</p>
        <p>Best regards,<br/>🧳 <strong>Your Luggage Terminal Team</strong></p>
      `,
    };

    // ✅ Fetch partner for the station
    const station = await Station.findById(stationId).populate("partner");

    if (station?.partner?.email) {
      const partnerMailOptions = {
        from: `"Luggage Terminal" <no-reply@luggageterminal.com>`,
        to: station.partner.email,
        subject: "🧳 New Luggage Storage Booking at Your Station",
        text: adminMailOptions.text, // same content as admin
      };

      await transporter.sendMail(partnerMailOptions);
    }

    // ✅ Send all mails
    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(userMailOptions);

    return NextResponse.json(
      { success: true, message: "Booking saved and emails sent" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Booking Error:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}
