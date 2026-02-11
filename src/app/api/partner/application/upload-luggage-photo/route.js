// app/api/partner/application/upload-luggage-photo/route.js
import { NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/dbConnect';
import Booking from '../../../../../models/booking';
import { verifyJWT } from '../../../../../lib/auth';

export async function POST(request) {
  try {
    await dbConnect();

    // Authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyJWT(token);
    
    if (!decoded || decoded.expired) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (decoded.role !== 'partner') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Partners only' },
        { status: 403 }
      );
    }

    console.log('📸 Upload request from partner:', decoded.id || decoded.userId);

    // Get form data
    const formData = await request.formData();
    const bookingReference = formData.get('bookingReference');
    const imageFile = formData.get('image');

    if (!bookingReference || !imageFile) {
      return NextResponse.json(
        { success: false, error: 'Booking reference and image are required' },
        { status: 400 }
      );
    }

    console.log('📦 Booking:', bookingReference);
    console.log('📷 Image:', imageFile.name, imageFile.type, `${(imageFile.size / 1024).toFixed(2)}KB`);

    // Validate image size (max 5MB to keep MongoDB document under 16MB limit)
    if (imageFile.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Image too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Find booking
    const booking = await Booking.findOne({ bookingReference });
    if (!booking) {
      console.error('❌ Booking not found:', bookingReference);
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // ✅ Convert image to base64 data URL
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = `data:${imageFile.type};base64,${buffer.toString('base64')}`;

    console.log('💾 Saving to MongoDB...');

    // ✅ Store base64 image directly in MongoDB
    booking.luggagePhotoUrl = base64Image;
    await booking.save();

    console.log(`✅ Photo saved in MongoDB for booking: ${bookingReference}`);

    return NextResponse.json({
      success: true,
      message: 'Photo uploaded successfully',
      photoUrl: booking.luggagePhotoUrl,
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Upload error:', error.message);
    console.error('❌ Stack:', error.stack);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload photo' },
      { status: 500 }
    );
  }
}