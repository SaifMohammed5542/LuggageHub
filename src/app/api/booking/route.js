// /app/api/booking/route.js
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request) {
  try {
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
    } = await request.json();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const adminMailOptions = {
      from: process.env.EMAIL_USER,
      to: "luggage5542@gmail.com",
      subject: "New Luggage Storage Booking",
      text: `
        New Booking Details:
        -------------------
        Full Name: ${fullName}
        Email: ${email}
        Phone: ${phone}
        Drop-off Date: ${dropOffDate}
        Pick-up Date: ${pickUpDate}
        Luggage Count: ${luggageCount}
        Special Instructions: ${specialInstructions}
        Payment ID: ${paymentId}
        Station ID: ${stationId}
      `,
    };

    const userMailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Luggage Storage Booking Confirmation",
      text: `
        Dear ${fullName},

        Thank you for booking with us! Here are your booking details:

        Full Name: ${fullName}
        Email: ${email}
        Phone: ${phone}
        Drop-off Date: ${dropOffDate}
        Pick-up Date: ${pickUpDate}
        Luggage Count: ${luggageCount}
        Special Instructions: ${specialInstructions}
        Payment ID: ${paymentId}
        Station ID: ${stationId}

        If you have any questions, feel free to contact us.

        Best regards,
        Your Luggage Storage Online Team
      `,
    };

    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(userMailOptions);

    return NextResponse.json(
      { success: true, message: "Emails sent successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { success: false, message: "Failed to send emails" },
      { status: 500 }
    );
  }
}