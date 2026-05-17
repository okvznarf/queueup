import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/security";
import { logger } from "@/lib/logger";
import { computeUsageForShop } from "@/lib/usage";

/**
 * GET /api/admin/usage?shopId=X
 *
 * Returns the current billing period's AI call usage for the shop:
 * used / included / overage count + cost / projection.
 *
 * Auth: admin auth_token, scoped to a shop they own.
 * Used by the Usage tab in the admin dashboard.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit(`usage:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get("shopId");
  if (!shopId) {
    return NextResponse.json({ error: "shopId is required" }, { status: 400 });
  }

  const auth = await requireAdmin(request, shopId);
  if (auth.error) return auth.error;

  try {
    const report = await computeUsageForShop(shopId);
    return NextResponse.json(report);
  } catch (error) {
    logger.error("Failed to compute usage", "api:admin:usage", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
