# Feature Landscape: AI Receptionist for Healthcare Clinics

**Domain:** AI voice + chat receptionist for dental, GP, physio clinics (EU-first)
**Researched:** 2026-03-28
**Confidence:** MEDIUM (web tools unavailable; based on training data through August 2025 + project context from PROJECT.md)

---

## Table Stakes

Features patients and clinic admins expect. Missing = product feels broken, clinics churn immediately.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Inbound call answering (voice) | Core promise — AI answers when humans can't | High | Twilio Media Streams + ElevenLabs STT/TTS + Claude; latency-critical |
| 24/7 availability | Entire value proposition vs human receptionist | Low (architecture) | No scheduling gaps; must handle overnight voicemail gracefully |
| Appointment booking via voice | Primary job-to-be-done for callers | High | Real-time availability check → confirm → write to booking system |
| Appointment booking via web chat | Patients prefer async; widget embed is expected | High | WebSocket or SSE; embeddable JS snippet |
| Reschedule / cancel existing appointment | ~30% of clinic call volume is changes | Med | Requires patient identity verification before mutation |
| Human handoff / escalation | Patients panic if AI can't transfer them | Med | "Press 0 for staff" or verbal trigger; Twilio warm transfer |
| Clinic FAQ answering | "What are your hours?", "Do you take X insurance?" | Low | Per-clinic knowledge base; structured Q&A store |
| Intake data collection | Reduces admin burden; patients expect this | Med | Name, DOB, phone, email, reason for visit, insurance number |
| Appointment confirmation to patient | Patients expect confirmation after booking | Low | Email/SMS via existing SendGrid/Twilio; fire after booking write |
| Patient identity verification | Clinics can't modify appointments without confirming who's calling | Med | DOB + last name match against existing patient record |
| Voicemail / after-hours message | Graceful fallback when AI can't resolve | Low | Twilio recording; transcript stored; clinic notified |
| GDPR consent disclosure on call | Legally required in EU before data collection | Med | Verbal announcement at call start; logged with timestamp |
| GDPR consent on web chat | Legally required before first message is processed | Low | Consent gate UI before chat window activates |
| Data retention policy (auto-delete) | GDPR Article 5 storage limitation principle | Med | Configurable TTL; cron job deletes transcripts + intake data |
| Patient data deletion on request | GDPR Article 17 right to erasure | Med | Clinic admin triggers; cascades through all stored conversation data |
| Clinic admin portal | Clinics must configure and monitor their AI | High | Configuration UI, analytics, transcript review |
| AI greeting / persona configuration | Clinics want AI to sound like their receptionist | Low | Name, voice, opening script, tone |
| Voice selection | Different clinics want different voices | Low | ElevenLabs voice library; pick from preset list |
| Analytics dashboard | Call volume, booking rate, top FAQs, escalation rate | Med | Clinic admin view; aggregated, no PII in dashboard |
| Twilio phone number provisioning | Clinic needs a dedicated inbound number | Med | Twilio subaccount per clinic or number pool; managed in portal |
| Web chat widget embed snippet | Clinics paste one line into their website | Low | `<script>` tag with clinic token; no-code embed |

---

## Differentiators

Features that are not universally expected but create competitive advantage vs Vapi.ai, Bland.ai, and generic voice AI platforms. These are what justify selling to clinics rather than them self-building on a generic voice API.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Healthcare-specific intake forms | Generic AI platforms don't pre-wire medical intake fields (reason for visit, insurance, referring practitioner) | Med | Configurable field set per clinic type (dental vs GP vs physio); default templates per specialty |
| Structured GDPR compliance out-of-the-box | EU clinics can't risk DIY compliance; pre-built consent flows are a hard requirement they'd otherwise build themselves | Med-High | Verbal consent script, web consent gate, retention TTL config, data deletion — all wired in; not bolted on |
| Per-clinic knowledge base editor | Generic platforms require developer prompting; clinic admins want a no-code FAQ editor | Med | CRUD UI for Q&A pairs; changes applied without redeployment |
| Confidence-based escalation rules | AI knows when to stop and pass to human — configurable uncertainty threshold + keyword triggers | Med | Clinic admin sets escalation triggers: "insurance billing", "urgent pain", patient says "speak to someone" |
| Call recording + transcript viewer | Clinic staff need to verify what AI told patients; reduces liability | Med | Encrypted at rest; auto-deleted per retention policy; searchable |
| Reseller white-label portal | Agencies reselling to multiple clinics need a fully unbranded multi-tenant portal | High | Subdomain, logo, colors; no QueueUp branding anywhere; reseller manages own clinic accounts |
| Reseller tiered billing display | Resellers markup prices before reselling; portal shows their pricing, not wholesale pricing | Med | Reseller sets per-clinic prices independently; billing is reseller-to-clinic, not platform-to-clinic |
| Per-clinic subdomain for portal | Each clinic admin logs into `clinic-name.resellerbrand.com` | Med | Dynamic subdomain routing in portal; reseller sets subdomain prefix |
| Specialty templates | Pre-configured AI personas and FAQ sets for "Dental", "GP", "Physio" — one-click start | Low | Reduces onboarding time; clinics feel it's built for them |
| Audit log for GDPR compliance | Every data access, deletion request, and consent event is logged | Med | Compliance log separate from conversation transcripts; immutable append-only |
| Dual-channel continuity (voice + chat) | Patient starts on web chat, calls later — AI recognizes returning patient context | High | Link sessions by verified phone/email; only if consent given; defer to v1.1 |
| Configurable intake field builder | Clinic admin adds custom intake fields (e.g., "GP referral number") without engineering | Med | Drag-and-drop or form builder; fields saved per clinic; intake collection prompt templated |

---

## Anti-Features

Things to deliberately NOT build in v1. Each entry explains why and what to do instead.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| EMR/PMS integrations (Dentrix, Eaglesoft, etc.) | Each integration is a 2-4 week project with hospital procurement and vendor API access; will consume v1 engineering entirely before product is validated | QueueUp-native only; design intake data model so EMR export is easy in v2 |
| SMS / WhatsApp / Email channels | Each channel adds auth surface, compliance scope, and UX complexity; voice + web chat alone is a full product | Document channel architecture so v2 SMS is additive; Twilio already supports SMS when ready |
| Multi-language support | Multilingual STT/TTS accuracy varies significantly by language; support cost multiplies; EU market is served by English-only at MVP | Design language field on clinic config so v2 is schema-additive; ElevenLabs supports languages |
| AI clinical advice or treatment explanations | Medical liability; EU AI Act Article 22 high-risk category; could constitute practicing medicine | Hard-code refusal: AI explicitly says "I can't advise on treatment; please speak with your clinician" |
| Outbound proactive calling (reminders, recalls) | Different compliance regime (ePrivacy Directive + GDPR consent for marketing calls); adds telephony cost model complexity | QueueUp already handles reminders via email; add outbound call reminders as v2 with separate consent flow |
| HIPAA compliance | HIPAA requires BAA signing, US data residency, specific technical safeguards — significant legal/infrastructure overhead | GDPR first; HIPAA is a US expansion problem; don't let it slow EU launch |
| Real-time voice sentiment analysis | Technically immature for reliable clinical use; risk of false positives triggering wrong escalation | Rule-based escalation triggers are more reliable and explainable |
| AI appointment triage / urgency scoring | Clinical triage is regulated; AI scoring without clinical validation creates liability | AI collects reason for visit verbatim and passes to human; no AI-generated triage scores |
| Billing / insurance verification automation | Insurance APIs (EU and US) vary by country and insurer; each is a separate integration project | Collect insurance number during intake; verification is a human task |
| In-portal patient records management | Creates a de-facto medical records system with all associated GDPR Article 9 special category data obligations | Transcripts and intake are operational data only; medical records stay in clinic's own PMS/EMR |
| Custom AI model fine-tuning per clinic | Massive infrastructure complexity, cost, and data handling risk for v1 | Per-clinic knowledge base + system prompt customization achieves 90% of the value at 5% of the complexity |
| Voice biometric authentication | Regulated biometric data under GDPR Article 9; requires explicit legal basis and DPO consultation | DOB + name match is sufficient for appointment changes; biometrics are v3+ with legal sign-off |

---

## Feature Dependencies

```
Twilio phone provisioning
  → Inbound call answering
    → Voice booking flow
      → Availability check (QueueUp API)
        → Appointment write (QueueUp API)
          → Confirmation email/SMS
    → Patient identity verification
      → Reschedule / cancel
    → Human handoff / escalation
    → GDPR verbal consent disclosure
      → Call recording + transcript
        → Transcript auto-delete (retention policy)
        → Patient data deletion (right to erasure)
        → Audit log

Web chat widget embed
  → GDPR consent gate
    → Chat booking flow
      → (same availability/write chain as voice)
    → Intake data collection

Clinic admin portal
  → AI greeting / persona config
  → Knowledge base editor (FAQs)
  → Escalation rules config
  → Voice selection
  → Intake field builder
  → Analytics dashboard
  → Call recording viewer
  → GDPR: retention TTL config
  → GDPR: patient data deletion trigger

Reseller white-label portal
  → Clinic account creation / management
    → Clinic admin portal (above)
  → Portal branding (logo, colors, subdomain)
  → Reseller tiered billing display
  → Specialty templates (dental/GP/physio)
```

---

## GDPR-Specific Feature Requirements (EU Healthcare Voice AI)

These are not optional additions — they are legal obligations under GDPR + ePrivacy Directive for EU healthcare AI that processes patient voice data.

| GDPR Requirement | Legal Basis | Feature Implementation | Complexity |
|------------------|-------------|------------------------|------------|
| Lawful basis disclosure (Article 13/14) | Transparency principle | Verbal announcement at call start: "This call may be recorded and processed by AI for appointment management. To continue, say yes or press 1." | Med |
| Explicit consent before processing | Article 6(1)(a) or Article 9(2)(a) for health data | Consent gate on web chat; verbal opt-in on voice; consent timestamp + content logged | Med |
| Special category data handling (Article 9) | Health information = special category | Reason-for-visit and medical intake fields require explicit consent (higher bar than general consent); separate consent signal stored | High |
| Right to erasure (Article 17) | Right to be forgotten | Clinic admin triggers full deletion of patient's transcripts, intake, and consent records on patient request; cascade delete across all tables | Med |
| Data minimisation (Article 5(1)(c)) | Only collect what's necessary | Intake fields are configurable — clinic admin explicitly enables each field; default set is minimal (name, phone, reason); no passive collection | Med |
| Storage limitation (Article 5(1)(e)) | Not kept longer than necessary | Per-clinic configurable TTL (default 90 days); automated cron deletes expired records; deletion logged in audit log | Med |
| Processing records / ROPA (Article 30) | Accountability principle | Platform maintains Records of Processing Activities documentation; audit log supports this | Low-Med |
| Data breach notification (Article 33) | 72-hour notification requirement | Operational: incident response process; technical: audit log makes breach scope queryable | Low (process) |
| Data residency | Not an explicit GDPR article, but expected by EU healthcare buyers | EU data hosting (e.g., AWS eu-west-1 or eu-central-1); contractual commitment in DPA | Med (infra) |
| Data Processing Agreement (DPA) | Article 28 — processor obligations | Legal document between QueueUp and resellers, and between resellers and clinics; platform provides template DPA | Low (legal) |
| AI decision transparency (EU AI Act Art. 52) | Transparency for AI systems interacting with humans | AI must identify itself as AI at the start of every interaction: "Hi, I'm an AI assistant for [Clinic Name]..." | Low |
| Consent withdrawal | Article 7(3) | Patient can say "I withdraw consent" at any point; call ends; no further processing; withdrawal logged | Med |
| Minor patient handling | Article 8 — children's data | If patient appears to be a minor (under 16 in most EU countries), escalate to human immediately; AI does not process minor's health data | Med |

---

## Reseller White-Label Portal: Required Features

| Feature | Why Required | Complexity |
|---------|--------------|------------|
| Reseller account creation (platform admin creates) | Platform sells to resellers, not clinics | Low |
| Clinic account CRUD (reseller creates / edits / suspends) | Reseller manages their own clinic customers | Med |
| Portal branding (logo, primary color, subdomain) | White-label requirement — zero QueueUp branding | Med |
| Per-clinic AI configuration passthrough | Reseller can configure AI on behalf of clinics | Med |
| Per-clinic Twilio number provisioning | Reseller triggers number purchase for each clinic | Med |
| Reseller-level analytics rollup | Reseller sees aggregate metrics across all their clinics | Med |
| Per-clinic status (active / suspended / trial) | Reseller controls access for billing purposes | Low |
| Reseller sets per-clinic pricing | Reseller bills clinics at markup; portal shows their prices | Med |
| Impersonation / "view as clinic admin" | Reseller needs to support their clinic customers | Med |
| Reseller receives platform usage data | So reseller can calculate their own margins | Low |
| White-label email templates | Confirmation and notification emails show reseller brand, not QueueUp | Med |
| Platform admin creates / manages resellers | Platform-level superadmin panel | Low |

---

## MVP Recommendation

Build in this priority order for fastest clinic validation:

**Phase 1 — Core AI Loop (voice + chat booking)**
1. Twilio inbound call + ElevenLabs voice pipeline
2. Appointment booking via voice (availability check + write)
3. FAQ answering from per-clinic knowledge base
4. Human handoff / escalation
5. GDPR verbal consent + web chat consent gate (required before any EU call)
6. Web chat widget + booking via chat
7. Appointment confirmation email

**Phase 2 — Clinic Admin Portal**
8. Clinic admin portal (greeting, FAQs, voice, escalation config)
9. Analytics dashboard (call volume, booking rate)
10. Call recording + transcript viewer
11. Patient data deletion (GDPR Article 17)
12. Retention policy TTL config + auto-delete cron

**Phase 3 — Reseller Portal**
13. Reseller white-label portal (branding, subdomain)
14. Clinic account management
15. Reseller-level analytics rollup

**Defer to v2:**
- Patient identity verification for reschedule/cancel (needs careful identity design)
- Reschedule / cancel (requires identity verification first)
- Specialty templates
- Reseller billing display (can be manual invoicing at first)
- Dual-channel voice + chat continuity

---

## Sources

**Confidence note:** Web tools (WebSearch, WebFetch, Brave Search) were unavailable during this research session. All findings are based on:

- Training data through August 2025 covering Vapi.ai, Bland.ai, Synthflow, Air.ai, Cognigy, and Nuance/Microsoft healthcare AI
- GDPR text (Articles 5, 6, 7, 8, 9, 13, 14, 17, 22, 28, 30, 33) — HIGH confidence, these are legal requirements
- EU AI Act Articles 52 (transparency obligations for AI systems) — HIGH confidence
- ePrivacy Directive requirements for call recording and consent — HIGH confidence
- General voice AI / telephony patterns from Twilio, ElevenLabs, and Claude API documentation — HIGH confidence on architecture
- Competitive feature analysis (Vapi.ai, Bland.ai, Synthflow) — MEDIUM confidence (may have shipped new features since August 2025)

**Validation needed before roadmap finalizes:**
- Current Vapi.ai and Bland.ai feature sets (check their docs/pricing pages directly)
- Current ElevenLabs Conversational AI feature set (check elevenlabs.io/docs)
- EU AI Act implementation status for healthcare AI specifically (may have updated guidance post-August 2025)
