// app/api/partner/application/confirm-pickup/route.js
// ✅ UPDATED TO DELETE ALL PHOTOS (up to 3)

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/models/booking';
import { verifyJWT } from '@/lib/auth';

export async function POST(request) {
  try {
    await dbConnect();

    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded || decoded.role !== 'partner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bookingReference } = body;

    if (!bookingReference) {
      return NextResponse.json(
        { error: 'Missing booking reference' },
        { status: 400 }
      );
    }

    const booking = await Booking.findOne({ bookingReference });
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status !== 'stored') {
      return NextResponse.json(
        { error: 'Booking is not in stored status' },
        { status: 400 }
      );
    }

    // ✅ UPDATE STATUS
    booking.status = 'completed';
    booking.pickUpTime = new Date();

    // ✅ DELETE ALL PHOTOS
    booking.luggagePhotoUrl = null;        // Old field
    booking.luggagePhotos = [];            // New array field
    
    await booking.save();

    return NextResponse.json({
      success: true,
      message: 'Pick-up confirmed and photos deleted',
      booking: {
        bookingReference: booking.bookingReference,
        status: booking.status,
        pickUpTime: booking.pickUpTime,
        photosDeleted: true
      }
    });

  } catch (error) {
    console.error('❌ Confirm pickup error:', error);
    return NextResponse.json(
      { error: 'Failed to confirm pick-up' },
      { status: 500 }
    );
  }
}