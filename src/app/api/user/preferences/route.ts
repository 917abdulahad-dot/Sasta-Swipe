import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import db from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bankId, cardType } = await req.json();

    if (!bankId || !cardType) {
      return NextResponse.json({ error: "bankId and cardType are required" }, { status: 400 });
    }

    // Upsert preferences
    db.prepare(`
      INSERT INTO user_preferences (user_id, bank_id, card_type)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        bank_id = excluded.bank_id,
        card_type = excluded.card_type
    `).run(payload.userId, bankId, cardType);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[Preferences API Error]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
