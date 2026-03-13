import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("customer_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== "customer") {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  try {
    const appointments = await prisma.appointment.findMany({
      where: { customerId: decoded.userId },
      include: { service: true, staff: true, shop: true },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(appointments);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
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
      include: { service: true, staff: true, shop: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}