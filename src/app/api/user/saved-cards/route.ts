import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import db from "@/lib/db";

// GET: Fetch all saved cards for the user
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const cards = db.prepare('SELECT * FROM saved_cards WHERE user_id = ? ORDER BY created_at DESC').all(payload.userId);
    
    return NextResponse.json({ cards }, { status: 200 });
  } catch (error) {
    console.error("[SavedCards GET Error]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Add a new saved card
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { bankId, cardType, customName } = await req.json();

    if (!bankId || !cardType) {
      return NextResponse.json({ error: "bankId and cardType are required" }, { status: 400 });
    }

    const result = db.prepare(`
      INSERT INTO saved_cards (user_id, bank_id, card_type, custom_name)
      VALUES (?, ?, ?, ?)
    `).run(payload.userId, bankId, cardType, customName || null);

    const newCardId = result.lastInsertRowid;

    return NextResponse.json({ success: true, id: newCardId }, { status: 201 });
  } catch (error) {
    console.error("[SavedCards POST Error]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Remove a saved card
export async function DELETE(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Card ID is required" }, { status: 400 });

    db.prepare('DELETE FROM saved_cards WHERE id = ? AND user_id = ?').run(id, payload.userId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[SavedCards DELETE Error]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
