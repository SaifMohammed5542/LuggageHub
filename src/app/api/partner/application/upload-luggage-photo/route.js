// app/api/partner/application/upload-luggage-photo/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/models/booking';
import { verifyJWT } from '@/lib/auth';

export async function POST(request) {
  try {
    await dbConnect();

    const token = request.cookies.get('auth_session')?.value;
    if (!token) {
      console.error('Upload: No token found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded || decoded.expired || decoded.role !== 'partner') {
      console.error('Upload: Token invalid or not partner');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const bookingReference = formData.get('bookingReference');
    const imageFile = formData.get('image');

    console.log('Upload request:', {
      bookingReference,
      hasImage: !!imageFile,
      imageType: imageFile?.type,
      imageSize: imageFile?.size
    });

    if (!bookingReference || !imageFile) {
      console.error('Upload: Missing data', { bookingReference, hasImage: !!imageFile });
      return NextResponse.json(
        { error: 'Missing booking reference or image' },
        { status: 400 }
      );
    }

    const booking = await Booking.findOne({ bookingReference });
    if (!booking) {
      console.error('Upload: Booking not found', bookingReference);
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');
    const mimeType = imageFile.type || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    if (!booking.luggagePhotos) {
      booking.luggagePhotos = [];
    }

    console.log('Current photos count:', booking.luggagePhotos.length);

    if (booking.luggagePhotos.length >= 9) {
      console.error('Upload: Maximum photos reached');
      return NextResponse.json(
        { error: 'Maximum 9 photos allowed per booking' },
        { status: 400 }
      );
    }

    booking.luggagePhotos.push(dataUrl);
    
    if (booking.luggagePhotos.length === 1) {
      booking.luggagePhotoUrl = dataUrl;
    }

    await booking.save();
    
    console.log('Upload successful, total photos:', booking.luggagePhotos.length);

    return NextResponse.json({
      success: true,
      message: 'Photo uploaded successfully',
      photoCount: booking.luggagePhotos.length,
      photoUrl: dataUrl
    });

  } catch (error) {
    console.error('Upload photo error:', error);
    return NextResponse.json(
      { error: 'Failed to upload photo', details: error.message },
      { status: 500 }
    );
  }
}