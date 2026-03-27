import { NextRequest, NextResponse } from "next/server";
import { hashPassword, verifyPassword } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { rateLimit, sanitize, isValidHexToken, getClientIp } from "@/lib/security";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!rateLimit("reset-pw:" + ip, 5, 900000)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const body = await req.json();
  const token = sanitize(body.token || "", 128);
  const password = body.password;
  if (!token || !isValidHexToken(token)) return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  if (!password || typeof password !== "string") return NextResponse.json({ error: "Password required" }, { status: 400 });
  if (password.length < 8 || password.length > 128) return NextResponse.json({ error: "Password must be 8-128 characters" }, { status: 400 });

  const customer = await prisma.customer.findFirst({
    where: { resetToken: token, resetTokenExpiry: { gte: new Date() } },
  });

  if (!customer) return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });

  // Prevent reuse of the same password
  if (customer.passwordHash) {
    const isSame = await verifyPassword(password, customer.passwordHash);
    if (isSame) return NextResponse.json({ error: "New password must be different from your current password" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  await prisma.customer.update({
    where: { id: customer.id },
    data: { passwordHash, resetToken: null, resetTokenExpiry: null },
  });

  return NextResponse.json({ ok: true });
}
