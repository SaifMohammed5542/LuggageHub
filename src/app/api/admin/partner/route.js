import dbConnect from '../../../../lib/dbConnect';
import User from '../../../../models/User';
import Station from '../../../../models/Station';
import { verifyJWT } from '../../../../lib/auth';
import { NextResponse } from 'next/server';

export async function POST(req) {
  await dbConnect();

  const token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const decoded = verifyJWT(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

const { username, email, password, stationId, accountDetails } = await req.json();
    if (!username || !email || !password || !stationId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'Partner already exists' }, { status: 409 });
    }

const partner = new User({
  username,
  email,
  password,
  role: 'partner',
  assignedStation: stationId,
  accountDetails
});


    await partner.save();

    await Station.findByIdAndUpdate(stationId, {
      partner: partner._id,
    });

    return NextResponse.json({ message: 'Partner created', partner });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
