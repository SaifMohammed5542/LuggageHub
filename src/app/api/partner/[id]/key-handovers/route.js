// src/app/api/partner/[id]/key-handovers/route.js
import dbConnect from '../../../../../lib/dbConnect';
import KeyHandover from '../../../../../models/keyHandover';
import User from '../../../../../models/User';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

// Helper: await params only if it's a promise (handles both Next 13/14 and 15)
const getParams = async (p) => (typeof p?.then === 'function' ? await p : p);

export async function GET(req, ctx) {
  await dbConnect();

  // ✅ Works for both sync and async params
  const { id: userId } = await getParams(ctx.params);

  const token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const decodedId = decoded.id || decoded.userId;

    if (decoded.role !== 'admin' && decodedId !== userId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const user = await User.findById(userId).lean();
    if (!user || !user.assignedStation) {
      return NextResponse.json({ success: false, error: 'No assigned station' }, { status: 404 });
    }

    const stationObjectId = new mongoose.Types.ObjectId(user.assignedStation);

    const handovers = await KeyHandover
      .find({ station: stationObjectId })
      .sort({ dropOffDate: -1 })
      .lean();

    return NextResponse.json({ success: true, handovers });
  } catch (err) {
    console.error('Key Handovers Fetch Error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
