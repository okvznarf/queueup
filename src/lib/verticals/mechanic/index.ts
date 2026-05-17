import { BusinessType } from "../../../../generated/prisma/client";
import type { VerticalPack } from "../types";

export const mechanicPack: VerticalPack = {
  slug: BusinessType.MECHANIC,
  displayName: "Auto repair shop",
  displayNamePlural: "Auto repair shops",

  pricing: {
    base: 59,
    perUnit: 10,
    unitLabel: "mechanic",
    unitLabelPlural: "mechanics",
    currency: "EUR",
    annualMonthsFree: 2,
    includedAiCallsPerMonth: 300,
    overageRateEur: 0.5,
    stripeProductIds: {
      monthly: null,
      annual: null,
      overage: null,
    },
    blendedArpuEur: 80,
    customersForTargetMrr: {
      targetMrr: 5000,
      count: 63,
    },
  },

  labels: {
    serviceLabel: "Service",
    serviceLabelPlural: "Services",
    staffLabel: "Mechanic",
    staffLabelPlural: "Mechanics",
    bookingLabel: "Drop-off",
    bookingLabelPlural: "Drop-offs",
  },

  bookingModel: "DROP_OFF_WINDOW",

  intake: {
    showVehicleInfo: true,
    showLicensePlate: true,
    showPartySize: false,
    requirePhone: true,
    customFields: [
      {
        name: "symptomDescription",
        label: "What's the problem? / Što je problem?",
        required: false,
        type: "textarea",
      },
    ],
  },

  defaultServices: [
    { name: "Izmjena ulja i filtera", description: "Oil + filter change", duration: 60, price: 70, category: "Maintenance" },
    { name: "Disk pločice (prednje)", description: "Front brake pads", duration: 120, price: 90, category: "Brakes" },
    { name: "Geometrija kotača", description: "Wheel alignment", duration: 60, price: 50, category: "Maintenance" },
    { name: "Izmjena guma", description: "Tire swap (seasonal)", duration: 45, price: 30, category: "Tires" },
    { name: "Dijagnostika", description: "OBD-II diagnostic scan", duration: 30, price: 40, category: "Diagnostics" },
    { name: "Klima servis", description: "AC service + refill", duration: 60, price: 80, category: "AC" },
  ],

  ai: {
    systemPromptTemplate: `[PLACEHOLDER — mechanic pack system prompt]

You are an AI receptionist for {{shopName}}, a Croatian auto repair shop.
Greet the caller in Croatian. Be warm but efficient — mechanics are busy.

Your job:
1. If the caller wants to drop off a car: collect plate number, make/model, symptom, and offer a drop-off day (NOT a time slot — multi-day jobs are normal).
2. If the caller is asking about repair status: look up their plate, give the current status, offer a callback when done.
3. If the caller wants a quote: collect what they want done, give a rough range based on the service catalog, and tell them final pricing requires inspection.
4. If unsure or caller wants to talk to a person: escalate.

Service catalog and prices are in {{serviceCatalogJson}}.
Working hours: {{workingHoursJson}}.

NEVER:
- Promise a fixed price without seeing the car.
- Commit to a specific finish time for multi-day jobs.
- Give medical or legal advice (e.g., about driving an unsafe vehicle — escalate).

[END PLACEHOLDER — rewrite during AI prompt phase]`,

    voicePersona: {
      provider: "elevenlabs",
      voiceId: "TBD_CROATIAN_MALE_VOICE_ID",
      voiceName: "TBD",
      style: "warm, casual, confident",
      gender: "male",
    },

    tools: [
      "book_dropoff",
      "check_repair_status",
      "request_quote",
      "request_callback",
      "lookup_customer",
    ],

    escalationTriggers: [
      "razgovarati s mehaničarom",
      "talk to a mechanic",
      "talk to a person",
      "hitno",
      "emergency",
      "tow",
      "vučna služba",
    ],

    greeting: "Dobar dan, ovo je {{shopName}}. Kako vam mogu pomoći?",
    language: "hr-HR",
  },

  pitch: {
    headline: "Telefon javlja umjesto vas, dok ste pod autom",
    subheadline: "AI recepcionerka koja preuzima pozive, dogovara dolaske i javlja kupcima kad je auto gotov.",
    valueProps: [
      "Nikad više propušten poziv — AI radi 24/7",
      "Manje prekida u radu — ne morate spuštati alat za 'je li auto gotov?'",
      "Automatski podsjetnici klijentima kad je auto spreman za podizanje",
    ],
    coldOutreachLine: "Koliko poziva ste propustili prošli tjedan? Pri 200€ po kočnicama, vi mi recite isplati li se.",
    recoveredRevenuePitch: "Jedna popravljena kočnica = 4-5 mjeseci pretplate. Jedna kvačila = cijela godina.",
  },

  blockers: [
    "Booking model validation: 5-10 Zagreb shops phone audit — confirm drop-off-window assumption before AI prompt content is finalized",
    "Croatian male ElevenLabs voice ID selection",
  ],
};
