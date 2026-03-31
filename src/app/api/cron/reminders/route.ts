import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";
import { sendAppointmentReminder } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/security";
import { logger } from "@/lib/logger";

// Returns midnight UTC of the calendar date that utcDate falls on
// when viewed in the given timezone.
function getLocalDateMidnightUTC(utcDate: Date, timezone: string): Date {
  const localDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(utcDate); // gives "YYYY-MM-DD"
  return new Date(localDateStr + "T00:00:00.000Z");
}

// Process emails in batches to avoid overwhelming SendGrid
async function sendBatch<T>(items: T[], batchSize: number, fn: (item: T) => Promise<boolean>): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map(fn));
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) sent++;
      else failed++;
    }
  }
  return { sent, failed };
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  if (!rateLimit("cron-reminders:" + ip, 25, 3600000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  if (!secret || auth.length !== expected.length || !timingSafeEqual(Buffer.from(auth), Buffer.from(expected))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all distinct shop timezones
  const shops = await prisma.shop.findMany({
    select: { id: true, timezone: true },
  });

  // Group shop IDs by timezone
  const byTimezone = new Map<string, string[]>();
  for (const shop of shops) {
    const tz = shop.timezone || "UTC";
    if (!byTimezone.has(tz)) byTimezone.set(tz, []);
    byTimezone.get(tz)!.push(shop.id);
  }

  let totalSent = 0;
  let totalFailed = 0;
  let skipped = 0;

  // Send 24h reminders for ALL appointments tomorrow (daily cron)
  // Since this runs once daily, we grab every appointment for tomorrow's
  // calendar date (in each shop's timezone), regardless of start time.
  const target = new Date(Date.now() + 24 * 60 * 60 * 1000);

  for (const [timezone, shopIds] of byTimezone) {
    const localDateMidnight = getLocalDateMidnightUTC(target, timezone);
    const localDateEnd = new Date(localDateMidnight.getTime() + 24 * 60 * 60 * 1000);

    const appointments = await prisma.appointment.findMany({
      where: {
        shopId: { in: shopIds },
        date: { gte: localDateMidnight, lt: localDateEnd },
        status: { in: ["CONFIRMED", "PENDING"] },
        reminderSentAt: null,
      },
      include: { customer: true, service: true, staff: true, shop: true },
    });

    // Filter out appointments without customer email
    const withEmail = appointments.filter(a => a.customer.email);
    skipped += appointments.length - withEmail.length;

    // Send in batches of 10 concurrently
    const { sent, failed } = await sendBatch(withEmail, 10, async (appt) => {
      try {
        await sendAppointmentReminder({
          customerName: appt.customer.name,
          customerEmail: appt.customer.email!,
          shopName: appt.shop.name,
          serviceName: appt.service.name,
          staffName: appt.staff?.name,
          date: appt.date,
          startTime: appt.startTime,
          reminderType: "24h",
        });
        await prisma.appointment.update({
          where: { id: appt.id },
          data: { reminderSentAt: new Date() },
        });
        return true;
      } catch (err) {
        logger.error("Failed to send 24h reminder", "cron:reminders", err);
        return false;
      }
    });

    totalSent += sent;
    totalFailed += failed;
  }

  return NextResponse.json({ ok: true, sent: totalSent, failed: totalFailed, skipped });
}
