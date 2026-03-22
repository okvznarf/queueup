import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/security";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (!rateLimit("admin-reset-pw:" + ip, 5, 3600000)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const { token, password } = await req.json();
  if (!token || !password) return NextResponse.json({ error: "Token and password required" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: { resetToken: token, resetTokenExpiry: { gte: new Date() } },
  });

  if (!user) return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });

  // Prevent reuse of the same password
  if (user.passwordHash) {
    const isSame = await verifyPassword(password, user.passwordHash);
    if (isSame) return NextResponse.json({ error: "New password must be different from your current password" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExpiry: null },
  });

  return NextResponse.json({ ok: true });
}
