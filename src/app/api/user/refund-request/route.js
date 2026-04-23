// app/api/user/refund-request/route.js
import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/dbConnect';
import Booking from '../../../../models/booking';
import RefundRequest from '../../../../models/RefundRequest';
import User from '../../../../models/User';
import { verifyJWT } from '../../../../lib/auth';

const PRICING = { small: 3.99, large: 8.49 };
const CUTOFF_HOURS = 2;

function getMelbourneNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const get = t => parts.find(p => p.type === t).value;
  const hour = get('hour') === '24' ? '00' : get('hour');
  return new Date(`${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}:00.000Z`);
}

function userAuth(req) {
  const token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) return null;
  const decoded = verifyJWT(token);
  if (!decoded || decoded.expired || decoded.role === 'admin' || decoded.role === 'partner') return null;
  return decoded;
}

function calcAmount(booking, dropOff, pickUp) {
  const days = Math.max(1, Math.ceil((pickUp - dropOff) / 86400000));
  const small = booking.smallBagCount || 0;
  const large = booking.largeBagCount || 0;
  if (small > 0 || large > 0) return +(small * days * PRICING.small + large * days * PRICING.large).toFixed(2);
  return +((booking.luggageCount || 0) * days * PRICING.small).toFixed(2);
}

export async function POST(req) {
  try {
    await dbConnect();
    const user = userAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { bookingId, type, requestedDropOff, requestedPickUp, customerNote } = await req.json();
    if (!bookingId || !type) return NextResponse.json({ error: 'bookingId and type are required' }, { status: 400 });
    if (!['cancel', 'reduce'].includes(type)) return NextResponse.json({ error: 'type must be cancel or reduce' }, { status: 400 });

    const booking = await Booking.findById(bookingId);
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    // Verify ownership: userId match OR email match (covers guest bookings linked by email)
    const dbUser = await User.findById(user.userId).lean();
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const ownsById    = booking.userId && String(booking.userId) === String(user.userId);
    const ownsByEmail = booking.email?.toLowerCase() === dbUser.email?.toLowerCase();
    if (!ownsById && !ownsByEmail)
      return NextResponse.json({ error: 'Not your booking' }, { status: 403 });

    const allowedStatuses = ['pending', 'confirmed'];
    if (!allowedStatuses.includes(booking.status))
      return NextResponse.json({ error: `Cannot request changes on a booking with status "${booking.status}"` }, { status: 400 });

    // 2-hour cutoff check — both sides use fake-UTC so the diff is real Melbourne hours
    const hoursUntilDropOff = (new Date(booking.dropOffDate) - getMelbourneNow()) / 3600000;
    if (hoursUntilDropOff < CUTOFF_HOURS)
      return NextResponse.json({ error: `Requests must be made at least ${CUTOFF_HOURS} hours before drop-off` }, { status: 400 });

    // Check no existing pending request for this booking
    const existing = await RefundRequest.findOne({ bookingId: booking._id, status: 'pending' });
    if (existing) return NextResponse.json({ error: 'You already have a pending request for this booking' }, { status: 400 });

    let refundAmount;
    let newDrop, newPick;

    if (type === 'cancel') {
      refundAmount = booking.totalAmount;
    } else {
      // reduce
      if (!requestedDropOff || !requestedPickUp)
        return NextResponse.json({ error: 'New dates required for reduce request' }, { status: 400 });
      newDrop = new Date(requestedDropOff);
      newPick = new Date(requestedPickUp);
      if (isNaN(newDrop) || isNaN(newPick) || newPick <= newDrop)
        return NextResponse.json({ error: 'Invalid new dates' }, { status: 400 });
      const newAmount = calcAmount(booking, newDrop, newPick);
      if (newAmount >= booking.totalAmount)
        return NextResponse.json({ error: 'New dates must result in a shorter stay. Use Change Dates to extend.' }, { status: 400 });
      refundAmount = +(booking.totalAmount - newAmount).toFixed(2);
    }

    const request = await RefundRequest.create({
      bookingId: booking._id,
      userId: dbUser._id,
      type,
      originalDropOff:  booking.dropOffDate,
      originalPickUp:   booking.pickUpDate,
      originalAmount:   booking.totalAmount,
      requestedDropOff: newDrop || null,
      requestedPickUp:  newPick || null,
      refundAmount,
      customerNote: customerNote?.trim() || '',
    });

    return NextResponse.json({
      success: true,
      requestId: request._id,
      refundAmount,
      message: type === 'cancel'
        ? `Cancellation request submitted. Refund of A$${refundAmount.toFixed(2)} will be processed once reviewed.`
        : `Reduce request submitted. Refund of A$${refundAmount.toFixed(2)} will be processed once reviewed.`,
    });
  } catch (err) {
    console.error('refund-request error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
