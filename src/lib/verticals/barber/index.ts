import { BusinessType } from "../../../../generated/prisma/client";
import type { VerticalPack } from "../types";

export const barberPack: VerticalPack = {
  slug: BusinessType.BARBER,
  displayName: "Barber shop",
  displayNamePlural: "Barber shops",

  pricing: {
    base: 29,
    perUnit: 7,
    unitLabel: "chair",
    unitLabelPlural: "chairs",
    currency: "EUR",
    annualMonthsFree: 2,
    includedAiCallsPerMonth: 200,
    overageRateEur: 0.3,
    stripeProductIds: {
      monthly: null,
      annual: null,
      overage: null,
    },
    blendedArpuEur: 41,
    customersForTargetMrr: {
      targetMrr: 5000,
      count: 122,
    },
  },

  labels: {
    serviceLabel: "Service",
    serviceLabelPlural: "Services",
    staffLabel: "Barber",
    staffLabelPlural: "Barbers",
    bookingLabel: "Appointment",
    bookingLabelPlural: "Appointments",
  },

  bookingModel: "FIXED_SLOT",

  intake: {
    showVehicleInfo: false,
    showLicensePlate: false,
    showPartySize: false,
    requirePhone: true,
    customFields: [
      {
        name: "preferredStylist",
        label: "Preferred barber / Omiljeni frizer",
        required: false,
        type: "text",
      },
    ],
  },

  defaultServices: [
    { name: "Šišanje", description: "Standard haircut", duration: 30, price: 15, category: "Hair" },
    { name: "Šišanje + brijanje", description: "Cut + beard trim", duration: 45, price: 22, category: "Hair" },
    { name: "Brijanje", description: "Beard trim/shave", duration: 20, price: 10, category: "Beard" },
    { name: "Bojanje", description: "Color", duration: 60, price: 40, category: "Color" },
    { name: "Šišanje djece", description: "Kids haircut (under 12)", duration: 20, price: 10, category: "Hair" },
  ],

  ai: {
    systemPromptTemplate: `[PLACEHOLDER — barber pack system prompt]

You are an AI receptionist for {{shopName}}, a Croatian barber shop.
Greet the caller in Croatian. Be friendly and quick — barbers run on tight slots.

Your job:
1. If the caller wants to book: ask which service, preferred barber (optional), and offer the next 3 available time slots.
2. If the caller wants to cancel or reschedule: look up by phone, confirm, and update.
3. If the caller is asking about hours / location / prices: answer directly from the catalog.
4. If unsure or caller wants to speak to a person: escalate.

Service catalog and prices: {{serviceCatalogJson}}.
Staff and their working hours: {{staffJson}}.
Working hours: {{workingHoursJson}}.

NEVER:
- Book a slot that conflicts with existing appointments.
- Promise a barber who isn't working that day.
- Skip the cancellation policy if one is configured.

[END PLACEHOLDER — rewrite during AI prompt phase]`,

    voicePersona: {
      provider: "elevenlabs",
      voiceId: "TBD_CROATIAN_FEMALE_FRIENDLY_VOICE_ID",
      voiceName: "TBD",
      style: "friendly, contemporary, quick",
      gender: "female",
    },

    tools: [
      "book_appointment",
      "check_availability",
      "cancel_appointment",
      "lookup_customer",
    ],

    escalationTriggers: [
      "razgovarati s frizerom",
      "talk to a barber",
      "talk to a person",
      "žalba",
      "complaint",
    ],

    greeting: "Dobar dan, ovo je {{shopName}}. Kako vam mogu pomoći?",
    language: "hr-HR",
  },

  pitch: {
    headline: "Više rezervacija, manje propuštenih poziva",
    subheadline: "AI recepcionerka koja preuzima pozive na hrvatskom i dogovara termine 24/7 — Booksy ne odgovara na poziv u 8 navečer, mi da.",
    valueProps: [
      "Nikad propušten poziv — AI radi 24/7, čak i tijekom šišanja",
      "Klijenti dobivaju termin odmah, bez čekanja na povratni poziv",
      "Automatski podsjetnici dan prije = manje no-show klijenata",
    ],
    coldOutreachLine: "Koliko poziva ste propustili dok ste šišali ovaj tjedan? Svaki propušteni poziv je 15-25€ koje ste mogli zaraditi.",
    recoveredRevenuePitch: "Jedno šišanje propušteno tjedno = mjesec pretplate. Jedna farba = dva mjeseca.",
  },

  blockers: [
    "Booksy positioning decision: do we replace Booksy or sit alongside it (AI handles calls, pushes bookings to Booksy via integration)? Affects sales pitch + product surface.",
    "Croatian female ElevenLabs voice ID selection (friendly/contemporary style)",
  ],
};
