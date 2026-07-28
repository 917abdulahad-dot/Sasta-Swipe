import { scrapeBankOffers } from "./src/lib/scraper";

async function run() {
  try {
    const res = await scrapeBankOffers("mcb", "lahore", "Visa Platinum Debit Card", 1);
    console.log("Scraping Result Length:", res.length);
    console.log("Snippet:", res.slice(0, 500));
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
