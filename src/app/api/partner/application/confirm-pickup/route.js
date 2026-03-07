// app/api/partner/application/confirm-pickup/route.js
// ✅ USES COOKIES + DELETES ALL PHOTOS

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/models/booking';
import { verifyJWT } from '@/lib/auth';

export async function POST(request) {
  try {
    await dbConnect();

    // ✅ Get token from cookie
    const token = request.cookies.get('auth_session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded || decoded.expired || decoded.role !== 'partner') {
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
    booking.checkOutTime = new Date();

    // ✅ DELETE ALL PHOTOS
    booking.luggagePhotoUrl = null;
    booking.luggagePhotos = [];
    
    await booking.save();

    return NextResponse.json({
      success: true,
      message: 'Pick-up confirmed and photos deleted',
      booking: {
        bookingReference: booking.bookingReference,
        status: booking.status,
        checkOutTime: booking.checkOutTime,
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