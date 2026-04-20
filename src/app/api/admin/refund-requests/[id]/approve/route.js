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

    const request = await RefundRequest.findById(id);
    if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    if (request.status !== 'pending') return NextResponse.json({ error: 'Request already resolved' }, { status: 400 });

    const booking = await Booking.findById(request.bookingId);
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    const payment = await Payment.findOne({ bookingId: booking._id });
    if (!payment?.paypalTransactionId) return NextResponse.json({ error: 'No PayPal transaction found' }, { status: 400 });

    // Fire PayPal refund
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
    const ppData = await ppRes.json();
    if (!ppRes.ok) throw new Error(ppData?.details?.[0]?.description || ppData?.message || `PayPal refund failed (${ppRes.status})`);

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

    // Resolve request
    request.status        = 'approved';
    request.resolvedAt    = new Date();
    request.paypalRefundId = ppData.id;
    await request.save();

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
