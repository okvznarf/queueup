import { NextRequest, NextResponse } from "next/server";
import { processJobs, registerJobHandler } from "@/lib/jobs";
import { sendBookingConfirmation, sendAppointmentReminder } from "@/lib/email";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

// ─── Register job handlers ──────────────────────────────────────────────────

registerJobHandler("email:confirmation", async (payload) => {
  const { appointmentId } = payload as { appointmentId: string };
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      date: true, startTime: true, totalPrice: true,
      customer: { select: { name: true, email: true } },
      service: { select: { name: true } },
      staff: { select: { name: true } },
      shop: { select: { name: true } },
    },
  });
  if (!appt || !appt.customer.email) return;

  await sendBookingConfirmation({
    customerName: appt.customer.name,
    customerEmail: appt.customer.email,
    shopName: appt.shop.name,
    serviceName: appt.service.name,
    staffName: appt.staff?.name,
    date: appt.date,
    startTime: appt.startTime,
    totalPrice: appt.totalPrice ?? 0,
  });
});

registerJobHandler("email:reminder", async (payload) => {
  const { appointmentId, type } = payload as { appointmentId: string; type?: string };
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      date: true, startTime: true, status: true,
      customer: { select: { name: true, email: true } },
      service: { select: { name: true } },
      staff: { select: { name: true } },
      shop: { select: { name: true } },
    },
  });
  // Skip if appointment was cancelled between enqueue and execution
  if (!appt || !appt.customer.email || appt.status === "CANCELLED") return;

  await sendAppointmentReminder({
    customerName: appt.customer.name,
    customerEmail: appt.customer.email,
    shopName: appt.shop.name,
    serviceName: appt.service.name,
    staffName: appt.staff?.name,
    date: appt.date,
    startTime: appt.startTime,
    reminderType: type === "1h" ? "1h" : "24h",
  });
});

// ─── Cron handler: process pending jobs ─────────────────────────────────────
// Schedule: every 1 minute via Vercel cron

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processJobs(20);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logger.error("Failed to process jobs", "cron:jobs", error);
    return NextResponse.json({ error: "Job processing failed" }, { status: 500 });
  }
}
