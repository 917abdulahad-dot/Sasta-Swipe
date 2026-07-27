import { NextRequest, NextResponse } from "next/server";
import { getBankById, BANK_OWNERKEYS } from "@/lib/banks";

export const runtime = "nodejs";
export const maxDuration = 30;

// ── Peekaboo SDK endpoints (obfuscated but fixed across all banks) ──────────
const ASSOCIATIONS_ENDPOINT =
  "https://secure-sdk.peekaboo.guru/saovrumensjlqdsaiocassasdasociasdasdtns";
const DEALS_ENDPOINT =
  "https://secure-sdk.peekaboo.guru/ksbolruuahrndcjchshjhejgjhasdo787kjieo767kjsgeskoyfgwwhkl6";

function toCardSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[&]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

async function postPeekaboo(
  url: string,
  body: Record<string, unknown>,
  referer: string,
  ownerKey: string
): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      medium: "IFRAME",
      ownerkey: ownerKey,
      version: "1.0.0",
      Origin: referer.replace(/\/$/, ""),
      Referer: referer,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Peekaboo API ${res.status}: ${text}`);
  }
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const { bankId, entityId, merchant, cardType, city } = await req.json();

    if (!bankId || !entityId || !cardType || !city) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const bank = getBankById(bankId);
    if (!bank) {
      return NextResponse.json({ error: `Bank '${bankId}' not found` }, { status: 404 });
    }

    const ownerKey = BANK_OWNERKEYS[bankId];
    if (!ownerKey) {
      return NextResponse.json({ maxCap: null, description: "Bank not supported for cap lookup" });
    }

    const referer = bank.dealsWidgetUrl ?? "https://hbl-web.peekaboo.guru/";
    // Peekaboo expects title-cased city name
    const cityName = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
    const cardSlug = toCardSlug(cardType);

    console.log(`[Deal Cap] bank=${bankId} entity=${entityId} card=${cardType} city=${cityName}`);

    // ── Step 1: Fetch associations to get associationTypeId ─────────────────
    // Not needed for "All Cards" — just fetch deals without a type filter
    let associationTypeId: string | null = null;

    if (cardType !== "All Cards") {
      const assocData = (await postPeekaboo(
        ASSOCIATIONS_ENDPOINT,
        {
          fksyd: cityName,
          n4ja3s: "Pakistan",
          js6nwf: "0",
          pan3ba: "0",
          mstoaw: "en",
          mnakls: "50",
          opmsta: "0",
        },
        referer,
        ownerKey
      )) as any[];

      for (const assoc of assocData) {
        const name = assoc.typeName ?? assoc.associationName ?? assoc.name ?? "";
        const assocSlug = toCardSlug(name);
        if (
          assocSlug === cardSlug ||
          assocSlug.includes(cardSlug) ||
          cardSlug.includes(assocSlug)
        ) {
          associationTypeId = String(assoc.typeId ?? assoc.associationTypeId ?? "");
          console.log(`[Deal Cap] Association matched: "${name}" → typeId=${associationTypeId}`);
          break;
        }
      }

      if (!associationTypeId) {
        console.log(`[Deal Cap] No association found for card slug: ${cardSlug}`);
        return NextResponse.json({
          maxCap: null,
          description: "Could not map card type to association",
        });
      }
    }

    // ── Step 2: Fetch deal details for the specific merchant/entity ─────────
    const dealsBody: Record<string, unknown> = {
      fksyd: cityName,
      n4ja3s: "Pakistan",
      js6nwf: "0",
      pan3ba: "0",
      mstoaw: "en",
      cotuia: Number(entityId),
      nai3asnu: "All",
      ia3uas: "All",
      matsw: merchant ?? "",
      yudwq: "_all",
      njsue: "sdk",
      hgoeni: Number(entityId),
      mnakls: "100",
      opmsta: "0",
      mghes: "true",
      klaosw: false,
      makthya: "discount",
    };

    if (associationTypeId) {
      dealsBody.kaiwnua = associationTypeId;
    }

    const deals = (await postPeekaboo(
      DEALS_ENDPOINT,
      dealsBody,
      referer,
      ownerKey
    )) as any[];

    console.log(`[Deal Cap] Fetched ${Array.isArray(deals) ? deals.length : 0} deals`);

    if (!Array.isArray(deals) || deals.length === 0) {
      return NextResponse.json({ maxCap: null, description: "No deals found for this merchant" });
    }

    // Find the deal that exactly matches our entityId, or fall back to first
    const deal =
      deals.find((d: any) => String(d.targetEntityId) === String(entityId)) ?? deals[0];

    console.log(`[Deal Cap] Using deal: "${deal.title}" for "${deal.targetEntityName}"`);

    // ── Step 3: Extract cap from the deal description ───────────────────────
    let maxCap: number | null = null;
    const description: string = deal.description ?? "";

    if (description) {
      // Primary pattern: "Discount Cap PKR 3,000/-" or "Discount Capping Rs. 5,000"
      const primaryMatch = description.match(
        /(?:discount\s*cap(?:ping)?|maximum\s*(?:discount|saving))[\s\S]{0,40}?(?:pkr|rs\.?)\s*([\d,]+)/i
      );
      if (primaryMatch) {
        maxCap = parseInt(primaryMatch[1].replace(/,/g, ""), 10);
        console.log(`[Deal Cap] maxCap (primary) = ${maxCap}`);
      } else {
        // Fallback: any Rs./PKR amount in description (least specific)
        const fallbackMatch = description.match(/(?:pkr|rs\.?)\s*([\d,]+)/i);
        if (fallbackMatch) {
          maxCap = parseInt(fallbackMatch[1].replace(/,/g, ""), 10);
          console.log(`[Deal Cap] maxCap (fallback) = ${maxCap}`);
        }
      }
    }

    return NextResponse.json({
      maxCap,
      description: deal.description ?? null,
      discount: deal.title ?? null,
      percentageValue: deal.percentageValue ?? null,
    });
  } catch (err) {
    console.error("[Deal Cap] Fatal error:", err);
    return NextResponse.json({ error: "Failed to fetch cap", details: String(err) }, { status: 500 });
  }
}
