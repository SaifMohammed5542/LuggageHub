// app/api/booking/route.js - COMPLETE WITH BOOKING DATA RETURN
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import dbConnect from "../../../lib/dbConnect";
import Booking from "../../../models/booking";
import Payment from "../../../models/Payment";
import Station from "../../../models/Station";
import User from "../../../models/User";
import ErrorLog from "../../../models/ErrorLog";
import { sendErrorNotification } from "../../../utils/mailer";
import { generateBookingReference, generatePaymentReference } from "../../../utils/generateReference";
import { generateQRCode } from '../../../utils/qrGenerator';

void User;

// ✅ Helper function for capacity warnings (unchanged)
async function sendCapacityWarningEmails(station, capacityPercentage, dropOffDate, pickUpDate) {
  if (capacityPercentage < 85) return;

  try {
    const nodemailer = (await import("nodemailer")).default;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const warningLevel =
      capacityPercentage >= 95
        ? "full"
        : capacityPercentage >= 90
        ? "critical"
        : "warning";
    const icon =
      warningLevel === "full"
        ? "⛔"
        : warningLevel === "critical"
        ? "🔴"
        : "🟡";

    const subject = `${icon} ${station.name} - Capacity Alert (${capacityPercentage}%)`;

    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${warningLevel === 'full' ? '#dc3545' : warningLevel === 'critical' ? '#fd7e14' : '#ffc107'}; color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin: 0; font-size: 24px;">${icon} CAPACITY ALERT</h2>
        </div>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Station Information</h3>
          <p><strong>Name:</strong> ${station.name}</p>
          <p><strong>Location:</strong> ${station.location}</p>
        </div>

        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${warningLevel === 'full' ? '#dc3545' : warningLevel === 'critical' ? '#fd7e14' : '#ffc107'};">
          <h3 style="margin-top: 0; color: #856404;">Current Status</h3>
          <p style="font-size: 32px; font-weight: bold; color: ${warningLevel === 'full' ? '#dc3545' : warningLevel === 'critical' ? '#fd7e14' : '#ffc107'}; margin: 10px 0;">
            ${capacityPercentage}% FULL
          </p>
          <p><strong>Time Period:</strong></p>
          <p>${new Date(dropOffDate).toLocaleString()} - ${new Date(pickUpDate).toLocaleString()}</p>
        </div>

        ${warningLevel === 'full' ? `
          <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #dc3545;">
            <p style="color: #721c24; font-weight: bold; margin: 0;">⛔ NO MORE BOOKINGS CAN BE ACCEPTED for this time period.</p>
          </div>
        ` : ''}
        
        ${warningLevel === 'critical' ? `
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #856404; font-weight: bold; margin: 0;">🔴 Approaching maximum capacity.</p>
          </div>
        ` : ''}
        
        ${warningLevel === 'warning' ? `
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #856404; font-weight: bold; margin: 0;">🟡 Station is filling up.</p>
          </div>
        ` : ''}
      </div>
    `;

    await transporter.sendMail({
      from: `"Luggage Terminal" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_ADMIN,
      subject,
      html: htmlMessage,
    });

    if (station?.partners?.length) {
      for (const partner of station.partners) {
        if (partner?.email && partner.role === "partner") {
          await transporter.sendMail({
            from: `"Luggage Terminal" <${process.env.EMAIL_USER}>`,
            to: partner.email,
            subject,
            html: htmlMessage,
          });
        }
      }
    }

    console.log(`📧 Capacity warning emails sent for ${station.name}`);
  } catch (error) {
    console.error("Failed to send capacity warning emails:", error);
  }
}

// ✅ Main POST function
export async function POST(request) {
  console.log('\n🎯 ========== LUGGAGE BOOKING API CALLED ==========');
  
  try {
    await dbConnect();
    console.log('✅ Database connected');

    const body = await request.json();
    console.log('📦 Request body received:', JSON.stringify(body, null, 2));

    const {
      fullName,
      email,
      phone,
      dropOffDate,
      pickUpDate,
      smallBagCount = 0,
      largeBagCount = 0,
      specialInstructions,
      paymentData,
      stationId,
      userId,
      totalAmount,
    } = body;

    const luggageCount = Number(smallBagCount) + Number(largeBagCount);

    console.log("📦 New booking request:", {
      stationId,
      dropOffDate,
      pickUpDate,
      luggageCount,
    });

    // 🚨 CAPACITY CHECK
    console.log('🔍 Fetching station details...');
    const station = await Station.findById(stationId).populate("partners");
    if (!station) {
      console.error('❌ Station not found:', stationId);
      return NextResponse.json(
        { success: false, message: "Station not found" },
        { status: 404 }
      );
    }
    console.log('✅ Station found:', station.name);

    if (station.capacity && station.capacity > 0) {
      console.log("🔍 Checking capacity for station:", station.name);

      const overlappingBookings = await Booking.find({
        stationId,
        status: "confirmed",
        dropOffDate: { $lte: new Date(pickUpDate) },
        pickUpDate: { $gte: new Date(dropOffDate) },
      }).select("luggageCount");

      const currentLuggage = overlappingBookings.reduce(
        (sum, b) => sum + (b.luggageCount || 0),
        0
      );
      const bufferCapacity = Math.floor(station.capacity * 0.9);
      const projectedTotal = currentLuggage + luggageCount;
      const percentage = Math.round((currentLuggage / station.capacity) * 100);

      console.log("📊 Capacity check:", {
        current: currentLuggage,
        projected: projectedTotal,
        buffer: bufferCapacity,
        percentage,
      });

      if (projectedTotal > bufferCapacity) {
        console.log("⛔ Capacity exceeded, blocking booking");

        return NextResponse.json(
          {
            success: false,
            message: "Station is at capacity for the selected time",
            capacityExceeded: true,
            capacity: {
              current: currentLuggage,
              max: station.capacity,
              projected: projectedTotal,
              percentage,
            },
          },
          { status: 409 }
        );
      }

      console.log("✅ Capacity check passed");
    }

    // ✅ Generate unique booking reference
    const bookingReference = generateBookingReference();
    console.log('🔖 Generated booking reference:', bookingReference);

    // ✅ Save the booking with reference
    console.log('💾 Saving booking to database...');
    const newBooking = new Booking({
      bookingReference,
      fullName,
      email,
      phone,
      dropOffDate,
      pickUpDate,
      smallBagCount,
      largeBagCount,
      luggageCount,
      specialInstructions,
      paymentId: paymentData?.paypalOrderId,
      stationId,
      userId,
      totalAmount,
      status: "confirmed",
    });

    await newBooking.save();
    console.log("✅ Booking saved:", newBooking._id, "Reference:", bookingReference);

    // ✅ Generate QR code for booking
let qrCodeDataURL = '';
try {
  qrCodeDataURL = await generateQRCode(bookingReference);
  console.log('✅ QR code generated for:', bookingReference);
} catch (qrErr) {
  console.error('⚠️ QR generation failed:', qrErr);
  // Continue anyway - booking is already saved
}

    // ✅ Generate payment reference and save payment record
    const paymentReference = generatePaymentReference();
    console.log('🔖 Generated payment reference:', paymentReference);

    const newPayment = new Payment({
      paymentReference,
      paypalOrderId: paymentData?.paypalOrderId,
      paypalTransactionId: paymentData?.paypalTransactionId,
      amount: totalAmount,
      currency: paymentData?.currency || 'AUD',
      status: 'completed',
      payerEmail: paymentData?.payerEmail || email,
      payerName: paymentData?.payerName || fullName,
      payerId: paymentData?.payerId,
      bookingId: newBooking._id,
      paymentMethod: 'paypal',
      paypalResponse: paymentData?.fullPayPalResponse,
    });

    await newPayment.save();
    console.log("✅ Payment record saved:", newPayment._id, "Reference:", paymentReference);

    let stationName = station?.name || stationId;
    const stationLocation = station?.location || "";

    if (stationId.toString() === "67fb37ffa0f2f5d8223497d7") {
      stationName = "EzyMart 660 Bourke street";
    }

    // 📧 Send capacity warning emails if needed
    if (station.capacity && station.capacity > 0) {
      const updatedOverlapping = await Booking.find({
        stationId,
        status: "confirmed",
        dropOffDate: { $lte: new Date(pickUpDate) },
        pickUpDate: { $gte: new Date(dropOffDate) },
      }).select("luggageCount");

      const updatedCurrent = updatedOverlapping.reduce(
        (sum, b) => sum + (b.luggageCount || 0),
        0
      );
      const updatedPercentage = Math.round(
        (updatedCurrent / station.capacity) * 100
      );

      await sendCapacityWarningEmails(
        station,
        updatedPercentage,
        dropOffDate,
        pickUpDate
      );
    }

    // ✅ Setup email transporter
    console.log('📧 Setting up email transporter...');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 📨 Email to admin
    console.log('📨 Sending admin email to:', process.env.EMAIL_ADMIN);
    try {
      await transporter.sendMail({
        from: `"Luggage Terminal" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_ADMIN,
        subject: `🧳 New Luggage Storage Booking - ${bookingReference}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a73e8;">🧳 New Luggage Storage Booking</h2>
            
            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #1a73e8;">
              <h3 style="margin-top: 0; color: #1565c0;">📋 Reference Numbers</h3>
              <p style="font-size: 18px; font-weight: bold; color: #1a73e8; margin: 5px 0;">
                <strong>Booking Ref:</strong> ${bookingReference}
              </p>
              <p style="font-size: 16px; color: #1565c0; margin: 5px 0;">
                <strong>Payment Ref:</strong> ${paymentReference}
              </p>
              <p style="font-size: 14px; color: #666; margin: 5px 0;">
                <strong>PayPal Order:</strong> ${paymentData?.paypalOrderId || 'N/A'}
              </p>
              <p style="font-size: 14px; color: #666; margin: 5px 0;">
                <strong>PayPal Transaction:</strong> ${paymentData?.paypalTransactionId || 'N/A'}
              </p>
            </div>

            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Customer Details</h3>
              <p><strong>Name:</strong> ${fullName}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Phone:</strong> ${phone}</p>
            </div>

            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1565c0;">Luggage Details</h3>
              <p><strong>🎒 Small Bags:</strong> ${smallBagCount}</p>
              <p><strong>🧳 Medium/Large Bags:</strong> ${largeBagCount}</p>
              <p style="font-size: 18px; font-weight: bold; color: #1a73e8;"><strong>📦 Total Bags:</strong> ${luggageCount}</p>
              ${specialInstructions ? `<p><strong>📝 Special Instructions:</strong> ${specialInstructions}</p>` : ''}
            </div>

            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Booking Details</h3>
              <p><strong>📍 Station:</strong> ${stationName}</p>
              ${stationLocation ? `<p><strong>Location:</strong> ${stationLocation}</p>` : ''}
              <p><strong>📅 Drop-off:</strong> ${new Date(dropOffDate).toLocaleString()}</p>
              <p><strong>📦 Pick-up:</strong> ${new Date(pickUpDate).toLocaleString()}</p>
              <p style="font-size: 18px; font-weight: bold; color: #2e7d32;"><strong>💰 Total Amount:</strong> A${totalAmount ? Number(totalAmount).toFixed(2) : '0.00'}</p>
            </div>
          </div>
        `,
      });
      console.log('✅ Admin email sent successfully');
    } catch (emailErr) {
      console.error('❌ Admin email failed:', emailErr.message);
    }

    // 📨 Email to customer
    // FIXED: Customer Email Section with QR Code as Attachment
// Replace your customer email section (around line 358-430) with this:

    // 📨 Email to customer
    console.log('📨 Sending customer email to:', email);
    console.log('🔍 QR Code Data URL length:', qrCodeDataURL ? qrCodeDataURL.length : 0);
    
    try {
      // Convert base64 to buffer for attachment
      let qrAttachment = null;
      if (qrCodeDataURL) {
        const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, '');
        qrAttachment = {
          filename: `booking-${bookingReference}.png`,
          content: Buffer.from(base64Data, 'base64'),
          cid: 'qrcode@booking' // This is the Content-ID for the image
        };
      }

      const mailOptions = {
        from: `"Luggage Terminal" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `✅ Booking Confirmed - ${bookingReference}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a73e8;">✅ Booking Confirmed!</h2>
            
            <p>Dear ${fullName},</p>
            <p>🙏 Thank you for booking with Luggage Terminal! Your luggage storage has been confirmed.</p>

            <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #4caf50;">
              <h3 style="margin-top: 0; color: #2e7d32;">✓ Booking Confirmed</h3>
              <p style="font-size: 20px; font-weight: bold; color: #2e7d32; margin: 10px 0;">
                Booking Reference: ${bookingReference}
              </p>
              <p style="font-size: 14px; color: #666; margin: 5px 0;">
                Payment Reference: ${paymentReference}
              </p>
              <p style="color: #2e7d32; margin: 10px 0;">
                ⚠️ <strong>Please save this booking reference for your records.</strong>
              </p>
            </div>

            <!-- ✅ QR CODE SECTION (Using CID) -->
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <h3 style="margin-top: 0; color: #1565c0;">📱 Your QR Code</h3>
              <p style="font-size: 14px; color: #666; margin: 0 0 16px 0;">
                Show this QR code when dropping off and picking up your luggage
              </p>
              ${qrCodeDataURL ? `<img src="cid:qrcode@booking" alt="Booking QR Code" style="max-width: 250px; border: 2px solid #1a73e8; border-radius: 8px; padding: 10px; background: white;" />` : '<p style="color: red;">QR Code generation failed</p>'}
              <p style="font-size: 12px; color: #999; margin: 16px 0 0 0;">
                Or provide your booking reference: <strong>${bookingReference}</strong>
              </p>
            </div>

            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1565c0;">Your Luggage Details</h3>
              <p><strong>🎒 Small Bags:</strong> ${smallBagCount}</p>
              <p><strong>🧳 Medium/Large Bags:</strong> ${largeBagCount}</p>
              <p style="font-size: 18px; font-weight: bold; color: #1a73e8;"><strong>📦 Total Bags:</strong> ${luggageCount}</p>
            </div>

            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Storage Details</h3>
              <p><strong>📍 Location:</strong> ${stationName}</p>
              ${stationLocation ? `<p><strong>Address:</strong> ${stationLocation}</p>` : ''}
              <p><strong>📅 Drop-off Date:</strong> ${new Date(dropOffDate).toLocaleString()}</p>
              <p><strong>📦 Pick-up Date:</strong> ${new Date(pickUpDate).toLocaleString()}</p>
            </div>

            ${specialInstructions ? `
              <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #856404;">📝 Special Instructions</h3>
                <p style="margin: 0;">${specialInstructions}</p>
              </div>
            ` : ''}

            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Payment Information</h3>
              <p style="font-size: 20px; font-weight: bold; color: #2e7d32; margin: 10px 0;"><strong>💰 Total Paid:</strong> A${totalAmount ? Number(totalAmount).toFixed(2) : '0.00'}</p>
              <p style="color: #4caf50; font-weight: bold;">✓ Payment Confirmed</p>
              <p style="font-size: 12px; color: #666; margin-top: 10px;">
                PayPal Transaction ID: ${paymentData?.paypalTransactionId || 'N/A'}
              </p>
            </div>

            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1a73e8;">
              <p style="margin: 0; font-size: 14px;"><strong>📌 Important:</strong> Please bring a valid ID and this booking reference (${bookingReference}) when dropping off and picking up your luggage.</p>
            </div>

            <p style="margin-top: 30px;">Thank you for choosing Luggage Terminal!</p>
            <p style="color: #666; font-size: 14px;">If you have any questions, please contact us with your booking reference: ${bookingReference}</p>
          </div>
        `
      };

      // Add QR code as attachment if it was generated
      if (qrAttachment) {
        mailOptions.attachments = [qrAttachment];
      }

      await transporter.sendMail(mailOptions);
      console.log('✅ Customer email sent successfully');
    } catch (emailErr) {
      console.error('❌ Customer email failed:', emailErr.message);
    }

    // 📨 Notify partners
    if (station?.partners?.length) {
      console.log('📨 Sending partner notifications...');
      for (const partner of station.partners) {
        if (partner?.email && partner.role === "partner") {
          try {
            await transporter.sendMail({
              from: `"Luggage Terminal" <${process.env.EMAIL_USER}>`,
              to: partner.email,
              subject: `🧳 New Booking - ${bookingReference}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #1a73e8;">🧳 New Booking at Your Station</h2>
                  
                  <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                    <p style="margin: 0; color: #856404; font-weight: bold;">A new luggage storage booking has been made at your station.</p>
                    <p style="font-size: 18px; font-weight: bold; color: #856404; margin: 10px 0;">
                      Booking Reference: ${bookingReference}
                    </p>
                  </div>

                  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Customer Details</h3>
                    <p><strong>Name:</strong> ${fullName}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Phone:</strong> ${phone}</p>
                  </div>

                  <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1565c0;">Luggage Details</h3>
                    <p><strong>🎒 Small Bags:</strong> ${smallBagCount}</p>
                    <p><strong>🧳 Medium/Large Bags:</strong> ${largeBagCount}</p>
                    <p style="font-size: 18px; font-weight: bold; color: #1a73e8;"><strong>📦 Total Bags:</strong> ${luggageCount}</p>
                    ${specialInstructions ? `<p><strong>📝 Special Instructions:</strong> ${specialInstructions}</p>` : ''}
                  </div>

                  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Booking Details</h3>
                    <p><strong>📍 Station:</strong> ${stationName}</p>
                    <p><strong>📅 Drop-off:</strong> ${new Date(dropOffDate).toLocaleString()}</p>
                    <p><strong>📦 Pick-up:</strong> ${new Date(pickUpDate).toLocaleString()}</p>
                  </div>
                </div>
              `,
            });
            console.log(`✅ Partner email sent to: ${partner.email}`);
          } catch (emailErr) {
            console.error(`❌ Partner email failed for ${partner.email}:`, emailErr.message);
          }
        }
      }
    }

    console.log('✅ All processing complete!');
    console.log('========== API CALL FINISHED ==========\n');

    // ✅ NEW: Prepare complete booking data for confirmation page
    const confirmationData = {
      bookingReference,
      paymentReference,
      bookingId: newBooking._id.toString(),
      paymentId: newPayment._id.toString(),
      
      // Customer details
      fullName,
      email,
      phone,
      
      // Station details
      stationName,
      stationLocation,
      
      // Booking details
      dropOffDate: new Date(dropOffDate).toISOString(),
      pickUpDate: new Date(pickUpDate).toISOString(),
      smallBagCount,
      largeBagCount,
      totalBags: luggageCount,
      specialInstructions,
      
      // Payment details
      totalAmount,
      paypalOrderId: paymentData?.paypalOrderId,
      paypalTransactionId: paymentData?.paypalTransactionId,
      
      // Metadata
      bookingDate: new Date().toISOString(),
      status: 'confirmed'
    };

    return NextResponse.json(
      { 
        success: true, 
        message: "Booking saved and emails sent",
        bookingReference,
        paymentReference,
        bookingId: newBooking._id,
        paymentId: newPayment._id,
        bookingData: confirmationData // ✅ NEW: Full data for frontend
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('\n💥 ========== API ERROR ==========');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('=====================================\n');

    let userEmail = "Unknown";
    let stationName = "Unknown";

    try {
      const clonedReq = request.clone();
      const body = await clonedReq.json();

      if (body?.email) userEmail = body.email;
      if (body?.stationId) {
        try {
          const stationDoc = await Station.findById(body.stationId);
          stationName = stationDoc?.name || body.stationId;
        } catch {
          stationName = body.stationId;
        }
      }
    } catch (parseErr) {
      console.warn("⚠️ Could not parse request body in error handler:", parseErr);
    }

    await ErrorLog.create({
      user: userEmail,
      station: stationName,
      errorType: "BOOKING_API_ERROR",
      message: error.message,
      stack: error.stack,
    });

    await sendErrorNotification({
      user: userEmail,
      station: stationName,
      error: error.message,
    });

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Internal Server Error",
      },
      { status: 500 }
    );
  }
}