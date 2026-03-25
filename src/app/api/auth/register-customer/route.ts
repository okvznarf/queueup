import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, createToken } from "@/lib/auth";
import { sanitize, isValidEmail, isValidPhone, rateLimit } from "@/lib/security";
import { sendWelcomeEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (!rateLimit("cust-register:" + ip, 5, 900000)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  try {
    const body = await request.json();
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

    const passwordHash = await hashPassword(password);

    let customer;
    if (existing) {
      customer = await prisma.customer.update({ where: { id: existing.id }, data: { passwordHash, name } });
    } else {
      customer = await prisma.customer.create({ data: { name, email, phone, passwordHash, shopId } });
    }

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