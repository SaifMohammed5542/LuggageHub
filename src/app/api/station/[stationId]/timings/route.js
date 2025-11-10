// app/api/station/[stationId]/timings/route.js
import { NextResponse } from "next/server";
import dbConnect from "../../../../../lib/dbConnect";
import Station from "../../../../../models/Station";

export async function GET(request, { params }) {
  try {
    await dbConnect();
    
    const { stationId } = params;
    
    if (!stationId) {
      return NextResponse.json(
        { success: false, message: "Station ID is required" },
        { status: 400 }
      );
    }

    const station = await Station.findById(stationId).select('name timings timezone');
    
    if (!station) {
      return NextResponse.json(
        { success: false, message: "Station not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      timings: station.timings,
      timezone: station.timezone,
      stationName: station.name
    }, { status: 200 });
    
  } catch (error) {
    console.error("Error fetching station timings:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch station timings" },
      { status: 500 }
    );
  }
}