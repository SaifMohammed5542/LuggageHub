import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import dbConnect from "../../../lib/dbConnect";
import KeyHandover from "../../../models/keyHandover";
import Station from "../../../models/Station";
import User from "../../../models/User";
import ErrorLog from "../../../models/ErrorLog";
import { sendErrorNotification } from "../../../utils/mailer";

void User; // ensures model is registered

export async function POST(request) {
  try {
    await dbConnect();

    const {
      dropOffPerson,
      pickUpPerson,
      dropOffDate,
      pickUpDate,
      stationId,
      paymentId,
    } = await request.json();

    // calculate days & price
    const numberOfDays = Math.max(
      1,
      Math.ceil(
        (new Date(pickUpDate) - new Date(dropOffDate)) / (1000 * 60 * 60 * 24)
      )
    );
    const keyRatePerDay = 9.99; // 💰 change here if rate changes
    const totalAmount = numberOfDays * keyRatePerDay;

    // generate random 6-digit pickup code
    const keyCode = Math.floor(100000 + Math.random() * 900000).toString();

    // save new handover
    const newHandover = new KeyHandover({
      dropOffPerson,
      pickUpPerson,
      dropOffDate,
      pickUpDate,
      stationId,
      keyCode,
      paymentId,
      price: totalAmount,
      paymentStatus: "confirmed",
      status: "pending",
    });

    await newHandover.save();

    // fetch station + partners
    const station = await Station.findById(stationId).populate("partners");
    const stationName = station?.name || "Unknown Station";

    // setup mail transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 📨 admin email
    await transporter.sendMail({
      from: `"Luggage Terminal" <no-reply@luggageterminal.com>`,
      to: process.env.EMAIL_ADMIN,
      subject: "🔑 New Key Handover Booking",
      text: `
New Key Handover Booking
-------------------------
Drop-off: ${dropOffPerson.name} (${dropOffPerson.email || "no email"})
Pick-up: ${pickUpPerson.name} (${pickUpPerson.email || "no email"})
Drop-off Date: ${dropOffDate}
Pick-up Date: ${pickUpDate}
Pickup Code: ${keyCode}
Payment ID: ${paymentId}
Amount: A$${totalAmount}
Station: ${stationName}
      `,
    });

    // 📨 drop-off person email
    if (dropOffPerson.email) {
      await transporter.sendMail({
        from: `"Luggage Terminal" <no-reply@luggageterminal.com>`,
        to: dropOffPerson.email,
        subject: "✅ Key Handover Confirmed",
        html: `
          <p>Hi ${dropOffPerson.name},</p>
          <p>Your key has been dropped off at <b>${stationName}</b>.</p>
          <p><b>Pickup Date:</b> ${pickUpDate}</p>
          <p><b>Pickup Code:</b> ${keyCode}</p>
        `,
      });
    }

    // 📨 pick-up person email
    if (pickUpPerson.email) {
      await transporter.sendMail({
        from: `"Luggage Terminal" <no-reply@luggageterminal.com>`,
        to: pickUpPerson.email,
        subject: "🔑 Key Pickup Instructions",
        html: `
          <p>Hi ${pickUpPerson.name},</p>
          <p>A key is waiting for you at <b>${stationName}</b>.</p>
          <p><b>Pickup Date:</b> ${pickUpDate}</p>
          <p><b>Pickup Code:</b> ${keyCode}</p>
        `,
      });
    }

    // 📨 notify station partners
    if (station?.partners?.length) {
      for (const partner of station.partners) {
        if (partner?.email && partner.role === "partner") {
          await transporter.sendMail({
            from: `"Luggage Terminal" <no-reply@luggageterminal.com>`,
            to: partner.email,
            subject: "🔑 New Key Handover at Your Station",
            text: `
A new key handover has been booked:

Drop-off: ${dropOffPerson.name} (${dropOffPerson.email || "no email"})
Pick-up: ${pickUpPerson.name} (${pickUpPerson.email || "no email"})
Drop-off Date: ${dropOffDate}
Pick-up Date: ${pickUpDate}
Pickup Code: ${keyCode}
Payment ID: ${paymentId}
Amount: A$${totalAmount}
Station: ${stationName}
            `,
          });
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Key Handover saved and emails sent",
        handover: {
          _id: newHandover._id,
          keyCode: newHandover.keyCode,
          stationId: newHandover.stationId,
          dropOffPerson: newHandover.dropOffPerson,
          pickUpPerson: newHandover.pickUpPerson,
          dropOffDate: newHandover.dropOffDate,
          pickUpDate: newHandover.pickUpDate,
          paymentId: newHandover.paymentId,
          price: newHandover.price,
          status: newHandover.status,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("💥 Key Handover API Error:", error);

    // try to extract user + station for error logging
    let userEmail = "Unknown";
    let stationName = "Unknown";
    try {
      const clonedReq = request.clone();
      const body = await clonedReq.json();
      if (body?.dropOffPerson?.email) userEmail = body.dropOffPerson.email;
      if (body?.stationId) {
        try {
          const stationDoc = await Station.findById(body.stationId);
          stationName = stationDoc?.name || body.stationId;
        } catch {
          stationName = body.stationId;
        }
      }
    } catch {}

    // save error log
    await ErrorLog.create({
      user: userEmail,
      station: stationName,
      errorType: "KEY_HANDOVER_API_ERROR",
      message: error.message,
      stack: error.stack,
    });

    // send error alert
    await sendErrorNotification({
      user: userEmail,
      station: stationName,
      error: error.message,
    });

    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
