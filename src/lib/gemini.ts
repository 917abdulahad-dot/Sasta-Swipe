import { Discount } from "@/types";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent";

export async function parseDiscountsWithGemini(
  rawContent: string,
  bankName: string,
  cardType: string,
  city: string
): Promise<Discount[]> {
  const prompt = `You are a data extraction assistant specializing in bank discount/offer programs in Pakistan.

You have been given content from ${bankName}'s deals platform (peekaboo.guru) for the city of "${city}".

The content may be in one of these formats:
1. A JSON API response with deal objects containing merchant info, discounts, categories, branches
2. Plain page text with merchant names and discount percentages

Your task:
1. Extract ALL food and dining related offers. This includes anything related to: restaurants, cafes, dining, food, eateries, F&B, food & beverage. Use your best judgment.
2. Only include offers available in "${city}" or nationwide offers.
3. Prefer offers for "${cardType}" cards, but also include "All Cards" offers.
4. **CRITICAL**: If the JSON has a "maxDiscount" field but an empty or missing "discounts" array, interpret the discount as "Up to {maxDiscount}% off".
5. Return ONLY a valid JSON array. No markdown, no explanation.

Each object must have this exact shape:
{
  "entityId": 13, // The EXACT entityId number from the JSON (e.g. 13)
  "merchant": "Restaurant or Brand Name",
  "discount": "e.g. Up to 40% off",
  "location": "${city} or Nationwide",
  "cardType": "Must be '${cardType}' since these are filtered results for that card",
  "validity": "Validity date if mentioned, or null",
  "terms": "Short T&C snippet if mentioned, or null",
  "category": "dining"
}

If no food/dining offers found, return: []

Content to parse:
---
${rawContent.slice(0, 80000)}
---

Return ONLY the JSON array:`;

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        maxOutputTokens: 8192,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";

  // Strip markdown code fences if Gemini wraps it anyway
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? (parsed as Discount[]) : [];
  } catch {
    console.error("Failed to parse Gemini response:", cleaned.slice(0, 500));
    return [];
  }
}
