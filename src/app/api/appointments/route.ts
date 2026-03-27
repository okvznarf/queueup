import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, requireAdmin } from "@/lib/auth";
import { sanitize, isValidEmail, isValidPhone, rateLimit, validateRequired, getClientIp } from "@/lib/security";
import { sendBookingConfirmation } from "@/lib/email";
import { enqueueJob } from "@/lib/jobs";
import { cacheDelete } from "@/lib/cache";
import { checkIdempotency, setIdempotency, bookingIdempotencyKey } from "@/lib/resilience";
import { broadcastToShop } from "@/app/api/events/route";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const shopId = request.nextUrl.searchParams.get("shopId");
  const date = request.nextUrl.searchParams.get("date");
  const staffId = request.nextUrl.searchParams.get("staffId");
  if (!shopId || !date) {
    return NextResponse.json({ error: "shopId and date are required" }, { status: 400 });
  }

  // Require admin auth — appointment list contains customer PII
  const auth = await requireAdmin(request, shopId);
  if (auth.error) return auth.error;

  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    const where: any = { shopId, date: { gte: startOfDay, lte: endOfDay }, status: { notIn: ["CANCELLED"] } };
    if (staffId) where.staffId = staffId;
    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        service: { select: { id: true, name: true, duration: true, price: true } },
        staff: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { startTime: "asc" },
      take: 500, // Hard limit — no shop has 500+ appointments/day
    });
    return NextResponse.json(appointments);
  } catch (error) {
    logger.error("Failed to fetch appointments", "api:appointments", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60);
  const endMins = totalMinutes % 60;
  return endHours.toString().padStart(2, "0") + ":" + endMins.toString().padStart(2, "0");
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit("booking:" + ip, 20, 3600000)) {
    return NextResponse.json({ error: "Too many booking attempts. Please try again later." }, { status: 429 });
  }

  try {
    const body = await request.json();

    const customerName = sanitize(body.customerName, 100);
    const customerPhone = sanitize(body.customerPhone, 30);
    const customerEmail = sanitize(body.customerEmail, 200).toLowerCase();
    const notes = sanitize(body.notes || "", 500);
    const vehicleInfo = sanitize(body.vehicleInfo || "", 200);
    const licensePlate = sanitize(body.licensePlate || "", 20);

    const missing = validateRequired({ shopId: body.shopId, serviceId: body.serviceId, date: body.date, startTime: body.startTime, customerName, customerPhone }, ["shopId", "serviceId", "date", "startTime", "customerName", "customerPhone"]);
    if (missing) {
      return NextResponse.json({ error: missing }, { status: 400 });
    }

    if (customerEmail && !isValidEmail(customerEmail)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    if (!isValidPhone(customerPhone)) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    // ── Idempotency: prevent duplicate bookings from double-clicks / retries ──
    const idempKey = bookingIdempotencyKey(body.shopId, body.date, body.startTime, customerPhone);
    const cached = checkIdempotency(idempKey);
    if (cached) {
      return NextResponse.json(cached, { status: 201 });
    }

    // Parallel: check shop status + service + time conflict in one batch
    const [shop, service, conflict] = await Promise.all([
      prisma.shop.findUnique({ where: { id: body.shopId }, select: { id: true, name: true, subscriptionActive: true } }),
      prisma.service.findUnique({ where: { id: body.serviceId }, select: { id: true, name: true, duration: true, price: true } }),
      prisma.appointment.findFirst({
        where: {
          shopId: body.shopId,
          date: new Date(body.date),
          startTime: body.startTime,
          status: { notIn: ["CANCELLED"] },
          ...(body.staffId ? { staffId: body.staffId } : {}),
        },
      }),
    ]);

    if (!shop || !shop.subscriptionActive) {
      return NextResponse.json({ error: "This business is currently unavailable" }, { status: 403 });
    }
    if (conflict) {
      return NextResponse.json({ error: "This time slot is no longer available" }, { status: 409 });
    }

    // ── Database transaction: customer upsert + appointment creation are atomic ──
    const appointment = await prisma.$transaction(async (tx) => {
      // Find customer: check logged-in token first, then phone/email
      let customerId = null;
      const token = request.cookies.get("customer_token")?.value;
      if (token) {
        const decoded = verifyToken(token);
        if (decoded && decoded.role === "customer") {
          customerId = decoded.userId;
        }
      }

      let customer = customerId
        ? await tx.customer.findUnique({ where: { id: customerId } })
        : null;

      if (!customer) {
        customer = await tx.customer.findFirst({
          where: {
            shopId: body.shopId,
            OR: [
              { phone: customerPhone },
              ...(customerEmail ? [{ email: customerEmail }] : []),
            ],
          },
        });
      }

      if (!customer) {
        customer = await tx.customer.create({ data: { name: customerName, phone: customerPhone, email: customerEmail || null, shopId: body.shopId } });
      } else {
        await tx.customer.update({ where: { id: customer.id }, data: { name: customerName, email: customerEmail || customer.email } });
      }

      // Re-check conflict inside transaction to prevent race conditions
      const txConflict = await tx.appointment.findFirst({
        where: {
          shopId: body.shopId,
          date: new Date(body.date),
          startTime: body.startTime,
          status: { notIn: ["CANCELLED"] },
          ...(body.staffId ? { staffId: body.staffId } : {}),
        },
      });
      if (txConflict) throw new Error("SLOT_TAKEN");

      return tx.appointment.create({
        data: {
          shopId: body.shopId, serviceId: body.serviceId, staffId: body.staffId || null, customerId: customer.id,
          date: new Date(body.date), startTime: body.startTime,
          endTime: body.endTime || calculateEndTime(body.startTime, service?.duration || 30),
          totalPrice: service?.price || 0, notes,
          partySize: body.partySize || null, vehicleInfo: vehicleInfo || null, licensePlate: licensePlate || null,
          status: "CONFIRMED",
        },
        select: {
          id: true, date: true, startTime: true, endTime: true, status: true, totalPrice: true,
          notes: true, partySize: true, vehicleInfo: true, licensePlate: true, createdAt: true,
          service: { select: { id: true, name: true, duration: true, price: true } },
          staff: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true, email: true, phone: true } },
          shop: { select: { id: true, name: true } },
        },
      });
    });

    // Store in idempotency cache so retries return the same result
    setIdempotency(idempKey, appointment);

    // Invalidate availability cache for this shop/date
    cacheDelete("avail:" + body.shopId);

    // Broadcast to admin dashboards watching this shop (SSE)
    broadcastToShop(body.shopId, "appointment:created", {
      id: appointment.id, startTime: appointment.startTime, date: appointment.date,
      service: appointment.service.name, customer: appointment.customer.name,
    });

    // Send confirmation email without blocking the response
    if (appointment.customer.email) {
      sendBookingConfirmation({
        customerName: appointment.customer.name,
        customerEmail: appointment.customer.email,
        shopName: appointment.shop.name,
        serviceName: appointment.service.name,
        staffName: appointment.staff?.name,
        date: appointment.date,
        startTime: appointment.startTime,
        totalPrice: appointment.totalPrice ?? 0,
      }).catch((err) => logger.error("Failed to send booking confirmation", "email:confirmation", err));

      // Schedule 24h and 1h reminder emails
      const [h, m] = appointment.startTime.split(":").map(Number);
      const aptTime = new Date(appointment.date);
      aptTime.setUTCHours(h, m, 0, 0);

      const remind24h = new Date(aptTime.getTime() - 24 * 60 * 60 * 1000);
      const remind1h = new Date(aptTime.getTime() - 1 * 60 * 60 * 1000);
      const now = new Date();

      if (remind24h > now) {
        enqueueJob("email:reminder", { appointmentId: appointment.id, type: "24h" }, { runAt: remind24h })
          .catch((err) => logger.error("Failed to enqueue 24h reminder", "jobs:enqueue", err));
      }
      if (remind1h > now) {
        enqueueJob("email:reminder", { appointmentId: appointment.id, type: "1h" }, { runAt: remind1h })
          .catch((err) => logger.error("Failed to enqueue 1h reminder", "jobs:enqueue", err));
      }
    }

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "SLOT_TAKEN") {
      return NextResponse.json({ error: "This time slot is no longer available" }, { status: 409 });
    }
    logger.error("Failed to create appointment", "api:appointments", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}