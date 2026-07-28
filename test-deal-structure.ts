import { chromium } from "playwright";
import * as fs from "fs";

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let dealsJson: any[] = [];

  page.on("response", async (res) => {
    if (!res.url().includes("secure-sdk.peekaboo.guru")) return;
    try {
      const text = await res.text();
      if (text.startsWith("[") && text.includes("entityId") && text.includes("name") && text.length > 500) {
        dealsJson = JSON.parse(text);
      }
    } catch {}
  });

  await page.goto(
    "https://mcb-web.peekaboo.guru/lahore/places/_all/all?ai=485&associationTypeId=862&card=visa-platinum-debit-card&sortType=discountPercentage",
    { waitUntil: "domcontentloaded" }
  );
  await page.waitForTimeout(6000);
  await browser.close();

  if (dealsJson.length > 0) {
    // Print first deal FULLY
    console.log("=== FIRST DEAL FULL STRUCTURE ===");
    console.log(JSON.stringify(dealsJson[0], null, 2));
    
    // Check if any deal has cap/terms info
    const keys = Object.keys(dealsJson[0]);
    console.log("\n=== ALL KEYS IN DEAL OBJECT ===");
    console.log(keys);
    
    // Save to file for deeper analysis
    fs.writeFileSync("deal-sample.json", JSON.stringify(dealsJson[0], null, 2));
    console.log("\nFull deal saved to deal-sample.json");
  }
}
run();
