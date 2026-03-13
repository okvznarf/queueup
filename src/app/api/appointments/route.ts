import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { sanitize, isValidEmail, isValidPhone, rateLimit, validateRequired } from "@/lib/security";
import { sendBookingConfirmation } from "@/lib/email";

export async function GET(request: NextRequest) {
  const shopId = request.nextUrl.searchParams.get("shopId");
  const date = request.nextUrl.searchParams.get("date");
  const staffId = request.nextUrl.searchParams.get("staffId");
  if (!shopId || !date) {
    return NextResponse.json({ error: "shopId and date are required" }, { status: 400 });
  }
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    const where: any = { shopId, date: { gte: startOfDay, lte: endOfDay }, status: { notIn: ["CANCELLED"] } };
    if (staffId) where.staffId = staffId;
    const appointments = await prisma.appointment.findMany({ where, include: { service: true, staff: true, customer: true }, orderBy: { startTime: "asc" } });
    return NextResponse.json(appointments);
  } catch (error) {
    console.error("Error fetching appointments:", error);
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
  const ip = request.headers.get("x-forwarded-for") || "unknown";
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

    const conflictWhere: any = { shopId: body.shopId, date: new Date(body.date), startTime: body.startTime, status: { notIn: ["CANCELLED"] } };
    if (body.staffId) conflictWhere.staffId = body.staffId;
    const conflict = await prisma.appointment.findFirst({ where: conflictWhere });
    if (conflict) {
      return NextResponse.json({ error: "This time slot is no longer available" }, { status: 409 });
    }

    // Check if customer is logged in
    let customerId = null;
    const token = request.cookies.get("customer_token")?.value;
    if (token) {
      const decoded = verifyToken(token);
      if (decoded && decoded.role === "customer") {
        customerId = decoded.userId;
      }
    }

    // Find or create customer
    let customer;
    if (customerId) {
      customer = await prisma.customer.findUnique({ where: { id: customerId } });
    }

    if (!customer) {
      // Try to find by phone
      customer = await prisma.customer.findUnique({ where: { phone_shopId: { phone: customerPhone, shopId: body.shopId } } });
    }

    if (!customer && customerEmail) {
      // Try to find by email
      customer = await prisma.customer.findUnique({ where: { email_shopId: { email: customerEmail, shopId: body.shopId } } });
    }

    if (!customer) {
      customer = await prisma.customer.create({ data: { name: customerName, phone: customerPhone, email: customerEmail || null, shopId: body.shopId } });
    } else {
      // Update name and email if changed
      await prisma.customer.update({ where: { id: customer.id }, data: { name: customerName, email: customerEmail || customer.email } });
    }

    const service = await prisma.service.findUnique({ where: { id: body.serviceId } });

    const appointment = await prisma.appointment.create({
      data: {
        shopId: body.shopId, serviceId: body.serviceId, staffId: body.staffId || null, customerId: customer.id,
        date: new Date(body.date), startTime: body.startTime,
        endTime: body.endTime || calculateEndTime(body.startTime, service?.duration || 30),
        totalPrice: service?.price || 0, notes,
        partySize: body.partySize || null, vehicleInfo: vehicleInfo || null, licensePlate: licensePlate || null,
        status: "CONFIRMED",
      },
      include: { service: true, staff: true, customer: true, shop: true },
    });

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
      });
    }

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error("Error creating appointment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}