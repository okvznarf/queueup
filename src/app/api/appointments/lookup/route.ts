import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireServiceOrAdmin } from "@/lib/serviceAuth";
import { rateLimit, getClientIp } from "@/lib/security";
import { logger } from "@/lib/logger";

/**
 * GET /api/appointments/lookup?shopId=X&phone=Y[&status=PENDING,CONFIRMED]
 *
 * Look up a customer's upcoming appointments by phone number for a given shop.
 * Used by voice-service and chat-service to identify callers before
 * reschedule / cancel operations.
 *
 * Auth: INTERNAL_SERVICE_TOKEN Bearer header OR admin JWT cookie.
 * NOT a public endpoint — contains PII (customer name, phone, email).
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit(`lookup:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get("shopId");
  const phone = searchParams.get("phone");

  if (!shopId || !phone) {
    return NextResponse.json({ error: "shopId and phone are required" }, { status: 400 });
  }

  // Auth: service token OR admin JWT scoped to this shop
  const auth = await requireServiceOrAdmin(request, shopId);
  if (auth.error) return auth.error;

  // Optional status filter — defaults to all non-cancelled upcoming appointments
  const statusParam = searchParams.get("status");
  let statusFilter: string[] | undefined;
  if (statusParam) {
    statusFilter = statusParam.split(",").map((s) => s.trim().toUpperCase());
  }

  try {
    // Find customer by phone + shopId (unique constraint)
    const customer = await prisma.customer.findUnique({
      where: { phone_shopId: { phone, shopId } },
      select: { id: true, name: true, phone: true, email: true },
    });

    if (!customer) {
      return NextResponse.json({ customer: null, appointments: [] });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build status condition
    const statusCondition = statusFilter
      ? { in: statusFilter as any[] }
      : { not: "CANCELLED" as const };

    const appointments = await prisma.appointment.findMany({
      where: {
        customerId: customer.id,
        shopId,
        date: { gte: today },
        status: statusCondition,
      },
      orderBy: { date: "asc" },
      take: 10,
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        status: true,
        notes: true,
        service: { select: { id: true, name: true, duration: true } },
        staff: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ customer, appointments });
  } catch (error) {
    logger.error("Failed to look up appointments", "api:appointments:lookup", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
