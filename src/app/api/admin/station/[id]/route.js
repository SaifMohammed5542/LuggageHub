// app/api/admin/station/[id]/route.js
import dbConnect from '../../../../../lib/dbConnect';
import Station from '../../../../../models/Station';
import { verifyJWT } from '../../../../../lib/auth';
import { NextResponse } from 'next/server';

// ✅ Helper to verify admin
async function verifyAdmin(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Unauthorized', status: 401 };
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyJWT(token);
    if (decoded && decoded.expired) {
      return { error: 'Token expired', status: 401, expired: true };
    }
    if (!decoded || decoded.role !== 'admin') {
      return { error: 'Forbidden: Admin access only', status: 403 };
    }
    return { decoded };
  } catch (error) {
    console.error('verifyAdmin error:', error);
    return { error: 'Invalid token', status: 401 };
  }
}

// 🔵 PUT - Update Station
export async function PUT(req, { params }) {
  await dbConnect();

  const auth = await verifyAdmin(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = params;
    const data = await req.json();

    // If updating coordinates, ensure proper format
    if (data.latitude !== undefined && data.longitude !== undefined) {
      data.coordinates = {
        type: 'Point',
        coordinates: [parseFloat(data.longitude), parseFloat(data.latitude)]
      };
      delete data.latitude;
      delete data.longitude;
    }

    const updatedStation = await Station.findByIdAndUpdate(
      id, 
      { ...data, updatedAt: Date.now() },
      { 
        new: true, 
        runValidators: true 
      }
    ).populate('partners', 'username email phone');

    if (!updatedStation) {
      return NextResponse.json({ 
        error: 'Station not found' 
      }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Station updated successfully',
      station: updatedStation
    }, { status: 200 });
  } catch (error) {
    console.error('Update station error:', error);
    return NextResponse.json({ 
      error: 'Server error updating station' 
    }, { status: 500 });
  }
}

// 🔴 DELETE - Delete Station
export async function DELETE(req, { params }) {
  await dbConnect();

  const auth = await verifyAdmin(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = params;

    const deletedStation = await Station.findByIdAndDelete(id);

    if (!deletedStation) {
      return NextResponse.json({ 
        error: 'Station not found' 
      }, { status: 404 });
    }

    // Optional: Clean up partners assigned to this station
    const User = (await import('../../../../../models/User')).default;
    await User.updateMany(
      { assignedStation: id },
      { assignedStation: null }
    );

    return NextResponse.json({
      message: 'Station deleted successfully',
      deletedStation
    }, { status: 200 });
  } catch (error) {
    console.error('Delete station error:', error);
    return NextResponse.json({ 
      error: 'Server error deleting station' 
    }, { status: 500 });
  }
}
