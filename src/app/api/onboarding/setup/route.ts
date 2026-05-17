import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { sanitize, rateLimit, getClientIp, parseBody } from "@/lib/security";
import { logger } from "@/lib/logger";
import { getPack } from "@/lib/verticals";
import { createStripeCustomer } from "@/lib/stripe";
import { BusinessType, DayOfWeek } from "../../../../../generated/prisma/client";

interface ServiceInput {
  name: string;
  duration: number;
  price: number;
  description?: string;
  category?: string;
}

interface OnboardingBody {
  shopName: string;
  city?: string;
  slug: string;
  businessType: string;
  services: ServiceInput[];
  workingHours?: Array<{
    day: string;
    openTime: string;
    closeTime: string;
    isClosed?: boolean;
  }>;
}

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/;

const DEFAULT_HOURS_BY_VERTICAL: Record<string, Array<{ day: DayOfWeek; openTime: string; closeTime: string; isClosed: boolean }>> = {
  MECHANIC: [
    { day: DayOfWeek.MONDAY, openTime: "08:00", closeTime: "17:00", isClosed: false },
    { day: DayOfWeek.TUESDAY, openTime: "08:00", closeTime: "17:00", isClosed: false },
    { day: DayOfWeek.WEDNESDAY, openTime: "08:00", closeTime: "17:00", isClosed: false },
    { day: DayOfWeek.THURSDAY, openTime: "08:00", closeTime: "17:00", isClosed: false },
    { day: DayOfWeek.FRIDAY, openTime: "08:00", closeTime: "17:00", isClosed: false },
    { day: DayOfWeek.SATURDAY, openTime: "08:00", closeTime: "13:00", isClosed: false },
    { day: DayOfWeek.SUNDAY, openTime: "00:00", closeTime: "00:00", isClosed: true },
  ],
  BARBER: [
    { day: DayOfWeek.MONDAY, openTime: "09:00", closeTime: "19:00", isClosed: false },
    { day: DayOfWeek.TUESDAY, openTime: "09:00", closeTime: "19:00", isClosed: false },
    { day: DayOfWeek.WEDNESDAY, openTime: "09:00", closeTime: "19:00", isClosed: false },
    { day: DayOfWeek.THURSDAY, openTime: "09:00", closeTime: "19:00", isClosed: false },
    { day: DayOfWeek.FRIDAY, openTime: "09:00", closeTime: "19:00", isClosed: false },
    { day: DayOfWeek.SATURDAY, openTime: "09:00", closeTime: "15:00", isClosed: false },
    { day: DayOfWeek.SUNDAY, openTime: "00:00", closeTime: "00:00", isClosed: true },
  ],
  DENTIST: [
    { day: DayOfWeek.MONDAY, openTime: "08:00", closeTime: "16:00", isClosed: false },
    { day: DayOfWeek.TUESDAY, openTime: "08:00", closeTime: "16:00", isClosed: false },
    { day: DayOfWeek.WEDNESDAY, openTime: "08:00", closeTime: "16:00", isClosed: false },
    { day: DayOfWeek.THURSDAY, openTime: "08:00", closeTime: "16:00", isClosed: false },
    { day: DayOfWeek.FRIDAY, openTime: "08:00", closeTime: "16:00", isClosed: false },
    { day: DayOfWeek.SATURDAY, openTime: "00:00", closeTime: "00:00", isClosed: true },
    { day: DayOfWeek.SUNDAY, openTime: "00:00", closeTime: "00:00", isClosed: true },
  ],
};

/**
 * POST /api/onboarding/setup
 *
 * Atomically creates: Shop (with pack-derived labels + pricing), default Staff
 * record (the owner), Services (from wizard input), and WorkingHours (from
 * wizard input or pack defaults).
 *
 * Requires authenticated User (auth_token). Idempotent at the slug level —
 * a second attempt with the same slug returns 409.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit(`onboarding:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  // Authenticate the User (must have registered first)
  const cookieHeader = request.headers.get("cookie") ?? "";
  const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized — please register first" }, { status: 401 });
  }
  const jwt = verifyToken(token);
  if (!jwt) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const body = (await parseBody(request, 50_000)) as OnboardingBody | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid or oversized payload" }, { status: 400 });
  }

  // Validate required fields
  const shopName = sanitize(body.shopName ?? "", 100);
  const city = sanitize(body.city ?? "", 100);
  const slug = (body.slug ?? "").trim().toLowerCase();
  const businessTypeRaw = body.businessType;
  const servicesInput = Array.isArray(body.services) ? body.services : [];
  const hoursInput = Array.isArray(body.workingHours) ? body.workingHours : null;

  if (!shopName) {
    return NextResponse.json({ error: "Shop name is required" }, { status: 400 });
  }
  if (!slug || !SLUG_REGEX.test(slug)) {
    return NextResponse.json({ error: "Slug must be a valid URL slug (lowercase letters, numbers, hyphens)" }, { status: 400 });
  }
  if (!(businessTypeRaw in BusinessType)) {
    return NextResponse.json({ error: "Unknown business type" }, { status: 400 });
  }
  const businessType = BusinessType[businessTypeRaw as keyof typeof BusinessType];

  if (servicesInput.length === 0) {
    return NextResponse.json({ error: "At least one service is required" }, { status: 400 });
  }

  // Validate each service
  const services: ServiceInput[] = [];
  for (const s of servicesInput) {
    const name = sanitize(s.name ?? "", 100);
    const duration = typeof s.duration === "number" ? Math.floor(s.duration) : NaN;
    const price = typeof s.price === "number" ? s.price : NaN;
    if (!name) return NextResponse.json({ error: "Service name required" }, { status: 400 });
    if (!Number.isFinite(duration) || duration < 5 || duration > 480) {
      return NextResponse.json({ error: `Service "${name}" duration must be 5-480 minutes` }, { status: 400 });
    }
    if (!Number.isFinite(price) || price < 0 || price > 100_000) {
      return NextResponse.json({ error: `Service "${name}" price must be 0-100000` }, { status: 400 });
    }
    services.push({
      name,
      duration,
      price,
      description: s.description ? sanitize(s.description, 500) : undefined,
      category: s.category ? sanitize(s.category, 80) : undefined,
    });
  }

  // Look up the pack — used for labels, pricing, and default hours
  const pack = getPack(businessType);
  if (!pack) {
    return NextResponse.json({ error: "No vertical pack available for this business type" }, { status: 400 });
  }

  // Resolve working hours: wizard input takes precedence, otherwise pack defaults
  const workingHours = hoursInput
    ? hoursInput.map((h) => {
        const dayKey = (h.day ?? "").toUpperCase() as keyof typeof DayOfWeek;
        if (!(dayKey in DayOfWeek)) throw new Error(`Invalid day: ${h.day}`);
        return {
          day: DayOfWeek[dayKey],
          openTime: sanitize(h.openTime ?? "09:00", 5),
          closeTime: sanitize(h.closeTime ?? "17:00", 5),
          isClosed: Boolean(h.isClosed),
        };
      })
    : DEFAULT_HOURS_BY_VERTICAL[businessType] ?? DEFAULT_HOURS_BY_VERTICAL.BARBER;

  try {
    // Verify slug + user state, then create everything atomically
    const slugTaken = await prisma.shop.findUnique({ where: { slug }, select: { id: true } });
    if (slugTaken) {
      return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
    }

    const user = await prisma.user.findUnique({ where: { id: jwt.userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const ownerAlreadyHasShop = await prisma.shop.findFirst({
      where: { ownerId: user.id },
      select: { id: true, slug: true },
    });
    if (ownerAlreadyHasShop) {
      return NextResponse.json(
        { error: "You already own a shop", existingSlug: ownerAlreadyHasShop.slug },
        { status: 409 },
      );
    }

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);

    const initialMonthlyPrice = pack.pricing.base + pack.pricing.perUnit;

    const shop = await prisma.$transaction(async (tx) => {
      const created = await tx.shop.create({
        data: {
          name: shopName,
          slug,
          businessType,
          city: city || null,
          country: "HR",
          timezone: "Europe/Zagreb",
          currency: "EUR",
          staffLabel: pack.labels.staffLabel,
          serviceLabel: pack.labels.serviceLabel,
          bookingLabel: pack.labels.bookingLabel,
          showVehicleInfo: pack.intake.showVehicleInfo,
          showPartySize: pack.intake.showPartySize,
          ownerId: user.id,
          monthlyPrice: initialMonthlyPrice,
          employeeCount: 1,
          subscriptionActive: true,
          trialEndsAt: trialEnd,
        },
      });

      await tx.staff.create({
        data: {
          name: user.name ?? user.email,
          email: user.email,
          shopId: created.id,
          isActive: true,
          sortOrder: 0,
        },
      });

      await tx.service.createMany({
        data: services.map((s, idx) => ({
          name: s.name,
          description: s.description ?? null,
          duration: s.duration,
          price: s.price,
          category: s.category ?? null,
          isActive: true,
          sortOrder: idx,
          shopId: created.id,
        })),
      });

      await tx.workingHours.createMany({
        data: workingHours.map((h) => ({
          day: h.day,
          openTime: h.openTime,
          closeTime: h.closeTime,
          isClosed: h.isClosed,
          shopId: created.id,
        })),
      });

      return created;
    });

    logger.info(`Shop onboarded: ${shop.slug} (${businessType})`, "onboarding");

    // Create Stripe customer in the background — non-blocking for the wizard
    // response. If Stripe is misconfigured or unreachable, the shop is still
    // fully usable; trial-end card capture will retry the customer creation.
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const stripeCustomerId = await createStripeCustomer({
          shopId: shop.id,
          email: user.email,
          name: shop.name,
          metadata: { businessType: shop.businessType, slug: shop.slug },
        });
        await prisma.shop.update({
          where: { id: shop.id },
          data: { stripeCustomerId },
        });
        logger.info(`Stripe customer created: ${stripeCustomerId} for shop ${shop.slug}`, "onboarding");
      } catch (stripeErr) {
        // Don't fail onboarding if Stripe is down — log and continue. The
        // trial-end card capture flow will retry customer creation if missing.
        logger.error(`Stripe customer creation failed for shop ${shop.slug}`, "onboarding", stripeErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        shop: {
          id: shop.id,
          slug: shop.slug,
          name: shop.name,
          businessType: shop.businessType,
        },
        bookingUrl: `/booking/${shop.slug}`,
        adminUrl: `/admin/${shop.slug}/appointments`,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Onboarding failed", "api:onboarding", error);
    return NextResponse.json({ error: "Failed to create shop. Please try again." }, { status: 500 });
  }
}
