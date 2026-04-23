// app/api/partner/application/today-bookings/route.js
// ✅ USES COOKIES (NOT Authorization header)

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/models/booking';
import User from '@/models/User';
import { verifyJWT } from '@/lib/auth';

/**
 * GET /api/partner/application/today-bookings
 * Get today's drop-offs and pick-ups for partner's assigned station
 * Returns two arrays: todayDropOffs and todayPickUps
 */
export async function GET(request) {
  try {
    await dbConnect();

    // ✅ Get token from cookie instead of Authorization header
    const token = request.cookies.get('auth_session')?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ✅ Verify token using your auth helper
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

    // 2. Get partner's assigned station
    const partner = await User.findById(partnerId).lean();
    if (!partner?.assignedStation) {
      return NextResponse.json(
        { success: false, error: 'Partner has no assigned station' },
        { status: 403 }
      );
    }

    const stationId = partner.assignedStation;

    // 3. Calculate today's date range in Melbourne wall-clock UTC
    // Dates stored as fake-UTC (Melbourne wall-clock = UTC parts), so compare UTC midnight-to-midnight
    const melbParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Australia/Melbourne',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const get = t => melbParts.find(p => p.type === t).value;
    const todayStart = new Date(`${get('year')}-${get('month')}-${get('day')}T00:00:00.000Z`);
    const todayEnd   = new Date(`${get('year')}-${get('month')}-${get('day')}T23:59:59.999Z`);

    console.log('📅 Fetching today\'s bookings:', {
      partner: partner.username,
      station: stationId,
      date: `${get('year')}-${get('month')}-${get('day')} (Melbourne)`
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