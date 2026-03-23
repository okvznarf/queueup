import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/security";
import { requireAdmin } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (!rateLimit("services:" + ip, 60, 60000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const shopId = request.nextUrl.searchParams.get("shopId");
  if (!shopId) {
    return NextResponse.json({ error: "shopId is required" }, { status: 400 });
  }
  try {
    const services = await prisma.service.findMany({
      where: { shopId, isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(services);
  } catch (error) {
    logger.error("Failed to fetch services", "api:services", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopId, name, description, duration, price, icon, category } = body;
    if (!shopId || !name || !duration || price === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const auth = await requireAdmin(request, shopId);
    if (auth.error) return auth.error;
    const service = await prisma.service.create({
      data: { shopId, name, description, duration, price, icon, category },
    });
    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    logger.error("Failed to create service", "api:services", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
