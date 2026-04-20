// app/api/admin/bookings/[id]/cancel-refund/route.js
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '../../../../../../lib/dbConnect';
import Booking from '../../../../../../models/booking';
import Payment from '../../../../../../models/Payment';
import { verifyJWT } from '../../../../../../lib/auth';

// Get PayPal access token using client credentials
async function getPayPalAccessToken() {
  const base = process.env.PAYPAL_MODE === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;

  if (!clientId || !secret) {
    throw new Error('PAYPAL_CLIENT_ID or PAYPAL_SECRET is missing from environment variables');
  }

  const credentials = Buffer.from(`${clientId}:${secret}`).toString('base64');

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal token error: ${err}`);
  }

  const data = await res.json();
  return { accessToken: data.access_token, base };
}

// Issue a refund via PayPal capture refund API
async function issuePayPalRefund(captureId, amount, currency = 'AUD') {
  const { accessToken, base } = await getPayPalAccessToken();

  // Empty body = full refund; amount body = partial refund
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

  if (!res.ok) {
    throw new Error(
      data?.details?.[0]?.description || data?.message || `PayPal refund failed (${res.status})`
    );
  }

  return data; // { id, status, amount, ... }
}

export async function POST(req, { params }) {
  try {
    await dbConnect();

    // --- Auth: admin only ---
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyJWT(token);
    if (decoded?.expired) return NextResponse.json({ error: 'Token expired', expired: true }, { status: 401 });
    if (!decoded || decoded.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
    }

    const { reason, issueRefund, refundAmount } = await req.json();

    if (!reason?.trim()) {
      return NextResponse.json({ error: 'A cancellation reason is required' }, { status: 400 });
    }

    // --- Find booking ---
    const booking = await Booking.findById(id);
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    if (booking.status === 'cancelled') {
      return NextResponse.json({ error: 'Booking is already cancelled' }, { status: 400 });
    }

    // --- Find payment ---
    const payment = await Payment.findOne({ bookingId: booking._id });

    let refundResult = null;

    if (issueRefund) {
      if (!payment) {
        return NextResponse.json({ error: 'No payment record found for this booking — cannot issue refund' }, { status: 400 });
      }
      if (!payment.paypalTransactionId) {
        return NextResponse.json({ error: 'No PayPal transaction ID on payment record — cannot issue refund' }, { status: 400 });
      }
      if (payment.status === 'refunded') {
        return NextResponse.json({ error: 'This payment has already been fully refunded' }, { status: 400 });
      }

      // Determine refund amount: partial if provided, otherwise full
      const amountToRefund = refundAmount && refundAmount < payment.amount
        ? parseFloat(refundAmount)
        : null; // null = full refund (PayPal default)

      // Call PayPal
      const paypalRefund = await issuePayPalRefund(
        payment.paypalTransactionId,
        amountToRefund,
        payment.currency || 'AUD'
      );

      // Record in Payment model
      await payment.addRefund({
        refundId: paypalRefund.id,
        amount: parseFloat(paypalRefund.amount?.value || amountToRefund || payment.amount),
        reason: reason.trim(),
      });

      refundResult = {
        refundId: paypalRefund.id,
        amount: paypalRefund.amount?.value ?? amountToRefund?.toFixed(2) ?? payment.amount.toFixed(2),
        status: paypalRefund.status,
      };
    }

    // --- Cancel the booking ---
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
