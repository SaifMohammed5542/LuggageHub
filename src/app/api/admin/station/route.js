import dbConnect from '../../../../lib/dbConnect';
import Station from '../../../../models/Station';
import { verifyJWT } from '../../../../lib/auth';
import { NextResponse } from 'next/server';

export async function POST(req) {
  await dbConnect();

  const token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decoded = verifyJWT(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, location } = await req.json();
    if (!name || !location) {
      return NextResponse.json({ error: 'Missing name or location' }, { status: 400 });
    }

    const newStation = new Station({ name, location });
    await newStation.save();

    return NextResponse.json({ message: 'Station created', station: newStation });
  } catch (err) {
    console.error('Station Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
