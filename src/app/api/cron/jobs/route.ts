import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { processJobs, registerJobHandler } from "@/lib/jobs";
import { sendBookingConfirmation } from "@/lib/email";
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

// ─── Cron handler: process pending jobs ─────────────────────────────────────
// Schedule: daily via Vercel cron

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  if (!secret || authHeader.length !== expected.length || !timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))) {
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
