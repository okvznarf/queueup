import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { rateLimit, sanitize, isValidEmail } from "@/lib/security";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (!rateLimit("cust-forgot:" + ip, 5, 900000)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const body = await req.json();
  const email = sanitize(body.email || "", 200).toLowerCase();
  const shopId = body.shopId;
  if (!email || !isValidEmail(email)) return NextResponse.json({ error: "Valid email is required" }, { status: 400 });

  // Find customer — by shopId if provided, otherwise find first match
  const customer = shopId
    ? await prisma.customer.findFirst({ where: { email, shopId } })
    : await prisma.customer.findFirst({ where: { email } });

  // Always return success to prevent email enumeration
  if (!customer || !customer.email) {
    return NextResponse.json({ ok: true });
  }

  const token = randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.customer.update({
    where: { id: customer.id },
    data: { resetToken: token, resetTokenExpiry: expiry },
  });

  const shop = await prisma.shop.findUnique({ where: { id: customer.shopId } });
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const resetLink = `${baseUrl}/customer/reset-password?token=${token}&shop=${shop?.slug ?? ""}`;

  try {
    await sendPasswordResetEmail(customer.email, resetLink, shop?.name ?? "QueueUp");
  } catch (error) {
    logger.error("Failed to send reset email", "api:auth", error);
  }

  return NextResponse.json({ ok: true });
}
