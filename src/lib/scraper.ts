import { getBankById, BANK_OWNERKEYS } from "@/lib/banks";

// ── Peekaboo SDK endpoints (obfuscated but fixed) ──────────────────────────
const ASSOCIATIONS_ENDPOINT =
  "https://secure-sdk.peekaboo.guru/saovrumensjlqdsaiocassasdasociasdasdtns";
const MERCHANTS_ENDPOINT =
  "https://secure-sdk.peekaboo.guru/uljin2s3nitoi89njkhklgkj5";

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

export async function scrapeBankOffers(
  bankId: string,
  city: string,
  cardType: string,
  pageNumber: number = 1,
  searchQuery: string = ""
): Promise<string> {
  const bank = getBankById(bankId);
  if (!bank) throw new Error(`Bank not found: ${bankId}`);

  const ownerKey = BANK_OWNERKEYS[bankId];
  if (!ownerKey) throw new Error(`No ownerKey for bank: ${bankId}`);

  const referer = bank.dealsWidgetUrl ?? "https://hbl-web.peekaboo.guru/";
  // Peekaboo expects title-cased city
  const cityName = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
  const isAllCards = !cardType || cardType === "All Cards";
  const cardSlug = isAllCards ? "" : toCardSlug(cardType);

  console.log(`[Scraper] Fetching ${bankId} / ${cardType} / ${cityName} (page ${pageNumber})`);

  // ── Step 1: Get card association typeId (skip for All Cards) ────────────
  let associationTypeId: string | null = null;

  if (!isAllCards) {
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
        console.log(`[Scraper] Association: "${name}" → typeId=${associationTypeId}`);
        break;
      }
    }

    if (!associationTypeId) {
      console.warn(`[Scraper] No association found for card: ${cardType}`);
      // Continue anyway — fetch all cards so we at least return something
    }
  }

  // ── Step 2: Fetch merchant/deal list (12 per page, peekaboo default) ────
  const PAGE_SIZE = 12;
  const offset = (pageNumber - 1) * PAGE_SIZE;

  const merchantsBody: Record<string, unknown> = {
    fksyd: cityName,
    n4ja3s: "Pakistan",
    js6nwf: "0",
    pan3ba: "0",
    mstoaw: "en",
    angaks: "all",
    j87asn: "_all",
    makthya: searchQuery ? "relevance" : "discountPercentage",
    mnakls: PAGE_SIZE,
    opmsta: String(offset),
    klaosw: false,
  };

  if (searchQuery) {
    // When searching, use the search field and reset card filter to _all
    merchantsBody.lkasx7 = searchQuery;
    merchantsBody.kaiwnua = "_all";
  } else if (associationTypeId) {
    // When not searching, apply the card filter
    merchantsBody.kaiwnua = associationTypeId;
  }

  const merchants = (await postPeekaboo(
    MERCHANTS_ENDPOINT,
    merchantsBody,
    referer,
    ownerKey
  )) as any[];

  console.log(`[Scraper] Got ${merchants.length} merchants from API`);

  // Return as JSON string so Gemini can parse it (same interface as before)
  return `=== DEALS JSON API RESPONSE ===\n${JSON.stringify(merchants)}`;
}
