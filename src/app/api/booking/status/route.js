// app/api/booking/status/route.js
import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/dbConnect';
import Booking from '../../../../models/booking';
import '../../../../models/Station'; // register model for populate

export async function GET(req) {
  const ref = new URL(req.url).searchParams.get('ref');
  if (!ref || ref.trim().length < 4)
    return NextResponse.json({ error: 'Booking reference required' }, { status: 400 });

  await dbConnect();

  const booking = await Booking.findOne({
    bookingReference: ref.trim().toUpperCase(),
  }).populate('stationId', 'name location address suburb city');

  if (!booking)
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  // Return only what a customer needs — no sensitive internal data
  return NextResponse.json({
    bookingReference: booking.bookingReference,
    status: booking.status,
    dropOffDate: booking.dropOffDate,
    pickUpDate: booking.pickUpDate,
    smallBagCount: booking.smallBagCount || 0,
    largeBagCount: booking.largeBagCount || 0,
    luggageCount: booking.luggageCount || 0,
    totalAmount: booking.totalAmount,
    station: booking.stationId
      ? {
          name: booking.stationId.name,
          location: booking.stationId.location || booking.stationId.address,
          suburb: booking.stationId.suburb,
          city: booking.stationId.city,
        }
      : null,
    checkInTime: booking.checkInTime || null,
    cancellationReason: booking.cancellationReason || null,
  });
}
