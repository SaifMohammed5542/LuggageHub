// app/api/partner/application/verify-qr/route.js
// ✅ UPDATED: Uses GET + cookies (faster, simpler)

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/models/booking';
import Station from '@/models/Station';
import User from '@/models/User';
import { verifyJWT } from '@/lib/auth';

// Ensure Station model is registered
void Station;

/**
 * GET /api/partner/application/verify-qr?bookingReference=XXX
 * Verify a scanned QR code and return booking details
 * Only returns booking if it belongs to the partner's assigned station
 */
export async function GET(request) {
  try {
    await dbConnect();

    // 1. Verify partner authentication (using cookies)
    const token = request.cookies.get('auth_session')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - No token provided' },
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

    // 2. Verify partner role
    if (decoded.role !== 'partner') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Partners only' },
        { status: 403 }
      );
    }

    const partnerId = decoded.userId;

    // 3. Get booking reference from query params
    const { searchParams } = new URL(request.url);
    const bookingReference = searchParams.get('bookingReference');

    if (!bookingReference) {
      return NextResponse.json(
        { success: false, error: 'Booking reference is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Verifying QR code:', bookingReference);

    // 4. Find the booking by reference (FAST - direct query)
    const booking = await Booking.findOne({ bookingReference })
      .populate('stationId')
      .lean();

    if (!booking) {
      console.log('❌ Booking not found:', bookingReference);
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
      console.log('❌ Wrong station. Booking:', bookingStationId, 'Partner:', partnerStationId);
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

    // 7. Return booking details (including photos)
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
        luggagePhotoUrl: booking.luggagePhotoUrl,
        luggagePhotos: booking.luggagePhotos || [],
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