// app/api/partner/[id]/station/route.js
import dbConnect from '../../../../../lib/dbConnect';
import Station from '../../../../../models/Station';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
    await dbConnect();

    // --- THIS IS THE CRITICAL AND REPEATED FIX ---
    // Await the params object BEFORE accessing its 'id' property
    const { id: userId } = await params;
    // ---------------------------------------------

    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Only the partner themselves or an admin can access this route
        // Now use the 'userId' variable, which is safely awaited
        if (decoded.role !== 'admin' && decoded.userId !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Use the 'userId' variable here as well
        const station = await Station.findOne({ partner: userId });

        if (!station) {
            return NextResponse.json({ error: 'Station not found' }, { status: 404 });
        }

        return NextResponse.json({ station });
    } catch (err) {
        console.error(err);
        // Provide more specific error messages for better debugging
        if (err instanceof jwt.JsonWebTokenError) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}