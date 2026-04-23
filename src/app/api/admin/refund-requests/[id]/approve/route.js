// app/api/admin/refund-requests/[id]/approve/route.js
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '../../../../../../lib/dbConnect';
import RefundRequest from '../../../../../../models/RefundRequest';
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

async function getPayPalAccessToken() {
  const base = process.env.PAYPAL_MODE === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';
  const credentials = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString('base64');
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal token error: ${await res.text()}`);
  const data = await res.json();
  return { accessToken: data.access_token, base };
}

export async function POST(req, { params }) {
  try {
    await dbConnect();
    if (!adminAuth(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    // Bug 6 fix: atomically claim the request — prevents two admins double-approving simultaneously.
    // findOneAndUpdate returns the OLD document; if status wasn't 'pending', it returns null.
    const request = await RefundRequest.findOneAndUpdate(
      { _id: id, status: 'pending' },
      { $set: { status: 'approved' } }
    );
    if (!request) return NextResponse.json({ error: 'Request already resolved' }, { status: 400 });

    const booking = await Booking.findById(request.bookingId);
    if (!booking) {
      // Revert claim if booking is missing
      await RefundRequest.findByIdAndUpdate(id, { $set: { status: 'pending' } });
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Find the most recent payment with refundable balance
    const payments = await Payment.find({ bookingId: booking._id }).sort({ createdAt: -1 });
    let payment = null;
    for (const p of payments) {
      if (!p.paypalTransactionId) continue;
      if (p.status === 'refunded') continue;
      const used = p.refunds?.reduce((s, r) => s + r.amount, 0) || 0;
      if (p.amount - used > 0.005) { payment = p; break; }
    }
    if (!payment) {
      await RefundRequest.findByIdAndUpdate(id, { $set: { status: 'pending' } });
      return NextResponse.json({ error: 'No refundable PayPal capture found for this booking' }, { status: 400 });
    }

    const used = payment.refunds?.reduce((s, r) => s + r.amount, 0) || 0;
    const maxRefundable = +(payment.amount - used).toFixed(2);
    if (request.refundAmount > maxRefundable + 0.01) {
      await RefundRequest.findByIdAndUpdate(id, { $set: { status: 'pending' } });
      return NextResponse.json({
        error: `Max refundable from the most recent payment is A$${maxRefundable.toFixed(2)}. The remaining refund may need to be issued manually via PayPal.`,
      }, { status: 400 });
    }

    // Fire PayPal refund
    let ppData;
    try {
      const { accessToken, base } = await getPayPalAccessToken();
      const ppRes = await fetch(`${base}/v2/payments/captures/${payment.paypalTransactionId}/refund`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': `rfq-approve-${id}-${Date.now()}`,
        },
        body: JSON.stringify({ amount: { value: request.refundAmount.toFixed(2), currency_code: payment.currency || 'AUD' } }),
      });
      ppData = await ppRes.json();
      if (!ppRes.ok) throw new Error(ppData?.details?.[0]?.description || ppData?.message || `PayPal refund failed (${ppRes.status})`);
    } catch (paypalErr) {
      // Revert claim so admin can retry
      await RefundRequest.findByIdAndUpdate(id, { $set: { status: 'pending' } });
      throw paypalErr;
    }

    // Record refund on Payment
    await payment.addRefund({
      refundId: ppData.id,
      amount: request.refundAmount,
      reason: request.type === 'cancel' ? 'Booking cancelled by customer' : 'Booking shortened by customer',
    });

    // Update booking
    if (request.type === 'cancel') {
      booking.status = 'cancelled';
      booking.cancellationReason = 'Cancelled by customer — refund approved';
    } else {
      booking.dropOffDate = request.requestedDropOff;
      booking.pickUpDate  = request.requestedPickUp;
      booking.totalAmount = +(booking.totalAmount - request.refundAmount).toFixed(2);
    }
    await booking.save();

    // Finalise request with PayPal details
    await RefundRequest.findByIdAndUpdate(id, {
      $set: { resolvedAt: new Date(), paypalRefundId: ppData.id },
    });

    return NextResponse.json({
      success: true,
      refundId: ppData.id,
      amount: request.refundAmount,
      message: `Refund of A$${request.refundAmount.toFixed(2)} issued successfully`,
    });
  } catch (err) {
    console.error('approve refund error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
