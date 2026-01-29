// app/api/partner/app/confirm-pickup/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/models/booking';
import User from '@/models/User';
import jwt from 'jsonwebtoken';

/**
 * POST /api/partner/app/confirm-pickup
 * Confirm customer has picked up their luggage
 * Updates status: stored → completed (with checkOutTime)
 */
export async function POST(request) {
  try {
    await dbConnect();

    // 1. Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
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

    const partnerId = decoded.id || decoded.userId;

    // 2. Get booking reference from request
    const body = await request.json();
    const { bookingReference } = body;

    if (!bookingReference) {
      return NextResponse.json(
        { success: false, error: 'Booking reference is required' },
        { status: 400 }
      );
    }

    console.log('🎒 Confirming pick-up for:', bookingReference);

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

    // 5. Check if luggage was dropped off first
    if (booking.status !== 'stored') {
      return NextResponse.json(
        { 
          success: false, 
          error: booking.status === 'completed' 
            ? 'Luggage already picked up' 
            : 'Luggage not yet dropped off',
          invalidStatus: true,
          currentStatus: booking.status
        },
        { status: 400 }
      );
    }

    // 6. Update booking status
    booking.status = 'completed';
    booking.checkOutTime = new Date();
    await booking.save();

    console.log('✅ Pick-up confirmed:', bookingReference);

    return NextResponse.json({
      success: true,
      message: 'Pick-up confirmed successfully',
      booking: {
        _id: booking._id,
        bookingReference: booking.bookingReference,
        status: booking.status,
        checkInTime: booking.checkInTime,
        checkOutTime: booking.checkOutTime,
        fullName: booking.fullName,
        luggageCount: booking.luggageCount
      }
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Confirm Pick-up Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}