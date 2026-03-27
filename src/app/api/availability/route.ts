import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/availability";
import { rateLimit, getClientIp } from "@/lib/security";
import { logger } from "@/lib/logger";
import { cacheGet, cacheSet } from "@/lib/cache";

const CACHE_TTL = 60_000; // 1 minute — short enough that new bookings appear quickly

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit("avail:" + ip, 60, 60000)) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  const shopId = request.nextUrl.searchParams.get("shopId");
  const date = request.nextUrl.searchParams.get("date");
  const staffId = request.nextUrl.searchParams.get("staffId");
  const duration = request.nextUrl.searchParams.get("duration");

  if (!shopId || !date) {
    return NextResponse.json({ error: "shopId and date required" }, { status: 400 });
  }

  const cacheKey = `avail:${shopId}:${date}:${staffId || "any"}:${duration || 30}`;
  const cached = cacheGet(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const slots = await getAvailableSlots(
      shopId,
      new Date(date),
      staffId || null,
      duration ? parseInt(duration) : 30
    );
    cacheSet(cacheKey, slots, CACHE_TTL);
    return NextResponse.json(slots);
  } catch (error) {
    logger.error("Failed to fetch availability", "api:availability", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}