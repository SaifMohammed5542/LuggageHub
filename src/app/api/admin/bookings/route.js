import { NextResponse } from "next/server";
import connectToDB from "../../../../lib/dbConnect";
import Booking from "../../../../models/booking";
import { verifyJWT } from "../../../../lib/auth"; // ✅ import the helper

export async function GET(req) {
  try {
    await connectToDB();

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyJWT(token); // ✅ using helper
    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const stationId = url.searchParams.get("stationId");

    let bookings;
    if (stationId) {
      bookings = await Booking.find({ stationId }).populate("stationId");
    } else {
      bookings = await Booking.find().populate("stationId");
    }

    return NextResponse.json({ bookings }, { status: 200 });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
