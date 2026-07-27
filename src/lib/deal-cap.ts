import { getBankById, BANK_OWNERKEYS } from "@/lib/banks";

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

export async function getDealCapData(
  bankId: string,
  entityId: string | number,
  merchant: string,
  cardType: string,
  city: string
) {
  const bank = getBankById(bankId);
  if (!bank) {
    throw new Error(`Bank '${bankId}' not found`);
  }

  const ownerKey = BANK_OWNERKEYS[bankId];
  if (!ownerKey) {
    return { maxCap: null, description: "Bank not supported for cap lookup" };
  }

  const referer = bank.dealsWidgetUrl ?? "https://hbl-web.peekaboo.guru/";
  const cityName = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
  const cardSlug = toCardSlug(cardType);

  console.log(`[Deal Cap Lib] bank=${bankId} entity=${entityId} card=${cardType} city=${cityName}`);

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
        console.log(`[Deal Cap Lib] Association matched: "${name}" → typeId=${associationTypeId}`);
        break;
      }
    }

    if (!associationTypeId) {
      console.log(`[Deal Cap Lib] No association found for card slug: ${cardSlug}`);
      return {
        maxCap: null,
        description: "Could not map card type to association",
      };
    }
  }

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

  console.log(`[Deal Cap Lib] Fetched ${Array.isArray(deals) ? deals.length : 0} deals`);

  if (!Array.isArray(deals) || deals.length === 0) {
    return { maxCap: null, description: "No deals found for this merchant" };
  }

  const deal = deals.find((d: any) => String(d.targetEntityId) === String(entityId)) ?? deals[0];
  console.log(`[Deal Cap Lib] Using deal: "${deal.title}" for "${deal.targetEntityName}"`);

  let maxCap: number | null = null;
  const description: string = deal.description ?? "";

  if (description) {
    const primaryMatch = description.match(
      /(?:discount\s*cap(?:ping)?|maximum\s*(?:discount|saving))[\s\S]{0,40}?(?:pkr|rs\.?)\s*([\d,]+)/i
    );
    if (primaryMatch) {
      maxCap = parseInt(primaryMatch[1].replace(/,/g, ""), 10);
    } else {
      const fallbackMatch = description.match(/(?:pkr|rs\.?)\s*([\d,]+)/i);
      if (fallbackMatch) {
        maxCap = parseInt(fallbackMatch[1].replace(/,/g, ""), 10);
      }
    }
  }

  return {
    maxCap,
    description: deal.description ?? null,
    discount: deal.title ?? null,
    percentageValue: deal.percentageValue ?? null,
  };
}
