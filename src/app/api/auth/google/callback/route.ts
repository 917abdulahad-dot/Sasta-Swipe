import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { signToken } from "@/lib/auth";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");
    
    if (!code) {
      return NextResponse.redirect(new URL("/login?error=NoCodeProvided", req.url));
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`;

    // 1. Exchange auth code for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("Token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(new URL("/login?error=TokenExchangeFailed", req.url));
    }

    const { access_token, id_token } = await tokenRes.json();

    // 2. Fetch user profile from Google using access token
    const userRes = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`, {
      headers: { Authorization: `Bearer ${id_token}` },
    });

    if (!userRes.ok) {
      console.error("User fetch failed:", await userRes.text());
      return NextResponse.redirect(new URL("/login?error=UserFetchFailed", req.url));
    }

    const googleUser = await userRes.json();
    const email = googleUser.email;

    if (!email) {
      return NextResponse.redirect(new URL("/login?error=NoEmailFromGoogle", req.url));
    }

    // 3. Check if user exists, if not, create them
    const existingUserResult = await db.query('SELECT id, email FROM users WHERE email = $1', [email]);
    let user = existingUserResult.rows[0];

    if (!user) {
      // Create new user. Since we require password_hash, generate a random one.
      // This ensures they can't login via normal password route unless they reset it later.
      const randomPassword = crypto.randomBytes(32).toString('hex');
      
      const insertResult = await db.query('INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id', [email, randomPassword]);
      user = { id: insertResult.rows[0].id, email };
    }

    // 4. Generate our app's JWT token
    const token = await signToken({ userId: user.id, email: user.email });

    // 5. Set cookie and redirect to home
    const res = NextResponse.redirect(new URL("/", req.url));
    
    res.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return res;
  } catch (error) {
    console.error("[Google Callback Error]:", error);
    return NextResponse.redirect(new URL("/login?error=InternalError", req.url));
  }
}
