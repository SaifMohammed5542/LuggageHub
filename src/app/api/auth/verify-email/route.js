// app/api/auth/verify-email/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/dbConnect";
import User from "../../../../models/User";
import { sendWelcomeEmail } from "../../../../utils/emailTemplates";

export async function GET(req) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      );
    }
    
    // Find user with this token that hasn't expired
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    });
    
    if (!user) {
      return NextResponse.json(
        { 
          error: "Invalid or expired verification token",
          expired: true
        },
        { status: 400 }
      );
    }
    
    // Check if already verified
    if (user.isEmailVerified) {
      return NextResponse.json({
        success: true,
        message: "Email already verified! You can login now.",
        alreadyVerified: true
      }, { status: 200 });
    }
    
    // ✅ Verify email
    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    user.updatedAt = new Date();
    await user.save();
    
    // ✅ Send welcome email (async, don't wait)
    sendWelcomeEmail(user.email, user.username).catch(err => {
      console.error('Failed to send welcome email:', err);
    });
    
    return NextResponse.json({
      success: true,
      message: "Email verified successfully! You can now login and access all features."
    }, { status: 200 });
    
  } catch (error) {
    console.error("Verify email error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}