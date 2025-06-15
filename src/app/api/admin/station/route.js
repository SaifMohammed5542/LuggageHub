// app/api/admin/station/route.js
import dbConnect from '../../../../lib/dbConnect';
import Station from '../../../../models/Station';
import { verifyJWT } from '../../../../lib/auth';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    console.log('🔁 Connecting to DB...');
    await dbConnect();
    console.log('✅ DB Connected');

    const token = req.headers.get('authorization')?.split(' ')[1];
    console.log('🔐 Token:', token);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    console.log('🧾 Decoded Token:', decoded);

    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body;
    try {
      body = await req.json();
      console.log('📦 Request Body:', body);
    } catch (jsonErr) {
      console.error('❌ JSON Parsing Error:', jsonErr);
      return NextResponse.json({ error: 'Invalid JSON format' }, { status: 400 });
    }

    const { name, location, latitude, longitude } = body;

    if (!name || !location || latitude === undefined || longitude === undefined) {
      console.log('❌ Missing required fields');
      return NextResponse.json({ error: 'Missing name, location, or coordinates' }, { status: 400 });
    }

    const newStation = new Station({
      name,
      location,
      coordinates: {
        type: 'Point',
        coordinates: [longitude, latitude], // NOTE: GeoJSON uses [lng, lat]
      }
    });

    console.log('📌 Saving Station:', newStation);
    await newStation.save();
    console.log('✅ Station Saved');

    return NextResponse.json({ message: 'Station created', station: newStation });
  } catch (err) {
    console.error('🔥 Station Creation Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
