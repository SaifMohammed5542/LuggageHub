// app/api/admin/bookings/route.js
import { NextResponse } from "next/server";
import connectToDB from "../../../../lib/dbConnect";
import Booking from "../../../../models/booking";
import { verifyJWT } from "../../../../lib/auth";

export async function GET(req) {
  try {
    await connectToDB();

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (decoded && decoded.expired) {
      return NextResponse.json({ error: "Token expired", expired: true }, { status: 401 });
    }
    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const stationId = url.searchParams.get("stationId");

    const query = stationId ? { stationId } : {};

    // ✅ lean() returns plain JS objects (much faster than Mongoose docs)
    // ✅ select() only fetches the fields the dashboard actually uses
    // ✅ No populate() — stationId is already on the booking, admin fetches
    //    stations separately, so the N+1 populate is unnecessary
const bookings = await Booking.find(query)
  .select(
    "fullName email phone stationId dropOffDate pickUpDate " +
    "smallBagCount largeBagCount luggageCount totalAmount " +
    "paymentId specialInstructions status createdAt"
  )
  .populate("stationId", "_id name")
  .sort({ dropOffDate: -1 })
  .lean();

    return NextResponse.json({ bookings }, { status: 200 });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
