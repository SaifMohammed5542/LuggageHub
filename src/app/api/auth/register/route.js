// app/api/auth/register/route.js - UPDATED WITH BETTER ERROR MESSAGES
import dbConnect from '../../../../lib/dbConnect';
import User from '../../../../models/User';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { sendVerificationEmail } from '../../../../utils/emailTemplates';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password);
}

export async function POST(req) {
  try {
    await dbConnect();

    const body = await req.json();
    const username = body?.username?.trim();
    const email = body?.email?.toLowerCase().trim();
    const password = body?.password;

    let errors = {};

    // Basic validation
    if (!username) {
      errors.username = "Username is required";
    }

    if (!email) {
      errors.email = "Email is required";
    } else if (!isValidEmail(email)) {
      errors.email = "Invalid email format";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (!isValidPassword(password)) {
      errors.password = "Password must be at least 8 characters and include letters & numbers only";
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    // ✅ NEW: Check for existing email
    const existingByEmail = await User.findOne({ email }).lean();
    if (existingByEmail) {
      return NextResponse.json(
        { errors: { email: "This email is already registered. Please login or use a different email." } },
        { status: 409 }
      );
    }

    // ✅ NEW: Check for existing username
    const existingByUsername = await User.findOne({ username }).lean();
    if (existingByUsername) {
      return NextResponse.json(
        { errors: { username: "This username is already taken. Please choose a different one." } },
        { status: 409 }
      );
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create new user
    const newUser = new User({
      username,
      email,
      password,
      role: "user",
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
      // ✅ Auto-delete if not verified within 30 days
      unverifiedExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    await newUser.save();

    // Send verification email
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${verificationToken}`;
    
    const emailResult = await sendVerificationEmail(email, username, verificationUrl);
    
    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      // Don't fail registration if email fails - user can resend later
    }

    return NextResponse.json(
      { 
        message: "Registration successful! Please check your email to verify your account.",
        emailSent: emailResult.success
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration Error:", error);
    
    // ✅ NEW: Handle MongoDB duplicate key errors (backup in case unique index check fails)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      if (field === 'email') {
        return NextResponse.json(
          { errors: { email: "This email is already registered." } },
          { status: 409 }
        );
      }
      if (field === 'username') {
        return NextResponse.json(
          { errors: { username: "This username is already taken." } },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}