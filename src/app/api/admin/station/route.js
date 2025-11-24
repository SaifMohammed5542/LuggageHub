// app/api/admin/station/route.js
import dbConnect from '../../../../lib/dbConnect';
import Station from '../../../../models/Station';
import { verifyJWT } from '../../../../lib/auth';
import { NextResponse } from 'next/server';

// ✅ Helper to verify admin
async function verifyAdmin(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Unauthorized', status: 401 };
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyJWT(token);
    if (decoded && decoded.expired) {
      return { error: 'Token expired', status: 401, expired: true };
    }
    if (!decoded || decoded.role !== 'admin') {
      return { error: 'Forbidden: Admin access only', status: 403 };
    }
    return { decoded };
  } catch (error) {
    console.error('verifyAdmin error:', error);
    return { error: 'Invalid token', status: 401 };
  }
}

// 🟢 POST - Create New Station
export async function POST(req) {
  await dbConnect();

  const auth = await verifyAdmin(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body;
  try {
    body = await req.json();
  } catch (error) {
    console.error('Invalid JSON in POST /admin/station:', error);
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { 
    name, 
    location, 
    latitude, 
    longitude, 
    bankDetails, 
    timings, 
    capacity, 
    description, 
    photos,
    timezone 
  } = body;

  // Validation
  if (!name || !location || latitude === undefined || longitude === undefined) {
    return NextResponse.json({ 
      error: 'Missing required fields: name, location, latitude, longitude' 
    }, { status: 400 });
  }

  try {
    const newStation = new Station({
      name,
      location,
      coordinates: { 
        type: 'Point', 
        coordinates: [parseFloat(longitude), parseFloat(latitude)] 
      },
      bankDetails: bankDetails || {},
      timings: timings || {},
      capacity: capacity || 0,
      description: description || '',
      photos: photos || [],
      timezone: timezone || 'Australia/Melbourne',
      status: 'active'
    });

    await newStation.save();

    return NextResponse.json({ 
      message: 'Station created successfully', 
      station: newStation 
    }, { status: 201 });
  } catch (error) {
    console.error('Station creation error:', error);
    
    if (error && error.code === 11000) {
      return NextResponse.json({ 
        error: 'Station with this name already exists' 
      }, { status: 409 });
    }
    
    return NextResponse.json({ 
      error: 'Server error creating station' 
    }, { status: 500 });
  }
}

// 🟢 GET - List All Stations
export async function GET(req) {
  await dbConnect();

  const auth = await verifyAdmin(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const stations = await Station.find()
      .populate('partners', 'username email phone') // Include partner info
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ 
      stations,
      count: stations.length 
    }, { status: 200 });
  } catch (error) {
    console.error('Fetch stations error:', error);
    return NextResponse.json({ 
      error: 'Server error fetching stations' 
    }, { status: 500 });
  }
}
