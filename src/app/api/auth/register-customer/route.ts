import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, createToken } from "@/lib/auth";
import { sanitize, isValidEmail, isValidPhone, rateLimit, getClientIp, parseBody } from "@/lib/security";
import { sendWelcomeEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit("cust-register:" + ip, 5, 900000)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  try {
    const body = await parseBody(request, 3_000);
    if (!body) {
      return NextResponse.json({ error: "Invalid or oversized payload" }, { status: 400 });
    }
    if (
      typeof body.name !== "string" ||
      typeof body.email !== "string" ||
      typeof body.phone !== "string" ||
      typeof body.password !== "string" ||
      typeof body.shopId !== "string"
    ) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (body.password.length > 200) {
      return NextResponse.json({ error: "Password too long" }, { status: 400 });
    }
    const name = sanitize(body.name, 100);
    const email = sanitize(body.email, 200).toLowerCase();
    const phone = sanitize(body.phone, 30);
    const password = body.password;
    const shopId = body.shopId;

    if (!name || !email || !phone || !password || !shopId) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (!isValidPhone(phone)) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const existing = await prisma.customer.findUnique({ where: { email_shopId: { email, shopId } } });
    if (existing && existing.passwordHash) {
      return NextResponse.json({ error: "Account already exists. Please login." }, { status: 409 });
    }
    // Passwordless record exists (from a prior walk-in booking). Don't let an
    // unverified actor attach a password and claim the booking history —
    // require them to prove email ownership via the reset-password flow.
    if (existing) {
      return NextResponse.json(
        {
          error: "An account with this email already exists from a prior booking. Please use the \"forgot password\" link to set your password — we'll email you a reset link.",
          code: "USE_PASSWORD_RESET",
        },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    const customer = await prisma.customer.create({ data: { name, email, phone, passwordHash, shopId } });

    const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { name: true, slug: true } });
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    sendWelcomeEmail({
      customerName: name,
      customerEmail: email,
      shopName: shop?.name || "QueueUp",
      loginUrl: `${baseUrl}/customer/login?shop=${shop?.slug || ""}`,
    }).catch(() => {});

    const token = createToken({ userId: customer.id, email: customer.email || "", role: "customer" });

    const response = NextResponse.json({ customer: { id: customer.id, name: customer.name, email: customer.email } }, { status: 201 });
    response.cookies.set("customer_token", token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production",
      sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/",
    });
    return response;
  } catch (error) {
    logger.error("Customer registration failed", "api:auth", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}