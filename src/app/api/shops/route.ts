import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/security";
import { requireAdmin } from "@/lib/auth";
import { cacheGet, cacheSet } from "@/lib/cache";
import { logger } from "@/lib/logger";

const SHOP_CACHE_TTL = 5 * 60_000; // 5 minutes

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit("shops:" + ip, 60, 60000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Shop slug is required" }, { status: 400 });
  }

  const cacheKey = `shop:${slug}`;
  const cached = cacheGet(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const shop = await prisma.shop.findUnique({
      where: { slug },
      include: {
        services: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
        staff: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
        workingHours: true,
      },
    });
    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Block booking if shop is disabled by superadmin
    if (!shop.subscriptionActive) {
      return NextResponse.json({ error: "This business is currently unavailable" }, { status: 403 });
    }

    // TODO: Re-enable trial/billing check when billing is live
    // const now = new Date();
    // const inTrial = shop.trialEndsAt && now < shop.trialEndsAt;
    // const hasPaid = shop.paidUntil && now < shop.paidUntil;
    // if (!inTrial && !hasPaid) {
    //   return NextResponse.json({ error: "This business is currently unavailable" }, { status: 403 });
    // }

    cacheSet(cacheKey, shop, SHOP_CACHE_TTL);
    return NextResponse.json(shop);
  } catch (error) {
    logger.error("Failed to fetch shop", "api:shops", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const { name, businessType, email, phone } = body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const labels: Record<string, { staff: string; service: string; booking: string }> = {
      BARBER: { staff: "Barber", service: "Service", booking: "Appointment" },
      RESTAURANT: { staff: "Server", service: "Experience", booking: "Reservation" },
      MECHANIC: { staff: "Technician", service: "Repair Type", booking: "Service Appointment" },
      SALON: { staff: "Stylist", service: "Treatment", booking: "Appointment" },
      DENTIST: { staff: "Doctor", service: "Treatment", booking: "Appointment" },
      FITNESS: { staff: "Trainer", service: "Session", booking: "Booking" },
    };
    const l = labels[businessType] || { staff: "Staff", service: "Service", booking: "Appointment" };
    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30-day trial
    const shop = await prisma.shop.create({
      data: {
        name, slug, businessType, email, phone,
        staffLabel: l.staff, serviceLabel: l.service, bookingLabel: l.booking,
        showStaffPicker: businessType !== "RESTAURANT",
        showPartySize: businessType === "RESTAURANT",
        showVehicleInfo: businessType === "MECHANIC",
        trialEndsAt,
        subscriptionActive: true,
        employeeCount: 1,
        monthlyPrice: 30, // 25 base + 5 for 1 employee
      },
    });
    return NextResponse.json(shop, { status: 201 });
  } catch (error) {
    logger.error("Failed to create shop", "api:shops", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
