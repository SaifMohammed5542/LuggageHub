// /app/api/station/list/route.js
import dbConnect from '../../../../lib/dbConnect';
import Station from '../../../../models/Station';
import jwt from 'jsonwebtoken';
import Booking from '../../../../models/booking';
import { NextResponse } from 'next/server';

export async function GET(req) {
  
  await dbConnect();

  const authHeader = req.headers.get('authorization');
  console.log("Auth Header:", authHeader); // ✅ Add this
  const token = authHeader?.split(' ')[1];
  console.log("Token extracted:", token); // ✅ Add this


  try {
    // If a token is present, verify it (optional, for potential future use)
    if (token) {
      jwt.verify(token, process.env.JWT_SECRET);
      // You could potentially filter stations based on user role here if needed in the future
    }

    // Fetch all stations regardless of authentication status
const stations = await Station.find({ status: 'active' });
    // Calculate current capacity for each station
const enrichedStations = await Promise.all(
  stations.map(async (station) => {
    const stationObj = station.toObject();
    
    // Count active bookings (bags currently stored)
    const activeBookings = await Booking.aggregate([
      {
        $match: {
          stationId: station._id,
          dropOffDate: { $lte: new Date() },
          pickUpDate: { $gte: new Date() },
          status: { $in: ['confirmed', 'active'] }
        }
      },
      {
        $group: {
          _id: null,
          totalBags: { 
            $sum: { $add: ['$smallBagCount', '$largeBagCount'] }
          }
        }
      }
    ]);
    
    stationObj.currentCapacity = activeBookings[0]?.totalBags || 0;
    return stationObj;
  })
);

return NextResponse.json({ 
  success: true,
  stations: enrichedStations 
});

  } catch (jwtError) {
    console.error("JWT Verification Error:", jwtError);
    // If token verification fails, still fetch and return all stations
    try {
      const stations = await Station.find({ status: 'active' });
return NextResponse.json({ 
  success: true,
  stations: stations.map(s => ({ ...s.toObject(), currentCapacity: 0 }))
});
    } catch (dbError) {
      console.error("Database Error:", dbError);
      return NextResponse.json({ error: 'Failed to fetch stations from the database' }, { status: 500 });
    }
  }
}