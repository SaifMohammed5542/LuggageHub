// app/api/partner-lead/route.js

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import PartnerLead from '@/models/PartnerLead';
import { sendPartnerLeadEmails } from '@/utils/emailTemplates';

export async function POST(req) {
  try {
    const body = await req.json();
    const { businessName, ownerName, suburb, address, phone, email, businessType } = body;

    if (!businessName || !ownerName || !suburb || !phone || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await dbConnect();

    const lead = await PartnerLead.create({
      businessName,
      ownerName,
      suburb,
      address,
      phone,
      email,
      businessType,
    });

    sendPartnerLeadEmails({ businessName, ownerName, suburb, address, phone, email, businessType })
      .catch(err => console.error('❌ Partner lead email failed:', err));

    console.log(`✅ Partner lead saved — ${businessName} (${suburb})`);
    return NextResponse.json({ success: true, leadId: lead._id });

  } catch (err) {
    console.error('❌ Partner lead error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}