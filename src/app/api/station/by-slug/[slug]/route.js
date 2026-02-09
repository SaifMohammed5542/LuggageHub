// app/api/station/by-slug/[slug]/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Station from '@/models/Station';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    
    const { slug } = params;
    
    if (!slug) {
      return NextResponse.json(
        { success: false, message: 'Station slug is required' },
        { status: 400 }
      );
    }

    // ✅ FIX 1: Normalize slug (trim whitespace, lowercase handled by DB)
    const normalizedSlug = slug.toLowerCase().trim();

    // ✅ Find station by slug - only return essential fields
    const station = await Station.findOne(
      { slug: normalizedSlug, status: 'active' },
      {
        _id: 1,
        name: 1,
        slug: 1,
        location: 1,
        coordinates: 1,
        capacity: 1,
        timings: 1,
        features: 1,
        rating: 1,
        photos: 1
      }
    ).lean();

    if (!station) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Station with slug "${normalizedSlug}" not found`,
          slug: normalizedSlug
        },
        { status: 404 }
      );
    }

    // ✅ FIX 2: Add cache headers
    return NextResponse.json(
      {
        success: true,
        station
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
          'CDN-Cache-Control': 'public, max-age=60',
          'Vercel-CDN-Cache-Control': 'public, max-age=60'
        }
      }
    );

  } catch (error) {
    console.error('Error fetching station by slug:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch station',
        error: error.message 
      },
      { status: 500 }
    );
  }
}