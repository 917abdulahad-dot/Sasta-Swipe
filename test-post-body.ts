import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on("request", (req) => {
    if (req.url().includes("secure-sdk.peekaboo.guru")) {
      const postData = req.postData();
      console.log("=== REQUEST ===");
      console.log("URL:", req.url());
      console.log("BODY:", postData?.substring(0, 300));
      console.log("---");
    }
  });

  await page.goto(
    "https://mcb-web.peekaboo.guru/lahore/places/_all/all?ai=485&associationTypeId=862&card=visa-platinum-debit-card&sortType=discountPercentage",
    { waitUntil: "domcontentloaded" }
  );
  await page.waitForTimeout(4000);
  const el = page.locator("text=California Pizza").first();
  await el.waitFor({ state: "visible", timeout: 5000 });
  await el.click();
  await page.waitForTimeout(4000);
  await browser.close();
}
run();
