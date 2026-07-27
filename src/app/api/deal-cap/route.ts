import { NextRequest, NextResponse } from "next/server";

import { getBankById } from "@/lib/banks";

// Must run as Node.js — Playwright cannot run in Edge runtime
export const runtime = "nodejs";
export const maxDuration = 60;

function toCardSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[&]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export async function POST(req: NextRequest) {
  let browser;
  try {
    const { bankId, entityId, merchant, cardType, city } = await req.json();

    if (!bankId || !entityId || !cardType || !city) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const bank = getBankById(bankId);
    if (!bank) {
      return NextResponse.json({ error: `Bank '${bankId}' not found` }, { status: 404 });
    }

    const baseUrl = bank.dealsWidgetUrl ?? "https://hbl-web.peekaboo.guru/";
    console.log(`[Deal Cap] bank=${bankId} entity=${entityId} merchant=${merchant} card=${cardType} city=${city}`);

    const cardSlug = toCardSlug(cardType);

    if (process.env.NODE_ENV === "production") {
      const sparticuz = (await import("@sparticuz/chromium")).default;
      const { chromium } = await import("playwright-core");
      browser = await chromium.launch({
        args: sparticuz.args,
        executablePath: await sparticuz.executablePath(),
        headless: true,
      });
    } else {
      const { chromium } = await import("playwright");
      browser = await chromium.launch({ headless: true });
    }

    // ── STEP 1: Get associations list ───────────────────────────────────────
    const page1 = await browser.newPage({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    });

    const associations: any[] = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Associations timeout after 8s")), 8000);

      page1.on("response", async (res) => {
        if (!res.url().includes("secure-sdk.peekaboo.guru")) return;
        try {
          const body = await res.text();
          if (body.trim().startsWith("[") && body.includes("associationId")) {
            clearTimeout(timer);
            resolve(JSON.parse(body));
          }
        } catch {}
      });

      page1.goto(`${baseUrl}${city.toLowerCase()}/places/_all/all`, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      }).catch(reject);
    });

    await page1.close();
    console.log(`[Deal Cap] Got ${associations.length} associations`);

    // ── STEP 2: Find matching association ───────────────────────────────────
    let ids: { ai: number; type: number } | null = null;
    for (const assoc of associations) {
      const name = assoc.typeName ?? assoc.associationName ?? assoc.name ?? "";
      const assocSlug = toCardSlug(name);
      if (assocSlug === cardSlug || assocSlug.includes(cardSlug) || cardSlug.includes(assocSlug)) {
        ids = {
          ai: assoc.associationId ?? assoc.id,
          type: assoc.typeId ?? assoc.associationTypeId,
        };
        console.log(`[Deal Cap] Matched: "${name}" → ai=${ids.ai} type=${ids.type}`);
        break;
      }
    }

    if (!ids) {
      await browser.close();
      console.log(`[Deal Cap] No match for slug: ${cardSlug}`);
      return NextResponse.json({ maxCap: null, description: "Could not map card type" });
    }

    // ── STEP 3: Open a fresh page, navigate to card-filtered deals, click merchant ──
    const page2 = await browser.newPage({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    });

    let filterUrl = `${baseUrl}${city.toLowerCase()}/places/_all/all?ai=${ids.ai}&associationTypeId=${ids.type}&card=${cardSlug}`;
    if (merchant) filterUrl += `&query=${encodeURIComponent(merchant)}&sortType=relevance`;
    console.log(`[Deal Cap] Filter URL: ${filterUrl}`);

    let maxCap: number | null = null;
    let descriptionText = "";
    let discountTitle = "";
    let dealResolve: () => void = () => {};

    const dealPromise = new Promise<void>((resolve) => {
      dealResolve = resolve;

      page2.on("response", async (res) => {
        // Try to intercept the specific API if it fires (varies by bank/token, but peekaboo has standard responses)
        try {
          const body = await res.text();
          if (body.includes("targetEntityId") && body.includes(String(entityId))) {
             const items: any[] = JSON.parse(body);
             if (Array.isArray(items)) {
                const deal = items.find((d) => String(d.targetEntityId) === String(entityId));
                if (deal) {
                  console.log(`[Deal Cap API] Found deal: ${deal.title}`);
                  discountTitle = deal.title || "";
                  if (deal.description) {
                    descriptionText = deal.description;
                    const m = deal.description.match(/(?:PKR|Rs\.?)\s*([\d,]+)/i);
                    if (m) {
                      maxCap = parseInt(m[1].replace(/,/g, ""), 10);
                      console.log(`[Deal Cap API] maxCap = ${maxCap}`);
                    }
                  }
                  resolve();
                }
             }
          }
        } catch (e) {
          // ignore parsing errors for non-deal responses
        }
      });
    });

    await page2.goto(filterUrl, { waitUntil: "domcontentloaded", timeout: 15000 });

    let clicked = false;
    try {
      const elExact = page2.locator(`text="${merchant}"`).first();
      const elPartial = page2.locator(`text=${merchant}`).first();

      let merchantEl = null;
      try {
        await elExact.waitFor({ state: "visible", timeout: 4000 });
        merchantEl = elExact;
        console.log(`[Deal Cap] Found merchant (exact): ${merchant}`);
      } catch {
        try {
          await elPartial.waitFor({ state: "visible", timeout: 2000 });
          merchantEl = elPartial;
          console.log(`[Deal Cap] Found merchant (partial): ${merchant}`);
        } catch {
          console.log(`[Deal Cap] Merchant "${merchant}" not found after 15s.`);
        }
      }

      if (merchantEl) {
        // Scroll into view to ensure click works
        await merchantEl.scrollIntoViewIfNeeded();
        await merchantEl.click();
        clicked = true;
      }
    } catch (err) {
      console.error("[Deal Cap] Click failed:", err);
    }

    if (clicked) {
      console.log("[Deal Cap] Clicked merchant, awaiting response or DOM update...");
      // Give it up to 5 seconds to either hit the API or render the DOM
      const timer = setTimeout(() => {
        dealResolve();
      }, 5000);
      await dealPromise;
      clearTimeout(timer);

      // Fallback: If API interception missed it, scrape the DOM directly for the cap
      if (!maxCap) {
        console.log("[Deal Cap] API interception didn't find cap. Scraping DOM...");
        // Wait briefly for animations/renders
        await page2.waitForTimeout(1500);
        
        const allText = await page2.evaluate(() => document.body.innerText);
        
        // Match common patterns across HBL, MCB, UBL:
        // "Discount cap PKR 5,000/-"
        // "Discount Capping PKR 10,000/-"
        // "Maximum Discount Rs. 2,000"
        const capRegex = /(?:discount cap(?:ping)?|maximum.*?discount).*?(?:pkr|rs\.?)\s*([\d,]+)/i;
        const domMatch = allText.match(capRegex);
        
        if (domMatch) {
           maxCap = parseInt(domMatch[1].replace(/,/g, ""), 10);
           console.log(`[Deal Cap DOM] Found maxCap = ${maxCap}`);
        } else {
           console.log(`[Deal Cap DOM] No cap found in text.`);
        }
      }
    } else {
      console.log("[Deal Cap] Merchant click failed — returning null cap");
    }

    await page2.close();
    await browser.close();

    console.log(`[Deal Cap] Result: maxCap=${maxCap} title=${discountTitle}`);
    return NextResponse.json({ maxCap, description: descriptionText, discount: discountTitle });

  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.error("[Deal Cap] Fatal error:", err);
    return NextResponse.json({ error: "Failed to fetch cap" }, { status: 500 });
  }
}
