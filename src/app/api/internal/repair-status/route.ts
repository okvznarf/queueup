import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireServiceOrAdmin } from "@/lib/serviceAuth";
import { rateLimit, getClientIp } from "@/lib/security";
import { logger } from "@/lib/logger";

/**
 * GET /api/internal/repair-status?shopId=X&licensePlate=Y
 *
 * Looks up the most recent in-flight appointment matching the license plate
 * and returns its repair workflow state. Used by the voice receptionist's
 * check_repair_status tool to answer "is my car ready?" calls.
 *
 * Matching:
 * - Same shop
 * - Same license plate (normalized: uppercase, stripped of spaces and dashes)
 * - Repair status is not PICKED_UP (active workflow), OR null with a non-cancelled
 *   appointment date in the last 14 days (just-dropped-off, status not yet set)
 *
 * Auth: INTERNAL_SERVICE_TOKEN Bearer header OR admin JWT cookie.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit(`repair-status:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get("shopId");
  const rawPlate = searchParams.get("licensePlate");

  if (!shopId || !rawPlate) {
    return NextResponse.json({ error: "shopId and licensePlate are required" }, { status: 400 });
  }

  const auth = await requireServiceOrAdmin(request, shopId);
  if (auth.error) return auth.error;

  const plate = normalizePlate(rawPlate);
  if (!plate) {
    return NextResponse.json({ error: "Invalid license plate" }, { status: 400 });
  }

  try {
    // Fetch candidate appointments and filter the plate match in JS so we can
    // match against normalized plate strings (DB stores user-entered form).
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const candidates = await prisma.appointment.findMany({
      where: {
        shopId,
        licensePlate: { not: null },
        date: { gte: cutoff },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
      orderBy: { date: "desc" },
      select: {
        id: true,
        date: true,
        startTime: true,
        licensePlate: true,
        vehicleInfo: true,
        repairStatus: true,
        repairStatusNote: true,
        repairStatusUpdatedAt: true,
        customer: { select: { name: true, phone: true } },
        service: { select: { name: true } },
      },
    });

    const match = candidates.find(
      (a) => a.licensePlate && normalizePlate(a.licensePlate) === plate,
    );

    if (!match) {
      return NextResponse.json({ found: false });
    }

    return NextResponse.json({
      found: true,
      appointment: {
        id: match.id,
        date: match.date.toISOString().split("T")[0],
        startTime: match.startTime,
        licensePlate: match.licensePlate,
        vehicleInfo: match.vehicleInfo,
        service: match.service.name,
        customer: match.customer.name,
        repairStatus: match.repairStatus ?? "RECEIVED",
        repairStatusNote: match.repairStatusNote,
        repairStatusUpdatedAt: match.repairStatusUpdatedAt?.toISOString() ?? null,
      },
    });
  } catch (err) {
    logger.error("Failed to look up repair status", "api:repair-status", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function normalizePlate(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, "").trim();
}
