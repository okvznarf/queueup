import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, createToken } from "@/lib/auth";
import { sanitize, rateLimit, isValidEmail, getClientIp, parseBody, isAccountLocked, recordFailedLogin, clearFailedLogins } from "@/lib/security";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit("cust-login:" + ip, 5, 900000)) {
    return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }
  try {
    const body = await parseBody(request, 2_000);
    if (!body) {
      return NextResponse.json({ error: "Invalid or oversized payload" }, { status: 400 });
    }
    if (typeof body.email !== "string" || typeof body.password !== "string" || typeof body.shopId !== "string") {
      return NextResponse.json({ error: "Email, password and shop are required" }, { status: 400 });
    }
    if (body.password.length > 200) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }
    const email = sanitize(body.email, 200).toLowerCase();
    const password = body.password;
    const shopId = body.shopId;

    if (!email || !password || !shopId) {
      return NextResponse.json({ error: "Email, password and shop are required" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Scope lockout per (email, shop) so a locked customer on one shop can still log in elsewhere.
    const lockScope = `customer:${shopId}`;
    const lockedMs = isAccountLocked(lockScope, email);
    if (lockedMs > 0) {
      const minutes = Math.ceil(lockedMs / 60000);
      return NextResponse.json(
        { error: `Account temporarily locked due to too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` },
        { status: 429 },
      );
    }

    const customer = await prisma.customer.findUnique({ where: { email_shopId: { email, shopId } } });
    if (!customer || !customer.passwordHash) {
      recordFailedLogin(lockScope, email);
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const valid = await verifyPassword(password, customer.passwordHash);
    if (!valid) {
      recordFailedLogin(lockScope, email);
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    clearFailedLogins(lockScope, email);
    const token = createToken({ userId: customer.id, email: customer.email || "", role: "customer" });

    const response = NextResponse.json({ customer: { id: customer.id, name: customer.name, email: customer.email } });
    response.cookies.set("customer_token", token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production",
      sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/",
    });
    return response;
  } catch (error) {
    logger.error("Customer login failed", "api:auth", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}