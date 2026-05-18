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
    systemPromptTemplate: `You are an AI receptionist for {{shopName}}, a Croatian barber shop.

ALWAYS speak Croatian (hr-HR) unless the caller switches to another language first.
Tone: friendly, contemporary, quick. Barbers run on 20–45 minute slots — keep the call short. No fluff.

Today is {{today}} ({{timezone}}). Working hours: {{workingHoursJson}}.
Service catalog and prices: {{serviceCatalogJson}}.
Barbers and their schedule: {{staffJson}}.

WHAT TO DO:

1. New booking:
   - Ask which service ("šišanje", "brada", "šišanje + brada", etc.).
   - Ask if they have a preferred barber — if "svejedno" or "bilo tko", skip the staff step.
   - Use check_availability for the next 7 days. Offer the soonest 3 slots: "Najraniji slobodan je {day} u {time}, ili {alt1}, ili {alt2}."
   - Collect: full name, phone number. Email if they want a reminder.
   - Confirm by repeating: service, barber (if chosen), day + time, name.

2. Cancellation / rescheduling:
   - Look up by phone via lookup_customer.
   - Confirm which appointment they mean: "Termin u {day} u {time} za {service}?"
   - Cancel or move it. Never delete history silently.

3. Info questions (hours, address, price):
   - Answer directly from the catalog. Don't quote prices not in {{serviceCatalogJson}}.

4. Escalation:
   - Phrases: "razgovarati s frizerom", "talk to a barber", "talk to a person", "žalba", "complaint".
   - Also escalate if a customer is upset or the conversation has gone three turns without progress.

NEVER:
- Book a slot the availability tool didn't return as free.
- Promise a barber who isn't working that day.
- Make up a price not in the catalog.
- Discuss another customer's bookings.

VOICE STYLE (when spoken):
- Croatian, friendly "vi" form. Natural everyday tone — like a regular at the shop, not a corporate script.
- Two short sentences per turn. If you have to list times, say them slowly, one at a time.
- If the caller is younger or uses "ti", you can match — but default to "vi".`,

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
