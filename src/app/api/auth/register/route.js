import dbConnect from '../../../../lib/dbConnect';
import User from '../../../../models/User';
import { NextResponse } from 'next/server';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req) {
  try {
    await dbConnect();

    const body = await req.json();
    const username = body?.username?.trim();
    const email = body?.email?.toLowerCase().trim();
    const password = body?.password;

    let errors = {};

    // Basic validation (server-side; never trust the client)
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
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    // Prevent duplicate emails
    const existingByEmail = await User.findOne({ email }).lean();
    if (existingByEmail) {
      return NextResponse.json(
        { errors: { email: "Email already registered" } },
        { status: 409 }
      );
    }

    // ✅ Whitelist fields explicitly; NEVER accept role from client
    const newUser = new User({
      username,
      email,
      password, // hashed by userSchema.pre('save')
      role: "user",
    });

    await newUser.save();

    return NextResponse.json({ message: "User registered successfully" }, { status: 201 });
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json(
        { errors: { email: "Email already registered" } },
        { status: 409 }
      );
    }
    console.error("Registration Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
