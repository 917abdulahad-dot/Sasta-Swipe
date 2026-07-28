// Test the new fetch-based deal-cap logic directly (no browser)

const ASSOCIATIONS_ENDPOINT =
  "https://secure-sdk.peekaboo.guru/saovrumensjlqdsaiocassasdasociasdasdtns";
const DEALS_ENDPOINT =
  "https://secure-sdk.peekaboo.guru/ksbolruuahrndcjchshjhejgjhasdo787kjieo767kjsgeskoyfgwwhkl6";

function toCardSlug(s: string): string {
  return s.toLowerCase().replace(/[&]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/[^a-z0-9-]/g, "");
}

async function postPeekaboo(url: string, body: any, referer: string, ownerKey: string): Promise<any> {
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
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Peekaboo API error: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  const bankId = "mcb";
  const entityId = 599; // California Pizza
  const merchant = "California Pizza";
  const cardType = "Visa Platinum Debit Card";
  const city = "Lahore";
  const referer = "https://mcb-web.peekaboo.guru/";
  const cardSlug = toCardSlug(cardType);

  console.log("=== Testing fetch-based deal-cap ===");
  console.log(`Card: ${cardType} (${cardSlug})`);
  console.log(`Entity: ${entityId} (${merchant})`);
  
  const ownerKey = "20b6989c507e2aa21567a44fb3c9c183"; // MCB
  const start = Date.now();

  // Step 1: Get associations
  const assocData: any[] = await postPeekaboo(ASSOCIATIONS_ENDPOINT, {
    fksyd: city,
    n4ja3s: "Pakistan",
    js6nwf: "0",
    pan3ba: "0",
    mstoaw: "en",
    mnakls: "50",
    opmsta: "0",
  }, referer, ownerKey);

  let associationTypeId: string | null = null;
  for (const assoc of assocData) {
    const name = assoc.typeName ?? assoc.associationName ?? assoc.name ?? "";
    const assocSlug = toCardSlug(name);
    if (assocSlug === cardSlug || assocSlug.includes(cardSlug) || cardSlug.includes(assocSlug)) {
      associationTypeId = String(assoc.typeId ?? assoc.associationTypeId ?? "");
      console.log(`\nMatched association: "${name}" → typeId=${associationTypeId}`);
      break;
    }
  }

  if (!associationTypeId) {
    console.log("ERROR: No association found!");
    return;
  }

  // Step 2: Fetch deal details
  const deals: any[] = await postPeekaboo(DEALS_ENDPOINT, {
    fksyd: city,
    n4ja3s: "Pakistan",
    js6nwf: "0",
    pan3ba: "0",
    mstoaw: "en",
    cotuia: entityId,
    nai3asnu: "All",
    ia3uas: "All",
    kaiwnua: associationTypeId,
    matsw: merchant,
    yudwq: "_all",
    njsue: "sdk",
    hgoeni: entityId,
    mnakls: "100",
    opmsta: "0",
    mghes: "true",
    klaosw: false,
    makthya: "discount",
  }, referer, ownerKey);

  console.log(`\nGot ${deals.length} deals`);
  const deal = deals.find((d: any) => String(d.targetEntityId) === String(entityId)) ?? deals[0];

  if (deal) {
    console.log(`Deal: "${deal.title}"`);
    console.log(`Percentage: ${deal.percentageValue}%`);
    console.log(`Description: ${deal.description}`);
    
    const capMatch = deal.description?.match(/(?:discount\s*cap(?:ping)?|maximum\s*(?:discount|saving))[\s\S]{0,30}?(?:pkr|rs\.?)\s*([\d,]+)/i);
    if (capMatch) {
      console.log(`\n✅ maxCap = PKR ${parseInt(capMatch[1].replace(/,/g, ""), 10).toLocaleString()}`);
    } else {
      console.log("\n⚠️ No cap found in description");
    }
  }

  const elapsed = Date.now() - start;
  console.log(`\n✅ Total time: ${elapsed}ms`);
}

main().catch(console.error);
