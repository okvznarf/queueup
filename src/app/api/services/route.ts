import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  rateLimit,
  getClientIp,
  parseBody,
  sanitize,
  isPositiveNumber,
  isIntInRange,
} from "@/lib/security";
import { requireAdmin } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
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
  const ip = getClientIp(request);
  if (!rateLimit("services-post:" + ip, 20, 60000)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }
  try {
    const body = await parseBody(request, 10_000);
    if (!body) {
      return NextResponse.json({ error: "Invalid or oversized payload" }, { status: 400 });
    }
    const { shopId, name, description, duration, price, icon, category } = body;
    if (!shopId || typeof shopId !== "string" || !name || typeof name !== "string") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!isIntInRange(duration, 1, 480)) {
      return NextResponse.json({ error: "duration must be an integer between 1 and 480 minutes" }, { status: 400 });
    }
    if (!isPositiveNumber(price)) {
      return NextResponse.json({ error: "price must be a positive number" }, { status: 400 });
    }
    const auth = await requireAdmin(request, shopId);
    if (auth.error) return auth.error;
    const cleanName = sanitize(name, 100);
    if (!cleanName) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }
    const service = await prisma.service.create({
      data: {
        shopId,
        name: cleanName,
        description: description ? sanitize(description, 500) : null,
        duration,
        price,
        icon: icon ? sanitize(icon, 50) : null,
        category: category ? sanitize(category, 100) : null,
      },
    });
    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    logger.error("Failed to create service", "api:services", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
