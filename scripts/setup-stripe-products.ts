/**
 * One-time setup script: creates the Stripe Products + Prices for every v3
 * vertical pack (mechanic, barber, dentist). Idempotent — safe to re-run.
 *
 * Usage:
 *   npm run setup-stripe
 *
 * Prerequisites:
 *   - STRIPE_SECRET_KEY set in .env (use a test key first)
 *   - Stripe account with metered billing enabled
 *
 * After running:
 *   - Output prints the resolved product/price IDs per pack
 *   - You can paste these IDs into the pack files if you want them visible
 *     in code (optional — code looks them up by metadata at subscription time)
 */
import "dotenv/config";
import { setupAllPacks } from "../src/lib/stripe";

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("\n[setup-stripe] STRIPE_SECRET_KEY is not set in .env\n");
    process.exit(1);
  }

  const isTestKey = process.env.STRIPE_SECRET_KEY.startsWith("sk_test_");
  console.log(`\n[setup-stripe] Using ${isTestKey ? "TEST" : "LIVE"} Stripe key.\n`);
  if (!isTestKey) {
    console.log("[setup-stripe] WARNING: You are running this against a LIVE Stripe key.");
    console.log("[setup-stripe] If that's not intended, abort with Ctrl-C now.\n");
    await new Promise((r) => setTimeout(r, 4000));
  }

  console.log("[setup-stripe] Creating products for all v3 packs...\n");

  const result = await setupAllPacks();

  console.log("\n[setup-stripe] Done. Resolved IDs:\n");
  for (const [pack, ids] of Object.entries(result)) {
    console.log(`  ${pack}:`);
    console.log(`    base monthly       price = ${ids.baseMonthlyPriceId}`);
    console.log(`    base annual        price = ${ids.baseAnnualPriceId}`);
    console.log(`    per-unit monthly   price = ${ids.perUnitMonthlyPriceId}`);
    console.log(`    overage (metered)  price = ${ids.overagePriceId}`);
    console.log("");
  }

  console.log("[setup-stripe] These IDs are also discoverable at runtime via product metadata");
  console.log("[setup-stripe] (qu_pack + qu_kind tags). You don't strictly need to copy them.\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("\n[setup-stripe] FAILED:", err);
  process.exit(1);
});
