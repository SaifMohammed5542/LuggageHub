// app/api/auth/login/route.js - UPDATED WITH EMAIL VERIFICATION CHECK
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/dbConnect";
import User from "../../../../models/User";
import jwt from "jsonwebtoken";

export async function POST(req) {
  try {
    await dbConnect();

    const { email, password } = await req.json();

    // 1) Validation
    const errors = {};
    if (!email) errors.email = "Email is required";
    if (!password) errors.password = "Password is required";
    
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    // 2) Find user
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { errors: { email: "No account found with this email" } },
        { status: 401 }
      );
    }

    // 3) Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return NextResponse.json(
        { errors: { password: "Incorrect password" } },
        { status: 401 }
      );
    }

    // ✅ NEW: Check if email is verified (only for regular users, not admin/partner)
    if (user.role === 'user' && !user.isEmailVerified) {
      return NextResponse.json(
        { 
          errors: { 
            email: "Please verify your email before logging in. Check your inbox for the verification link." 
          },
          needsVerification: true,
          email: user.email
        },
        { status: 403 }
      );
    }

    // 4) Create tokens
    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        assignedStation: user.assignedStation || null,
        lastActivity: Date.now()
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // 5) Create response with HttpOnly cookie
    const response = NextResponse.json(
      {
        message: "Login successful",
        token,
        userId: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        assignedStation: user.assignedStation || null,
      },
      { status: 200 }
    );

    // Set HttpOnly cookie for refresh token
    response.cookies.set('auth_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    });

    return response;

  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}