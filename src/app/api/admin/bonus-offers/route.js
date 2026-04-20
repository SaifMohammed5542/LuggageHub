// app/api/admin/bonus-offers/route.js
import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/dbConnect';
import BonusOffer from '../../../../models/BonusOffer';
import { verifyJWT } from '../../../../lib/auth';

function adminAuth(req) {
  const token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) return null;
  const decoded = verifyJWT(token);
  if (!decoded || decoded.expired || decoded.role !== 'admin') return null;
  return decoded;
}

// GET — list all bonus offers
export async function GET(req) {
  try {
    await dbConnect();
    if (!adminAuth(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const offers = await BonusOffer.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ offers });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — create a new bonus offer
export async function POST(req) {
  try {
    await dbConnect();
    if (!adminAuth(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { name, description, type, threshold, windowDays, rewardAmount } = await req.json();

    if (!name?.trim())    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    if (!type)            return NextResponse.json({ error: 'Type is required' }, { status: 400 });
    if (!threshold || threshold < 1) return NextResponse.json({ error: 'Threshold must be at least 1' }, { status: 400 });
    if (!rewardAmount || rewardAmount <= 0) return NextResponse.json({ error: 'Reward amount must be positive' }, { status: 400 });
    if (type === 'rolling_window' && (!windowDays || windowDays < 1))
      return NextResponse.json({ error: 'windowDays is required for rolling_window type' }, { status: 400 });

    const offer = await BonusOffer.create({
      name: name.trim(),
      description: description?.trim() || '',
      type,
      threshold,
      windowDays: type === 'rolling_window' ? windowDays : null,
      rewardAmount,
      active: true,
    });

    return NextResponse.json({ offer }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
