// app/api/partner/[id]/key-handovers/route.js
import dbConnect from '../../../../../lib/dbConnect';
import KeyHandover from '../../../../../models/keyHandover';
import Station from '../../../../../models/Station';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  await dbConnect();
  const { id: userId } = params;

  try {
    // Fix: match `partner` field in Station schema
    const station = await Station.findOne({ partner: userId });
    if (!station) {
      return NextResponse.json(
        { success: false, message: 'Station not found' },
        { status: 404 }
      );
    }

    const handovers = await KeyHandover.find({ stationId: station._id }).sort({
      dropOffDate: -1,
    });

    return NextResponse.json({ success: true, handovers });
  } catch (err) {
    console.error('Key Handovers Fetch Error:', err);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
