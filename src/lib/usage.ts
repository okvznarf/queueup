import prisma from "@/lib/prisma";
import { getPack } from "@/lib/verticals";
import { BusinessType } from "../../generated/prisma/client";

/**
 * Minimum call duration (seconds) for a call to count as a billable AI call.
 * Filters out hangups and immediate escalations. Platform-wide for v1.
 * May move into pack later if some verticals need different thresholds.
 */
export const BILLABLE_CALL_MIN_DURATION_SEC = 30;

export interface UsageReport {
  shopId: string;
  businessType: BusinessType;
  packSlug: BusinessType | null;
  pricing: {
    base: number;
    perUnit: number;
    unitLabel: string;
    currency: "EUR";
    includedAiCallsPerMonth: number;
    overageRateEur: number;
  } | null;

  /** Billing period boundaries (calendar month for v1). */
  periodStart: Date;
  periodEnd: Date;
  daysIntoPeriod: number;
  daysInPeriod: number;

  /** Billable AI calls used in the period so far. */
  used: number;
  /** Pack quota — null if no pack. */
  included: number | null;
  /** max(0, used - included). 0 if no pack. */
  overageCalls: number;
  /** EUR — overageCalls × pack.overageRateEur. */
  overageCostEur: number;
  /** used / included × 100, rounded. 0 if no pack. */
  usagePercent: number;

  /** Linear projection: used / daysIntoPeriod × daysInPeriod. */
  projectedTotal: number;
  projectedOverageCalls: number;
  projectedOverageCostEur: number;
}

/**
 * Returns the [start, end) of the current calendar month (UTC) for the given date.
 * V1 uses calendar months for owner-facing usage visibility; Stripe billing cycle
 * anchors can differ but those are computed by Stripe at invoice time.
 */
export function currentBillingPeriod(now: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return { start, end };
}

/**
 * Computes a complete usage report for one shop for the current billing period.
 * Used by both the admin dashboard endpoint and the alert cron — single source
 * of truth for "what counts as a billable call" and how overage is computed.
 */
export async function computeUsageForShop(shopId: string, now: Date = new Date()): Promise<UsageReport> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { id: true, businessType: true },
  });
  if (!shop) throw new Error(`Shop not found: ${shopId}`);

  const { start, end } = currentBillingPeriod(now);

  const used = await prisma.voiceCall.count({
    where: {
      clinicId: shopId,
      startedAt: { gte: start, lt: end },
      durationSec: { gte: BILLABLE_CALL_MIN_DURATION_SEC },
    },
  });

  const pack = getPack(shop.businessType);

  const daysInPeriod = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const daysIntoPeriod = Math.max(
    1,
    Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
  );

  const projectedTotal = Math.round((used / daysIntoPeriod) * daysInPeriod);

  if (!pack) {
    return {
      shopId,
      businessType: shop.businessType,
      packSlug: null,
      pricing: null,
      periodStart: start,
      periodEnd: end,
      daysIntoPeriod,
      daysInPeriod,
      used,
      included: null,
      overageCalls: 0,
      overageCostEur: 0,
      usagePercent: 0,
      projectedTotal,
      projectedOverageCalls: 0,
      projectedOverageCostEur: 0,
    };
  }

  const included = pack.pricing.includedAiCallsPerMonth;
  const overageRate = pack.pricing.overageRateEur;
  const overageCalls = Math.max(0, used - included);
  const overageCostEur = round2(overageCalls * overageRate);
  const usagePercent = included > 0 ? Math.round((used / included) * 100) : 0;
  const projectedOverageCalls = Math.max(0, projectedTotal - included);
  const projectedOverageCostEur = round2(projectedOverageCalls * overageRate);

  return {
    shopId,
    businessType: shop.businessType,
    packSlug: pack.slug,
    pricing: {
      base: pack.pricing.base,
      perUnit: pack.pricing.perUnit,
      unitLabel: pack.pricing.unitLabel,
      currency: pack.pricing.currency,
      includedAiCallsPerMonth: included,
      overageRateEur: overageRate,
    },
    periodStart: start,
    periodEnd: end,
    daysIntoPeriod,
    daysInPeriod,
    used,
    included,
    overageCalls,
    overageCostEur,
    usagePercent,
    projectedTotal,
    projectedOverageCalls,
    projectedOverageCostEur,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
