import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  // Returns which auth-related env vars are PRESENT (not their values, for security)
  return NextResponse.json({
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? `SET (length: ${process.env.GOOGLE_CLIENT_ID.length})` : "MISSING",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? `SET (length: ${process.env.GOOGLE_CLIENT_SECRET.length})` : "MISSING",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "MISSING",
    JWT_SECRET: process.env.JWT_SECRET ? "SET" : "MISSING",
    NODE_ENV: process.env.NODE_ENV,
  });
}
