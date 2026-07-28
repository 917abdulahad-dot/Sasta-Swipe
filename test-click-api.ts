import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const allApis: { url: string; prefix: string }[] = [];

  page.on("response", async (res) => {
    if (!res.url().includes("secure-sdk.peekaboo.guru")) return;
    try {
      const text = await res.text();
      if (text.startsWith("[") || text.startsWith("{")) {
        allApis.push({ url: res.url(), prefix: text.substring(0, 150) });
      }
    } catch {}
  });

  // Step 1: Load the merchant list for MCB Lahore Visa Platinum
  await page.goto(
    "https://mcb-web.peekaboo.guru/lahore/places/_all/all?ai=485&associationTypeId=862&card=visa-platinum-debit-card&sortType=discountPercentage",
    { waitUntil: "domcontentloaded" }
  );
  await page.waitForTimeout(5000);

  console.log("=== APIs after page load ===");
  for (const api of allApis) {
    console.log("URL:", api.url);
    console.log("Data:", api.prefix);
    console.log("---");
  }
  allApis.length = 0;

  // Step 2: Click the first merchant card
  console.log("\n=== Clicking first merchant ===");
  const firstCard = page.locator("article, .merchant-card, [class*='card']").first();
  try {
    await firstCard.waitFor({ state: "visible", timeout: 5000 });
    await firstCard.click();
    console.log("Clicked!");
  } catch (e) {
    console.log("Could not click card:", e);
    // Try clicking by text
    const kababjees = page.locator("text=California Pizza").first();
    try {
      await kababjees.waitFor({ state: "visible", timeout: 3000 });
      await kababjees.click();
      console.log("Clicked California Pizza");
    } catch {}
  }

  await page.waitForTimeout(5000);

  console.log("=== APIs after clicking merchant ===");
  for (const api of allApis) {
    console.log("URL:", api.url);
    console.log("Data:", api.prefix);
    console.log("---");
  }

  await browser.close();
}
run();
