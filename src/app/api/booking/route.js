import nodemailer from "nodemailer";

export async function POST(req) {
  try {
    const body = await req.json();
    const { fullName, email, phone, location, dropOffDate, pickUpDate, luggageCount, luggageSize, specialInstructions } = body;

    // Create a transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS, // App password
      },
    });

    // Email details
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: "saifcool457@gmail.com", // Replace with your email
      subject: `New Luggage Booking from ${fullName}`,
      text: `
        📦 Luggage Booking Details:
        ------------------------------
        👤 Name: ${fullName}
        ✉️ Email: ${email}
        📞 Phone: ${phone}
        📍 Location: ${location}
        📅 Drop-off: ${dropOffDate}
        📅 Pick-up: ${pickUpDate}
        🎒 Luggage Count: ${luggageCount}
        📏 Luggage Size: ${luggageSize}
        📝 Special Instructions: ${specialInstructions || "None"}
      `,
    };

    await transporter.sendMail(mailOptions);
    return Response.json({ success: true, message: "Booking email sent!" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return Response.json({ success: false, message: "Failed to send email." }, { status: 500 });
  }
}
