import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { rateLimit } from "@/lib/security";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (!rateLimit("cust-appts:" + ip, 30, 60000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const token = request.cookies.get("customer_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== "customer") {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  try {
    // Cursor-based pagination: ?limit=20&cursor=<lastId>
    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit")) || 20, 1), 100);
    const cursor = request.nextUrl.searchParams.get("cursor");

    const appointments = await prisma.appointment.findMany({
      where: { customerId: decoded.userId },
      include: {
        service: { select: { id: true, name: true, duration: true, price: true } },
        staff: { select: { id: true, name: true } },
        shop: { select: { id: true, name: true, slug: true, primaryColor: true } },
      },
      orderBy: { date: "desc" },
      take: limit + 1, // Fetch one extra to know if there's a next page
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = appointments.length > limit;
    const data = hasMore ? appointments.slice(0, limit) : appointments;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return NextResponse.json({ data, nextCursor, hasMore });
  } catch (error) {
    logger.error("Failed to fetch customer appointments", "api:customer", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (!rateLimit("cust-cancel:" + ip, 10, 60000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const token = request.cookies.get("customer_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== "customer") {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { appointmentId } = body;
    if (!appointmentId || typeof appointmentId !== "string") {
      return NextResponse.json({ error: "appointmentId required" }, { status: 400 });
    }

    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment || appointment.customerId !== decoded.userId) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
    if (appointment.status === "CANCELLED" || appointment.status === "COMPLETED") {
      return NextResponse.json({ error: "Cannot cancel this appointment" }, { status: 400 });
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "CANCELLED" },
      select: {
        id: true, date: true, startTime: true, endTime: true, status: true,
        service: { select: { id: true, name: true } },
        staff: { select: { id: true, name: true } },
        shop: { select: { id: true, name: true, slug: true } },
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Failed to update customer appointment", "api:customer", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
