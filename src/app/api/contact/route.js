import nodemailer from "nodemailer";

export async function POST(req) {
  try {
    const { name, email, message } = await req.json();

    // Setup transporter with Hostinger SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, // smtp.hostinger.com
      port: process.env.SMTP_PORT, // 465
      secure: true, // true for port 465
      auth: {
        user: process.env.EMAIL_USER, // support@luggageterminal.com
        pass: process.env.EMAIL_PASS, // your email password
      },
    });

    // Send email to your support inbox
    await transporter.sendMail({
      from: `"Luggage Terminal Contact" <${process.env.EMAIL_USER}>`,
      to: "support@luggageterminal.com",
      replyTo: email, // lets you reply directly to customer
      subject: "New Contact Form Submission",
      html: `
        <h3>New Message from Contact Form</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong><br/> ${message}</p>
      `,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Email error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
}
