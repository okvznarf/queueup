import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token || !password) return NextResponse.json({ error: "Token and password required" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  const customer = await prisma.customer.findFirst({
    where: { resetToken: token, resetTokenExpiry: { gt: new Date() } },
  });

  if (!customer) return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });

  const passwordHash = await hashPassword(password);
  await prisma.customer.update({
    where: { id: customer.id },
    data: { passwordHash, resetToken: null, resetTokenExpiry: null },
  });

  return NextResponse.json({ ok: true });
}
