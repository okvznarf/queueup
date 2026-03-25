import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createToken } from "@/lib/auth";
import { rateLimit } from "@/lib/security";

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (!rateLimit("google-cb:" + ip, 5, 900000)) {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    return NextResponse.redirect(`${baseUrl}/customer/login?error=too_many_attempts`);
  }

  const code = req.nextUrl.searchParams.get("code");
  const stateParam = req.nextUrl.searchParams.get("state") || "";
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  if (!code) return NextResponse.redirect(`${baseUrl}/customer/login?error=google_cancelled`);

  // Verify CSRF state token
  let shopSlug = "";
  try {
    const stateData = JSON.parse(Buffer.from(stateParam, "base64url").toString());
    shopSlug = stateData.shop || "";
    const storedCsrf = req.cookies.get("oauth_state")?.value;
    if (!storedCsrf || storedCsrf !== stateData.csrf) {
      return NextResponse.redirect(`${baseUrl}/customer/login?error=invalid_state&shop=${shopSlug}`);
    }
  } catch {
    return NextResponse.redirect(`${baseUrl}/customer/login?error=invalid_state`);
  }

  // Exchange code for tokens
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(`${baseUrl}/customer/login?error=oauth_not_configured&shop=${shopSlug}`);
  }
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) return NextResponse.redirect(`${baseUrl}/customer/login?error=google_failed&shop=${shopSlug}`);

  const { access_token } = await tokenRes.json();

  // Get user info from Google
  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!userRes.ok) return NextResponse.redirect(`${baseUrl}/customer/login?error=google_failed&shop=${shopSlug}`);

  const googleUser = await userRes.json();
  const { id: googleId, email, name } = googleUser;

  if (!email) return NextResponse.redirect(`${baseUrl}/customer/login?error=no_email&shop=${shopSlug}`);

  // Find the shop
  const shop = await prisma.shop.findUnique({ where: { slug: shopSlug } });
  if (!shop) return NextResponse.redirect(`${baseUrl}/customer/login?error=no_shop`);

  // Find or create customer
  let customer = await prisma.customer.findFirst({ where: { googleId } });

  if (!customer) {
    const existing = await prisma.customer.findFirst({ where: { email, shopId: shop.id } });
    if (existing) {
      customer = await prisma.customer.update({ where: { id: existing.id }, data: { googleId } });
    } else {
      customer = await prisma.customer.create({
        data: { name, email, googleId, shopId: shop.id },
      });
    }
  }

  const token = createToken({ userId: customer.id, email: customer.email || "", role: "customer" });

  const response = NextResponse.redirect(`${baseUrl}/customer/dashboard`);
  response.cookies.set("customer_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  // Clear the OAuth state cookie
  response.cookies.delete("oauth_state");
  return response;
}
