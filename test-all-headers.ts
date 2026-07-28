import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on("request", (req) => {
    if (req.url().includes("secure-sdk.peekaboo.guru")) {
      console.log("URL:", req.url());
      const headers = req.headers();
      // Print ALL headers
      for (const [key, val] of Object.entries(headers)) {
        console.log(`  ${key}: ${val}`);
      }
      console.log("  BODY:", req.postData()?.substring(0, 200));
      console.log("---");
    }
  });

  await page.goto(
    "https://mcb-web.peekaboo.guru/lahore/places/_all/all?ai=485&associationTypeId=862&card=visa-platinum-debit-card&sortType=discountPercentage",
    { waitUntil: "domcontentloaded" }
  );
  await page.waitForTimeout(3000);
  await browser.close();
}
run();
