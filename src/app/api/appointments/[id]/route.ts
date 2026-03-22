import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/security";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (!rateLimit("appt-patch:" + ip, 20, 600000)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const { id } = await context.params;
  const auth = requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { status } = body;

    // Validate status value
    const allowedStatuses = ["CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW", "PENDING"];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Verify the user has access to this appointment
    const existing = await prisma.appointment.findUnique({ where: { id }, select: { shopId: true, customerId: true } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Customers can only cancel their own appointments
    if (auth.user.role === "customer") {
      if (existing.customerId !== auth.user.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (status !== "CANCELLED") {
        return NextResponse.json({ error: "Customers can only cancel appointments" }, { status: 403 });
      }
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status },
      include: { service: true, staff: true, customer: true },
    });
    return NextResponse.json(appointment);
  } catch (error) {
    console.error("Error updating appointment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
