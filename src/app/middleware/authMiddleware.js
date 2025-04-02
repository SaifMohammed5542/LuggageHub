// middleware/middleware.js
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function middleware(req) {
  const token = req.headers.get('authorization')?.split(' ')[1];
  const path = req.nextUrl.pathname;

  if (path.startsWith('/api/') && !path.startsWith('/api/auth/')) {
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET);
      return NextResponse.next();
    } catch (error) {
      console.error('Token Verification Error:', error); // Add this line!
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  }
  return NextResponse.next();
}