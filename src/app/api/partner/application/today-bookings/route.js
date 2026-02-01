// app/api/partner/applicationlication/today-bookings/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/models/booking';
import User from '@/models/User';
import jwt from 'jsonwebtoken';

/**
 * GET /api/partner/application/today-bookings
 * Get today's drop-offs and pick-ups for partner's assigned station
 * Returns two arrays: todayDropOffs and todayPickUps
 */
export async function GET(request) {
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

    // 2. Get partner's assigned station
    const partner = await User.findById(partnerId).lean();
    if (!partner?.assignedStation) {
      return NextResponse.json(
        { success: false, error: 'Partner has no assigned station' },
        { status: 403 }
      );
    }

    const stationId = partner.assignedStation;

    // 3. Calculate today's date range (midnight to midnight)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    console.log('📅 Fetching today\'s bookings:', {
      partner: partner.username,
      station: stationId,
      date: todayStart.toLocaleDateString()
    });

    // 4. Find today's DROP-OFFS (status: pending or confirmed)
    const todayDropOffs = await Booking.find({
      stationId,
      dropOffDate: {
        $gte: todayStart,
        $lte: todayEnd
      },
      status: { $in: ['pending', 'confirmed'] } // Not yet dropped off
    })
    .sort({ dropOffDate: 1 })
    .select('bookingReference fullName email phone luggageCount smallBagCount largeBagCount dropOffDate pickUpDate status totalAmount specialInstructions')
    .lean();

    // 5. Find today's PICK-UPS (status: stored)
    const todayPickUps = await Booking.find({
      stationId,
      pickUpDate: {
        $gte: todayStart,
        $lte: todayEnd
      },
      status: 'stored' // Already dropped off, waiting for pick-up
    })
    .sort({ pickUpDate: 1 })
    .select('bookingReference fullName email phone luggageCount smallBagCount largeBagCount dropOffDate pickUpDate status totalAmount checkInTime specialInstructions')
    .lean();

    console.log('✅ Found bookings:', {
      dropOffs: todayDropOffs.length,
      pickUps: todayPickUps.length
    });

    return NextResponse.json({
      success: true,
      today: todayStart.toISOString().split('T')[0],
      todayDropOffs,
      todayPickUps,
      counts: {
        dropOffs: todayDropOffs.length,
        pickUps: todayPickUps.length,
        total: todayDropOffs.length + todayPickUps.length
      }
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Today Bookings Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}