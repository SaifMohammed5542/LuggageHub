// /app/api/booking/route.js
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import dbConnect from "../../../lib/dbConnect";
import Booking from "../../../models/booking";

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
      userId, // optional if logged-in user is provided
    } = await request.json();

    // ✅ Save the booking in MongoDB
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

    // ✅ Email setup
    console.log("USER:", process.env.EMAIL_USER);
console.log("PASS length:", process.env.EMAIL_PASS?.length);



    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: true, // true for 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const adminMailOptions = {
  from: `"Luggage Terminal" <no-reply@luggageterminal.com>`,
  to: "luggage5542@gmail.com",
  subject: "🧳 New Luggage Storage Booking",
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

    <p>Best regards,<br/>
    🧳 <strong>Your Luggage Terminal Team</strong></p>
  `,
};


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
