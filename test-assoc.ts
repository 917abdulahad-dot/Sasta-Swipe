import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on("response", async (res) => {
    if (res.url().includes("saovrumensjlqdsaiocassasdasociasdasdtns")) {
      const text = await res.text();
      console.log("Found associations!");
      console.log(text.includes("associationId") ? "Has associationId" : "NO associationId");
      if (!text.includes("associationId")) {
          console.log(text.substring(0, 500));
      }
    }
  });
  await page.goto("https://hbl-web.peekaboo.guru/lahore/places/_all/all", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(10000);
  await browser.close();
}
run();
