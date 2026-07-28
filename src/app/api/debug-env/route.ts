import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  // Returns which auth-related env vars are PRESENT (not their values, for security)
  const allKeys = Object.keys(process.env).sort();
  return NextResponse.json({
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? `SET (length: ${process.env.GOOGLE_CLIENT_ID.length})` : "MISSING",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? `SET (length: ${process.env.GOOGLE_CLIENT_SECRET.length})` : "MISSING",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "MISSING",
    JWT_SECRET: process.env.JWT_SECRET ? "SET" : "MISSING",
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? `SET (length: ${process.env.GEMINI_API_KEY.length})` : "MISSING",
    DATABASE_URL: process.env.DATABASE_URL ? "SET" : "MISSING",
    NODE_ENV: process.env.NODE_ENV,
    total_env_keys: allKeys.length,
    all_custom_keys: allKeys.filter(k => !k.startsWith('npm_') && !k.startsWith('VERCEL') && !k.startsWith('NODE') && !k.startsWith('PATH') && k !== 'HOME' && k !== 'PWD'),
  });
}
