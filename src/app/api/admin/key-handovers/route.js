//api/admin/key-handovers/route.js
import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/dbConnect';
import KeyHandover from '../../../../models/keyHandover';
import { verifyJWT } from '../../../../lib/auth';

export async function GET(req) {
  try {
    // 1) Connect to MongoDB
    await dbConnect();
    console.log('✅ [key-handovers] DB connected');

    // 2) Check auth
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    console.log('🔑 [key-handovers] token:', token);

    const decoded = verifyJWT(token);
    console.log('🕵️‍♂️ [key-handovers] decoded:', decoded);
    if (!decoded || decoded.role !== 'admin') {
      console.warn('🚫 [key-handovers] Unauthorized access');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 3) Fetch & populate - Change stationId to station
    const handovers = await KeyHandover.find()
      .populate('station', 'name location')  // Corrected path to 'station'
      .sort({ createdAt: -1 });
    console.log(`📦 [key-handovers] fetched ${handovers.length} records`);

    // 4) Return
    console.log(JSON.stringify(handovers, null, 2));

    return NextResponse.json({ success: true, handovers });

  } catch (err) {
    console.error('❌ [key-handovers] Error fetching key handovers:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch handovers' },
      { status: 500 }
    );
  }
}