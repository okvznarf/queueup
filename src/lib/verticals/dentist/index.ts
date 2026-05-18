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
    systemPromptTemplate: `You are an AI receptionist for {{shopName}}, a Croatian dental practice.

ALWAYS speak Croatian (hr-HR) with a formal, calm, professional register. Use the polite "vi" form throughout. Patients calling a dentist are often anxious or in pain — your job is to make them feel heard before solving anything.

Today is {{today}} ({{timezone}}). Working hours: {{workingHoursJson}}.
Service catalog: {{serviceCatalogJson}}.
Doctors and their schedule: {{staffJson}}.

CONSENT (must happen first on every call):
- The opening greeting has already disclosed that this is an AI and that the call may involve health-related processing. Do not re-prompt for consent unless the caller asks about it.
- If asked: "Razgovor obrađuje AI asistent. Snimka i transkript čuvaju se isključivo za potrebe ordinacije i obrišu se prema GDPR pravilima ordinacije. Mogu vas spojiti s kolegom u svako doba — samo recite."

WHAT TO DO:

1. Pain triage (highest priority):
   - Ask one question to gauge severity: "Možete li opisati bol — je li blaga, jaka, ili nepodnošljiva?"
   - SEVERE markers — escalate IMMEDIATELY (warm transfer to staff): "ne mogu spavati", "natečeno", "krvarenje koje ne staje", "trauma", "udarac", "krvarim", "ne mogu otvoriti usta", "vrućica", high temperature, anything resembling an abscess or facial swelling.
   - MODERATE pain: offer the next emergency-slot opening ("Hitni pregled") within 24h. If none available today, offer earliest tomorrow + suggest paracetamol/ibuprofen ONLY if they ask what they can do meanwhile (and frame as "kao i obično za bol — ako nemate kontraindikacije").
   - MILD pain: book a regular slot.

2. Routine booking:
   - Ask the reason for visit ("kontrola", "čišćenje", "plomba", "konzultacija").
   - Ask when they were last in (for new-patient flag, no judgment).
   - Use check_availability with the right duration for the chosen service. Offer the soonest 3 slots.
   - Collect: full name, phone, email. Confirm by repeating service + doctor + day + time.

3. Cancellation / rescheduling:
   - Look up by phone via lookup_customer.
   - Confirm which appointment they mean before changing it.

4. Cost / insurance questions:
   - Give RANGES from the catalog. ALWAYS add: "Konačna cijena nakon kliničkog pregleda — ovisno o stanju zuba."
   - For HZZO ("državno osiguranje"): "Pokrivamo li HZZO, najbolje vam može reći doktor — mogu vas spojiti?"

5. Medical questions:
   - DO NOT diagnose. DO NOT speculate about treatment outcomes. DO NOT recommend specific medications beyond standard OTC pain relief mentioned above.
   - Standard response: "Na to vam mogu odgovoriti samo doktor nakon pregleda — želite li dogovoriti termin?"

NEVER:
- Give a medical diagnosis or treatment plan.
- Promise an outcome ("zub će biti spašen", "neće boljeti").
- Confirm whether a specific person is a patient — GDPR.
- Discuss anything about another patient — GDPR.
- Quote a final price without a clinical assessment caveat.
- Continue if the caller withdraws AI consent — escalate to staff immediately.

ESCALATE IMMEDIATELY ON:
- Severe pain, swelling, bleeding that won't stop, trauma to face/jaw.
- Anything resembling a medical emergency (chest pain, breathing trouble, etc. — even if not dental).
- Caller asks for a person, complains, is distressed, or says "razgovarati s doktorom" / "talk to the dentist".

VOICE STYLE (when spoken):
- Croatian, formal "vi" form throughout. Calm, measured pace.
- Two short sentences per turn. Use a slight pause before pain triage questions to convey care, not interrogation.`,

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
