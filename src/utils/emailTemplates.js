// utils/emailTemplates.js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.ERROR_EMAIL_USER,
    pass: process.env.ERROR_EMAIL_PASS,
  },
});

/**
 * Send email verification link to user
 */
export async function sendVerificationEmail(email, username, verificationUrl) {
  try {
    await transporter.sendMail({
      from: `"Luggage Terminal" <${process.env.ERROR_EMAIL_USER}>`,
      to: email,
      subject: "✅ Verify Your Email - Luggage Terminal",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: #ffffff;
              border-radius: 10px;
              padding: 40px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 10px;
            }
            h1 {
              color: #1e293b;
              font-size: 24px;
              margin-bottom: 20px;
            }
            .button {
              display: inline-block;
              padding: 14px 32px;
              background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
              color: white !important;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .button:hover {
              background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              color: #64748b;
              font-size: 14px;
            }
            .warning {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 12px;
              margin: 20px 0;
              border-radius: 4px;
              font-size: 14px;
            }
            .link-text {
              background: #f1f5f9;
              padding: 12px;
              border-radius: 6px;
              word-break: break-all;
              font-size: 12px;
              margin-top: 15px;
              color: #475569;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🧳 Luggage Terminal</div>
            </div>
            
            <h1>Welcome, ${username}! 👋</h1>
            
            <p>Thanks for registering with Luggage Terminal. We're excited to have you on board!</p>
            
            <p>To complete your registration and access all features, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">
                ✅ Verify Email Address
              </a>
            </div>
            
            <div class="warning">
              ⏰ <strong>This link expires in 24 hours.</strong> If it expires, you can request a new one from the login page.
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <div class="link-text">
              ${verificationUrl}
            </div>
            
            <div class="footer">
              <p><strong>Didn't create an account?</strong><br>
              You can safely ignore this email.</p>
              
              <p style="margin-top: 20px;">
                Questions? Contact us at ${process.env.ERROR_EMAIL_USER}
              </p>
              
              <p style="margin-top: 20px; color: #94a3b8; font-size: 12px;">
                © ${new Date().getFullYear()} Luggage Terminal. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Welcome to Luggage Terminal, ${username}!

Please verify your email address by clicking this link:
${verificationUrl}

This link expires in 24 hours.

If you didn't create an account, you can safely ignore this email.

Questions? Contact us at ${process.env.ERROR_EMAIL_USER}
      `,
    });

    console.log(`✅ Verification email sent to ${email}`);
    return { success: true };
  } catch (err) {
    console.error("❌ Failed to send verification email:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Send welcome email after verification
 */
export async function sendWelcomeEmail(email, username) {
  try {
    await transporter.sendMail({
      from: `"Luggage Terminal" <${process.env.ERROR_EMAIL_USER}>`,
      to: email,
      subject: "🎉 Welcome to Luggage Terminal!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: #ffffff;
              border-radius: 10px;
              padding: 40px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .success-icon {
              text-align: center;
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 {
              color: #059669;
              text-align: center;
              margin-bottom: 20px;
            }
            .button {
              display: inline-block;
              padding: 14px 32px;
              background: linear-gradient(135deg, #059669 0%, #047857 100%);
              color: white !important;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✅</div>
            <h1>Email Verified!</h1>
            
            <p>Hi ${username},</p>
            
            <p>Your email has been successfully verified. You can now:</p>
            
            <ul>
              <li>📦 Book luggage storage at any of our locations</li>
              <li>📋 View your booking history</li>
              <li>🔔 Receive booking confirmations and updates</li>
              <li>💰 Track your bookings and payments</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/map-booking" class="button">
                🗺️ Find Storage Near You
              </a>
            </div>
            
            <p style="margin-top: 30px; color: #64748b; font-size: 14px; text-align: center;">
              Need help? Contact us at ${process.env.ERROR_EMAIL_USER}
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`✅ Welcome email sent to ${email}`);
  } catch (err) {
    console.error("❌ Failed to send welcome email:", err);
  }
}


// ─────────────────────────────────────────────────────────────
// ADD THIS TO THE BOTTOM OF utils/emailTemplates.js
// ─────────────────────────────────────────────────────────────

/**
 * Send partner lead emails:
 * 1. Notification to you (admin)
 * 2. Confirmation to the applicant
 */
const partnerTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


export async function sendPartnerLeadEmails({ businessName, ownerName, suburb, phone, email, businessType }) {
  // 1. Notify you instantly
  await partnerTransporter.sendMail({
    from: `"Luggage Terminal Partners" <partners@luggageterminal.com>`,
    to: 'partners@luggageterminal.com',
    subject: `🧳 New Partner Lead — ${businessName} (${suburb})`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .container { background: #ffffff; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #0284C7 0%, #0369a1 100%); color: white; padding: 20px 24px; border-radius: 8px; margin-bottom: 24px; }
          .header h2 { margin: 0 0 4px; font-size: 20px; }
          .header p { margin: 0; opacity: 0.85; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
          td:first-child { color: #64748b; font-weight: 600; font-size: 13px; width: 140px; }
          td:last-child { color: #1e293b; }
          .action-box { background: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #F59E0B; border-radius: 8px; padding: 14px 16px; }
          .action-box p { margin: 0; font-size: 13px; color: #92400e; }
          .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🧳 New Partner Lead</h2>
            <p>Someone wants to join the Luggage Terminal partner network</p>
          </div>
          <table>
            ${[
              ['Business Name', businessName],
              ['Owner / Manager', ownerName],
              ['Suburb', suburb],
              ['Phone', phone],
              ['Email', email],
              ['Business Type', businessType || '—'],
            ].map(([label, value]) => `
              <tr><td>${label}</td><td>${value}</td></tr>
            `).join('')}
          </table>
          <div class="action-box">
            <p>⚡ <strong>Action needed:</strong> Reach out to ${ownerName} within 24 hours to close this lead.</p>
          </div>
          <div class="footer">
            Luggage Terminal · Melbourne CBD · luggageterminal.com
          </div>
        </div>
      </body>
      </html>
    `,
  });

  // 2. Confirm to applicant
  await partnerTransporter.sendMail({
    from: `"Luggage Terminal Partners" <partners@luggageterminal.com>`,    
    to: email,
    subject: `We received your application — Luggage Terminal`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .container { background: #ffffff; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 28px; font-weight: bold; color: #0284C7; margin-bottom: 10px; }
          h1 { color: #1e293b; font-size: 24px; margin-bottom: 20px; text-align: center; }
          .steps { background: #f1f5f9; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
          .steps p { margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #475569; }
          .steps ol { margin: 8px 0 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.8; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🧳 Luggage Terminal</div>
          </div>
          <h1>Thanks, ${ownerName}! 🎉</h1>
          <p>We've received your application for <strong>${businessName}</strong> to join the Luggage Terminal partner network.</p>
          <div class="steps">
            <p>What happens next:</p>
            <ol>
              <li>Our team reviews your application (within 48 hours)</li>
              <li>We contact you directly to confirm details</li>
              <li>Your station goes live and you start earning</li>
            </ol>
          </div>
            <p>Any questions? Email us at <a href="mailto:partners@luggageterminal.com" style="color: #0284C7;">partners@luggageterminal.com</a></p>
          <p>— The Luggage Terminal Team</p>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Luggage Terminal. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Hi ${ownerName},

Thanks for applying to become a Luggage Terminal partner!

We've received your application for ${businessName} and will review it within 48 hours.

What happens next:
1. Our team reviews your application
2. We contact you to confirm details
3. Your station goes live and you start earning

Questions? Reply to this email or partners@luggageterminal.com

— The Luggage Terminal Team
    `,
  });

  console.log(`✅ Partner lead emails sent for ${businessName} (${email})`);
}