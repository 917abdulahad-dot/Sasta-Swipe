import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const ownerkeys = new Map<string, string>();

  page.on("request", (req) => {
    if (req.url().includes("secure-sdk.peekaboo.guru")) {
      const h = req.headers();
      if (h["ownerkey"]) ownerkeys.set(req.url(), h["ownerkey"]);
    }
  });

  const banks = [
    ["faysal", "https://faysalbank-web.peekaboo.guru/"],
    ["allied", "https://allied-web.peekaboo.guru/"],
    ["mcbislamic", "https://mcb-islamic-web.peekaboo.guru/"],
    ["meezan", "https://meezan-web.peekaboo.guru/"],
    ["alfalah", "https://alfalah-web.peekaboo.guru/"],
  ];

  for (const [name, url] of banks) {
    ownerkeys.clear();
    await page.goto(`${url}lahore/places/_all/all`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    const keys = [...new Set(ownerkeys.values())];
    console.log(`${name}: ${keys[0] ?? "NOT FOUND"}`);
  }

  await browser.close();
}
run();
