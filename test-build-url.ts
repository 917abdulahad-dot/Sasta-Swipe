import { chromium } from "playwright";
async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  let associations = null;
  page.on("response", async (res) => {
    if (res.url().includes("saovrumensjlqdsaiocassasdasociasdasdtns")) {
      try {
        associations = JSON.parse(await res.text());
      } catch (e) {}
    }
  });
  await page.goto("https://hbl-web.peekaboo.guru/lahore/places/_all/all", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);
  await browser.close();

  if (associations) {
      console.log("Found associations!");
      const targetSlug = "visa-platinum-debit-card";
      let matched = false;
      for (let i = 0; i < associations.length; i++) {
        const assoc = associations[i];
        const toCardSlug = (s: string) => s.toLowerCase().replace(/[&]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/[^a-z0-9-]/g, "");
        const assocSlug = toCardSlug(assoc.typeName ?? assoc.associationName ?? assoc.name ?? "");
        console.log("Assoc name:", assoc.typeName ?? assoc.associationName ?? assoc.name, " -> slug:", assocSlug);
        if (assocSlug === targetSlug || assocSlug.includes(targetSlug) || targetSlug.includes(assocSlug)) {
           console.log("MATCHED!");
           matched = true;
           break;
        }
      }
      if (!matched) console.log("DID NOT MATCH ANY ASSOCIATIONS");
  } else {
      console.log("No associations captured.");
  }
}
run();
