import { NextResponse } from "next/server";
import dbConnect from "../../../lib/dbConnect";
import KeyHandover from "../../../models/keyHandover";
import Station from "../../../models/Station";
import nodemailer from "nodemailer";

export async function POST(request) {
  try {
    await dbConnect();

    const reqBody = await request.json();
    const {
      dropOffPerson,
      pickUpPerson,
      dropOffDate,
      pickUpDate,
      stationId,
    } = reqBody;

    // Normalize drop-off and pick-up details
    const dropOffName = dropOffPerson?.name || "No Name";
    const dropOffEmail = dropOffPerson?.email || null;
    const pickUpName = pickUpPerson?.name || "No Name";
    const pickUpEmail = pickUpPerson?.email || null;

    const station = await Station.findById(stationId).populate("partner");
    if (!station) {
      return NextResponse.json(
        { success: false, message: "Station not found" },
        { status: 404 }
      );
    }

    const partnerEmail = station.partner?.email;
    const keyCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Save the key handover details with keyCode
    const newHandover = await KeyHandover.create({
      dropOffPerson: { name: dropOffName, email: dropOffEmail },
      pickUpPerson: { name: pickUpName, email: pickUpEmail },
      dropOffDate,
      pickUpDate,
      keyCode,  // Change this from handoverCode to keyCode
      station: stationId,
    });

    // Setup Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const stationInfo = `${station.name} - ${station.location}`;

    // Email to drop-off person (if email provided)
    if (dropOffEmail) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: dropOffEmail,
        subject: `Your Key Handover Details – ${station.name}`,
        text: `
Hi ${dropOffName},

Your key has been dropped off at ${stationInfo}.
Pickup Date: ${pickUpDate}
Your pickup code: ${keyCode}  // Use keyCode here

Pickup Person: ${pickUpName} (${pickUpEmail || "no email provided"})

Thank you!
        `,
      });
    }

    // Email to pick-up person (if email provided)
    if (pickUpEmail) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: pickUpEmail,
        subject: `Key Pickup Instructions – ${station.name}`,
        text: `
Hi ${pickUpName},

A key is waiting for you at ${stationInfo}.
Pickup Date: ${pickUpDate}
Your pickup code: ${keyCode}  // Use keyCode here

Dropped off by: ${dropOffName} (${dropOffEmail || "no email provided"})

Thank you!
        `,
      });
    }

    // Email to station partner (if partner email exists)
    if (partnerEmail) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: partnerEmail,
        subject: `New Key Handover – ${station.name}`,
        text: `
Hello Partner,

A new key handover has been scheduled at ${stationInfo}:

• Drop-off: ${dropOffName} (${dropOffEmail || "no email provided"})
• Pick-up:  ${pickUpName} (${pickUpEmail || "no email provided"})
• Drop-off Date: ${dropOffDate}
• Pick-up Date: ${pickUpDate}
• Code: ${keyCode}  // Use keyCode here

Please verify the code when the pickup person arrives.

Regards,
Luggage Storage Online
        `,
      });
    }

    return NextResponse.json(
      { success: true, message: "Key Handover created & emails sent", handover: newHandover },
      { status: 200 }
    );
  } catch (error) {
    console.error("Key Handover Error:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}
