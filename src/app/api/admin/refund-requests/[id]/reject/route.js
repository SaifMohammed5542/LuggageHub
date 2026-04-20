// app/api/admin/refund-requests/[id]/reject/route.js
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '../../../../../../lib/dbConnect';
import RefundRequest from '../../../../../../models/RefundRequest';
import { verifyJWT } from '../../../../../../lib/auth';

function adminAuth(req) {
  const token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) return null;
  const decoded = verifyJWT(token);
  if (!decoded || decoded.expired || decoded.role !== 'admin') return null;
  return decoded;
}

export async function POST(req, { params }) {
  try {
    await dbConnect();
    if (!adminAuth(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const { reason } = await req.json();
    if (!reason?.trim()) return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });

    const request = await RefundRequest.findById(id);
    if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    if (request.status !== 'pending') return NextResponse.json({ error: 'Request already resolved' }, { status: 400 });

    request.status          = 'rejected';
    request.rejectionReason = reason.trim();
    request.resolvedAt      = new Date();
    await request.save();

    return NextResponse.json({ success: true, message: 'Request rejected' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
