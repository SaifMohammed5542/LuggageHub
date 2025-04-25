import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/dbConnect';
import KeyHandover from '../../../../models/keyHandover';
// import Station from '@/models/Station';
import { verifyJWT } from '../../../../lib/auth';

export async function GET(req) {
  try {
    await dbConnect();

    const authHeader = req.headers.get('authorization');
    const token = authHeader && authHeader.split(' ')[1];

    const decoded = verifyJWT(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const handovers = await KeyHandover.find()
      .populate('stationId', 'name location') // Include station info
      .sort({ createdAt: -1 });

    return NextResponse.json({ handovers });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch handovers' }, { status: 500 });
  }
}
