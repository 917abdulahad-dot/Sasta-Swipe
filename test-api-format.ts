import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("response", async (res) => {
    const url = res.url();
    if (url.includes("secure-sdk.peekaboo.guru")) {
      try {
        const text = await res.text();
        console.log("== URL ==", url);
        console.log("== PREFIX ==", text.slice(0, 50));
      } catch (e) {}
    }
  });

  console.log("Navigating...");
  await page.goto("https://hbl-web.peekaboo.guru/lahore/places/_all/all", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(10000);
  console.log("Done");
  await browser.close();
}

run();
