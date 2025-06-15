// app/api/partner/[id]/key-handovers/route.js
import dbConnect from '../../../../../lib/dbConnect';
import KeyHandover from '../../../../../models/keyHandover'; // Correct: models/keyHandover.js
import Station from '../../../../../models/Station';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
    await dbConnect();

    // THIS IS THE CRITICAL FIX: Await the params object
    const { id: userId } = await params;

    try {
        const station = await Station.findOne({ partner: userId });
        if (!station) {
            return NextResponse.json(
                { success: false, message: 'Station not found' },
                { status: 404 }
            );
        }

        const handovers = await KeyHandover.find({ station: station._id }).sort({
            dropOffDate: -1,
        });
        // No .populate() needed for dropOffPerson/pickUpPerson because they are embedded objects in your schema.

        return NextResponse.json({ success: true, handovers });
    } catch (err) {
        console.error('Key Handovers Fetch Error:', err);
        return NextResponse.json(
            { success: false, message: 'Server error' },
            { status: 500 }
        );
    }
}