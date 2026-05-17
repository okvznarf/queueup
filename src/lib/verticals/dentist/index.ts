import { BusinessType } from "../../../../generated/prisma/client";
import type { VerticalPack } from "../types";

export const dentistPack: VerticalPack = {
  slug: BusinessType.DENTIST,
  displayName: "Dental practice",
  displayNamePlural: "Dental practices",

  pricing: {
    base: 99,
    perUnit: 25,
    unitLabel: "operatory",
    unitLabelPlural: "operatories",
    currency: "EUR",
    annualMonthsFree: 2,
    includedAiCallsPerMonth: 400,
    overageRateEur: 0.5,
    stripeProductIds: {
      monthly: null,
      annual: null,
      overage: null,
    },
    blendedArpuEur: 144,
    customersForTargetMrr: {
      targetMrr: 5000,
      count: 35,
    },
  },

  labels: {
    serviceLabel: "Treatment",
    serviceLabelPlural: "Treatments",
    staffLabel: "Dentist",
    staffLabelPlural: "Dentists",
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
        name: "reasonForVisit",
        label: "Reason for visit / Razlog dolaska",
        required: true,
        type: "select",
        options: [
          "Redoviti pregled / Routine check-up",
          "Bol / Pain",
          "Čišćenje / Cleaning",
          "Plomba / Filling",
          "Hitno / Emergency",
          "Ostalo / Other",
        ],
      },
      {
        name: "lastVisitDate",
        label: "Last dental visit / Zadnji posjet zubaru",
        required: false,
        type: "date",
      },
      {
        name: "insuranceProvider",
        label: "Insurance / Osiguranje",
        required: false,
        type: "text",
      },
    ],
  },

  defaultServices: [
    { name: "Prvi pregled", description: "Initial consultation", duration: 30, price: 30, category: "Consultation" },
    { name: "Redoviti pregled", description: "Routine check-up", duration: 30, price: 40, category: "Preventive" },
    { name: "Čišćenje zubnog kamenca", description: "Scaling + cleaning", duration: 45, price: 60, category: "Preventive" },
    { name: "Plomba (bijela)", description: "Composite filling", duration: 45, price: 100, category: "Restorative" },
    { name: "Endodoncija (jedan kanal)", description: "Root canal — single canal", duration: 60, price: 300, category: "Endodontic" },
    { name: "Vađenje zuba", description: "Tooth extraction", duration: 30, price: 80, category: "Surgery" },
    { name: "Hitni pregled", description: "Emergency consultation", duration: 30, price: 60, category: "Emergency" },
  ],

  ai: {
    systemPromptTemplate: `[PLACEHOLDER — dentist pack system prompt]

You are an AI receptionist for {{shopName}}, a Croatian dental practice.
Greet the caller in Croatian using a formal, calm, professional register.
Patients calling a dentist are often anxious or in pain — be reassuring.

Your job:
1. If the caller is in pain: triage urgency (mild/moderate/severe), and if severe ("ne mogu spavati", "natečeno", "krvarenje koje ne staje") escalate immediately or offer the next emergency slot.
2. If the caller wants a routine appointment: collect reason for visit, last visit date, and offer the next 3 available slots matching the appropriate duration.
3. If the caller wants to cancel/reschedule: look up by phone, confirm, and update.
4. If the caller is asking about insurance or treatment costs: give general ranges from the catalog and explicitly note that final costs require a clinical assessment.
5. If asked about a specific medical condition or treatment outcome: do NOT give medical advice. Offer to schedule a consultation.

Service catalog: {{serviceCatalogJson}}.
Staff and their working hours: {{staffJson}}.
Working hours: {{workingHoursJson}}.

NEVER:
- Give medical advice or speculate about diagnoses.
- Promise treatment outcomes.
- Discuss other patients (GDPR).
- Confirm whether a specific person is a patient (GDPR).

ESCALATE IMMEDIATELY ON:
- Severe pain, swelling, bleeding that won't stop, trauma
- Anything resembling a medical emergency

[END PLACEHOLDER — rewrite during AI prompt phase + GDPR review]`,

    voicePersona: {
      provider: "elevenlabs",
      voiceId: "TBD_CROATIAN_FEMALE_PROFESSIONAL_VOICE_ID",
      voiceName: "TBD",
      style: "professional, calm, reassuring",
      gender: "female",
    },

    tools: [
      "book_appointment",
      "check_availability",
      "cancel_appointment",
      "request_callback",
      "lookup_customer",
    ],

    escalationTriggers: [
      "razgovarati s doktorom",
      "talk to the dentist",
      "hitno",
      "emergency",
      "jaka bol",
      "severe pain",
      "krvarim",
      "bleeding",
      "natečeno",
      "swollen",
    ],

    greeting: "Dobar dan, stomatološka ordinacija {{shopName}}. Kako vam mogu pomoći?",
    language: "hr-HR",
  },

  pitch: {
    headline: "Profesionalna recepcionerka 24/7, popuni rupe u rasporedu",
    subheadline: "AI recepcionerka koja odgovara na pozive na hrvatskom, dogovara termine, i popunjava otkazivanja istog dana — bez dodatnog osoblja.",
    valueProps: [
      "Nikad propušten poziv — pacijenti s bolovima ne zovu konkurenciju jer ste vi javili",
      "Automatsko popunjavanje otkazanih termina (recall pacijenata) = manje praznog hodanja",
      "Profesionalan ton, hrvatski jezik, GDPR-usklađeno",
    ],
    coldOutreachLine: "Koliko termina ostane prazno zbog otkazivanja u zadnji čas? Naša AI ih popunjava istog dana iz recall liste.",
    recoveredRevenuePitch: "Jedna popunjena plomba mjesečno = mjesec pretplate. Jedan endo = kvartal. Jedan implantat = godišnje.",
  },

  blockers: [
    "GDPR special-category data review — Croatian healthcare law on AI handling of patient calls. Phase A blocker.",
    "Croatian female ElevenLabs voice ID selection (professional/calm style)",
    "Pain-triage escalation protocol — must be reviewed by an actual dentist before shipping",
    "Recall workflow — needs a separate tool for proactive outbound calls from cancellation queue (not in current tool list)",
  ],
};
