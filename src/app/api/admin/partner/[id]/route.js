// app/api/admin/partner/[id]/route.js
import dbConnect from '../../../../../lib/dbConnect';
import User from '../../../../../models/User';
import Station from '../../../../../models/Station';
import { verifyJWT } from '../../../../../lib/auth';
import { NextResponse } from 'next/server';

// Helper to verify admin
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

/**
 * Utility: safely update station's partners field (handles
 * existing non-array values too).
 *
 * - addPartnerToStation(stationId, partnerId)
 * - removePartnerFromStation(stationId, partnerId)
 */
async function addPartnerToStation(stationId, partnerId) {
  if (!stationId) return;
  const station = await Station.findById(stationId).lean();
  if (!station) return;

  // If partners is array => addToSet
  if (Array.isArray(station.partners)) {
    await Station.findByIdAndUpdate(stationId, { $addToSet: { partners: partnerId } });
  } else {
    // partners field exists but is a single ObjectId (or null/undefined)
    // Convert to array if needed
    if (!station.partners) {
      await Station.findByIdAndUpdate(stationId, { $set: { partners: [partnerId] } });
    } else {
      // If single id and equals partnerId -> keep as array with that id
      const existing = String(station.partners);
      if (existing === String(partnerId)) {
        await Station.findByIdAndUpdate(stationId, { $set: { partners: [partnerId] } });
      } else {
        // different single id -> convert to array of both
        await Station.findByIdAndUpdate(stationId, { $set: { partners: [station.partners, partnerId] } });
      }
    }
  }
}

async function removePartnerFromStation(stationId, partnerId) {
  if (!stationId) return;
  const station = await Station.findById(stationId).lean();
  if (!station) return;

  if (Array.isArray(station.partners)) {
    // Safe pull
    await Station.findByIdAndUpdate(stationId, { $pull: { partners: partnerId } });
  } else {
    // If partners is a single ObjectId and equals partnerId -> unset or set to []
    if (station.partners && String(station.partners) === String(partnerId)) {
      // Prefer to convert to empty array
      await Station.findByIdAndUpdate(stationId, { $set: { partners: [] } });
    }
  }
}

// -------------------------
// PUT - update partner
// -------------------------
export async function PUT(req, context) {
  await dbConnect();

  // context might be sync or async; await defensively
  const ctx = await context;
  const { params } = ctx || {};
  const auth = await verifyAdmin(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = params;
    const data = await req.json();

    const partner = await User.findById(id);
    if (!partner || partner.role !== 'partner') {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    const oldStationId = partner.assignedStation ? String(partner.assignedStation) : null;
    const newStationId = data.assignedStation ? String(data.assignedStation) : null;

    // Build update (but don't overwrite password unless provided)
    const updateFields = {};
    if (data.username !== undefined) updateFields.username = data.username;
    if (data.email !== undefined) updateFields.email = data.email;
    if (data.phone !== undefined) updateFields.phone = data.phone;
    if (data.role !== undefined) updateFields.role = data.role; // caution: usually shouldn't change
    // we will set assignedStation after station updates

    // Apply non-password updates
    Object.assign(partner, updateFields);

    // If password provided, set it (assumes User model pre-save will hash)
    if (data.password) {
      partner.password = data.password;
    }

    // Save partner (pre-save hooks will run)
    await partner.save();

    // If station changed, update station documents safely
    if (oldStationId && oldStationId !== newStationId) {
      await removePartnerFromStation(oldStationId, partner._id);
    }

    if (newStationId && oldStationId !== newStationId) {
      await addPartnerToStation(newStationId, partner._id);
    }

    // Persist assignedStation on user last
    if (newStationId !== undefined) {
      partner.assignedStation = newStationId || null;
      await partner.save();
    }

    const updatedPartner = await User.findById(id)
      .populate('assignedStation', 'name location')
      .select('-password')
      .lean();

    return NextResponse.json({ message: 'Partner updated successfully', partner: updatedPartner }, { status: 200 });
  } catch (error) {
    console.error('Update partner error:', error);
    return NextResponse.json({ error: 'Server error updating partner' }, { status: 500 });
  }
}

// -------------------------
// DELETE - delete partner
// -------------------------
export async function DELETE(req, context) {
  await dbConnect();

  const ctx = await context;
  const { params } = ctx || {};
  const auth = await verifyAdmin(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = params;

    const partner = await User.findById(id);
    if (!partner || partner.role !== 'partner') {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    const stationId = partner.assignedStation ? String(partner.assignedStation) : null;

    // Delete partner
    await User.findByIdAndDelete(id);

    // Remove from station partners safely
    if (stationId) {
      await removePartnerFromStation(stationId, id);
    }

    return NextResponse.json({ message: 'Partner deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Delete partner error:', error);
    return NextResponse.json({ error: 'Server error deleting partner' }, { status: 500 });
  }
}

// -------------------------
// GET - fetch partner details
// -------------------------
export async function GET(req, context) {
  await dbConnect();

  const ctx = await context;
  const { params } = ctx || {};
  const auth = await verifyAdmin(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = params;
    const partner = await User.findById(id)
      .populate('assignedStation', 'name location')
      .select('-password')
      .lean();

    if (!partner || partner.role !== 'partner') {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    return NextResponse.json({ partner }, { status: 200 });
  } catch (error) {
    console.error('Get partner error:', error);
    return NextResponse.json({ error: 'Server error fetching partner' }, { status: 500 });
  }
}
