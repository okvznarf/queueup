import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { rateLimit, getClientIp, parseBody } from "@/lib/security";
import { logger } from "@/lib/logger";
import { getPack } from "@/lib/verticals";
import { createCheckoutSession, createStripeCustomer } from "@/lib/stripe";

/**
 * POST /api/billing/checkout
 * Body: { shopId, billingCycle: "monthly" | "annual" }
 *
 * Creates a Stripe Checkout Session for the shop's subscription and returns
 * its URL. The client redirects the browser to that URL. After payment,
 * Stripe redirects back to /admin/{slug}/billing/success.
 *
 * If the shop has no Stripe Customer yet (e.g., onboarded while Stripe was
 * misconfigured), one is created here as a fallback.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit(`billing-checkout:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = (await parseBody(request, 5_000)) as { shopId?: string; billingCycle?: "monthly" | "annual" } | null;
  if (!body || typeof body.shopId !== "string") {
    return NextResponse.json({ error: "shopId required" }, { status: 400 });
  }
  const shopId = body.shopId;
  const billingCycle: "monthly" | "annual" = body.billingCycle === "annual" ? "annual" : "monthly";

  const auth = await requireAdmin(request, shopId);
  if (auth.error) return auth.error;

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe is not configured on this server" }, { status: 503 });
  }

  try {
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        id: true,
        slug: true,
        name: true,
        businessType: true,
        employeeCount: true,
        trialEndsAt: true,
        stripeCustomerId: true,
        owner: { select: { email: true, name: true } },
      },
    });
    if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    if (!shop.owner?.email) {
      return NextResponse.json({ error: "Shop has no owner email — cannot bill" }, { status: 400 });
    }

    const pack = getPack(shop.businessType);
    if (!pack) {
      return NextResponse.json(
        { error: "No vertical pack for this shop — billing requires a v3 pack" },
        { status: 400 },
      );
    }

    // Fallback Stripe Customer creation if missing
    let customerId = shop.stripeCustomerId;
    if (!customerId) {
      customerId = await createStripeCustomer({
        shopId: shop.id,
        email: shop.owner.email,
        name: shop.name,
        metadata: { businessType: shop.businessType, slug: shop.slug },
      });
      await prisma.shop.update({ where: { id: shop.id }, data: { stripeCustomerId: customerId } });
    }

    const base = (process.env.NEXT_PUBLIC_APP_URL || "https://queueup.me").replace(/\/$/, "");
    const successUrl = `${base}/admin/${shop.slug}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${base}/admin/${shop.slug}/appointments?billing=cancelled`;

    const session = await createCheckoutSession({
      customerId,
      pack,
      billingCycle,
      unitQuantity: shop.employeeCount,
      trialEndsAt: shop.trialEndsAt,
      successUrl,
      cancelUrl,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    logger.error("Checkout session creation failed", "api:billing:checkout", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
