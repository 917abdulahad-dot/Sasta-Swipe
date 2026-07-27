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

    const result = await db.query('SELECT * FROM saved_cards WHERE user_id = $1 ORDER BY created_at DESC', [payload.userId]);
    const cards = result.rows;
    
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

    const result = await db.query(`
      INSERT INTO saved_cards (user_id, bank_id, card_type, custom_name)
      VALUES ($1, $2, $3, $4) RETURNING id
    `, [payload.userId, bankId, cardType, customName || null]);

    const newCardId = result.rows[0].id;

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

    await db.query('DELETE FROM saved_cards WHERE id = $1 AND user_id = $2', [id, payload.userId]);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[SavedCards DELETE Error]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
