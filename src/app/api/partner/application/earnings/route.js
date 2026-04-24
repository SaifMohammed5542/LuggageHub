// app/api/partner/application/earnings/route.js
// Cookie auth — used by both PWA and partner dashboard

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import '@/models/Station'; // registers Station schema so populate('assignedStation') works
import Booking from '@/models/booking';
import BonusOffer from '@/models/BonusOffer';
import PartnerBonus from '@/models/PartnerBonus';
import PartnerPayout from '@/models/PartnerPayout';
import { verifyJWT } from '@/lib/auth';

const COUNTABLE = ['confirmed', 'stored', 'completed'];

function bookingPartnerEarning(b) {
  const days = Math.max(1, Math.ceil((new Date(b.pickUpDate) - new Date(b.dropOffDate)) / 86400000));
  const small = b.smallBagCount || 0;
  const large = b.largeBagCount || 0;
  if (small > 0 || large > 0) return (small * days * 2) + (large * days * 4);
  return (b.luggageCount || 0) * days * 2;
}

export async function GET(req) {
  try {
    await dbConnect();

    const token = req.cookies.get('auth_session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyJWT(token);
    if (!decoded || decoded.expired || decoded.role !== 'partner')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const partner = await User.findById(decoded.userId).populate('assignedStation', 'name').lean();
    if (!partner?.assignedStation) return NextResponse.json({ error: 'No assigned station' }, { status: 404 });

    const stationId = partner.assignedStation._id;
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);

    const [bookings, payouts, offers] = await Promise.all([
      Booking.find({ stationId }).select('dropOffDate pickUpDate smallBagCount largeBagCount luggageCount status').lean(),
      PartnerPayout.find({ partnerId: partner._id }).sort({ paidAt: -1 }).lean(),
      BonusOffer.find({ active: true }).lean(),
    ]);

    const countable = bookings.filter(b => COUNTABLE.includes(b.status));

    const earningsAllTime   = countable.reduce((s, b) => s + bookingPartnerEarning(b), 0);
    const earningsThisMonth = countable
      .filter(b => new Date(b.dropOffDate) >= thisMonthStart)
      .reduce((s, b) => s + bookingPartnerEarning(b), 0);
    const totalPaid = payouts.reduce((s, p) => s + p.amount, 0);

    // Today snapshot
    const todayDropoffs = bookings.filter(b => {
      const d = new Date(b.dropOffDate);
      return d >= todayStart && d < todayEnd;
    }).length;
    const todayPickups = bookings.filter(b => {
      const d = new Date(b.pickUpDate);
      return d >= todayStart && d < todayEnd && b.status === 'stored';
    }).length;

    // Monthly breakdown
    const monthlyMap = {};
    countable.forEach(b => {
      const d = new Date(b.dropOffDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-AU', { month: 'long', year: 'numeric' });
      if (!monthlyMap[key]) monthlyMap[key] = { key, label, earnings: 0 };
      monthlyMap[key].earnings += bookingPartnerEarning(b);
    });
    const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap[nowKey])
      monthlyMap[nowKey] = { key: nowKey, label: now.toLocaleString('en-AU', { month: 'long', year: 'numeric' }), earnings: 0 };

    const monthlyBreakdown = Object.values(monthlyMap)
      .sort((a, b) => b.key.localeCompare(a.key))
      .map(m => {
        const payout = payouts.find(p => p.periodLabel === m.label) || null;
        return { key: m.key, month: m.label, earnings: +m.earnings.toFixed(2), paid: !!payout, paidAt: payout?.paidAt || null, paidAmount: payout ? +payout.amount.toFixed(2) : null };
      });

    // Bonus progress (evaluate as side-effect too)
    const allBonuses = await PartnerBonus.find({ partnerId: partner._id }).lean();

    const bonusProgress = await Promise.all(offers.map(async offer => {
      let current = 0, earned = false, windowEnd = null;

      if (offer.type === 'all_time') {
        current = Math.min(countable.length, offer.threshold);
        earned = !!allBonuses.find(b => b.offerId.toString() === offer._id.toString());

      } else if (offer.type === 'calendar_month') {
        const inMonth = countable.filter(b => new Date(b.dropOffDate) >= thisMonthStart).length;
        current = Math.min(inMonth, offer.threshold);
        earned = !!allBonuses.find(b => {
          const ws = new Date(b.windowStart);
          return b.offerId.toString() === offer._id.toString() &&
            ws.getFullYear() === now.getFullYear() && ws.getMonth() === now.getMonth();
        });
        windowEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      } else if (offer.type === 'rolling_window') {
        const lastBonus = allBonuses
          .filter(b => b.offerId.toString() === offer._id.toString())
          .sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt))[0];
        const windowStart = lastBonus
          ? new Date(lastBonus.earnedAt)
          : new Date(Math.max(new Date(offer.createdAt), new Date(partner.createdAt)));
        const wEnd = new Date(windowStart);
        wEnd.setDate(wEnd.getDate() + offer.windowDays);
        windowEnd = wEnd.toISOString();
        const inWindow = countable.filter(b => {
          const d = new Date(b.dropOffDate);
          return d >= windowStart && d <= wEnd;
        }).length;
        current = Math.min(inWindow, offer.threshold);
      }

      return { offerId: offer._id, name: offer.name, type: offer.type, threshold: offer.threshold, rewardAmount: offer.rewardAmount, current, earned, windowEnd };
    }));

    return NextResponse.json({
      earningsThisMonth: +earningsThisMonth.toFixed(2),
      earningsAllTime: +earningsAllTime.toFixed(2),
      totalPaid: +totalPaid.toFixed(2),
      outstanding: +Math.max(0, earningsAllTime - totalPaid).toFixed(2),
      todayDropoffs,
      todayPickups,
      monthlyBreakdown,
      bonusProgress,
    });
  } catch (err) {
    console.error('partner earnings error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
