// Ensure this route runs on Node.js (not Edge), so DNS + Mongoose work reliably
export const runtime = "nodejs";

import jwt from "jsonwebtoken";
import dbConnect from "../../../../lib/dbConnect";
import User from "../../../../models/User";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    await dbConnect();

    const { email, password } = await req.json();

    // 1) Basic validation
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

    // 4) Issue JWT
    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        role: user.role,
        assignedStation: user.assignedStation || null,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return NextResponse.json(
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
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
