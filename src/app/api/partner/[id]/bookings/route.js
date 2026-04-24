// app/api/partner/[id]/bookings/route.js
// ✅ USES COOKIES (NOT Authorization header)

import dbConnect from '../../../../../lib/dbConnect';
import Booking from '../../../../../models/booking';
import Station from '../../../../../models/Station';
import User from '../../../../../models/User';
import { verifyJWT } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { getNovember2025Range } from "@/utils/dateRange";

// await params if it's a promise (handles Next versions where params is async)
const getParams = async (p) => (typeof p?.then === 'function' ? await p : p);

async function verifyAdminOrSelf(req, userId) {
  try {
    // ✅ Get token from cookie instead of Authorization header
    const token = req.cookies.get('auth_session')?.value;
    
    if (!token) {
      return { error: 'Unauthorized', status: 401 };
    }

    // ✅ Verify token using your auth helper
    const decoded = verifyJWT(token);
    
    if (!decoded || decoded.expired) {
      return { error: 'Invalid or expired token', status: 401 };
    }

    const decodedId = decoded.userId;
    
    if (decoded.role !== 'admin' && decodedId !== userId) {
      return { error: 'Forbidden', status: 403 };
    }

    return { decoded };
  } catch (err) {
    console.error('Auth error:', err);
    return { error: 'Invalid or expired token', status: 401 };
  }
}

export async function GET(req, ctx) {
  try {
    await dbConnect();
    const { id: userId } = await getParams(ctx.params);

    const auth = await verifyAdminOrSelf(req, userId);
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    // 1) find partner & their station
    const user = await User.findById(userId).lean();
    if (!user?.assignedStation) {
      return NextResponse.json({ success: false, error: 'No assigned station' }, { status: 404 });
    }

    const station = await Station.findById(user.assignedStation).lean();
    if (!station) {
      return NextResponse.json({ success: false, error: 'Assigned station not found' }, { status: 404 });
    }

    const stationId = station._id;
    const stationIdStr = stationId.toString();

    // ✅ DEFINE FIRST
    const { start } = getNovember2025Range();

    // ✅ THEN USE
    const query = {
      $and: [
        // ✅ station matching (unchanged)
        {
          $or: [
            { station: stationId },
            { station: stationIdStr },
            { stationId: stationIdStr },
            { stationId: stationId },
            { 'station._id': stationId },
            { stationSlug: station.slug },
            { stationName: station.name },
          ],
        },

        // ✅ FROM NOVEMBER 2025 → PRESENT (CORE FIX)
        {
          $or: [
            // booking starts on/after Nov 1
            {
              dropOffDate: { $gte: start },
            },

            // booking started before Nov 1 but continues after
            {
              dropOffDate: { $lt: start },
              pickUpDate: { $gte: start },
            },
          ],
        },

        // ✅ exclude invalid states
        {
          status: { $nin: ["cancelled", "no_show"] },
        },
      ],
    };

    const bookings = await Booking.find(query)
      .sort({ dropOffDate: -1 })
      .lean();

    // Optional debug to help you see what's stored
    const url = new URL(req.url);
    const debug = url.searchParams.get('debug') === '1';
    if (debug) {
      const sample = bookings.slice(0, 3).map(b => ({
        _id: b._id,
        station: b.station,
        stationId: b.stationId,
        stationName: b.stationName,
        stationSlug: b.stationSlug,
        dropOffDate: b.dropOffDate,
      }));
      return NextResponse.json({
        success: true,
        matchedBy: query.$or.map((q) => Object.keys(q)[0]),
        stationContext: { id: stationIdStr, name: station.name, slug: station.slug },
        count: bookings.length,
        sample,
        bookings,
      });
    }

    return NextResponse.json({ success: true, bookings }, { status: 200 });
  } catch (err) {
    console.error('Fetch Bookings Error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}