import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on("request", (req) => {
    if (req.url().includes("uljin2s3nitoi89njkhklgkj5")) {
      console.log("Merchants request body:", req.postData());
    }
  });

  // Navigate to a search URL
  await page.goto(
    "https://mcb-web.peekaboo.guru/lahore/places/_all/all?query=pizza&sortType=relevance",
    { waitUntil: "domcontentloaded" }
  );
  await page.waitForTimeout(4000);
  await browser.close();
}
run();
