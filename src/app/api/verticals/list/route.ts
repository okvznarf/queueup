import { NextResponse } from "next/server";
import { getPack, supportedBusinessTypes } from "@/lib/verticals";

/**
 * GET /api/verticals/list
 *
 * Returns minimal pack metadata for the onboarding wizard's business-type
 * chooser: slug, displayName, default services, pricing summary, default
 * working hours (none yet — wizard uses sensible per-vertical fallbacks).
 *
 * Public (no auth) — does not expose system prompts, tools, or anything
 * sensitive. This is the data a prospective customer needs to choose a pack.
 */
export async function GET() {
  const types = supportedBusinessTypes();

  const packs = types
    .map((t) => {
      const p = getPack(t);
      if (!p) return null;
      return {
        slug: p.slug,
        displayName: p.displayName,
        displayNamePlural: p.displayNamePlural,
        bookingModel: p.bookingModel,
        pricing: {
          base: p.pricing.base,
          perUnit: p.pricing.perUnit,
          unitLabel: p.pricing.unitLabel,
          unitLabelPlural: p.pricing.unitLabelPlural,
          currency: p.pricing.currency,
          includedAiCallsPerMonth: p.pricing.includedAiCallsPerMonth,
          overageRateEur: p.pricing.overageRateEur,
        },
        labels: p.labels,
        defaultServices: p.defaultServices,
        intake: {
          showVehicleInfo: p.intake.showVehicleInfo,
          showLicensePlate: p.intake.showLicensePlate,
          showPartySize: p.intake.showPartySize,
        },
        pitch: {
          headline: p.pitch.headline,
          subheadline: p.pitch.subheadline,
        },
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  return NextResponse.json({ packs });
}
