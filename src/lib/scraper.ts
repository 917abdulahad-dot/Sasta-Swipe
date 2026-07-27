import { getBankById } from "@/lib/banks";

export async function scrapeBankOffers(bankId: string, city: string, cardType: string, pageNumber: number = 1, searchQuery: string = ""): Promise<string> {
  const bank = getBankById(bankId);
  if (!bank) throw new Error(`Bank not found: ${bankId}`);

  const { chromium } = await import("playwright");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
  });

  const page = await context.newPage();

  let captureEnabled = false;
  let capturedDealsJson: string | null = null;
  let associations: any[] | null = null;

  page.on("response", async (res) => {
    const url = res.url();
    if (!url.includes("secure-sdk.peekaboo.guru")) return;
    try {
      const body = await res.text();
      if (!body || body.length < 10) return;
      const trimmed = body.trim();
      
      if (trimmed.startsWith("[") && body.includes("associationId") && !associations) {
        associations = JSON.parse(body);
        console.log(`[Scraper] Captured ${associations!.length} card associations`);
      }

      if (captureEnabled && trimmed.startsWith("[") && body.includes("entityId") && body.includes("name") && body.length > 500) {
        console.log(`[Scraper] ✅ Captured deals JSON: ${body.length} chars`);
        capturedDealsJson = body;
      }
    } catch {
      // ignore
    }
  });

  try {
    const baseUrl = bank.dealsWidgetUrl ?? "https://hbl-web.peekaboo.guru/";
    const citySlug = city.toLowerCase().replace(/\s+/g, "-");
    const isAllCards = !cardType || cardType === "All Cards";

    // ── Phase 1: Navigate to city page ────────────────────────────────────
    let cityUrl = `${baseUrl}${citySlug}/places/_all/all`;
    if (searchQuery) cityUrl += `?query=${encodeURIComponent(searchQuery)}&sortType=relevance`;
    else cityUrl += `?sortType=discountPercentage`;
    console.log(`[Scraper] Navigating to: ${cityUrl}`);

    // Enable capture ONLY for the deals we care about
    captureEnabled = isAllCards;
    await page.goto(cityUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(6000);

    // ── Phase 2: Apply card filter if needed ──────────────────────────────
    if (!isAllCards) {
      console.log(`[Scraper] Applying card filter: "${cardType}"`);

      // Enable capture right before we trigger the card selection
      captureEnabled = true;
      capturedDealsJson = null;

      let appliedDirectUrl = false;
      if (associations) {
        const cardUrl = await buildCardFilterUrl(baseUrl, citySlug, cardType, associations, searchQuery);
        if (cardUrl) {
           console.log(`[Scraper] Navigating to card-filtered URL: ${cardUrl}`);
           await page.goto(cardUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
           await page.waitForTimeout(5000);
           appliedDirectUrl = true;
        }
      }

      if (!appliedDirectUrl) {
        const selected = await selectCardViaDropdown(page, cardType);
        if (selected) {
          // Wait for the filtered deals API to respond
          await page.waitForTimeout(6000);
          console.log(`[Scraper] ✅ Captured deals JSON: ${capturedDealsJson ? (capturedDealsJson as string).length + " chars" : "none"}`);
        } else {
          console.warn(`[Scraper] Could not select card "${cardType}" from dropdown`);
        }
      }
    }

    if (pageNumber > 1) {
      console.log(`[Scraper] Advancing to page ${pageNumber} by clicking See More ${pageNumber - 1} times...`);
      for (let i = 1; i < pageNumber; i++) {
        // Clear before the final click so we only capture the new chunk
        if (i === pageNumber - 1) {
           capturedDealsJson = null;
        }
        try {
          const btn = page.locator('text=/See More|Load More|Show More/i').first();
          if (await btn.isVisible({ timeout: 2000 })) {
             await btn.click();
             await page.waitForTimeout(4000); // Wait for next API chunk
          } else {
             // Fallback to scrolling if no button
             await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
             await page.waitForTimeout(2000);
          }
        } catch {}
      }
    }

    // ── Phase 3: Return data ───────────────────────────────────────────────
    if (pageNumber > 1 && !capturedDealsJson) {
      // If we are paginating and no new chunk loaded, return empty to avoid duplicate text scraping
      return `=== DEALS JSON API RESPONSE ===\n[]`;
    }

    if (capturedDealsJson) {
      return `=== DEALS JSON API RESPONSE ===\n${capturedDealsJson}`;
    }

    // Fallback: scrape visible text
    const textContent = await page.evaluate(() => {
      document.querySelectorAll("script, style, noscript").forEach((el) => el.remove());
      return document.body.innerText;
    });
    console.log(`[Scraper] Falling back to text scraping: ${textContent.length} chars`);
    return `=== PAGE TEXT ===\n${textContent}`;
  } finally {
    await browser.close();
  }
}

// ── UI helpers ─────────────────────────────────────────────────────────────

async function buildCardFilterUrl(
  baseUrl: string,
  citySlug: string,
  cardType: string,
  associations: any[],
  searchQuery: string = ""
): Promise<string | null> {
  const toCardSlug = (s: string) => 
    s.toLowerCase()
     .replace(/[&]/g, "")
     .replace(/\s+/g, "-")
     .replace(/-+/g, "-")
     .replace(/[^a-z0-9-]/g, "");
  const targetSlug = toCardSlug(cardType);

  // Find association by matching slug against name-derived slug
  for (let i = 0; i < associations.length; i++) {
    const assoc = associations[i];
    const assocSlug = toCardSlug(assoc.typeName ?? assoc.associationName ?? assoc.name ?? "");

    if (assocSlug === targetSlug || assocSlug.includes(targetSlug) || targetSlug.includes(assocSlug)) {
      const ai = assoc.associationId ?? assoc.id;
      const associationTypeId = assoc.typeId ?? assoc.associationTypeId;
      let url = `${baseUrl}${citySlug}/places/_all/all?ai=${ai}&associationTypeId=${associationTypeId}&card=${targetSlug}`;
      if (searchQuery) url += `&query=${encodeURIComponent(searchQuery)}&sortType=relevance`;
      else url += `&sortType=discountPercentage`;
      console.log(`[Scraper] Built card URL: ${url}`);
      return url;
    }
  }
  return null;
}

/**
 * Open the HBL Cards dropdown and click the target card.
 * Returns true if the card was successfully clicked.
 */
async function selectCardViaDropdown(page: any, cardType: string): Promise<boolean> {
  // 1. Open the dropdown (look for "HBL Cards" label or the card icon)
  const dropdownTriggers = [
    'text=HBL Cards',
    'text=MCB Cards',
    'text=Select Your Card',
    'text=Select Card',
    'text=Select Discount Source',
    'text=Faysal Bank Cards',
    'text=MCB Islamic Debit Cards',
    '[aria-label*="card" i]',
    'button:has-text("Cards")',
  ];

  let dropdownOpened = false;
  for (const sel of dropdownTriggers) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 })) {
        await el.click({ timeout: 2000 });
        dropdownOpened = true;
        console.log(`[Scraper] Opened card dropdown via: ${sel}`);
        break;
      }
    } catch {}
  }

  if (!dropdownOpened) {
    console.warn("[Scraper] Could not open card dropdown");
    return false;
  }

  await page.waitForTimeout(800);

  // 2. Click the specific card name in the dropdown list
  try {
    // Try exact text first
    const cardEl = page.locator(`text="${cardType}"`).first();
    if (await cardEl.isVisible({ timeout: 3000 })) {
      await cardEl.click({ timeout: 3000 });
      console.log(`[Scraper] Clicked card: "${cardType}"`);
      return true;
    }
  } catch {}

  // Try partial text (fallback)
  try {
    const cardEl = page.locator(`text=${cardType}`).first();
    if (await cardEl.isVisible({ timeout: 3000 })) {
      await cardEl.click({ timeout: 3000 });
      console.log(`[Scraper] Clicked card (partial): "${cardType}"`);
      return true;
    }
  } catch {}

  console.warn(`[Scraper] Card "${cardType}" not found in dropdown`);
  return false;
}
