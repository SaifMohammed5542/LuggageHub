import dbConnect from '../../../../lib/dbConnect';
import User from '../../../../models/User';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    await dbConnect();
    const { username, email, password, role } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    // ❌ Removed manual hashing
    const newUser = new User({ username, email, password, role });
    await newUser.save(); // Hashing happens automatically inside `pre('save')`

    return NextResponse.json({ message: 'User registered successfully' }, { status: 201 });
  } catch (error) {
    console.error('Registration Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
