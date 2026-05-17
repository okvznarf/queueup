import type { BusinessType } from "../../../generated/prisma/client";

/**
 * A vertical pack defines everything that varies between business types:
 * pricing, UI labels, booking model, intake fields, default services,
 * AI receptionist persona + tools, marketing copy.
 *
 * The shared platform (auth, billing engine, voice stack, booking page,
 * admin dashboard) is vertical-agnostic and consumes pack data via loader.
 */
export interface VerticalPack {
  slug: BusinessType;
  displayName: string;
  displayNamePlural: string;

  pricing: PricingTier;
  labels: UiLabels;
  bookingModel: BookingModel;
  intake: IntakeSchema;
  defaultServices: DefaultService[];
  ai: AiConfig;
  pitch: MarketingCopy;

  blockers?: string[];
}

export interface PricingTier {
  base: number;
  perUnit: number;
  unitLabel: string;
  unitLabelPlural: string;
  currency: "EUR";
  annualMonthsFree: number;
  /**
   * Number of AI-handled calls included per billing month. Calls beyond this
   * are billed at overageRateEur. A "billable AI call" is currently defined
   * platform-wide as a call >30s with >1 AI turn (filters out hangups +
   * immediate escalations). Definition may move into the pack later.
   */
  includedAiCallsPerMonth: number;
  /** EUR per call charged beyond includedAiCallsPerMonth. */
  overageRateEur: number;
  stripeProductIds: {
    monthly: string | null;
    annual: string | null;
    /** Stripe metered-billing component for AI call overages. */
    overage: string | null;
  };
  blendedArpuEur: number;
  customersForTargetMrr: {
    targetMrr: number;
    count: number;
  };
}

export interface UiLabels {
  serviceLabel: string;
  serviceLabelPlural: string;
  staffLabel: string;
  staffLabelPlural: string;
  bookingLabel: string;
  bookingLabelPlural: string;
}

export type BookingModel = "FIXED_SLOT" | "DROP_OFF_WINDOW" | "QUEUE";

export interface IntakeSchema {
  showVehicleInfo: boolean;
  showPartySize: boolean;
  showLicensePlate: boolean;
  requirePhone: boolean;
  customFields: CustomIntakeField[];
}

export interface CustomIntakeField {
  name: string;
  label: string;
  required: boolean;
  type: "text" | "textarea" | "select" | "date";
  options?: string[];
}

export interface DefaultService {
  name: string;
  description?: string;
  duration: number;
  price: number;
  category?: string;
}

export interface AiConfig {
  systemPromptTemplate: string;
  voicePersona: VoicePersona;
  tools: AiToolName[];
  escalationTriggers: string[];
  greeting: string;
  language: "hr-HR" | "en-US";
}

export interface VoicePersona {
  provider: "elevenlabs";
  voiceId: string;
  voiceName: string;
  style: string;
  gender: "male" | "female";
}

export type AiToolName =
  | "book_appointment"
  | "book_dropoff"
  | "check_availability"
  | "check_repair_status"
  | "request_quote"
  | "cancel_appointment"
  | "lookup_customer"
  | "request_callback";

export interface MarketingCopy {
  headline: string;
  subheadline: string;
  valueProps: string[];
  coldOutreachLine: string;
  recoveredRevenuePitch: string;
}
