// app/api/admin/bookings/[id]/partial-refund/route.js
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
    if (!mongoose.isValidObjectId(id))
      return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });

    const { amount, note } = await req.json();
    const refundAmt = parseFloat(amount);
    if (!refundAmt || refundAmt <= 0)
      return NextResponse.json({ error: 'Valid refund amount required' }, { status: 400 });

    const booking = await Booking.findById(id);
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    const payments = await Payment.find({ bookingId: booking._id }).sort({ createdAt: -1 });
    if (!payments.length) return NextResponse.json({ error: 'No payment record found for this booking' }, { status: 400 });

    // Bug 5 fix: if reschedule locked a specific capture, use it; otherwise fall back to newest with balance.
    let payment = null;
    if (booking.pendingRefundCaptureId) {
      payment = payments.find(p => p.paypalTransactionId === booking.pendingRefundCaptureId) || null;
      // If that specific capture is now fully refunded, fall through to newest-first
      if (payment) {
        const used = payment.refunds?.reduce((s, r) => s + r.amount, 0) || 0;
        if (payment.amount - used <= 0.005) payment = null;
      }
    }
    if (!payment) {
      for (const p of payments) {
        if (!p.paypalTransactionId) continue;
        if (p.status === 'refunded') continue;
        const used = p.refunds?.reduce((s, r) => s + r.amount, 0) || 0;
        if (p.amount - used > 0.005) { payment = p; break; }
      }
    }
    if (!payment) return NextResponse.json({ error: 'No refundable PayPal capture found — all payments already fully refunded' }, { status: 400 });

    const alreadyRefunded = payment.refunds?.reduce((sum, r) => sum + r.amount, 0) || 0;
    const maxRefundable = +(payment.amount - alreadyRefunded).toFixed(2);
    if (refundAmt > maxRefundable)
      return NextResponse.json({ error: `Max refundable from this capture is A$${maxRefundable.toFixed(2)}` }, { status: 400 });

    // Call PayPal
    const { accessToken, base } = await getPayPalAccessToken();
    const ppRes = await fetch(`${base}/v2/payments/captures/${payment.paypalTransactionId}/refund`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `partial-refund-${payment.paypalTransactionId}-${Date.now()}`,
      },
      body: JSON.stringify({ amount: { value: refundAmt.toFixed(2), currency_code: payment.currency || 'AUD' } }),
    });

    const ppData = await ppRes.json();
    if (!ppRes.ok)
      throw new Error(ppData?.details?.[0]?.description || ppData?.message || `PayPal refund failed (${ppRes.status})`);

    // Record refund on Payment
    await payment.addRefund({
      refundId: ppData.id,
      amount: parseFloat(ppData.amount?.value || refundAmt),
      reason: note || 'Partial refund — booking rescheduled to shorter duration',
    });

    // Bug 5 fix: reduce pendingRefundAmount by the actual refunded amount rather than clearing to 0.
    // If multiple shortens have accumulated, admin may need to click again for the remainder.
    const actualRefunded = parseFloat(ppData.amount?.value || refundAmt);
    booking.pendingRefundAmount = Math.max(0, +((booking.pendingRefundAmount || 0) - actualRefunded).toFixed(2));
    if (booking.pendingRefundAmount <= 0) booking.pendingRefundCaptureId = null;
    await booking.save();

    return NextResponse.json({
      success: true,
      refundId: ppData.id,
      amount: ppData.amount?.value || refundAmt.toFixed(2),
      status: ppData.status,
      pendingRefundAmount: booking.pendingRefundAmount,
      message: `A$${refundAmt.toFixed(2)} refund issued to customer successfully`,
    });
  } catch (err) {
    console.error('Partial refund error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
