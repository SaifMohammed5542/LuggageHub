// app/api/admin/bookings/[id]/reschedule/route.js
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '../../../../../../lib/dbConnect';
import Booking from '../../../../../../models/booking';
import Payment from '../../../../../../models/Payment';
import { verifyJWT } from '../../../../../../lib/auth';

function adminAuth(req) {
  const token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) return null;
  const decoded = verifyJWT(token);
  if (!decoded || decoded.expired || decoded.role !== 'admin') return null;
  return decoded;
}

function calcAmount(booking, dropOff, pickUp) {
  const days = Math.max(1, Math.ceil((pickUp - dropOff) / 86400000));
  const small = booking.smallBagCount || 0;
  const large = booking.largeBagCount || 0;
  if (small > 0 || large > 0)
    return +(small * days * 3.99 + large * days * 8.49).toFixed(2);
  return +((booking.luggageCount || 0) * days * 7.99).toFixed(2);
}

export async function PATCH(req, { params }) {
  try {
    await dbConnect();
    if (!adminAuth(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    if (!mongoose.isValidObjectId(id))
      return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });

    const { dropOffDate, pickUpDate, note } = await req.json();
    if (!dropOffDate || !pickUpDate)
      return NextResponse.json({ error: 'dropOffDate and pickUpDate are required' }, { status: 400 });

    const newDrop = new Date(dropOffDate);
    const newPick = new Date(pickUpDate);

    if (isNaN(newDrop) || isNaN(newPick))
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    if (newPick <= newDrop)
      return NextResponse.json({ error: 'Pick-up must be after drop-off' }, { status: 400 });

    const booking = await Booking.findById(id);
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    // Bug 2 fix: stored bookings can be rescheduled (e.g. customer calls to change pick-up)
    const reschedulable = ['pending', 'confirmed', 'stored'];
    if (!reschedulable.includes(booking.status))
      return NextResponse.json({ error: `Cannot reschedule a booking with status "${booking.status}"` }, { status: 400 });

    const oldDrop = new Date(booking.dropOffDate);
    const oldPick = new Date(booking.pickUpDate);
    const oldDays = Math.max(1, Math.ceil((oldPick - oldDrop) / 86400000));
    const newDays = Math.max(1, Math.ceil((newPick - newDrop) / 86400000));

    const oldAmount = booking.totalAmount;
    const newAmount = calcAmount(booking, newDrop, newPick);
    const amountDiff = +(newAmount - oldAmount).toFixed(2);

    // Store reschedule history
    if (!booking.rescheduleHistory) booking.rescheduleHistory = [];
    booking.rescheduleHistory.push({
      rescheduledAt: new Date(),
      rescheduledBy: 'admin',
      oldDropOffDate: booking.dropOffDate,
      oldPickUpDate: booking.pickUpDate,
      oldAmount,
      note: note || '',
    });

    booking.dropOffDate = newDrop;
    booking.pickUpDate  = newPick;
    booking.totalAmount = newAmount;

    // If amount decreased, accumulate pending refund and record which capture to refund from
    if (amountDiff < 0) {
      booking.pendingRefundAmount = +((booking.pendingRefundAmount || 0) + Math.abs(amountDiff)).toFixed(2);

      // Bug 5 fix: lock in the correct PayPal capture at the time of shortening.
      // The newest non-refunded capture is what covers the current booking period.
      if (!booking.pendingRefundCaptureId) {
        const payments = await Payment.find({ bookingId: booking._id }).sort({ createdAt: -1 });
        for (const p of payments) {
          if (!p.paypalTransactionId) continue;
          if (p.status === 'refunded') continue;
          const used = p.refunds?.reduce((s, r) => s + r.amount, 0) || 0;
          if (p.amount - used > 0.005) { booking.pendingRefundCaptureId = p.paypalTransactionId; break; }
        }
      }
    }

    await booking.save();

    return NextResponse.json({
      success: true,
      booking: {
        _id: booking._id,
        dropOffDate: booking.dropOffDate,
        pickUpDate:  booking.pickUpDate,
        totalAmount: booking.totalAmount,
        pendingRefundAmount: booking.pendingRefundAmount,
        status: booking.status,
      },
      oldDays,
      newDays,
      oldAmount,
      newAmount,
      amountDiff,
      message: `Booking rescheduled. Days: ${oldDays} → ${newDays}. Amount: A$${oldAmount} → A$${newAmount}${amountDiff !== 0 ? ` (${amountDiff > 0 ? '+' : ''}A$${amountDiff})` : ''}.`,
    });
  } catch (err) {
    console.error('reschedule error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
