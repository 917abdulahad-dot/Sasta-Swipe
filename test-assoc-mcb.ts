import { chromium } from "playwright";
async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  let associations = null;
  page.on("response", async (res) => {
    if (res.url().includes("secure-sdk.peekaboo.guru")) {
      try {
        const text = await res.text();
        if (text.includes("associationId") && !associations) {
            associations = JSON.parse(text);
            console.log("Found associations!");
        }
      } catch(e) {}
    }
  });
  await page.goto("https://mcb-web.peekaboo.guru/lahore/places/_all/all", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);
  await browser.close();

  if (associations) {
      const targetSlug = "visa-platinum-debit-card";
      let matched = false;
      for (let i = 0; i < associations.length; i++) {
        const assoc = associations[i];
        const toCardSlug = (s: string) => s.toLowerCase().replace(/[&]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/[^a-z0-9-]/g, "");
        const assocSlug = toCardSlug(assoc.typeName ?? assoc.associationName ?? assoc.name ?? "");
        console.log("Assoc name:", assoc.typeName ?? assoc.associationName ?? assoc.name, " -> slug:", assocSlug);
      }
  }
}
run();
