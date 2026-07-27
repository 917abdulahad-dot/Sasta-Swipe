import { NextRequest, NextResponse } from "next/server";
import { getDealCapData } from "@/lib/deal-cap";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { bankId, entityId, merchant, cardType, city } = await req.json();

    if (!bankId || !entityId || !cardType || !city) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const capData = await getDealCapData(bankId, entityId, merchant, cardType, city);
    return NextResponse.json(capData);

  } catch (err) {
    console.error("[Deal Cap Route] Fatal error:", err);
    return NextResponse.json({ error: "Failed to fetch cap", details: String(err) }, { status: 500 });
  }
}
