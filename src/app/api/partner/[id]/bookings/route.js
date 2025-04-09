import dbConnect from '../../../../../lib/dbConnect';
import Booking from '../../../../../models/booking';
import Station from '../../../../../models/Station';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  await dbConnect();

  const token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Only allow the partner themselves or an admin
    if (decoded.role !== 'admin' && decoded.userId !== params.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Find the station assigned to this partner
    const station = await Station.findOne({ partner: params.id });

    if (!station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 });
    }

    // Fetch all bookings for this station
    const bookings = await Booking.find({ station: station._id }).sort({ createdAt: -1 });

    return NextResponse.json({ bookings });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Invalid token or server error' }, { status: 401 });
  }
}
