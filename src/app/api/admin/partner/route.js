//app/api/admin/partner/route.js
import dbConnect from '../../../../lib/dbConnect';
import User from '../../../../models/User'; 
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
    if (!decoded || decoded.role !== 'admin') {
      return { error: 'Forbidden: Admin access only', status: 403 };
    }
    return { decoded };
  } catch (error) {
    console.error('verifyAdmin error:', error);
    return { error: 'Invalid token', status: 401 };
  }
}

// 🟢 POST - Create New Partner
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
    console.error('Invalid JSON in POST /admin/partner:', error);
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { username, email, password, phone, stationId } = body;

  // Validation
  if (!username || !email || !password || !stationId) {
    return NextResponse.json({ 
      error: 'Missing required fields: username, email, password, stationId' 
    }, { status: 400 });
  }

  try {
    // Check if station exists
    const station = await Station.findById(stationId);
    if (!station) {
      return NextResponse.json({ 
        error: 'Station not found' 
      }, { status: 404 });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return NextResponse.json({ 
        error: 'User with this email or username already exists' 
      }, { status: 409 });
    }

    // Create partner
    const partner = new User({
      username,
      email,
      password, // Will be hashed by pre-save hook
      phone: phone || '',
      role: 'partner',
      assignedStation: stationId
    });

    await partner.save();

    // Add partner to station's partners array
    await Station.findByIdAndUpdate(stationId, {
      $addToSet: { partners: partner._id }
    });

    // Return partner without password
    const partnerResponse = partner.toObject();
    delete partnerResponse.password;

    return NextResponse.json({ 
      message: 'Partner created successfully', 
      partner: partnerResponse 
    }, { status: 201 });
  } catch (error) {
    console.error('Partner creation error:', error);
    
    if (error && error.code === 11000) {
      return NextResponse.json({ 
        error: 'Partner with this email or username already exists' 
      }, { status: 409 });
    }
    
    return NextResponse.json({ 
      error: 'Server error creating partner' 
    }, { status: 500 });
  }
}

// 🟢 GET - List All Partners
export async function GET(req) {
  await dbConnect();

  const auth = await verifyAdmin(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const partners = await User.find({ role: 'partner' })
      .populate('assignedStation', 'name location')
      .select('-password') // Exclude password
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ 
      partners,
      count: partners.length 
    }, { status: 200 });
  } catch (error) {
    console.error('Fetch partners error:', error);
    return NextResponse.json({ 
      error: 'Server error fetching partners' 
    }, { status: 500 });
  }
}
