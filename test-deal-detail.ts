import { chromium } from "playwright";
import * as fs from "fs";

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on("response", async (res) => {
    if (!res.url().includes("secure-sdk.peekaboo.guru")) return;
    try {
      const text = await res.text();
      // Capture the deals endpoint called after clicking a merchant
      if (text.includes("dealId") || text.includes("targetEntityId")) {
        console.log("\n=== DEAL DETAILS ENDPOINT ===");
        console.log("URL:", res.url());
        const parsed = JSON.parse(text);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        console.log("First item FULL:", JSON.stringify(items[0], null, 2));
        fs.writeFileSync("deal-detail-sample.json", JSON.stringify(items[0], null, 2));
      }
    } catch {}
  });

  await page.goto(
    "https://mcb-web.peekaboo.guru/lahore/places/_all/all?ai=485&associationTypeId=862&card=visa-platinum-debit-card&sortType=discountPercentage",
    { waitUntil: "domcontentloaded" }
  );
  await page.waitForTimeout(4000);

  // Click California Pizza
  const el = page.locator("text=California Pizza").first();
  await el.waitFor({ state: "visible", timeout: 5000 });
  await el.click();
  await page.waitForTimeout(5000);

  await browser.close();
}
run();
