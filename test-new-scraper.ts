import { scrapeBankOffers } from "./src/lib/scraper";
import { parseDiscountsWithGemini } from "./src/lib/gemini";
// Load env from .env.local manually
import * as fs from "fs";
const envFile = fs.readFileSync(".env.local", "utf-8");
for (const line of envFile.split("\n")) {
  const [k, ...v] = line.split("=");
  if (k && v.length) process.env[k.trim()] = v.join("=").trim();
}

async function main() {
  const bankId = "mcb";
  const cardType = "Visa Platinum Debit Card";
  const city = "Lahore";
  const page = 1;

  console.log("=== Testing new fetch-based scraper ===\n");
  const start = Date.now();

  try {
    const rawContent = await scrapeBankOffers(bankId, city, cardType, page);
    const elapsed1 = Date.now() - start;
    console.log(`\nScrape done in ${elapsed1}ms`);
    console.log("Raw content length:", rawContent.length);
    console.log("Snippet:", rawContent.substring(0, 300));

    console.log("\n--- Parsing with Gemini ---");
    const discounts = await parseDiscountsWithGemini(rawContent, "MCB", cardType, city);
    const elapsed2 = Date.now() - start;
    console.log(`\nGemini parse done in ${elapsed2}ms`);
    console.log(`Found ${discounts.length} deals`);
    if (discounts.length > 0) {
      console.log("First deal:", JSON.stringify(discounts[0], null, 2));
    }
  } catch (err) {
    console.error("ERROR:", err);
  }
}

main();
