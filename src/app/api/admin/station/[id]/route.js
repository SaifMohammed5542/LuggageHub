// /app/api/admin/station/[id]/route.js
import dbConnect from "../../../../../lib/dbConnect";
import Station from "../../../../../models/Station";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

// ✅ Middleware helper
async function verifyAdmin(req) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { error: "Unauthorized", status: 401 };
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || decoded.role !== "admin") {
      return { error: "Forbidden: Admin access only", status: 403 };
    }

    return { decoded };
  } catch (err) {
    console.error("Auth error:", err);
    return { error: "Invalid or expired token", status: 401 };
  }
}

// 🔹 Update Station
export async function PUT(req, { params }) {
  await dbConnect();

  const auth = await verifyAdmin(req);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = params;
    const data = await req.json();

    const updatedStation = await Station.findByIdAndUpdate(id, data, { 
      new: true, 
      runValidators: true   // ✅ Ensure schema validation
    });

    if (!updatedStation) {
      return NextResponse.json({ success: false, error: "Station not found" }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, message: "Station updated", station: updatedStation },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update Station Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

// 🔹 Delete Station
export async function DELETE(req, { params }) {
  await dbConnect();

  const auth = await verifyAdmin(req);
  if (auth.error) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = params;
    const deletedStation = await Station.findByIdAndDelete(id);

    if (!deletedStation) {
      return NextResponse.json({ success: false, error: "Station not found" }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, message: "Station deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete Station Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
