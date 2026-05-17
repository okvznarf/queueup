import Stripe from "stripe";
import { getPack, supportedBusinessTypes } from "@/lib/verticals";
import type { VerticalPack } from "@/lib/verticals";
import { logger } from "@/lib/logger";
import { BusinessType } from "../../generated/prisma/client";

/**
 * Stripe integration for QueueUp v3 multi-vertical billing.
 *
 * Pricing model (Option B):
 *   Each vertical has 3 Stripe products created by the setup script:
 *   - Base monthly       (recurring, fixed €X/mo)
 *   - Base annual        (recurring, fixed €(X×10)/yr — "2 months free")
 *   - Per-unit monthly   (recurring, €Y per quantity — represents mechanics/chairs/operatories)
 *   - AI overage         (metered, €Z per usage record — pushed by usage cron)
 *
 *   A subscription is built from: 1 base + 1 per-unit (quantity = staff count) + 1 metered overage.
 *
 * Why product metadata over hardcoded IDs:
 *   We tag each Stripe product with `qu_pack` and `qu_kind` metadata so the setup script
 *   is idempotent and code can find products without re-storing IDs in the pack files.
 *   stripeProductIds in pack files is a convenience cache for fast lookup at subscription
 *   creation; the setup script populates it.
 */

let _client: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _client = new Stripe(key);
  }
  return _client;
}

export interface CreateStripeCustomerInput {
  shopId: string;
  email: string;
  name: string;
  metadata?: Record<string, string>;
}

/**
 * Creates a Stripe Customer for a shop. Idempotent at the metadata level
 * (`metadata.shopId` identifies the customer).
 */
export async function createStripeCustomer(input: CreateStripeCustomerInput): Promise<string> {
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: input.email,
    name: input.name,
    metadata: {
      ...(input.metadata ?? {}),
      shopId: input.shopId,
      source: "queueup-v3-onboarding",
    },
  });
  return customer.id;
}

export type PackProductKind = "base_monthly" | "base_annual" | "per_unit_monthly" | "overage";

/**
 * Looks up a Stripe Product by metadata (qu_pack + qu_kind). Used by the setup
 * script to be idempotent and by subscription creation to avoid stale IDs.
 */
export async function findProductByPackKind(
  pack: BusinessType,
  kind: PackProductKind,
): Promise<Stripe.Product | null> {
  const stripe = getStripe();
  const products = await stripe.products.search({
    query: `metadata['qu_pack']:'${pack}' AND metadata['qu_kind']:'${kind}'`,
    limit: 1,
  });
  return products.data[0] ?? null;
}

/**
 * Creates Stripe Products + Prices for one vertical pack, idempotently.
 * Returns the four created/found product IDs. Safe to re-run; will skip
 * existing products and prices.
 */
export async function setupProductsForPack(pack: VerticalPack): Promise<{
  baseMonthlyProductId: string;
  baseAnnualProductId: string;
  perUnitMonthlyProductId: string;
  overageProductId: string;
  baseMonthlyPriceId: string;
  baseAnnualPriceId: string;
  perUnitMonthlyPriceId: string;
  overagePriceId: string;
}> {
  const stripe = getStripe();

  // Helper: find or create product
  async function ensureProduct(kind: PackProductKind, name: string, description: string) {
    const existing = await findProductByPackKind(pack.slug, kind);
    if (existing) {
      logger.info(`Stripe product exists: ${pack.slug} ${kind} (${existing.id})`, "stripe:setup");
      return existing;
    }
    const created = await stripe.products.create({
      name,
      description,
      metadata: { qu_pack: pack.slug, qu_kind: kind },
    });
    logger.info(`Stripe product created: ${pack.slug} ${kind} (${created.id})`, "stripe:setup");
    return created;
  }

  // Helper: find or create price under a product
  async function ensurePrice(
    product: Stripe.Product,
    priceId: string,
    create: () => Promise<Stripe.Price>,
  ) {
    const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
    const match = prices.data.find((p) => p.metadata.qu_price_id === priceId);
    if (match) {
      logger.info(`Stripe price exists: ${product.metadata.qu_pack} ${priceId}`, "stripe:setup");
      return match;
    }
    const created = await create();
    logger.info(`Stripe price created: ${product.metadata.qu_pack} ${priceId} (${created.id})`, "stripe:setup");
    return created;
  }

  // Products
  const baseMonthly = await ensureProduct(
    "base_monthly",
    `QueueUp ${pack.displayName} — Monthly`,
    `Monthly subscription for ${pack.displayNamePlural.toLowerCase()}: AI receptionist, booking page, ${pack.pricing.includedAiCallsPerMonth} included AI calls/mo.`,
  );
  const baseAnnual = await ensureProduct(
    "base_annual",
    `QueueUp ${pack.displayName} — Annual`,
    `Annual subscription (2 months free) for ${pack.displayNamePlural.toLowerCase()}.`,
  );
  const perUnitMonthly = await ensureProduct(
    "per_unit_monthly",
    `QueueUp ${pack.displayName} — Per ${pack.pricing.unitLabel}`,
    `Per-${pack.pricing.unitLabel} surcharge billed monthly with the base subscription.`,
  );
  const overage = await ensureProduct(
    "overage",
    `QueueUp ${pack.displayName} — AI call overage`,
    `Per-call charge applied to AI calls beyond your plan's monthly quota.`,
  );

  // Prices
  const baseMonthlyPrice = await ensurePrice(baseMonthly, "base_monthly", () =>
    stripe.prices.create({
      product: baseMonthly.id,
      currency: pack.pricing.currency.toLowerCase(),
      unit_amount: Math.round(pack.pricing.base * 100),
      recurring: { interval: "month" },
      metadata: { qu_price_id: "base_monthly", qu_pack: pack.slug },
    }),
  );

  const annualAmount = Math.round(pack.pricing.base * 100) * (12 - pack.pricing.annualMonthsFree);
  const baseAnnualPrice = await ensurePrice(baseAnnual, "base_annual", () =>
    stripe.prices.create({
      product: baseAnnual.id,
      currency: pack.pricing.currency.toLowerCase(),
      unit_amount: annualAmount,
      recurring: { interval: "year" },
      metadata: { qu_price_id: "base_annual", qu_pack: pack.slug },
    }),
  );

  const perUnitMonthlyPrice = await ensurePrice(perUnitMonthly, "per_unit_monthly", () =>
    stripe.prices.create({
      product: perUnitMonthly.id,
      currency: pack.pricing.currency.toLowerCase(),
      unit_amount: Math.round(pack.pricing.perUnit * 100),
      recurring: { interval: "month" },
      metadata: { qu_price_id: "per_unit_monthly", qu_pack: pack.slug },
    }),
  );

  const overagePrice = await ensurePrice(overage, "overage", () =>
    stripe.prices.create({
      product: overage.id,
      currency: pack.pricing.currency.toLowerCase(),
      unit_amount: Math.round(pack.pricing.overageRateEur * 100),
      recurring: { interval: "month", usage_type: "metered" },
      metadata: { qu_price_id: "overage", qu_pack: pack.slug },
    }),
  );

  return {
    baseMonthlyProductId: baseMonthly.id,
    baseAnnualProductId: baseAnnual.id,
    perUnitMonthlyProductId: perUnitMonthly.id,
    overageProductId: overage.id,
    baseMonthlyPriceId: baseMonthlyPrice.id,
    baseAnnualPriceId: baseAnnualPrice.id,
    perUnitMonthlyPriceId: perUnitMonthlyPrice.id,
    overagePriceId: overagePrice.id,
  };
}

export async function setupAllPacks(): Promise<Record<string, Awaited<ReturnType<typeof setupProductsForPack>>>> {
  const result: Record<string, Awaited<ReturnType<typeof setupProductsForPack>>> = {};
  for (const businessType of supportedBusinessTypes()) {
    const pack = getPack(businessType);
    if (!pack) continue;
    result[businessType] = await setupProductsForPack(pack);
  }
  return result;
}

/**
 * Creates a Stripe Subscription for a shop. Requires the Customer to have a
 * default payment method set (collected via Stripe Elements or Customer Portal).
 *
 * NOT YET CALLED from anywhere in the app — card collection UI is the missing
 * piece. Use this as the building block once you ship card collection.
 */
export interface CreateSubscriptionInput {
  customerId: string;
  pack: VerticalPack;
  billingCycle: "monthly" | "annual";
  unitQuantity: number; // staff count
}

export async function createSubscription(input: CreateSubscriptionInput): Promise<Stripe.Subscription> {
  const stripe = getStripe();

  const baseProduct = await findProductByPackKind(
    input.pack.slug,
    input.billingCycle === "annual" ? "base_annual" : "base_monthly",
  );
  const perUnitProduct = input.billingCycle === "monthly"
    ? await findProductByPackKind(input.pack.slug, "per_unit_monthly")
    : null;
  const overageProduct = await findProductByPackKind(input.pack.slug, "overage");

  if (!baseProduct) throw new Error(`Stripe product missing: ${input.pack.slug} base`);
  if (!overageProduct) throw new Error(`Stripe product missing: ${input.pack.slug} overage`);

  const basePrice = await findPriceForProduct(baseProduct.id, input.billingCycle === "annual" ? "base_annual" : "base_monthly");
  const perUnitPrice = perUnitProduct ? await findPriceForProduct(perUnitProduct.id, "per_unit_monthly") : null;
  const overagePrice = await findPriceForProduct(overageProduct.id, "overage");

  if (!basePrice) throw new Error(`Stripe price missing: ${input.pack.slug} base`);
  if (!overagePrice) throw new Error(`Stripe price missing: ${input.pack.slug} overage`);

  const items: Stripe.SubscriptionCreateParams.Item[] = [{ price: basePrice.id }];
  if (perUnitPrice && input.unitQuantity > 0) {
    items.push({ price: perUnitPrice.id, quantity: input.unitQuantity });
  }
  items.push({ price: overagePrice.id });

  return stripe.subscriptions.create({
    customer: input.customerId,
    items,
    metadata: {
      qu_pack: input.pack.slug,
      qu_billing_cycle: input.billingCycle,
    },
  });
}

async function findPriceForProduct(productId: string, quPriceId: string): Promise<Stripe.Price | null> {
  const stripe = getStripe();
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 10 });
  return prices.data.find((p) => p.metadata.qu_price_id === quPriceId) ?? null;
}

/**
 * Creates a Stripe Checkout Session for a shop to add a payment method and
 * subscribe. Uses subscription mode with three line items: base, per-unit
 * (quantity = staff count), and metered overage.
 *
 * Trial-end behavior: if the shop is still in its 30-day trial, the subscription
 * inherits the remaining trial via `subscription_data.trial_end`. After the
 * trial ends Stripe automatically starts billing.
 *
 * Returns the Checkout Session URL — caller should redirect the browser.
 */
export async function createCheckoutSession(input: {
  customerId: string;
  pack: VerticalPack;
  billingCycle: "monthly" | "annual";
  unitQuantity: number;
  trialEndsAt: Date | null;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ id: string; url: string }> {
  const stripe = getStripe();

  const baseProduct = await findProductByPackKind(
    input.pack.slug,
    input.billingCycle === "annual" ? "base_annual" : "base_monthly",
  );
  const perUnitProduct = input.billingCycle === "monthly"
    ? await findProductByPackKind(input.pack.slug, "per_unit_monthly")
    : null;
  const overageProduct = await findProductByPackKind(input.pack.slug, "overage");

  if (!baseProduct) throw new Error(`Stripe product missing: ${input.pack.slug} base`);
  if (!overageProduct) throw new Error(`Stripe product missing: ${input.pack.slug} overage`);

  const basePrice = await findPriceForProduct(
    baseProduct.id,
    input.billingCycle === "annual" ? "base_annual" : "base_monthly",
  );
  const perUnitPrice = perUnitProduct ? await findPriceForProduct(perUnitProduct.id, "per_unit_monthly") : null;
  const overagePrice = await findPriceForProduct(overageProduct.id, "overage");

  if (!basePrice) throw new Error(`Stripe price missing: ${input.pack.slug} base`);
  if (!overagePrice) throw new Error(`Stripe price missing: ${input.pack.slug} overage`);

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    { price: basePrice.id, quantity: 1 },
  ];
  if (perUnitPrice && input.unitQuantity > 0) {
    lineItems.push({ price: perUnitPrice.id, quantity: input.unitQuantity });
  }
  lineItems.push({ price: overagePrice.id });

  const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
    metadata: {
      qu_pack: input.pack.slug,
      qu_billing_cycle: input.billingCycle,
    },
  };

  // If trial hasn't ended yet, pass through to Stripe so they continue free
  // until the same date. Otherwise Stripe starts billing immediately.
  if (input.trialEndsAt && input.trialEndsAt > new Date()) {
    subscriptionData.trial_end = Math.floor(input.trialEndsAt.getTime() / 1000);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: input.customerId,
    line_items: lineItems,
    subscription_data: subscriptionData,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    allow_promotion_codes: true,
  });

  if (!session.url) {
    throw new Error("Stripe Checkout returned no URL");
  }
  return { id: session.id, url: session.url };
}

/**
 * Creates a Stripe Billing Portal Session — Stripe-hosted UI where the owner
 * can update their card, see invoices, change billing cycle, or cancel.
 *
 * Requires the Stripe Billing Portal to be configured once in the dashboard:
 * Settings → Billing → Customer portal.
 */
export async function createBillingPortalSession(input: {
  customerId: string;
  returnUrl: string;
}): Promise<{ url: string }> {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: input.customerId,
    return_url: input.returnUrl,
  });
  return { url: session.url };
}

/**
 * Pushes AI call overage usage to a shop's metered subscription item.
 * Called by the monthly usage cron at billing period end.
 *
 * NOT YET CALLED — wire into a new cron once card collection + subscription
 * creation is in place.
 */
export async function pushOverageUsage(input: {
  subscriptionId: string;
  packSlug: BusinessType;
  overageCalls: number;
  timestamp?: Date;
}): Promise<void> {
  if (input.overageCalls <= 0) return;

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(input.subscriptionId, {
    expand: ["items.data.price.product"],
  });

  const meteredItem = subscription.items.data.find((item) => {
    const product = item.price.product as Stripe.Product;
    return product?.metadata?.qu_kind === "overage";
  });

  if (!meteredItem) {
    throw new Error(`No metered overage item on subscription ${input.subscriptionId}`);
  }

  // Stripe SDK v20+: usage records are namespaced under subscriptionItems
  // @ts-expect-error — usage_records is a valid SDK property
  await stripe.subscriptionItems.createUsageRecord(meteredItem.id, {
    quantity: input.overageCalls,
    timestamp: Math.floor((input.timestamp ?? new Date()).getTime() / 1000),
    action: "set",
  });

  logger.info(
    `Pushed ${input.overageCalls} overage calls to Stripe item ${meteredItem.id}`,
    "stripe:usage",
  );
}
