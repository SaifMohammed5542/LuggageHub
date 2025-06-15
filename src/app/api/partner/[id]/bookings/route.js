// app/api/partner/[id]/bookings/route.js
import dbConnect from '../../../../../lib/dbConnect';
import Booking from '../../../../../models/booking';
import Station from '../../../../../models/Station';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
    await dbConnect();

    // --- CRITICAL FIX: Await the params object here ---
    const { id: userId } = await params;
    // --------------------------------------------------

    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Now you can safely use 'userId' (which came from 'await params')
        if (decoded.role !== 'admin' && decoded.userId !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Now you can safely use 'userId' (which came from 'await params')
        const station = await Station.findOne({ partner: userId });

        if (!station) {
            return NextResponse.json({ error: 'Station not found' }, { status: 404 });
        }

        const bookings = await Booking.find({ stationId: station._id }).sort({ createdAt: -1 });

        return NextResponse.json({ bookings });
    } catch (err) {
        console.error(err);
        // Better error message for invalid token vs. generic server error
        if (err instanceof jwt.JsonWebTokenError) {
            return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}