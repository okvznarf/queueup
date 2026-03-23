import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, createToken } from "@/lib/auth";
import { sanitize, rateLimit } from "@/lib/security";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (!rateLimit("login:" + ip, 10, 900000)) {
    return NextResponse.json({ error: "Too many login attempts. Try again in 15 minutes." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const email = sanitize(body.email, 200).toLowerCase();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, passwordHash: true, role: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = createToken({ userId: user.id, email: user.email, role: user.role });

    // Get shop slug separately to avoid Prisma adapter relation issues
    const ownedShop = await prisma.shop.findFirst({ where: { ownerId: user.id }, select: { slug: true } });
    const shopSlug = ownedShop?.slug ?? null;

    const response = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name }, role: user.role, shopSlug });
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    logger.error("Login failed", "api:auth", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}