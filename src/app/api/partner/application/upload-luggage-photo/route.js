// app/api/partner/application/upload-luggage-photo/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/models/booking';
import { verifyJWT } from '@/lib/auth';

export async function POST(request) {
  try {
    await dbConnect();

    // ✅ VERIFY TOKEN
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded || decoded.role !== 'partner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ PARSE FORM DATA
    const formData = await request.formData();
    const bookingReference = formData.get('bookingReference');
    const imageFile = formData.get('image');

    if (!bookingReference || !imageFile) {
      return NextResponse.json(
        { error: 'Missing booking reference or image' },
        { status: 400 }
      );
    }

    // ✅ FIND BOOKING
    const booking = await Booking.findOne({ bookingReference });
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // ✅ CONVERT IMAGE TO BASE64
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');
    const mimeType = imageFile.type || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    // ✅ STORE MULTIPLE PHOTOS (up to 3)
    if (!booking.luggagePhotos) {
      booking.luggagePhotos = [];
    }

    // Check if already have 3 photos
    if (booking.luggagePhotos.length >= 3) {
      return NextResponse.json(
        { error: 'Maximum 3 photos allowed per booking' },
        { status: 400 }
      );
    }

    // Add new photo
    booking.luggagePhotos.push(dataUrl);
    
    // Keep old field for backward compatibility
    if (booking.luggagePhotos.length === 1) {
      booking.luggagePhotoUrl = dataUrl;
    }

    await booking.save();

    return NextResponse.json({
      success: true,
      message: 'Photo uploaded successfully',
      photoCount: booking.luggagePhotos.length,
      photoUrl: dataUrl
    });

  } catch (error) {
    console.error('❌ Upload photo error:', error);
    return NextResponse.json(
      { error: 'Failed to upload photo' },
      { status: 500 }
    );
  }
}