import fs from "fs";
import path from "path";
import os from "os";
import { ScrapeResult } from "@/types";

const CACHE_DIR = process.env.NODE_ENV === "production"
  ? path.join(os.tmpdir(), "sasta-swipe-cache")
  : path.join(process.cwd(), "cache");
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function getCacheKey(bankId: string, cardType: string, city: string, searchQuery?: string): string {
  const base = `${bankId}_${cardType}_${city}`;
  const full = searchQuery ? `${base}_search_${searchQuery}` : base;
  return full
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function getCachePath(key: string): string {
  return path.join(CACHE_DIR, `${key}.json`);
}

export function getCachedResult(
  bankId: string,
  cardType: string,
  city: string,
  searchQuery?: string
): ScrapeResult | null {
  ensureCacheDir();
  const key = getCacheKey(bankId, cardType, city, searchQuery);
  const filePath = getCachePath(key);

  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const data: ScrapeResult = JSON.parse(raw);
    const age = Date.now() - new Date(data.scrapedAt).getTime();
    if (age > CACHE_TTL_MS) {
      fs.unlinkSync(filePath);
      return null;
    }
    return { ...data, cached: true };
  } catch {
    return null;
  }
}

export function setCachedResult(result: ScrapeResult & { searchQuery?: string }): void {
  ensureCacheDir();
  const key = getCacheKey(result.bank, result.cardType, result.city, result.searchQuery);
  const filePath = getCachePath(key);
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2), "utf-8");
}

export function clearCache(): void {
  ensureCacheDir();
  const files = fs.readdirSync(CACHE_DIR);
  files.forEach((f) => fs.unlinkSync(path.join(CACHE_DIR, f)));
}
