import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Check if user exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const result = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, hashedPassword);
    const userId = result.lastInsertRowid as number;

    // Generate JWT
    const token = await signToken({ userId, email });

    const res = NextResponse.json({ success: true, user: { id: userId, email } }, { status: 201 });
    
    // Set cookie
    res.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return res;
  } catch (error) {
    console.error("[Register API Error]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
