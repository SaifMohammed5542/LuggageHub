// app/api/admin/bookings/[id]/cancel-refund/route.js
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '../../../../../../lib/dbConnect';
import Booking from '../../../../../../models/booking';
import Payment from '../../../../../../models/Payment';
import { verifyJWT } from '../../../../../../lib/auth';

async function getPayPalAccessToken() {
  const base = process.env.PAYPAL_MODE === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  if (!clientId || !secret) throw new Error('PAYPAL_CLIENT_ID or PAYPAL_SECRET is missing from environment variables');
  const credentials = Buffer.from(`${clientId}:${secret}`).toString('base64');
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal token error: ${await res.text()}`);
  const data = await res.json();
  return { accessToken: data.access_token, base };
}

async function issuePayPalRefund(captureId, amount, currency = 'AUD') {
  const { accessToken, base } = await getPayPalAccessToken();
  const body = amount
    ? JSON.stringify({ amount: { value: amount.toFixed(2), currency_code: currency } })
    : '{}';
  const res = await fetch(`${base}/v2/payments/captures/${captureId}/refund`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `refund-${captureId}-${Date.now()}`,
    },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.details?.[0]?.description || data?.message || `PayPal refund failed (${res.status})`);
  return data;
}

export async function POST(req, { params }) {
  try {
    await dbConnect();

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyJWT(token);
    if (decoded?.expired) return NextResponse.json({ error: 'Token expired', expired: true }, { status: 401 });
    if (!decoded || decoded.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });

    const { reason, issueRefund, refundAmount } = await req.json();
    if (!reason?.trim()) return NextResponse.json({ error: 'A cancellation reason is required' }, { status: 400 });

    const booking = await Booking.findById(id);
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    if (booking.status === 'cancelled') return NextResponse.json({ error: 'Booking is already cancelled' }, { status: 400 });

    // All payments sorted newest-first
    const allPayments = await Payment.find({ bookingId: booking._id }).sort({ createdAt: -1 });

    let refundResult = null;

    if (issueRefund) {
      if (!allPayments.length) return NextResponse.json({ error: 'No payment record found for this booking — cannot issue refund' }, { status: 400 });

      // Build list of captures that still have refundable balance
      const refundableCaptures = [];
      for (const p of allPayments) {
        if (!p.paypalTransactionId) continue;
        if (p.status === 'refunded') continue;
        const used = p.refunds?.reduce((s, r) => s + r.amount, 0) || 0;
        const balance = +(p.amount - used).toFixed(2);
        if (balance > 0.005) refundableCaptures.push({ payment: p, balance });
      }

      if (!refundableCaptures.length) return NextResponse.json({ error: 'No refundable PayPal captures found — all payments already fully refunded' }, { status: 400 });

      const results = [];

      if (!refundAmount) {
        // Bug 4 fix: full refund — loop through ALL captures and refund each completely
        for (const { payment, balance } of refundableCaptures) {
          const ppRefund = await issuePayPalRefund(payment.paypalTransactionId, null, payment.currency || 'AUD');
          await payment.addRefund({
            refundId: ppRefund.id,
            amount: parseFloat(ppRefund.amount?.value || balance),
            reason: reason.trim(),
          });
          results.push({ refundId: ppRefund.id, amount: parseFloat(ppRefund.amount?.value || balance) });
        }
      } else {
        // Partial refund — distribute across captures newest-first until covered
        let remaining = parseFloat(refundAmount);
        for (const { payment, balance } of refundableCaptures) {
          if (remaining <= 0.005) break;
          const toRefund = +Math.min(remaining, balance).toFixed(2);
          const ppRefund = await issuePayPalRefund(payment.paypalTransactionId, toRefund, payment.currency || 'AUD');
          await payment.addRefund({
            refundId: ppRefund.id,
            amount: parseFloat(ppRefund.amount?.value || toRefund),
            reason: reason.trim(),
          });
          results.push({ refundId: ppRefund.id, amount: parseFloat(ppRefund.amount?.value || toRefund) });
          remaining = +(remaining - toRefund).toFixed(2);
        }
      }

      const totalRefunded = results.reduce((s, r) => s + r.amount, 0);
      refundResult = {
        refundId: results.map(r => r.refundId).join(', '),
        amount: totalRefunded.toFixed(2),
        status: 'COMPLETED',
        captures: results.length,
      };
    }

    await booking.cancel(reason.trim());

    return NextResponse.json({
      success: true,
      bookingReference: booking.bookingReference,
      refund: refundResult,
      message: issueRefund
        ? `Booking cancelled and refund of A$${refundResult?.amount} issued successfully`
        : 'Booking cancelled (no refund issued)',
    });
  } catch (err) {
    console.error('Cancel/refund error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
