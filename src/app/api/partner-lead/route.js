// app/api/partner-lead/route.js

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import { sendPartnerLeadEmails } from '@/utils/emailTemplates';

// ── Schema ──────────────────────────────────────────────────
const PartnerLeadSchema = new mongoose.Schema({
  businessName:  { type: String, required: true },
  ownerName:     { type: String, required: true },
  suburb:        { type: String, required: true },
  phone:         { type: String, required: true },
  email:         { type: String, required: true },
  businessType:  { type: String, default: '' },
  submittedAt:   { type: Date, default: Date.now },
  status:        { type: String, default: 'new' },
});

const PartnerLead =
  mongoose.models.PartnerLead ||
  mongoose.model('PartnerLead', PartnerLeadSchema);

// ── POST handler ─────────────────────────────────────────────
export async function POST(req) {
  try {
    const body = await req.json();
    const { businessName, ownerName, suburb, phone, email, businessType } = body;

    if (!businessName || !ownerName || !suburb || !phone || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await dbConnect();

    const lead = await PartnerLead.create({
      businessName,
      ownerName,
      suburb,
      phone,
      email,
      businessType,
    });

    // Uses sendPartnerLeadEmails from emailTemplates.js
    // which sends via partnerTransporter (SMTP) from partners@luggageterminal.com
    sendPartnerLeadEmails({ businessName, ownerName, suburb, phone, email, businessType })
      .catch(err => console.error('❌ Partner lead email failed:', err));

    console.log(`✅ Partner lead saved — ${businessName} (${suburb})`);
    return NextResponse.json({ success: true, leadId: lead._id });

  } catch (err) {
    console.error('❌ Partner lead error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}