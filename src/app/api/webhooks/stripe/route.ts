import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { logger } from "@/lib/logger";

/**
 * POST /api/webhooks/stripe
 *
 * Stripe webhook receiver. Validates the signature with STRIPE_WEBHOOK_SECRET,
 * then dispatches to per-event handlers.
 *
 * Configure in Stripe Dashboard → Webhooks → Add endpoint:
 *   https://queueup.me/api/webhooks/stripe
 *
 * Events we listen for (skeleton — business logic TBD when card collection
 * + subscription creation UI ships):
 *   - customer.subscription.created      → set Shop.stripeSubscriptionId
 *   - customer.subscription.updated      → sync subscriptionActive
 *   - customer.subscription.deleted      → mark Shop inactive
 *   - invoice.payment_succeeded          → extend paidUntil
 *   - invoice.payment_failed             → flag for dunning
 *   - customer.deleted                   → clear Shop.stripeCustomerId
 */

// Disable Next's body parsing — Stripe signature check needs the raw body
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    logger.error("STRIPE_WEBHOOK_SECRET is not set — webhook ignored", "stripe:webhook");
    return NextResponse.json({ received: false }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    logger.error("Stripe webhook signature verification failed", "stripe:webhook", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency: Stripe sends the same event ID on retries. For v1 we just log
  // duplicate IDs — a proper event-log table can come later if needed.
  logger.info(`Stripe event: ${event.type} (${event.id})`, "stripe:webhook");

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreated(sub);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(sub);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(sub);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      case "customer.deleted": {
        const customer = event.data.object as Stripe.Customer;
        await handleCustomerDeleted(customer);
        break;
      }

      default:
        // Skeleton: unknown event types are no-ops. As we wire up more flows
        // (refunds, disputes, etc.), add cases here.
        break;
    }
  } catch (err) {
    logger.error(`Stripe webhook handler failed for ${event.type}`, "stripe:webhook", err);
    // Return 500 so Stripe retries. Stripe stops retrying after ~3 days of failures.
    return NextResponse.json({ received: false, error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ── Handlers ────────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Subscriptions created via Checkout produce both checkout.session.completed
  // AND customer.subscription.created. We update from both to be defensive.
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (!customerId || !subscriptionId) return;

  const shop = await prisma.shop.findUnique({ where: { stripeCustomerId: customerId }, select: { id: true } });
  if (!shop) {
    logger.warn(`checkout.session.completed for unknown customer ${customerId}`, "stripe:webhook");
    return;
  }
  await prisma.shop.update({
    where: { id: shop.id },
    data: { stripeSubscriptionId: subscriptionId, subscriptionActive: true },
  });
}

async function handleSubscriptionCreated(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const shop = await prisma.shop.findUnique({ where: { stripeCustomerId: customerId }, select: { id: true } });
  if (!shop) {
    logger.warn(`subscription.created for unknown customer ${customerId}`, "stripe:webhook");
    return;
  }
  await prisma.shop.update({
    where: { id: shop.id },
    data: { stripeSubscriptionId: sub.id, subscriptionActive: sub.status === "active" || sub.status === "trialing" },
  });
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const shop = await prisma.shop.findUnique({ where: { stripeCustomerId: customerId }, select: { id: true } });
  if (!shop) return;
  await prisma.shop.update({
    where: { id: shop.id },
    data: {
      stripeSubscriptionId: sub.id,
      subscriptionActive: sub.status === "active" || sub.status === "trialing",
    },
  });
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const shop = await prisma.shop.findUnique({ where: { stripeCustomerId: customerId }, select: { id: true } });
  if (!shop) return;
  await prisma.shop.update({
    where: { id: shop.id },
    data: { stripeSubscriptionId: null, subscriptionActive: false },
  });
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  const shop = await prisma.shop.findUnique({ where: { stripeCustomerId: customerId }, select: { id: true } });
  if (!shop) return;

  const periodEndSec = invoice.lines.data[0]?.period?.end;
  if (periodEndSec) {
    await prisma.shop.update({
      where: { id: shop.id },
      data: { paidUntil: new Date(periodEndSec * 1000), subscriptionActive: true },
    });
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  // Skeleton: dunning is not yet wired. Stripe handles email retries via its
  // configured dunning settings; we just log here.
  logger.warn(`Payment failed for customer ${customerId} — dunning TBD`, "stripe:webhook");
}

async function handleCustomerDeleted(customer: Stripe.Customer) {
  const shop = await prisma.shop.findUnique({ where: { stripeCustomerId: customer.id }, select: { id: true } });
  if (!shop) return;
  await prisma.shop.update({
    where: { id: shop.id },
    data: { stripeCustomerId: null, stripeSubscriptionId: null, subscriptionActive: false },
  });
}
