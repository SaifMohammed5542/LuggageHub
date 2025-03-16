// app/api/booking/route.js
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  const emailServiceApiKey = process.env.EMAIL_SERVICE_API_KEY;
  console.log('EMAIL_SERVICE_API_KEY:', emailServiceApiKey); // Log the variable

  if (!emailServiceApiKey) {
    return res.status(500).json({ error: 'Email service API key is missing!' });
  }

  // Your email sending logic here...
}


export async function POST(request) {
  try {
    const { fullName, email, phone, dropOffDate, pickUpDate, luggageCount, specialInstructions, paymentId } =
      await request.json();

    // Create a Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: "gmail", // Use your email service
      auth: {
        user: process.env.EMAIL_USER, // Your email address
        pass: process.env.EMAIL_PASS, // Your email password or app password
      },
    });



    
    // Email content for admin
    const adminMailOptions = {
      from: process.env.EMAIL_USER,
      to: "luggage5542@gmail.com", // Your email address
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
      `,
    };

    // Email content for user
    const userMailOptions = {
      from: process.env.EMAIL_USER,
      to: email, // User's email address
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

        If you have any questions, feel free to contact us.

        Best regards,
        Your Luggage Storage Online Team
      `,
    };

    // Send the emails
    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(userMailOptions);

    // Send a success response
    return NextResponse.json(
      { success: true, message: "Emails sent successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error sending email:", error);

    // Send an error response
    return NextResponse.json(
      { success: false, message: "Failed to send emails" },
      { status: 500 }
    );
  }
}