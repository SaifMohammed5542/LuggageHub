// app/api/partner/application/confirm-dropoff/route.js
// ✅ USES COOKIES

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/models/booking';
import User from '@/models/User';
import { verifyJWT } from '@/lib/auth';

export async function POST(request) {
  try {
    await dbConnect();

    // ✅ Get token from cookie
    const token = request.cookies.get('auth_session')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyJWT(token);
    
    if (!decoded || decoded.expired) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (decoded.role !== 'partner') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Partners only' },
        { status: 403 }
      );
    }

    const partnerId = decoded.userId;

    // 2. Get booking reference from request
    const body = await request.json();
    const { bookingReference } = body;

    if (!bookingReference) {
      return NextResponse.json(
        { success: false, error: 'Booking reference is required' },
        { status: 400 }
      );
    }

    console.log('📦 Confirming drop-off for:', bookingReference);

    // 3. Find the booking
    const booking = await Booking.findOne({ bookingReference });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // 4. Verify partner owns this station
    const partner = await User.findById(partnerId).lean();
    if (!partner?.assignedStation) {
      return NextResponse.json(
        { success: false, error: 'Partner has no assigned station' },
        { status: 403 }
      );
    }

    if (booking.stationId.toString() !== partner.assignedStation.toString()) {
      return NextResponse.json(
        { success: false, error: 'This booking is not for your station' },
        { status: 403 }
      );
    }

    // 5. Check if already dropped off
    if (booking.status === 'stored' || booking.status === 'completed') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Luggage already dropped off',
          alreadyDroppedOff: true,
          booking: {
            status: booking.status,
            checkInTime: booking.checkInTime
          }
        },
        { status: 400 }
      );
    }

    // 6. Update booking status
    booking.status = 'stored';
    booking.checkInTime = new Date();
    await booking.save();

    console.log('✅ Drop-off confirmed:', bookingReference);

    return NextResponse.json({
      success: true,
      message: 'Drop-off confirmed successfully',
      booking: {
        _id: booking._id,
        bookingReference: booking.bookingReference,
        status: booking.status,
        checkInTime: booking.checkInTime,
        fullName: booking.fullName,
        luggageCount: booking.luggageCount,
        luggagePhotoUrl: booking.luggagePhotoUrl,
      }
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Confirm Drop-off Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}