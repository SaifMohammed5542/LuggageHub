export const runtime = "nodejs";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const INACTIVITY_DAYS = 7; // ⬅️ Logout after 7 days of inactivity

export async function POST(req) {
  try {
    const cookieToken = req.cookies.get('auth_session')?.value;
    
    if (!cookieToken) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    let decoded;
try {
  decoded = jwt.verify(cookieToken, process.env.JWT_SECRET);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
} catch (err) {
  decoded = jwt.decode(cookieToken);
}

    if (!decoded) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // ✅ NEW: Check last activity
    const lastActivity = decoded.lastActivity;
    if (lastActivity) {
      const daysSinceActivity = (Date.now() - lastActivity) / (1000 * 60 * 60 * 24);
      
      if (daysSinceActivity > INACTIVITY_DAYS) {
        // User inactive for more than 7 days - force logout
        const response = NextResponse.json(
          { error: "Session expired due to inactivity" },
          { status: 401 }
        );
        
        // Clear cookie
        response.cookies.set('auth_session', '', {
          httpOnly: true,
          maxAge: 0
        });
        
        return response;
      }
    }

    // ✅ NEW: Issue token with updated lastActivity timestamp
    const newToken = jwt.sign(
      {
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role,
        assignedStation: decoded.assignedStation,
        lastActivity: Date.now() // ⬅️ Update activity timestamp
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const response = NextResponse.json(
      {
        token: newToken,
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role,
      },
      { status: 200 }
    );

    // Update cookie with new token
    response.cookies.set('auth_session', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60
    });

    return response;

  } catch (error) {
    console.error("Refresh Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}