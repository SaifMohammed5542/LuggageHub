import dbConnect from '../../../../lib/dbConnect';
import Booking from '../../../../models/booking';
import User from '../../../../models/User';
import { verifyJWT } from '../../../../lib/auth';
import { NextResponse } from 'next/server';

export async function GET(req) {
  await dbConnect();

  const token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decoded = verifyJWT(token);
    if (!decoded || decoded.role !== 'partner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the partner's assigned stationId
    const partner = await User.findById(decoded.id);
    if (!partner || !partner.assignedStation) {
      return NextResponse.json({ error: 'No assigned station' }, { status: 404 });
    }

    // Fetch bookings only for this station
    const bookings = await Booking.find({ stationId: partner.assignedStation })
      .populate('stationId')
      .sort({ createdAt: -1 });

    return NextResponse.json({ bookings }, { status: 200 });
  } catch (err) {
    console.error('Error fetching partner bookings:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
