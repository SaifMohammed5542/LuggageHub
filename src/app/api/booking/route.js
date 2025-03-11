import nodemailer from "nodemailer";

// API Route Handler
export async function POST(req) {
  try {
    // Parse JSON from the request body
    const body = await req.json();
    const { fullName, email, phone, location, dropOffDate, pickUpDate, luggageCount, luggageSize, specialInstructions, paymentId } = body;


    // Generate a unique Order ID using Date.now() and a random string
    const orderId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;



    // Ensure environment variables are set
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("❌ Missing EMAIL_USER or EMAIL_PASS in environment variables.");
      return new Response(
        JSON.stringify({ success: false, message: "Server email configuration error." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create a transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS, // App password
      },
    });

    // Email details to the admin
    const mailOptionsAdmin = {
      from: process.env.EMAIL_USER,
      to: "luggage5542@gmail.com", // Replace with your admin email
      subject: `📦 New Luggage Booking - ${fullName}`,
      text: `
        📦 Luggage Booking Details:
        ------------------------------
        🆔 Order ID: ${orderId}
        👤 Name: ${fullName}
        ✉️ Email: ${email}
        📞 Phone: ${phone}
        📍 Location: ${location}
        📅 Drop-off: ${dropOffDate}
        📅 Pick-up: ${pickUpDate}
        🎒 Luggage Count: ${luggageCount}
        📏 Luggage Size: ${luggageSize}
        📝 Special Instructions: ${specialInstructions || "None"}
        💳 Payment ID: ${paymentId || "Not available"}
      `,
    };

    // Email details to the user
    const mailOptionsUser = {
      from: process.env.EMAIL_USER,
      to: email, // The user's email
      subject: `📦 Your Luggage Booking Confirmation`,
      text: `
        Dear ${fullName},
    
        Your booking has been successfully confirmed! Here are the details:
        ---------------------------------------------------------------
        🆔 Order ID: ${orderId}
        👤 Name: ${fullName}
        ✉️ Email: ${email}
        📞 Phone: ${phone}
        📍 Location: ${location}
        📅 Drop-off: ${dropOffDate}
        📅 Pick-up: ${pickUpDate}
        🎒 Luggage Count: ${luggageCount}
        📏 Luggage Size: ${luggageSize}
        📝 Special Instructions: ${specialInstructions || "None"}
        💳 Payment ID: ${paymentId || "Not available"}
    
        Thank you for using our service! We look forward to storing your luggage.
    
        Best regards,
        Luggage Storage Team
      `,
    };

    // Send the email to the admin
    await transporter.sendMail(mailOptionsAdmin);

    // Send the email to the user
    await transporter.sendMail(mailOptionsUser);

    console.log(`✅ Booking email sent successfully for ${fullName}`);

    return new Response(
      JSON.stringify({ success: true, message: "Booking email sent!" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Email sending failed:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Failed to send email." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// (Optional) GET Method for testing API response
export async function GET() {
  return new Response(
    JSON.stringify({ message: "Booking API is running!" }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
