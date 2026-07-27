import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";
import { scrapeBankOffers } from "@/lib/scraper";
import { parseDiscountsWithGemini } from "@/lib/gemini";
import { getBankById } from "@/lib/banks";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const maxDuration = 60;

const systemPrompt = `You are a helpful, professional, and friendly Support Assistant for Sasta Swipe, a platform that helps users find dining discounts on their Pakistani bank cards.

Your goal is to assist users in discovering discounts and calculating their final bills. 

If a user asks for deals, you must know their:
1. Bank (e.g. HBL, MCB, UBL, Faysal, Allied, Meezan, Alfalah, MCB Islamic)
2. City (e.g. Lahore, Karachi, Islamabad)
3. Card Type (e.g. Visa Platinum, Gold, All Cards, etc. If they just say "HBL", ask them which HBL card they have, or suggest checking for "All Cards").

If they haven't provided these, politely ask them.
Once you have the information, call the \`getDeals\` tool.
If they ask for specific categories (e.g., "fast food", "chinese"), you can filter the results returned by \`getDeals\` in your text response.

If they ask to calculate a bill for a specific restaurant, call the \`calculateDiscountedBill\` tool, providing the exact restaurant name (merchant name), their bank, city, and card type, along with the total bill amount.

When responding with deals, format them beautifully in markdown (bullet points). Keep your tone enthusiastic and helpful!
CRITICAL RULE: When displaying a discount, NEVER say "Up to X% off" or "Upto X% off". Just say "X% off". Remove "Up to" completely.`;
const getDealsDeclaration = {
  name: "getDeals",
  description: "Scrapes the latest dining deals for a specific bank, city, and card type.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      bankId: { type: Type.STRING, description: "The ID of the bank (e.g., 'hbl', 'mcb', 'ubl', 'faysal', 'allied', 'meezan', 'alfalah', 'mcbislamic')" },
      city: { type: Type.STRING, description: "The city (e.g., 'Lahore', 'Karachi', 'Islamabad')" },
      cardType: { type: Type.STRING, description: "The specific card name or 'All Cards'" }
    },
    required: ["bankId", "city", "cardType"]
  }
};

const calculateDiscountedBillDeclaration = {
  name: "calculateDiscountedBill",
  description: "Calculates the final bill after applying the max cap discount for a specific restaurant.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      bankId: { type: Type.STRING, description: "The ID of the bank" },
      city: { type: Type.STRING, description: "The city" },
      cardType: { type: Type.STRING, description: "The specific card type" },
      merchantName: { type: Type.STRING, description: "The exact name of the restaurant" },
      billAmount: { type: Type.NUMBER, description: "The total bill amount before discount" }
    },
    required: ["bankId", "city", "cardType", "merchantName", "billAmount"]
  }
};

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const formattedHistory = messages.slice(0, -1).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content || " " }]
    }));
    
    const lastMessage = messages[messages.length - 1];

    let response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [...formattedHistory, { role: 'user', parts: [{ text: lastMessage.content }] }],
      config: {
        systemInstruction: systemPrompt,
        tools: [{ functionDeclarations: [getDealsDeclaration, calculateDiscountedBillDeclaration] }]
      }
    });

    let replyText = response.text || "";
    let functionCalls = response.functionCalls;

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      let toolResult = null;
      
      if (call.name === 'getDeals') {
        const { bankId, city, cardType } = call.args as any;
        try {
          const bankName = getBankById(bankId)?.name || bankId;
          const rawContent = await scrapeBankOffers(bankId, city, cardType);
          const deals = await parseDiscountsWithGemini(rawContent, bankName, cardType, city);
          
          toolResult = deals.slice(0, 15).map((d: any) => ({
            merchant: d.merchant,
            discountText: d.discount ? d.discount.replace(/up\s*to\s*/i, "").trim() : "",
            address: d.location,
            validity: d.validity,
            terms: d.terms
          }));
        } catch (e: any) {
          toolResult = { error: e.message };
        }
      } else if (call.name === 'calculateDiscountedBill') {
        const { bankId, city, cardType, merchantName, billAmount } = call.args as any;
        try {
          const bankName = getBankById(bankId)?.name || bankId;
          const rawContent = await scrapeBankOffers(bankId, city, cardType);
          const deals = await parseDiscountsWithGemini(rawContent, bankName, cardType, city);
          
          const deal = deals.find((d: any) => {
             return d.merchant.toLowerCase().includes(merchantName.toLowerCase());
          });

          if (!deal) {
            toolResult = { error: `Could not find any deals for ${merchantName} with the provided card.` };
          } else {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
            const capRes = await fetch(`${baseUrl}/api/deal-cap`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                bankId, entityId: deal.entityId, merchant: merchantName, cardType, city
              })
            });

            if (!capRes.ok) {
              toolResult = { error: "Failed to fetch the discount cap for this restaurant." };
            } else {
              const capData = await capRes.json();
              const cap = capData.maxCap || 0;

              const discountStr = deal.discount || "";
              const percentMatch = discountStr.match(/(\d+)%/);
              let discountPercent = percentMatch ? parseInt(percentMatch[1], 10) : 0;

              if (discountPercent === 0) {
                 toolResult = { info: "Found the restaurant, but couldn't parse the exact percentage. The maximum cap is Rs. " + cap };
              } else {
                 const calculatedDiscount = (billAmount * discountPercent) / 100;
                 const actualDiscount = cap > 0 && calculatedDiscount > cap ? cap : calculatedDiscount;
                 const finalBill = billAmount - actualDiscount;

                 toolResult = {
                    restaurant: merchantName,
                    discountPercentage: discountPercent,
                    maxCap: cap,
                    originalBill: billAmount,
                    appliedDiscount: actualDiscount,
                    finalBillToPay: finalBill
                 };
              }
            }
          }
        } catch (e: any) {
          toolResult = { error: e.message };
        }
      }

      // If we got a tool result, we must call the model AGAIN to get the final text response!
      if (toolResult) {
         // Create the history exactly how Google GenAI expects it for a tool response
         const toolCallHistory = [
           ...formattedHistory,
           { role: 'user', parts: [{ text: lastMessage.content }] },
           response.candidates?.[0]?.content || { role: 'model', parts: [{ functionCall: call }] },
           { role: 'user', parts: [{ functionResponse: { name: call.name, response: { result: toolResult } } }] }
         ];

         const finalResponse = await ai.models.generateContent({
           model: 'gemini-3.1-flash-lite',
           contents: toolCallHistory,
           config: {
             systemInstruction: systemPrompt,
           }
         });
         
         replyText = finalResponse.text || "I found the results, but had trouble formatting them.";
      }
    }

    return NextResponse.json({ reply: replyText });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Failed to process chat" }, { status: 500 });
  }
}
