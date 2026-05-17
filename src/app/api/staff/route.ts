import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  rateLimit,
  getClientIp,
  parseBody,
  sanitize,
  isValidEmail,
  isValidPhone,
} from "@/lib/security";
import { requireAdmin } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit("staff:" + ip, 60, 60000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const shopId = request.nextUrl.searchParams.get("shopId");
  if (!shopId) {
    return NextResponse.json({ error: "shopId is required" }, { status: 400 });
  }
  try {
    const staff = await prisma.staff.findMany({
      where: { shopId, isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(staff);
  } catch (error) {
    logger.error("Failed to fetch staff", "api:staff", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit("staff-post:" + ip, 20, 60000)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }
  try {
    const body = await parseBody(request, 10_000);
    if (!body) {
      return NextResponse.json({ error: "Invalid or oversized payload" }, { status: 400 });
    }
    const { shopId, name, email, phone, role, bio } = body;
    if (!shopId || typeof shopId !== "string" || !name || typeof name !== "string") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (email && (typeof email !== "string" || !isValidEmail(email))) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (phone && (typeof phone !== "string" || !isValidPhone(phone))) {
      return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
    }
    const auth = await requireAdmin(request, shopId);
    if (auth.error) return auth.error;
    const cleanName = sanitize(name, 100);
    if (!cleanName) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }
    const staff = await prisma.staff.create({
      data: {
        shopId,
        name: cleanName,
        email: email || null,
        phone: phone || null,
        role: role ? sanitize(role, 100) : null,
        bio: bio ? sanitize(bio, 1000) : null,
      },
    });
    return NextResponse.json(staff, { status: 201 });
  } catch (error) {
    logger.error("Failed to create staff", "api:staff", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
