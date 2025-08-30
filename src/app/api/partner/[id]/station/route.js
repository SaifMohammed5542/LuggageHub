// src/app/api/partner/[id]/station/route.js
import dbConnect from '../../../../../lib/dbConnect';
import Station from '../../../../../models/Station';
import User from '../../../../../models/User';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

const getParams = async (p) => (typeof p?.then === 'function' ? await p : p);

export async function GET(req, context) {
  await dbConnect();

  // ✅ await params (not context)
  const { id: userId } = await getParams(context.params);

  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const decodedId = decoded.id || decoded.userId; // tolerate either key

    if (decoded.role !== 'admin' && decodedId !== userId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // You can pass string IDs to findById; no need to cast to ObjectId manually
    const user = await User.findById(userId).lean();
    if (!user?.assignedStation) {
      return NextResponse.json({ success: false, error: 'No assigned station' }, { status: 404 });
    }

    const station = await Station.findById(user.assignedStation).lean();
    if (!station) {
      return NextResponse.json({ success: false, error: 'Station not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, station }, { status: 200 });
  } catch (err) {
    console.error('Station Fetch Error:', err);
    if (err instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
