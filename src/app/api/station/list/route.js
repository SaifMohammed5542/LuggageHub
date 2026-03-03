// app/api/station/list/route.js
import { NextResponse } from "next/server";
import dbConnect from "../../../../lib/dbConnect";
import Station from "../../../../models/Station";
import Booking from "../../../../models/booking";

export async function GET() {
  try {
    await dbConnect();

    const stations = await Station.find({ status: "active" }).lean();

    const enrichedStations = await Promise.all(
      stations.map(async (station) => {
        const activeBookings = await Booking.aggregate([
          {
            $match: {
              stationId: station._id,
              dropOffDate: { $lte: new Date() },
              pickUpDate: { $gte: new Date() },
              status: { $in: ["confirmed", "active"] },
            },
          },
          {
            $group: {
              _id: null,
              totalBags: { $sum: { $add: ["$smallBagCount", "$largeBagCount"] } },
            },
          },
        ]);

        return {
          ...station,
          currentCapacity: activeBookings[0]?.totalBags || 0,
        };
      })
    );

    return NextResponse.json({ success: true, stations: enrichedStations });
  } catch (error) {
    console.error("Failed to fetch stations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stations" },
      { status: 500 }
    );
  }
}