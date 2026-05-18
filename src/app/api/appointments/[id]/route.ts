import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { verifyServiceToken } from "@/lib/serviceAuth";
import { rateLimit, getClientIp, parseBody } from "@/lib/security";
import { logger } from "@/lib/logger";
import { broadcastToShop } from "@/app/api/events/route";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const ip = getClientIp(request);
  if (!rateLimit("appt-patch:" + ip, 20, 600000)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const { id } = await context.params;

  // Service token path: AI acting on behalf of a patient — skip user auth
  const isServiceToken = verifyServiceToken(request);
  // Service token must declare which shop it's acting on. Resource ownership
  // is re-verified below so a leaked token can't pivot across tenants.
  const declaredShopId = isServiceToken ? request.headers.get("x-shop-id") : null;
  if (isServiceToken && !declaredShopId) {
    return NextResponse.json({ error: "x-shop-id header required for service token" }, { status: 400 });
  }

  if (!isServiceToken) {
    const auth = requireAuth(request);
    if (auth.error) return auth.error;
  }

  // Re-read auth for role checks below (only relevant for non-service-token path)
  const auth = isServiceToken ? null : requireAuth(request);

  try {
    const body = await parseBody(request, 1_000);
    if (!body) {
      return NextResponse.json({ error: "Invalid or oversized payload" }, { status: 400 });
    }
    const { status, repairStatus, repairStatusNote } = body as {
      status?: string;
      repairStatus?: string | null;
      repairStatusNote?: string | null;
    };

    // At least one updatable field must be present.
    if (status === undefined && repairStatus === undefined && repairStatusNote === undefined) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    // Validate status value if provided
    if (status !== undefined) {
      const allowedStatuses = ["CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW", "PENDING"];
      if (!allowedStatuses.includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
    }

    // Validate repairStatus value if provided
    if (repairStatus !== undefined && repairStatus !== null) {
      const allowedRepairStatuses = ["RECEIVED", "IN_PROGRESS", "WAITING_FOR_PARTS", "READY", "PICKED_UP"];
      if (!allowedRepairStatuses.includes(repairStatus)) {
        return NextResponse.json({ error: "Invalid repairStatus" }, { status: 400 });
      }
    }

    if (repairStatusNote !== undefined && repairStatusNote !== null && typeof repairStatusNote !== "string") {
      return NextResponse.json({ error: "Invalid repairStatusNote" }, { status: 400 });
    }
    if (typeof repairStatusNote === "string" && repairStatusNote.length > 500) {
      return NextResponse.json({ error: "repairStatusNote too long (max 500)" }, { status: 400 });
    }

    // Verify the user has access to this appointment
    const existing = await prisma.appointment.findUnique({ where: { id }, select: { shopId: true, customerId: true } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Service token: resource must belong to the declared shop (blast-radius limit).
    if (isServiceToken && existing.shopId !== declaredShopId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Service token: the AI may perform any status change on behalf of the patient
    // User JWT: enforce role-based access control
    if (!isServiceToken && auth && !auth.error) {
      const user = auth.user!;
      // Customers can only cancel their own appointments — never touch repair status.
      if (user.role === "customer") {
        if (existing.customerId !== user.userId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        if (status !== "CANCELLED" || repairStatus !== undefined || repairStatusNote !== undefined) {
          return NextResponse.json({ error: "Customers can only cancel appointments" }, { status: 403 });
        }
      }

      // Admins can only modify appointments in their own shop
      if (user.role !== "customer" && user.role !== "superadmin") {
        const shop = await prisma.shop.findUnique({ where: { id: existing.shopId }, select: { ownerId: true } });
        if (!shop || shop.ownerId !== user.userId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (repairStatus !== undefined) {
      updateData.repairStatus = repairStatus;
      updateData.repairStatusUpdatedAt = new Date();
    }
    if (repairStatusNote !== undefined) {
      updateData.repairStatusNote = repairStatusNote || null;
      // Also bump the timestamp if only the note changed, so customers calling
      // get an accurate "last update" answer.
      if (updateData.repairStatusUpdatedAt === undefined) {
        updateData.repairStatusUpdatedAt = new Date();
      }
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: { service: true, staff: true, customer: true },
    });

    // Broadcast status change to all connected clients for this shop
    broadcastToShop(existing.shopId, "appointment:updated", {
      id: appointment.id, status: appointment.status,
      customer: appointment.customer.name,
    });

    return NextResponse.json(appointment);
  } catch (error) {
    logger.error("Failed to update appointment", "api:appointments", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
