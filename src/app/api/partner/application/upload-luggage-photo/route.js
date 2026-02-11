// app/api/partner/application/upload-luggage-photo/route.js
import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import dbConnect from '../../../../../lib/dbConnect';
import Booking from '../../../../../models/booking';
import { verifyToken } from '../../../../../lib/auth';

export async function POST(request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.role !== 'partner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const formData = await request.formData();
    const bookingReference = formData.get('bookingReference');
    const imageFile = formData.get('image');

    if (!bookingReference || !imageFile) {
      return NextResponse.json(
        { error: 'Booking reference and image are required' },
        { status: 400 }
      );
    }

    // Find booking
    const booking = await Booking.findOne({ bookingReference });
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Convert image to buffer
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'luggage-photos');
    await mkdir(uploadDir, { recursive: true });

    // Save image with booking reference as filename
    const filename = `${bookingReference}.jpg`;
    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);

    // Update booking with photo path
    booking.luggagePhotoUrl = `/luggage-photos/${filename}`;
    await booking.save();

    console.log(`✅ Luggage photo saved for booking: ${bookingReference}`);

    return NextResponse.json({
      success: true,
      message: 'Photo uploaded successfully',
      photoUrl: booking.luggagePhotoUrl,
    });
  } catch (error) {
    console.error('Upload luggage photo error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload photo' },
      { status: 500 }
    );
  }
}