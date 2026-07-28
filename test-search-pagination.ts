import { scrapeBankOffers } from "./src/lib/scraper";

async function main() {
  console.log("=== Testing search: 'pizza' with MCB Visa Platinum ===");
  const start = Date.now();
  const raw = await scrapeBankOffers("mcb", "Lahore", "Visa Platinum Debit Card", 1, "pizza");
  const data = JSON.parse(raw.replace("=== DEALS JSON API RESPONSE ===\n", ""));
  console.log(`Done in ${Date.now() - start}ms | Results: ${data.length}`);
  data.forEach((d: any) => console.log(" -", d.name));

  console.log("\n=== Testing search: 'burger' with HBL All Cards ===");
  const start2 = Date.now();
  const raw2 = await scrapeBankOffers("hbl", "Karachi", "All Cards", 1, "burger");
  const data2 = JSON.parse(raw2.replace("=== DEALS JSON API RESPONSE ===\n", ""));
  console.log(`Done in ${Date.now() - start2}ms | Results: ${data2.length}`);
  data2.forEach((d: any) => console.log(" -", d.name));

  console.log("\n=== Testing page 2 pagination ===");
  const start3 = Date.now();
  const raw3 = await scrapeBankOffers("mcb", "Lahore", "Visa Platinum Debit Card", 2);
  const data3 = JSON.parse(raw3.replace("=== DEALS JSON API RESPONSE ===\n", ""));
  console.log(`Done in ${Date.now() - start3}ms | Results: ${data3.length}`);
  data3.forEach((d: any) => console.log(" -", d.name));
}
main().catch(console.error);
