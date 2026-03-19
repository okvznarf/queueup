import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendAppointmentReminder } from "@/lib/email";

// Given a UTC datetime and a timezone string (e.g. "Europe/Zagreb"),
// returns the local hour as a zero-padded string like "14"
function getLocalHour(utcDate: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false,
  }).format(utcDate).padStart(2, "0");
}

// Returns midnight UTC of the calendar date that utcDate falls on
// when viewed in the given timezone.
// e.g. if utcDate is 2024-03-18T23:00Z and timezone is Europe/Zagreb (UTC+1),
// the local date is 2024-03-19, so this returns 2024-03-19T00:00:00Z
function getLocalDateMidnightUTC(utcDate: Date, timezone: string): Date {
  const localDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(utcDate); // gives "YYYY-MM-DD"
  return new Date(localDateStr + "T00:00:00.000Z");
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Target moment: exactly 24 hours from now
  const target = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Get all distinct shop timezones so we can handle each correctly
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

  let sent = 0;
  let skipped = 0;

  for (const [timezone, shopIds] of byTimezone) {
    // What local hour does "target" fall in for this timezone?
    const localHour = getLocalHour(target, timezone);

    // What midnight UTC corresponds to the local calendar date of "target"?
    const localDateMidnight = getLocalDateMidnightUTC(target, timezone);
    const localDateEnd = new Date(localDateMidnight.getTime() + 24 * 60 * 60 * 1000);

    const appointments = await prisma.appointment.findMany({
      where: {
        shopId: { in: shopIds },
        date: { gte: localDateMidnight, lt: localDateEnd },
        status: { in: ["CONFIRMED", "PENDING"] },
        startTime: { startsWith: localHour + ":" },
      },
      include: { customer: true, service: true, staff: true, shop: true },
    });

    for (const appt of appointments) {
      if (!appt.customer.email) {
        skipped++;
        continue;
      }
      try {
        await sendAppointmentReminder({
          customerName: appt.customer.name,
          customerEmail: appt.customer.email,
          shopName: appt.shop.name,
          serviceName: appt.service.name,
          staffName: appt.staff?.name,
          date: appt.date,
          startTime: appt.startTime,
        });
        sent++;
      } catch (err) {
        console.error(`Failed to send reminder for appointment ${appt.id}:`, err);
        skipped++;
      }
    }
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
