// /app/api/key-handover/route.js
// REPLACE YOUR ENTIRE FILE WITH THIS

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import dbConnect from "../../../lib/dbConnect";
import KeyHandover from "../../../models/keyHandover";
import Station from "../../../models/Station";
import User from "../../../models/User";
import ErrorLog from "../../../models/ErrorLog";
import { sendErrorNotification } from "../../../utils/mailer";

void User;

export async function POST(request) {
  console.log('\n🎯 ========== KEY HANDOVER API CALLED ==========');
  
  try {
    await dbConnect();
    console.log('✅ Database connected');

    const body = await request.json();
    console.log('📦 Request body received:', JSON.stringify(body, null, 2));

    const {
      dropOffPerson,
      pickUpPerson,
      keyDetails,
      dropOffDate,
      pickUpDate,
      stationId,
      keyCode,
      paymentId,
    } = body;

    // Detailed validation logging
    console.log('🔍 Validating fields...');
    
    if (!dropOffPerson?.name || !dropOffPerson?.email) {
      console.error('❌ Validation failed: dropOffPerson missing', { dropOffPerson });
      return NextResponse.json(
        { success: false, message: "Drop-off person details are required" },
        { status: 400 }
      );
    }
    console.log('✅ dropOffPerson valid');

    if (!pickUpPerson?.name) {
      console.error('❌ Validation failed: pickUpPerson.name missing', { pickUpPerson });
      return NextResponse.json(
        { success: false, message: "Pick-up person name is required" },
        { status: 400 }
      );
    }
    console.log('✅ pickUpPerson valid');

    if (!keyDetails?.numberOfKeys || !keyDetails?.keyTypes || keyDetails.keyTypes.length === 0) {
      console.error('❌ Validation failed: keyDetails invalid', { keyDetails });
      return NextResponse.json(
        { success: false, message: "Key details are required" },
        { status: 400 }
      );
    }
    console.log('✅ keyDetails valid');

    if (!keyCode || keyCode.length !== 6) {
      console.error('❌ Validation failed: keyCode invalid', { keyCode, length: keyCode?.length });
      return NextResponse.json(
        { success: false, message: "Valid 6-digit PIN is required" },
        { status: 400 }
      );
    }
    console.log('✅ keyCode valid');

    if (!dropOffDate || !pickUpDate || !stationId || !paymentId) {
      console.error('❌ Validation failed: missing required fields', {
        hasDropOffDate: !!dropOffDate,
        hasPickUpDate: !!pickUpDate,
        hasStationId: !!stationId,
        hasPaymentId: !!paymentId
      });
      return NextResponse.json(
        { success: false, message: "All booking details are required" },
        { status: 400 }
      );
    }
    console.log('✅ All required fields valid');

    // Calculate days & price
    const numberOfDays = Math.max(
      1,
      Math.ceil(
        (new Date(pickUpDate) - new Date(dropOffDate)) / (1000 * 60 * 60 * 24)
      )
    );
    const keyRatePerDay = 9.99;
    const totalAmount = numberOfDays * keyRatePerDay;
    
    console.log('💰 Price calculated:', { numberOfDays, totalAmount });

    // Save new handover
    console.log('💾 Saving to database...');
    const newHandover = new KeyHandover({
      dropOffPerson: {
        name: dropOffPerson.name,
        email: dropOffPerson.email,
      },
      pickUpPerson: {
        name: pickUpPerson.name,
        email: pickUpPerson.email || null,
      },
      keyDetails: {
        numberOfKeys: parseInt(keyDetails.numberOfKeys),
        keyTypes: keyDetails.keyTypes,
        otherKeyType: keyDetails.otherKeyType || null,
        description: keyDetails.description || null,
        specialInstructions: keyDetails.specialInstructions || null,
      },
      dropOffDate,
      pickUpDate,
      stationId,
      keyCode,
      paymentId,
      price: totalAmount,
      numberOfDays,
      paymentStatus: "confirmed",
      status: "pending",
    });

    await newHandover.save();
    console.log('✅ Booking saved to database:', newHandover._id);

    // Fetch station + partners
    console.log('📍 Fetching station details...');
    const station = await Station.findById(stationId).populate("partners");
    const stationName = station?.name || "Unknown Station";
    const stationLocation = station?.location || "";
    console.log('✅ Station found:', stationName);

    // Format key types for email
    const keyTypeLabels = {
      house: "House/Apartment Keys",
      car: "Car Keys",
      office: "Office Keys",
      mailbox: "Mailbox Keys",
      safe: "Safe Keys",
      other: keyDetails.otherKeyType || "Other Keys"
    };
    const formattedKeyTypes = keyDetails.keyTypes
      .map(type => keyTypeLabels[type] || type)
      .join(", ");

    // Setup mail transporter
    console.log('📧 Setting up email transporter...');
    console.log('Email config:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.EMAIL_USER,
      hasPass: !!process.env.EMAIL_PASS,
      passLength: process.env.EMAIL_PASS?.length,
      admin: process.env.EMAIL_ADMIN
    });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 📨 Admin email
    console.log('📨 Sending admin email to:', process.env.EMAIL_ADMIN);
    try {
      await transporter.sendMail({
        from: `"Luggage Terminal" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_ADMIN,
        subject: "🔑 New Key Handover Booking",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a73e8;">🔑 New Key Handover Booking</h2>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Key Details</h3>
              <p><strong>Number of Keys:</strong> ${keyDetails.numberOfKeys}</p>
              <p><strong>Key Types:</strong> ${formattedKeyTypes}</p>
              ${keyDetails.description ? `<p><strong>Description:</strong> ${keyDetails.description}</p>` : ''}
              ${keyDetails.specialInstructions ? `<p><strong>Special Instructions:</strong> ${keyDetails.specialInstructions}</p>` : ''}
            </div>

            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #856404;">🔐 Pickup PIN</h3>
              <p style="font-size: 32px; font-weight: bold; font-family: 'Courier New', monospace; letter-spacing: 4px; color: #1a73e8; text-align: center;">
                ${keyCode}
              </p>
            </div>

            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">People Details</h3>
              <p><strong>Drop-off:</strong> ${dropOffPerson.name} (${dropOffPerson.email})</p>
              <p><strong>Pick-up:</strong> ${pickUpPerson.name} ${pickUpPerson.email ? `(${pickUpPerson.email})` : '(No email provided)'}</p>
            </div>

            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Booking Details</h3>
              <p><strong>Station:</strong> ${stationName} - ${stationLocation}</p>
              <p><strong>Drop-off:</strong> ${new Date(dropOffDate).toLocaleString()}</p>
              <p><strong>Pick-up:</strong> ${new Date(pickUpDate).toLocaleString()}</p>
              <p><strong>Duration:</strong> ${numberOfDays} day(s)</p>
              <p><strong>Amount:</strong> A$${totalAmount.toFixed(2)}</p>
              <p><strong>Payment ID:</strong> ${paymentId}</p>
            </div>
          </div>
        `,
      });
      console.log('✅ Admin email sent successfully');
    } catch (emailErr) {
      console.error('❌ Admin email failed:', emailErr.message);
      console.error('Full error:', emailErr);
    }

    // 📨 Drop-off person email
    if (dropOffPerson.email) {
      console.log('📨 Sending dropper email to:', dropOffPerson.email);
      try {
        await transporter.sendMail({
          from: `"Luggage Terminal" <${process.env.EMAIL_USER}>`,
          to: dropOffPerson.email,
          subject: "✅ Key Handover Booking Confirmed - Your PIN Inside",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a73e8;">✅ Key Handover Confirmed</h2>
              
              <p>Hi ${dropOffPerson.name},</p>
              <p>Your key handover booking has been confirmed!</p>

              <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #ffc107;">
                <h3 style="margin-top: 0; color: #856404;">🔐 Important: Your Pickup PIN</h3>
                <p style="font-size: 28px; font-weight: bold; font-family: 'Courier New', monospace; letter-spacing: 4px; color: #1a73e8; text-align: center; background: white; padding: 15px; border-radius: 8px;">
                  ${keyCode}
                </p>
                <p style="color: #856404; font-weight: bold;">⚠️ SAVE THIS PIN - Keys cannot be collected without it!</p>
              </div>

              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Key Details</h3>
                <p><strong>Number of Keys:</strong> ${keyDetails.numberOfKeys}</p>
                <p><strong>Key Types:</strong> ${formattedKeyTypes}</p>
                ${keyDetails.description ? `<p><strong>Description:</strong> ${keyDetails.description}</p>` : ''}
              </div>

              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Storage Details</h3>
                <p><strong>Station:</strong> ${stationName}</p>
                <p><strong>Location:</strong> ${stationLocation}</p>
                <p><strong>Drop-off:</strong> ${new Date(dropOffDate).toLocaleString()}</p>
                <p><strong>Pick-up:</strong> ${new Date(pickUpDate).toLocaleString()}</p>
              </div>

              <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1565c0;">Pick-up Person</h3>
                <p><strong>Name:</strong> ${pickUpPerson.name}</p>
                ${pickUpPerson.email ? `<p><strong>Email:</strong> ${pickUpPerson.email}</p>` : '<p><em>No email provided</em></p>'}
                <p style="font-size: 14px; color: #666;">Make sure to share the PIN with the person collecting the keys.</p>
              </div>

              <p><strong>Total Paid:</strong> A$${totalAmount.toFixed(2)}</p>
              
              <p style="margin-top: 30px;">Thank you for choosing Luggage Terminal!</p>
            </div>
          `,
        });
        console.log('✅ Dropper email sent successfully');
      } catch (emailErr) {
        console.error('❌ Dropper email failed:', emailErr.message);
        console.error('Full error:', emailErr);
      }
    }

    // 📨 Pick-up person email
    if (pickUpPerson.email) {
      console.log('📨 Sending picker email to:', pickUpPerson.email);
      try {
        await transporter.sendMail({
          from: `"Luggage Terminal" <${process.env.EMAIL_USER}>`,
          to: pickUpPerson.email,
          subject: "🔑 Key Pickup Instructions - Your PIN Inside",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a73e8;">🔑 Key Pickup Instructions</h2>
              
              <p>Hi ${pickUpPerson.name},</p>
              <p>Keys are waiting for you at <strong>${stationName}</strong>.</p>

              <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #ffc107;">
                <h3 style="margin-top: 0; color: #856404;">🔐 Your Pickup PIN</h3>
                <p style="font-size: 28px; font-weight: bold; font-family: 'Courier New', monospace; letter-spacing: 4px; color: #1a73e8; text-align: center; background: white; padding: 15px; border-radius: 8px;">
                  ${keyCode}
                </p>
                <p style="color: #856404; font-weight: bold;">⚠️ You MUST provide this PIN to collect the keys!</p>
              </div>

              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Key Details</h3>
                <p><strong>Number of Keys:</strong> ${keyDetails.numberOfKeys}</p>
                <p><strong>Key Types:</strong> ${formattedKeyTypes}</p>
                ${keyDetails.description ? `<p><strong>Description:</strong> ${keyDetails.description}</p>` : ''}
              </div>

              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Pickup Details</h3>
                <p><strong>Station:</strong> ${stationName}</p>
                <p><strong>Location:</strong> ${stationLocation}</p>
                <p><strong>Pickup Date/Time:</strong> ${new Date(pickUpDate).toLocaleString()}</p>
              </div>

              <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1565c0;">Drop-off Person</h3>
                <p><strong>Name:</strong> ${dropOffPerson.name}</p>
                <p><strong>Email:</strong> ${dropOffPerson.email}</p>
              </div>

              <p style="margin-top: 30px;">See you soon!</p>
            </div>
          `,
        });
        console.log('✅ Picker email sent successfully');
      } catch (emailErr) {
        console.error('❌ Picker email failed:', emailErr.message);
        console.error('Full error:', emailErr);
      }
    }

    console.log('✅ All processing complete!');
    console.log('========== API CALL FINISHED ==========\n');

    return NextResponse.json({
      success: true,
      message: "Key Handover saved and emails sent",
      handover: {
        _id: newHandover._id,
        keyCode: newHandover.keyCode,
      },
    }, { status: 200 });

  } catch (error) {
    console.error('\n💥 ========== API ERROR ==========');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('=====================================\n');


      await ErrorLog.create({
    source: "KEY_HANDOVER_API",
    message: error.message,
    stack: error.stack,
    payload: { stationId },
  });

  await sendErrorNotification({
    subject: "❌ Key Handover API Error",
    error,
  });


    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}