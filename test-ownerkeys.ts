import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const ownerkeys = new Map<string, string>();

  page.on("request", (req) => {
    if (req.url().includes("secure-sdk.peekaboo.guru")) {
      const headers = req.headers();
      const key = headers["ownerkey"];
      if (key) ownerkeys.set(req.url(), key);
    }
  });

  // Test MCB
  await page.goto("https://mcb-web.peekaboo.guru/lahore/places/_all/all", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  console.log("MCB ownerkeys:", [...new Set(ownerkeys.values())]);
  ownerkeys.clear();

  // Test HBL
  await page.goto("https://hbl-web.peekaboo.guru/lahore/places/_all/all", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  console.log("HBL ownerkeys:", [...new Set(ownerkeys.values())]);
  ownerkeys.clear();

  // Test UBL
  await page.goto("https://ubl-web.peekaboo.guru/lahore/places/_all/all", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  console.log("UBL ownerkeys:", [...new Set(ownerkeys.values())]);

  await browser.close();
}
run();
