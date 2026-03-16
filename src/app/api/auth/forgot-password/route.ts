import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { email, shopId } = await req.json();
  if (!email || !shopId) return NextResponse.json({ error: "Email and shop required" }, { status: 400 });

  const customer = await prisma.customer.findFirst({ where: { email, shopId } });

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

  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const resetLink = `${baseUrl}/customer/reset-password?token=${token}&shop=${shop?.slug ?? ""}`;

  await sendPasswordResetEmail(customer.email, resetLink, shop?.name ?? "QueueUp");

  return NextResponse.json({ ok: true });
}
