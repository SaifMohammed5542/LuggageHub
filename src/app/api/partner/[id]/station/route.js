import dbConnect from '../../../../../lib/dbConnect';
import Station from '../../../../../models/Station';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  await dbConnect();

  const token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Only the partner themselves or an admin can access this route
    if (decoded.role !== 'admin' && decoded.userId !== params.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const station = await Station.findOne({ partner: params.id });

    if (!station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 });
    }

    return NextResponse.json({ station });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
