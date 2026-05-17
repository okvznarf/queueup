import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";
import { computeUsageForShop } from "@/lib/usage";
import { pushOverageUsage } from "@/lib/stripe";
import { rateLimit, getClientIp } from "@/lib/security";
import { logger } from "@/lib/logger";

/**
 * GET /api/cron/overage-push
 *
 * Daily cron. For every shop with an active Stripe subscription, computes
 * current billing-period overage (from VoiceCall records) and pushes the
 * cumulative count to the shop's metered Stripe subscription item.
 *
 * Idempotency: we use `action: "set"` in pushOverageUsage which OVERWRITES the
 * period's reported usage. Re-running mid-day is safe and self-correcting —
 * a missed cron the next day just catches up.
 *
 * Auth: Bearer CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  if (!rateLimit("cron-overage:" + ip, 25, 3600000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  if (!secret || auth.length !== expected.length || !timingSafeEqual(Buffer.from(auth), Buffer.from(expected))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const shops = await prisma.shop.findMany({
    where: {
      subscriptionActive: true,
      stripeSubscriptionId: { not: null },
    },
    select: {
      id: true,
      businessType: true,
      stripeSubscriptionId: true,
    },
  });

  let processed = 0;
  let pushed = 0;
  let skippedNoOverage = 0;
  let skippedNoPack = 0;
  let errors = 0;

  for (const shop of shops) {
    processed++;
    try {
      const report = await computeUsageForShop(shop.id);
      if (!report.pricing) {
        skippedNoPack++;
        continue;
      }

      if (report.overageCalls <= 0) {
        // Still push 0 so Stripe knows current state — prevents stale usage from
        // a previous run lingering. Actually action:"set" with 0 is wasteful;
        // skip and let Stripe keep the last reported (which was also our last set).
        skippedNoOverage++;
        continue;
      }

      await pushOverageUsage({
        subscriptionId: shop.stripeSubscriptionId!,
        packSlug: shop.businessType,
        overageCalls: report.overageCalls,
      });
      pushed++;
    } catch (err) {
      errors++;
      logger.error(`Overage push failed for shop ${shop.id}`, "cron:overage", err);
    }
  }

  logger.info(
    `Overage push: processed=${processed} pushed=${pushed} ` +
      `skippedNoOverage=${skippedNoOverage} skippedNoPack=${skippedNoPack} errors=${errors}`,
    "cron:overage",
  );

  return NextResponse.json({
    processed,
    pushed,
    skippedNoOverage,
    skippedNoPack,
    errors,
  });
}
