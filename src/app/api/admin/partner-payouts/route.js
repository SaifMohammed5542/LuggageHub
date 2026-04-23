// app/api/admin/partner-payouts/route.js
import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/dbConnect';
import User from '../../../../models/User';
import Booking from '../../../../models/booking';
import BonusOffer from '../../../../models/BonusOffer';
import PartnerBonus from '../../../../models/PartnerBonus';
import PartnerPayout from '../../../../models/PartnerPayout';
import { verifyJWT } from '../../../../lib/auth';

function adminAuth(req) {
  const token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) return null;
  const decoded = verifyJWT(token);
  if (!decoded || decoded.expired || decoded.role !== 'admin') return null;
  return decoded;
}

// Flat-rate partner earnings per booking (mirrors frontend logic)
function bookingPartnerEarning(booking) {
  const dropOff = new Date(booking.dropOffDate);
  const pickUp  = new Date(booking.pickUpDate);
  const days    = Math.max(1, Math.ceil((pickUp - dropOff) / (1000 * 60 * 60 * 24)));
  const small   = booking.smallBagCount || 0;
  const large   = booking.largeBagCount || 0;
  if (small > 0 || large > 0) return (small * days * 2) + (large * days * 4);
  return (booking.luggageCount || 0) * days * 2; // legacy fallback
}

const COUNTABLE = ['confirmed', 'stored', 'completed'];

// Evaluate all active bonus offers for a partner and create PartnerBonus records if earned
async function evaluateBonuses(partner, stationId, bookings, offers) {
  const results = [];

  for (const offer of offers) {
    if (!offer.active) continue;

    try {
      if (offer.type === 'rolling_window') {
        // Find last earned bonus for this partner+offer
        const lastBonus = await PartnerBonus.findOne(
          { partnerId: partner._id, offerId: offer._id },
          null,
          { sort: { earnedAt: -1 } }
        );

        const windowStart = lastBonus
          ? new Date(lastBonus.earnedAt)
          : new Date(Math.max(new Date(offer.createdAt), new Date(partner.createdAt)));

        const windowEnd = new Date(windowStart);
        windowEnd.setDate(windowEnd.getDate() + offer.windowDays);

        const inWindow = bookings.filter(b => {
          const d = new Date(b.dropOffDate);
          return COUNTABLE.includes(b.status) && d >= windowStart && d <= windowEnd;
        });

        if (inWindow.length >= offer.threshold) {
          // Idempotent: unique index on (partnerId, offerId, windowStart) prevents duplicates
          try {
            const bonus = await PartnerBonus.create({
              partnerId: partner._id,
              stationId,
              offerId: offer._id,
              windowStart,
              windowEnd,
              bookingsInWindow: inWindow.length,
              amount: offer.rewardAmount,
              earnedAt: new Date(),
              status: 'pending',
            });
            results.push(bonus);
          } catch (e) {
            if (e.code !== 11000) throw e; // ignore duplicate key
          }
        }

        const progress = Math.min(inWindow.length, offer.threshold);
        offer._progress = { current: inWindow.length, total: offer.threshold, progress, windowEnd };

      } else if (offer.type === 'calendar_month') {
        const now = new Date();
        const windowStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const windowEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const existing = await PartnerBonus.findOne({
          partnerId: partner._id,
          offerId: offer._id,
          windowStart: { $gte: windowStart, $lte: windowEnd },
        });

        if (!existing) {
          const inMonth = bookings.filter(b => {
            const d = new Date(b.dropOffDate);
            return COUNTABLE.includes(b.status) && d >= windowStart && d <= windowEnd;
          });

          if (inMonth.length >= offer.threshold) {
            try {
              const bonus = await PartnerBonus.create({
                partnerId: partner._id,
                stationId,
                offerId: offer._id,
                windowStart,
                windowEnd,
                bookingsInWindow: inMonth.length,
                amount: offer.rewardAmount,
                earnedAt: new Date(),
                status: 'pending',
              });
              results.push(bonus);
            } catch (e) {
              if (e.code !== 11000) throw e;
            }
          }

          const progress = Math.min(
            bookings.filter(b => {
              const d = new Date(b.dropOffDate);
              return COUNTABLE.includes(b.status) && d >= windowStart && d <= windowEnd;
            }).length,
            offer.threshold
          );
          offer._progress = { current: progress, total: offer.threshold, windowEnd };
        } else {
          offer._progress = { current: offer.threshold, total: offer.threshold, earned: true };
        }

      } else if (offer.type === 'all_time') {
        const existing = await PartnerBonus.findOne({ partnerId: partner._id, offerId: offer._id });

        if (!existing) {
          const total = bookings.filter(b => COUNTABLE.includes(b.status)).length;
          if (total >= offer.threshold) {
            try {
              await PartnerBonus.create({
                partnerId: partner._id,
                stationId,
                offerId: offer._id,
                windowStart: new Date(partner.createdAt),
                windowEnd: null,
                bookingsInWindow: total,
                amount: offer.rewardAmount,
                earnedAt: new Date(),
                status: 'pending',
              });
            } catch (e) {
              if (e.code !== 11000) throw e;
            }
          }
          const total2 = bookings.filter(b => COUNTABLE.includes(b.status)).length;
          offer._progress = { current: Math.min(total2, offer.threshold), total: offer.threshold };
        } else {
          offer._progress = { current: offer.threshold, total: offer.threshold, earned: true };
        }
      }
    } catch (err) {
      console.error(`Bonus eval error (offer ${offer._id}):`, err.message);
    }
  }

  return results;
}

// ─── GET: full payout summary for all partners ───────────────────────────────
export async function GET(req) {
  try {
    await dbConnect();
    if (!adminAuth(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const [partners, offers] = await Promise.all([
      User.find({ role: 'partner' }).populate('assignedStation', 'name location').lean(),
      BonusOffer.find().lean(),
    ]);

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const summaries = await Promise.all(partners.map(async (partner) => {
      const stationId = partner.assignedStation?._id;
      if (!stationId) return null;

      // All bookings for this station
      const bookings = await Booking.find({ stationId })
        .select('dropOffDate pickUpDate smallBagCount largeBagCount luggageCount status totalAmount')
        .lean();

      // Earnings
      const countable = bookings.filter(b => COUNTABLE.includes(b.status));
      const earningsAllTime   = countable.reduce((s, b) => s + bookingPartnerEarning(b), 0);
      const earningsThisMonth = countable
        .filter(b => new Date(b.dropOffDate) >= thisMonthStart)
        .reduce((s, b) => s + bookingPartnerEarning(b), 0);

      // Total paid (booking earnings only, from PartnerPayout)
      const payouts = await PartnerPayout.find({ partnerId: partner._id }).lean();
      const totalPaid = payouts.reduce((s, p) => s + p.amount, 0);

      // Bonuses
      await evaluateBonuses(partner, stationId, bookings, offers.map(o => ({ ...o })));
      const allBonuses = await PartnerBonus.find({ partnerId: partner._id })
        .populate('offerId', 'name')
        .lean();
      const pendingBonuses = allBonuses.filter(b => b.status === 'pending');
      const pendingBonusTotal = pendingBonuses.reduce((s, b) => s + b.amount, 0);

      // Outstanding = all-time earnings + pending bonuses − total paid
      const outstanding = Math.max(0, earningsAllTime + pendingBonusTotal - totalPaid);

      // Bonus progress for active offers
      const progress = offers
        .filter(o => o.active)
        .map(o => ({
          offerId: o._id,
          name: o.name,
          type: o.type,
          threshold: o.threshold,
          rewardAmount: o.rewardAmount,
          windowDays: o.windowDays,
          _progress: o._progress || null,
        }));

      // Monthly breakdown: group countable bookings by month, match against payout records
      const monthlyMap = {};
      countable.forEach(b => {
        const d = new Date(b.dropOffDate);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyMap[key]) {
          // Build a human-readable label: "April 2026"
          const label = d.toLocaleString('en-AU', { month: 'long', year: 'numeric' });
          monthlyMap[key] = { key, label, earnings: 0 };
        }
        monthlyMap[key].earnings += bookingPartnerEarning(b);
      });

      // Also include the current month even if it has no bookings yet
      const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap[nowKey]) {
        const label = now.toLocaleString('en-AU', { month: 'long', year: 'numeric' });
        monthlyMap[nowKey] = { key: nowKey, label, earnings: 0 };
      }

      const monthlyBreakdown = Object.values(monthlyMap)
        .sort((a, b) => b.key.localeCompare(a.key))
        .map(m => {
          // Match payout record by periodLabel
          const payout = payouts.find(p => p.periodLabel === m.label) || null;
          return {
            key: m.key,
            month: m.label,
            earnings: +m.earnings.toFixed(2),
            paid: !!payout,
            paidAt: payout?.paidAt || null,
            payoutId: payout?._id || null,
            paidAmount: payout ? +payout.amount.toFixed(2) : null,
          };
        });

      return {
        partnerId: partner._id,
        partnerName: partner.username,
        email: partner.email,
        stationId,
        stationName: partner.assignedStation?.name || '—',
        earningsThisMonth: +earningsThisMonth.toFixed(2),
        earningsAllTime: +earningsAllTime.toFixed(2),
        totalPaid: +totalPaid.toFixed(2),
        pendingBonusTotal: +pendingBonusTotal.toFixed(2),
        outstanding: +outstanding.toFixed(2),
        payoutHistory: payouts,
        pendingBonuses,
        bonusProgress: progress,
        monthlyBreakdown,
      };
    }));

    return NextResponse.json({ summaries: summaries.filter(Boolean) });
  } catch (err) {
    console.error('partner-payouts GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST: mark as paid ───────────────────────────────────────────────────────
export async function POST(req) {
  try {
    await dbConnect();
    if (!adminAuth(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { partnerId, stationId, amount, periodLabel, periodStart, periodEnd,
            bookingEarnings, bonusEarnings, bonusIds, notes } = await req.json();

    if (!partnerId || !stationId || !amount || !periodLabel)
      return NextResponse.json({ error: 'partnerId, stationId, amount and periodLabel are required' }, { status: 400 });

    // Create payout record
    const payout = await PartnerPayout.create({
      partnerId,
      stationId,
      amount,
      periodLabel,
      periodStart: periodStart ? new Date(periodStart) : new Date(),
      periodEnd:   periodEnd   ? new Date(periodEnd)   : new Date(),
      bookingEarnings: bookingEarnings || 0,
      bonusEarnings:   bonusEarnings   || 0,
      bonusIds:        bonusIds        || [],
      notes:           notes           || '',
      paidAt: new Date(),
      paidBy: 'admin',
    });

    // Mark included bonuses as paid
    if (bonusIds?.length) {
      await PartnerBonus.updateMany(
        { _id: { $in: bonusIds } },
        { status: 'paid', paidAt: new Date(), paidBy: 'admin' }
      );
    }

    return NextResponse.json({ success: true, payout }, { status: 201 });
  } catch (err) {
    console.error('partner-payouts POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
