// /app/api/station/list/route.js
import dbConnect from '../../../../lib/dbConnect';
import Station from '../../../../models/Station';
import jwt from 'jsonwebtoken';
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
    const stations = await Station.find();
    return NextResponse.json({ stations });

  } catch (jwtError) {
    console.error("JWT Verification Error:", jwtError);
    // If token verification fails, still fetch and return all stations
    try {
      const stations = await Station.find();
      return NextResponse.json({ stations });
    } catch (dbError) {
      console.error("Database Error:", dbError);
      return NextResponse.json({ error: 'Failed to fetch stations from the database' }, { status: 500 });
    }
  }
}