import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { rateLimit, sanitize, isValidEmail, getClientIp, hashToken } from "@/lib/security";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!rateLimit("admin-forgot:" + ip, 5, 900000)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const body = await req.json();
  const email = sanitize(body.email || "", 200).toLowerCase();
  if (!email || !isValidEmail(email)) return NextResponse.json({ error: "Valid email is required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success to prevent email enumeration
  if (!user) return NextResponse.json({ ok: true });

  const rawToken = randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Store only the hash — raw token is emailed to the user
  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: hashToken(rawToken), resetTokenExpiry: expiry },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const resetLink = `${baseUrl}/admin/reset-password?token=${rawToken}`;

  await sendPasswordResetEmail(user.email, resetLink, "QueueUp Admin");

  return NextResponse.json({ ok: true });
}
