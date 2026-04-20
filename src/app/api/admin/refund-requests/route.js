// app/api/admin/refund-requests/route.js
import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/dbConnect';
import RefundRequest from '../../../../models/RefundRequest';
import { verifyJWT } from '../../../../lib/auth';

function adminAuth(req) {
  const token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) return null;
  const decoded = verifyJWT(token);
  if (!decoded || decoded.expired || decoded.role !== 'admin') return null;
  return decoded;
}

export async function GET(req) {
  try {
    await dbConnect();
    if (!adminAuth(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const status = new URL(req.url).searchParams.get('status') || 'pending';

    const requests = await RefundRequest.find(status === 'all' ? {} : { status })
      .populate('bookingId', 'bookingReference fullName email phone smallBagCount largeBagCount totalAmount status dropOffDate pickUpDate')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ requests });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
