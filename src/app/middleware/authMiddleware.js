// middleware.js
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function middleware(req) {
  const token = req.headers.get('authorization')?.split(' ')[1];
  const path = req.nextUrl.pathname;

  // Protect API routes except auth
  if (path.startsWith('/api/') && !path.startsWith('/api/auth/')) {
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Block partners from admin routes
      if (path.startsWith('/api/admin/') && decoded.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Block other partners from accessing another partner's route
      if (path.startsWith('/api/partner/')) {
        const urlParts = path.split('/');
        const partnerIdFromUrl = urlParts[3]; // e.g. /api/partner/1234
        if (decoded.role !== 'admin' && decoded.userId !== partnerIdFromUrl) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }

      return NextResponse.next();
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  }

  return NextResponse.next();
}
