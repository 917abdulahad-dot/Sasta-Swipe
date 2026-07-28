import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on("request", (req) => {
    if (req.url().includes("secure-sdk.peekaboo.guru")) {
      console.log("REQUEST:", req.method(), req.url());
      const headers = req.headers();
      // Print key headers
      const interesting = ["x-api-key", "authorization", "x-auth-token", "origin", "referer"];
      for (const h of interesting) {
        if (headers[h]) console.log(`  ${h}: ${headers[h]}`);
      }
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
