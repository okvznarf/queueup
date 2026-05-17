import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";
import { sendTrialReminder, sendTrialEnded } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/security";
import { logger } from "@/lib/logger";

/**
 * GET /api/cron/trial-management
 *
 * Daily cron. For every shop still in trial without a Stripe subscription,
 * sends 7-day and 1-day reminders, then a final ended-notice that also
 * flips Shop.subscriptionActive to false (pausing the AI receptionist).
 *
 * Idempotency: Shop.trialNoticesLevel tracks progression (0 → 1 → 2 → 3).
 * Once a level has been processed it won't fire again. Shops that add a card
 * before the trial ends get a Stripe subscription (via webhook) and are
 * skipped by this cron from then on.
 *
 * Auth: Bearer CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  if (!rateLimit("cron-trial:" + ip, 25, 3600000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  if (!secret || auth.length !== expected.length || !timingSafeEqual(Buffer.from(auth), Buffer.from(expected))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Shops still in trial state: have a trialEndsAt, no Stripe subscription,
  // and notices level not yet maxed.
  const shops = await prisma.shop.findMany({
    where: {
      trialEndsAt: { not: null },
      stripeSubscriptionId: null,
      trialNoticesLevel: { lt: 3 },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      trialEndsAt: true,
      trialNoticesLevel: true,
      owner: { select: { email: true, name: true } },
    },
  });

  const now = new Date();
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://queueup.me").replace(/\/$/, "");

  let processed = 0;
  let sentReminder7 = 0;
  let sentReminder1 = 0;
  let sentEnded = 0;
  let deactivated = 0;
  let skippedNoOwner = 0;
  let skippedNotDue = 0;
  let errors = 0;

  for (const shop of shops) {
    processed++;
    try {
      if (!shop.owner?.email || !shop.trialEndsAt) {
        skippedNoOwner++;
        continue;
      }

      const msLeft = shop.trialEndsAt.getTime() - now.getTime();
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
      const billingUrl = `${base}/admin/${shop.slug}/appointments`;

      let levelToSet: number | null = null;
      let action: "reminder7" | "reminder1" | "ended" | null = null;

      // Trial has ended (or will today) and we haven't sent the ended notice
      if (msLeft <= 0 && shop.trialNoticesLevel < 3) {
        action = "ended";
        levelToSet = 3;
      } else if (daysLeft <= 1 && shop.trialNoticesLevel < 2) {
        action = "reminder1";
        levelToSet = 2;
      } else if (daysLeft <= 7 && shop.trialNoticesLevel < 1) {
        action = "reminder7";
        levelToSet = 1;
      }

      if (!action || levelToSet == null) {
        skippedNotDue++;
        continue;
      }

      if (action === "reminder7") {
        await sendTrialReminder({
          ownerEmail: shop.owner.email,
          ownerName: shop.owner.name ?? "",
          shopName: shop.name,
          daysLeft: 7,
          billingUrl,
        });
        sentReminder7++;
      } else if (action === "reminder1") {
        await sendTrialReminder({
          ownerEmail: shop.owner.email,
          ownerName: shop.owner.name ?? "",
          shopName: shop.name,
          daysLeft: 1,
          billingUrl,
        });
        sentReminder1++;
      } else if (action === "ended") {
        await sendTrialEnded({
          ownerEmail: shop.owner.email,
          ownerName: shop.owner.name ?? "",
          shopName: shop.name,
          billingUrl,
        });
        sentEnded++;

        // Deactivate the shop — AI receptionist will stop responding (shop-context
        // returns 403 for !subscriptionActive). Booking page stays up.
        await prisma.shop.update({
          where: { id: shop.id },
          data: { subscriptionActive: false },
        });
        deactivated++;
      }

      await prisma.shop.update({
        where: { id: shop.id },
        data: { trialNoticesLevel: levelToSet },
      });
    } catch (err) {
      errors++;
      logger.error(`Trial management failed for shop ${shop.id}`, "cron:trial", err);
    }
  }

  logger.info(
    `Trial management: processed=${processed} sentReminder7=${sentReminder7} sentReminder1=${sentReminder1} ` +
      `sentEnded=${sentEnded} deactivated=${deactivated} skippedNoOwner=${skippedNoOwner} ` +
      `skippedNotDue=${skippedNotDue} errors=${errors}`,
    "cron:trial",
  );

  return NextResponse.json({
    processed,
    sentReminder7,
    sentReminder1,
    sentEnded,
    deactivated,
    skippedNoOwner,
    skippedNotDue,
    errors,
  });
}
