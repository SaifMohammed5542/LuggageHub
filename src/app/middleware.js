import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET;

export function middleware(req) {
  const { pathname } = req.nextUrl;
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1]; // Handles both "Bearer token" and plain token

  // ✅ 1. Protect API routes (except /api/auth)
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const decoded = jwt.verify(token, secret);

      // Block partners from accessing admin routes
      if (pathname.startsWith('/api/admin/') && decoded.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Block partners from accessing another partner's route
      if (pathname.startsWith('/api/partner/')) {
        const urlParts = pathname.split('/');
        const partnerIdFromUrl = urlParts[3];
        if (decoded.role !== 'admin' && decoded.userId !== partnerIdFromUrl) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }

      return NextResponse.next();
    } catch (error) { // Changed 'err' to 'error' for consistency
      console.error("JWT Verification Error (API Middleware):", error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  }

  // ✅ 2. Protect /dashboard and /admin/dashboard routes for admin only
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin/dashboard')) {
    if (!token) {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }

    try {
      const decoded = jwt.verify(token, secret);
      if (decoded.role !== 'admin') {
        return NextResponse.redirect(new URL('/auth/login', req.url));
      }
    } catch (error) { // Changed 'err' to 'error' for consistency
      console.error('JWT verification failed (Route Middleware):', error);
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
  }

  return NextResponse.next();
}

// ✅ This makes sure the middleware only runs on the right pages
export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*', '/admin/dashboard/:path*'], // Added /admin/dashboard/:path*
};