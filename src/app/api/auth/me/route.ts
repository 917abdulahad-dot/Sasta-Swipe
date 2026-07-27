import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    
    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Fetch user preferences
    const prefs = db.prepare('SELECT bank_id, card_type FROM user_preferences WHERE user_id = ?').get(payload.userId) as any;

    return NextResponse.json({ 
      user: { id: payload.userId, email: payload.email },
      preferences: prefs || null
    }, { status: 200 });
  } catch (error) {
    console.error("[Me API Error]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
