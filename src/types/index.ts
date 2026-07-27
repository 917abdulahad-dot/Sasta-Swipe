export interface Discount {
  entityId: number;
  merchant: string;
  discount: string;         // e.g. "Up to 20% off", "Flat 15% off"
  location: string;         // e.g. "Lahore" or "Nationwide"
  cardType?: string;        // e.g. "Visa Credit", "All HBL Cards"
  validity?: string;        // e.g. "Valid till December 31, 2025"
  terms?: string;           // Short T&C snippet
  category: string;         // Will always be "dining" for phase 1
  logoUrl?: string;
}

export interface Bank {
  id: string;
  name: string;
  logo: string;
  color: string;
  offersUrl: string;
  dealsWidgetUrl?: string;   // Direct URL to the deals widget/platform (e.g. peekaboo.guru)
  cardTypes: string[];
}

export interface ScrapeResult {
  bank: string;
  cardType: string;
  city: string;
  discounts: Discount[];
  scrapedAt: string;
  cached: boolean;
}

export interface ScrapeRequest {
  bankId: string;
  cardType: string;
  city: string;
}
