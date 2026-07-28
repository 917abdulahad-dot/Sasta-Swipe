import { scrapeBankOffers } from "./src/lib/scraper";
import { parseDiscountsWithGemini } from "./src/lib/gemini";
import { getBankById } from "./src/lib/banks";
import * as fs from "fs";

// Load env
const envFile = fs.readFileSync(".env.local", "utf-8");
for (const line of envFile.split("\n")) {
  const [k, ...v] = line.split("=");
  if (k && v.length) process.env[k.trim()] = v.join("=").trim();
}

async function testChatBotLogic() {
  const bankId = "mcbislamic";
  const city = "Lahore";
  const cardType = "Visa Platinum Debit Card";
  const merchantName = "Howdy";
  
  const bankName = getBankById(bankId)?.name || bankId;
  console.log(`Bank: ${bankName}, City: ${city}, Card: ${cardType}, Merchant: ${merchantName}`);
  
  const rawContent = await scrapeBankOffers(bankId, city, cardType, 1, merchantName);
  console.log("Raw Content length:", rawContent.length);
  
  const deals = await parseDiscountsWithGemini(rawContent, bankName, cardType, city);
  console.log("Deals found:", deals.length);
  
  const deal = deals.find((d: any) => {
     return d.merchant.toLowerCase().includes(merchantName.toLowerCase());
  }) || deals[0];
  
  if (!deal || !deal.entityId) {
    console.log(`Could not find any deals for ${merchantName} with the provided card. deal:`, deal);
    return;
  }
  
  console.log(`Found deal for entityId: ${deal.entityId}, merchant: ${deal.merchant}`);
  
  // now test deal-cap API directly
  // we'll just mock what deal-cap does to see if it works
  const baseUrl = "http://localhost:3000";
  const capRes = await fetch(`${baseUrl}/api/deal-cap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bankId, entityId: deal.entityId, merchant: merchantName, cardType, city
    })
  });
  
  if (!capRes.ok) {
    console.log("capRes not ok", await capRes.text());
  } else {
    const capData = await capRes.json();
    console.log("Cap Data:", capData);
  }
}
testChatBotLogic();
