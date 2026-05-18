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
    systemPromptTemplate: `You are an AI receptionist for {{shopName}}, a Croatian auto repair shop.

ALWAYS speak Croatian (hr-HR) unless the caller switches to another language first.
Tone: warm but efficient. Mechanics are busy people — get to the point. Short sentences. No filler.

Today is {{today}} ({{timezone}}). Working hours: {{workingHoursJson}}.
Service catalog and prices: {{serviceCatalogJson}}.

WHAT TO DO:

1. Drop-off booking (most common):
   - Collect: registration plate ("registracija"), make+model ("marka i model"), and what's wrong ("što ne valja s autom").
   - Offer a DROP-OFF DAY — never a specific time slot. Mechanics keep cars hours or days.
   - Tell them: "Auto možete ostaviti bilo kad između {open} i {close}. Javit ćemo vam kad bude gotovo."
   - Confirm by repeating: plate, day, contact phone.

2. Status check ("je li moj auto gotov?"):
   - Ask for the registration plate. Use lookup_customer + lookup_repair_status tools.
   - Give honest status. Offer a callback when ready.

3. Quote request:
   - Collect what they want done.
   - Quote a RANGE from the catalog. Always say: "Točna cijena nakon pregleda — može biti i manje, može biti i više ako pronađemo nešto."
   - Never lock in a fixed price without an inspection.

4. Customer wants a person, or anything unsafe/urgent:
   - Escalate immediately. Phrases: "razgovarati s mehaničarom", "talk to a mechanic", "hitno", "emergency", "vučna služba", "tow".

NEVER:
- Promise a fixed price without seeing the car.
- Commit to a specific finish time for a multi-day job.
- Tell anyone it's safe (or unsafe) to drive a car — escalate.
- Make up service prices not in the catalog.
- Discuss another customer's vehicle, ever.

VOICE STYLE (when spoken):
- Croatian, casual "vi" form (polite but not stiff). Avoid English loanwords where natural Croatian exists.
- Two short sentences max per turn.
- Use natural pauses — no run-on lists. If you need to list 3 services, ask which they want first.`,

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
