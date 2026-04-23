// app/api/admin/bonus-offers/[id]/route.js
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '../../../../../lib/dbConnect';
import BonusOffer from '../../../../../models/BonusOffer';
import { verifyJWT } from '../../../../../lib/auth';

function adminAuth(req) {
  const token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) return null;
  const decoded = verifyJWT(token);
  if (!decoded || decoded.expired || decoded.role !== 'admin') return null;
  return decoded;
}

// PATCH — update offer (name, active toggle, amounts, etc.)
export async function PATCH(req, { params }) {
  try {
    await dbConnect();
    if (!adminAuth(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const body = await req.json();
    const allowed = ['name', 'description', 'threshold', 'windowDays', 'rewardAmount', 'active'];
    const update = {};
    allowed.forEach(k => { if (body[k] !== undefined) update[k] = body[k]; });

    const offer = await BonusOffer.findByIdAndUpdate(id, update, { new: true });
    if (!offer) return NextResponse.json({ error: 'Offer not found' }, { status: 404 });

    return NextResponse.json({ offer });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — remove offer
export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    if (!adminAuth(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    await BonusOffer.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
