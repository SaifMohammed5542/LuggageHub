// app/api/partner/app/verify-qr/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/models/booking';
import User from '@/models/User';
import jwt from 'jsonwebtoken';

/**
 * POST /api/partner/app/verify-qr
 * Verify a scanned QR code (booking reference) and return booking details
 * Only returns booking if it belongs to the partner's assigned station
 */
export async function POST(request) {
  try {
    await dbConnect();

    // 1. Verify partner authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - No token provided' },
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

    // 2. Verify partner role
    if (decoded.role !== 'partner') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Partners only' },
        { status: 403 }
      );
    }

    const partnerId = decoded.id || decoded.userId;

    // 3. Get scanned booking reference from request body
    const body = await request.json();
    const { bookingReference } = body;

    if (!bookingReference) {
      return NextResponse.json(
        { success: false, error: 'Booking reference is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Verifying QR code:', bookingReference);

    // 4. Find the booking by reference
    const booking = await Booking.findOne({ bookingReference })
      .populate('stationId')
      .lean();

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found', notFound: true },
        { status: 404 }
      );
    }

    // 5. Get partner's assigned station
    const partner = await User.findById(partnerId).lean();
    if (!partner?.assignedStation) {
      return NextResponse.json(
        { success: false, error: 'Partner has no assigned station' },
        { status: 403 }
      );
    }

    // 6. Verify booking belongs to partner's station
    const bookingStationId = booking.stationId?._id || booking.stationId;
    const partnerStationId = partner.assignedStation;

    if (bookingStationId.toString() !== partnerStationId.toString()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'This booking is not for your station',
          wrongStation: true 
        },
        { status: 403 }
      );
    }

    console.log('✅ QR verified successfully:', bookingReference);

    // 7. Return booking details
    return NextResponse.json({
      success: true,
      booking: {
        _id: booking._id,
        bookingReference: booking.bookingReference,
        fullName: booking.fullName,
        email: booking.email,
        phone: booking.phone,
        smallBagCount: booking.smallBagCount || 0,
        largeBagCount: booking.largeBagCount || 0,
        luggageCount: booking.luggageCount,
        dropOffDate: booking.dropOffDate,
        pickUpDate: booking.pickUpDate,
        totalAmount: booking.totalAmount,
        status: booking.status,
        specialInstructions: booking.specialInstructions,
        checkInTime: booking.checkInTime,
        checkOutTime: booking.checkOutTime,
        stationName: booking.stationId?.name || 'Unknown Station',
        createdAt: booking.createdAt
      }
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Verify QR Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}