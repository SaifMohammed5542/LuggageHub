import { NextResponse } from "next/server";
import dbConnect from "../../../lib/dbConnect";
import ErrorLog from "../../../models/ErrorLog";
import { sendErrorNotification } from "../../../utils/mailer";

export async function POST(req) {
  try {
    await dbConnect();
    const { user, station, error } = await req.json();

    await ErrorLog.create({
      user,
      station,
      errorType: "PAYPAL_FRONTEND_ERROR",
      message: error,
      createdAt: new Date(),
    });

    await sendErrorNotification({
      user,
      station,
      error,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error logging payment error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
