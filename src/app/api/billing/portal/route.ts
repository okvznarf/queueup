import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { rateLimit, getClientIp, parseBody } from "@/lib/security";
import { logger } from "@/lib/logger";
import { createBillingPortalSession } from "@/lib/stripe";

/**
 * POST /api/billing/portal
 * Body: { shopId }
 *
 * Creates a Stripe Customer Portal session. The client redirects the browser
 * to the returned URL, where the owner can update card / cancel / view invoices.
 * Stripe sends them back to the admin dashboard when done.
 *
 * Requires the Customer Portal to be configured once in the Stripe dashboard:
 * Settings → Billing → Customer portal.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit(`billing-portal:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = (await parseBody(request, 1_000)) as { shopId?: string } | null;
  if (!body || typeof body.shopId !== "string") {
    return NextResponse.json({ error: "shopId required" }, { status: 400 });
  }
  const shopId = body.shopId;

  const auth = await requireAdmin(request, shopId);
  if (auth.error) return auth.error;

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe is not configured on this server" }, { status: 503 });
  }

  try {
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { slug: true, stripeCustomerId: true },
    });
    if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    if (!shop.stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer for this shop — start a checkout first" },
        { status: 400 },
      );
    }

    const base = (process.env.NEXT_PUBLIC_APP_URL || "https://queueup.me").replace(/\/$/, "");
    const returnUrl = `${base}/admin/${shop.slug}/appointments`;

    const session = await createBillingPortalSession({
      customerId: shop.stripeCustomerId,
      returnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    logger.error("Portal session creation failed", "api:billing:portal", error);
    return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 });
  }
}
