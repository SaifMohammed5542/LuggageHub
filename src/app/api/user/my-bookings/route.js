// app/api/user/my-bookings/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/dbConnect";
import Booking from "../../../../models/booking";
import User from "../../../../models/User";
import Station from "../../../../models/Station"; // ✅ ADDED
import jwt from "jsonwebtoken";

// ✅ Ensure Station is registered
void Station;

export async function GET(req) {
  try {
    await dbConnect();

    // 1. Verify auth token
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    // 2. Get user from database
    const user = await User.findById(decoded.userId).lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 3. Build query based on email verification status
    let query;
    if (user.isEmailVerified) {
      // ✅ Verified: show ALL bookings matched by email (guest + logged-in)
      query = {
        $or: [
          { userId: user._id },
          { email: user.email, userId: null },
          { email: user.email, userId: { $exists: false } }
        ]
      };
    } else {
      // ⚠️ Not verified: only show bookings made while logged in
      query = { userId: user._id };
    }

    // 4. Fetch bookings with station details
    const bookings = await Booking.find(query)
      .populate("stationId", "name location address")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      bookings,
      isEmailVerified: user.isEmailVerified,
      totalCount: bookings.length
    }, { status: 200 });

  } catch (error) {
    console.error("My Bookings Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}