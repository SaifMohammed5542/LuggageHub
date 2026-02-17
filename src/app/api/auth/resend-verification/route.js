// app/api/auth/resend-verification/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/dbConnect";
import User from "../../../../models/User";
import crypto from 'crypto';
import { sendVerificationEmail } from "../../../../utils/emailTemplates";

export async function POST(req) {
  try {
    await dbConnect();

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      // Don't reveal if user exists or not (security)
      return NextResponse.json({
        message: "If an account exists with this email, a verification link has been sent."
      }, { status: 200 });
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return NextResponse.json({
        message: "This email is already verified. You can login now."
      }, { status: 200 });
    }

    // Generate new token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpires;
    user.updatedAt = new Date();
    await user.save();

    // Send email
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${verificationToken}`;
    
    const emailResult = await sendVerificationEmail(user.email, user.username, verificationUrl);
    
    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      return NextResponse.json(
        { error: "Failed to send verification email. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Verification email sent! Please check your inbox."
    }, { status: 200 });

  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}