import { NextRequest, NextResponse } from "next/server";

// Must run as Node.js — Playwright cannot run in Edge runtime
export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds (Vercel Free Tier max)
import { getCachedResult, setCachedResult } from "@/lib/cache";
import { scrapeBankOffers } from "@/lib/scraper";
import { parseDiscountsWithGemini } from "@/lib/gemini";
import { getBankById } from "@/lib/banks";
import { ScrapeResult } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bankId, cardType, city, page = 1, searchQuery = "" } = body as {
      bankId: string;
      cardType: string;
      city: string;
      page?: number;
      searchQuery?: string;
    };

    if (!bankId || !cardType || !city) {
      return NextResponse.json(
        { error: "bankId, cardType and city are required" },
        { status: 400 }
      );
    }

    const bank = getBankById(bankId);
    if (!bank) {
      return NextResponse.json({ error: `Bank '${bankId}' not found` }, { status: 404 });
    }

    // Check cache first ONLY for page 1
    if (page === 1) {
      const cached = getCachedResult(bankId, cardType, city, searchQuery);
      if (cached) {
        console.log(`[API] Cache hit for ${bankId}/${cardType}/${city}${searchQuery ? ` (Query: ${searchQuery})` : ""}`);
        return NextResponse.json(cached);
      }
    }

    console.log(`[API] Cache miss/bypass — scraping ${bank.name} for ${city} / ${cardType} (Page ${page})${searchQuery ? ` [Query: ${searchQuery}]` : ""}`);

    // Scrape the bank's offers page (passing city, cardType, page, and searchQuery)
    const rawContent = await scrapeBankOffers(bankId, city, cardType, page, searchQuery);

    // Parse with Gemini
    const discounts = await parseDiscountsWithGemini(rawContent, bank.name, cardType, city);

    const result: ScrapeResult & { searchQuery?: string } = {
      bank: bankId,
      cardType,
      city,
      discounts,
      scrapedAt: new Date().toISOString(),
      cached: false,
      searchQuery: searchQuery || undefined,
    };

    // Save to cache ONLY for page 1
    if (page === 1) {
      setCachedResult(result);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[API] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const { clearCache } = await import("@/lib/cache");
    clearCache();
    return NextResponse.json({ success: true, message: "Cache cleared" });
  } catch (err) {
    return NextResponse.json({ error: "Failed to clear cache" }, { status: 500 });
  }
}
