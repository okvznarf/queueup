import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireServiceOrAdmin } from "@/lib/serviceAuth";
import { rateLimit, getClientIp } from "@/lib/security";
import { cacheGet, cacheSet } from "@/lib/cache";
import { logger } from "@/lib/logger";
import { getPack } from "@/lib/verticals";

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

/**
 * GET /api/internal/shop-context?shopId=X
 *
 * Returns the full shop context bundle used by voice-service and chat-service
 * to build the AI system prompt at session start. Consolidates shop metadata,
 * active services, active staff, and working hours into a single API call.
 *
 * Auth: INTERNAL_SERVICE_TOKEN Bearer header OR admin JWT cookie.
 * Cached for 2 minutes (shop context changes rarely).
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit(`shop-context:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get("shopId");

  if (!shopId) {
    return NextResponse.json({ error: "shopId is required" }, { status: 400 });
  }

  // Auth: service token OR admin JWT scoped to this shop
  const auth = await requireServiceOrAdmin(request, shopId);
  if (auth.error) return auth.error;

  // Cache check
  const cacheKey = `shop-context:${shopId}`;
  const cached = cacheGet<object>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const shopIncludes = {
    services: {
      where: { isActive: true },
      orderBy: { sortOrder: "asc" as const },
      select: { id: true, name: true, duration: true, price: true, description: true },
    },
    staff: {
      where: { isActive: true },
      orderBy: { sortOrder: "asc" as const },
      select: { id: true, name: true, role: true },
    },
    workingHours: {
      select: { day: true, openTime: true, closeTime: true, isClosed: true },
    },
  };

  try {
    // Try by slug first (most common for widget/voice), then by ID
    let shop = await prisma.shop.findFirst({
      where: { slug: shopId },
      include: shopIncludes,
    });

    if (!shop) {
      shop = await prisma.shop.findUnique({
        where: { id: shopId },
        include: shopIncludes,
      });
    }

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    if (!shop.subscriptionActive) {
      return NextResponse.json({ error: "Shop subscription is not active" }, { status: 403 });
    }

    const pack = getPack(shop.businessType);

    const context = {
      shopId: shop.id,
      shopName: shop.name,
      businessType: shop.businessType,
      address: shop.address ?? null,
      phone: shop.phone ?? null,
      email: shop.email ?? null,
      timezone: shop.timezone,
      currency: shop.currency,
      primaryColor: shop.primaryColor,
      staffLabel: shop.staffLabel,
      serviceLabel: shop.serviceLabel,
      bookingLabel: shop.bookingLabel,
      staffCount: shop.staff.length,
      services: shop.services,
      staff: shop.staff,
      workingHours: shop.workingHours,
      pack: pack
        ? {
            slug: pack.slug,
            bookingModel: pack.bookingModel,
            intake: pack.intake,
            ai: {
              systemPromptTemplate: pack.ai.systemPromptTemplate,
              voicePersona: pack.ai.voicePersona,
              tools: pack.ai.tools,
              escalationTriggers: pack.ai.escalationTriggers,
              greeting: pack.ai.greeting,
              language: pack.ai.language,
            },
          }
        : null,
    };

    cacheSet(cacheKey, context, CACHE_TTL_MS);

    return NextResponse.json(context);
  } catch (error) {
    logger.error("Failed to fetch shop context", "api:internal:shop-context", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
