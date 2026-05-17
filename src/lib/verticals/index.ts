import { BusinessType } from "../../../generated/prisma/client";
import type { VerticalPack } from "./types";
import { mechanicPack } from "./mechanic";
import { barberPack } from "./barber";
import { dentistPack } from "./dentist";

const registry: Partial<Record<BusinessType, VerticalPack>> = {
  [BusinessType.MECHANIC]: mechanicPack,
  [BusinessType.BARBER]: barberPack,
  [BusinessType.DENTIST]: dentistPack,
};

/**
 * Look up the vertical pack for a shop's businessType.
 * Returns null for business types without a v3-launch pack (RESTAURANT,
 * SALON, SPA, FITNESS, VETERINARY, OTHER) — callers must handle this.
 */
export function getPack(businessType: BusinessType): VerticalPack | null {
  return registry[businessType] ?? null;
}

/**
 * Same as getPack but throws if no pack exists. Use in code paths where
 * the shop is guaranteed to have a v3 pack (e.g., post-onboarding paths
 * that gate on pack availability).
 */
export function requirePack(businessType: BusinessType): VerticalPack {
  const pack = getPack(businessType);
  if (!pack) {
    throw new Error(`No vertical pack available for businessType=${businessType}`);
  }
  return pack;
}

/**
 * BusinessTypes that have a shipping pack in v3. Used by the signup flow's
 * business-type chooser to filter the BusinessType enum to launchable verticals.
 */
export function supportedBusinessTypes(): BusinessType[] {
  return Object.keys(registry) as BusinessType[];
}

export type { VerticalPack } from "./types";
export * from "./types";
