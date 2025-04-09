// /app/api/station/list/route.js
import dbConnect from '../../../../lib/dbConnect';
import Station from '../../../../models/Station';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

export async function GET(req) {
  await dbConnect();

  const token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    const stations = await Station.find();
    return NextResponse.json({ stations });
  } catch (err) { // Changed 'error' to 'err' to be consistent and potentially used
    console.error("JWT Verification Error:", err); // Added logging for debugging
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}