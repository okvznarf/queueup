import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";
import { computeUsageForShop } from "@/lib/usage";
import { sendUsageAlert } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/security";
import { logger } from "@/lib/logger";

/**
 * GET /api/cron/usage-alerts
 *
 * Hourly cron: for every active shop with a v3 vertical pack, computes current
 * billing-period AI call usage and sends an 80% or 100% alert email if the
 * threshold has been crossed and we haven't already alerted at that level
 * this period.
 *
 * Idempotency:
 * - `lastUsageAlertSentAt` + `lastUsageAlertLevel` on Shop track the most recent
 *   alert. If `lastUsageAlertSentAt` is before the current period's start, we
 *   reset (new billing period — alerts can fire again).
 * - 80% alert fires once. 100% alert fires once. Going from 80% → 100% in the
 *   same period sends only the 100% email.
 *
 * Auth: Bearer CRON_SECRET header (matches /api/cron/reminders pattern).
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  if (!rateLimit("cron-usage-alerts:" + ip, 60, 3600000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  if (!secret || auth.length !== expected.length || !timingSafeEqual(Buffer.from(auth), Buffer.from(expected))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pull every active shop with an owner. The pack filter is applied later
  // (computeUsageForShop returns null pricing for shops without a v3 pack).
  const shops = await prisma.shop.findMany({
    where: { subscriptionActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      lastUsageAlertSentAt: true,
      lastUsageAlertLevel: true,
      owner: { select: { email: true, name: true } },
    },
  });

  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://queueup.me").replace(/\/$/, "");

  let processed = 0;
  let sent80 = 0;
  let sent100 = 0;
  let skippedNoPack = 0;
  let skippedNoOwner = 0;
  let skippedBelowThreshold = 0;
  let skippedAlreadyAlerted = 0;
  let errors = 0;

  for (const shop of shops) {
    processed++;
    try {
      if (!shop.owner?.email) {
        skippedNoOwner++;
        continue;
      }

      const report = await computeUsageForShop(shop.id);
      if (!report.pricing) {
        skippedNoPack++;
        continue;
      }

      // Reset alert state if last alert was in a previous billing period
      let currentLevel = shop.lastUsageAlertLevel;
      if (shop.lastUsageAlertSentAt && shop.lastUsageAlertSentAt < report.periodStart) {
        currentLevel = null;
        await prisma.shop.update({
          where: { id: shop.id },
          data: { lastUsageAlertSentAt: null, lastUsageAlertLevel: null },
        });
      }

      const daysLeft = Math.max(0, report.daysInPeriod - report.daysIntoPeriod);

      let levelToSend: 80 | 100 | null = null;
      if (report.usagePercent >= 100 && (currentLevel == null || currentLevel < 100)) {
        levelToSend = 100;
      } else if (report.usagePercent >= 80 && (currentLevel == null || currentLevel < 80)) {
        levelToSend = 80;
      }

      if (!levelToSend) {
        if (report.usagePercent >= 80) skippedAlreadyAlerted++;
        else skippedBelowThreshold++;
        continue;
      }

      await sendUsageAlert({
        ownerEmail: shop.owner.email,
        ownerName: shop.owner.name ?? "",
        shopName: shop.name,
        level: levelToSend,
        used: report.used,
        included: report.included ?? 0,
        overageRateEur: report.pricing.overageRateEur,
        projectedOverageCalls: report.projectedOverageCalls,
        projectedOverageCostEur: report.projectedOverageCostEur,
        daysLeftInPeriod: daysLeft,
        dashboardUrl: `${base}/admin/${shop.slug}/appointments`,
      });

      await prisma.shop.update({
        where: { id: shop.id },
        data: {
          lastUsageAlertSentAt: new Date(),
          lastUsageAlertLevel: levelToSend,
        },
      });

      if (levelToSend === 80) sent80++;
      else sent100++;
    } catch (err) {
      errors++;
      logger.error(`Usage alert failed for shop ${shop.id}`, "cron:usage-alerts", err);
    }
  }

  logger.info(
    `Usage alerts: processed=${processed} sent80=${sent80} sent100=${sent100} ` +
      `skippedNoPack=${skippedNoPack} skippedNoOwner=${skippedNoOwner} ` +
      `skippedBelowThreshold=${skippedBelowThreshold} skippedAlreadyAlerted=${skippedAlreadyAlerted} ` +
      `errors=${errors}`,
    "cron:usage-alerts",
  );

  return NextResponse.json({
    processed,
    sent80,
    sent100,
    skippedNoPack,
    skippedNoOwner,
    skippedBelowThreshold,
    skippedAlreadyAlerted,
    errors,
  });
}
