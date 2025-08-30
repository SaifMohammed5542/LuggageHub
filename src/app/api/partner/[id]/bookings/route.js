import dbConnect from '../../../../../lib/dbConnect';
import Booking from '../../../../../models/booking';
import Station from '../../../../../models/Station';
import User from '../../../../../models/User';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

// await params if it's a promise (handles Next versions where params is async)
const getParams = async (p) => (typeof p?.then === 'function' ? await p : p);

async function verifyAdminOrSelf(req, userId) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return { error: 'Unauthorized', status: 401 };
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const decodedId = decoded.id || decoded.userId;
    if (decoded.role !== 'admin' && decodedId !== userId) return { error: 'Forbidden', status: 403 };
    return { decoded };
  } catch (err) {
    console.error('Auth error:', err);
    return { error: 'Invalid or expired token', status: 401 };
  }
}

export async function GET(req, ctx) {
  await dbConnect();
  const { id: userId } = await getParams(ctx.params);

  const auth = await verifyAdminOrSelf(req, userId);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
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

    // 2) be flexible: match various historical schemas
    const query = {
      $or: [
        { station: stationId },            // proper ObjectId ref
        { station: stationIdStr },         // station saved as string id
        { stationId: stationIdStr },       // separate stationId field
        { stationId: stationId },          // stationId as ObjectId
        { 'station._id': stationId },      // embedded station object
        { stationSlug: station.slug },     // saved by slug
        { stationName: station.name },     // saved by name
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
