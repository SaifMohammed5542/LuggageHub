import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail", // or SMTP if you prefer
  auth: {
    user: process.env.ERROR_EMAIL_USER, // error inbox
    pass: process.env.ERROR_EMAIL_PASS, // Gmail App Password
  },
});

export async function sendErrorNotification({ user, station, error }) {
  try {
    await transporter.sendMail({
      from: `"Luggage Terminal Error Bot" <${process.env.ERROR_EMAIL_USER}>`,
      to: process.env.ERROR_EMAIL_RECEIVER,
      // ✅ Subject now includes station + user
      subject: `⚠️ Booking Error - ${station} (${user})`,
      text: `
🚨 Error Alert 🚨
-----------------
User: ${user}
Station: ${station}
Error: ${error}
Time: ${new Date().toISOString()}
      `,
    });
  } catch (err) {
    console.error("❌ Failed to send error email:", err);
  }
}

