import { chromium } from "playwright";
async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on("response", async (res) => {
    if (res.url().includes("secure-sdk.peekaboo.guru") || res.url().includes("saovrumensjlqdsaiocassasdasociasdasdtns")) {
      try {
        const text = await res.text();
        if (text.startsWith("[") && text.includes("entityId") && text.includes("name")) {
            console.log("DEALS JSON:", text.substring(0, 400));
        }
      } catch(e) {}
    }
  });
  await page.goto("https://hbl-web.peekaboo.guru/lahore/places/_all/all", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(6000);
  await browser.close();
}
run();
