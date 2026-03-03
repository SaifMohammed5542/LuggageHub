// app/api/station/nearest/route.js
import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/dbConnect";
import Station from "../../../../models/Station";

export async function POST(request) {
  try {
    await dbConnect();

    const { latitude, longitude } = await request.json();

    if (latitude == null || longitude == null) {
      return NextResponse.json(
        { success: false, message: "Coordinates required" },
        { status: 400 }
      );
    }

    const stations = await Station.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [longitude, latitude] },
          distanceField: "distanceMeters",
          spherical: true,
          query: { status: "active" },
        },
      },
      { $limit: 5 },
      {
        $addFields: {
          distanceKm: { $round: [{ $divide: ["$distanceMeters", 1000] }, 2] },
        },
      },
    ]);

    return NextResponse.json({ success: true, stations });
  } catch (error) {
    console.error("Nearest station search failed:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}