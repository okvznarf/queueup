# Roadmap: QueueUp AI Receptionist

## Overview

This roadmap builds the AI Receptionist product in five phases, each delivering a coherent, independently verifiable capability. The build order is architecturally non-negotiable: the voice orchestrator (a persistent Node.js service on Railway) must exist before any patient-facing feature; GDPR consent infrastructure must be live before any EU patient touches the system; the clinic portal must exist before the reseller portal has anything to manage. Phases 1-3 deliver the minimum viable product a single clinic can use. Phases 4-5 deliver the distribution and analytics layer that enables reseller sales.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Voice Pipeline + GDPR Foundation** - Deploy the Railway orchestrator, wire Twilio → Deepgram → Claude → ElevenLabs, and establish GDPR consent infrastructure — the non-negotiable runtime and compliance base everything else depends on
- [ ] **Phase 2: Booking AI + Web Chat** - Add full appointment booking/cancel/reschedule tool calls to the AI, ship the embeddable web chat widget, and wire booking confirmation emails
- [ ] **Phase 3: Clinic Admin Portal** - Give clinic admins a portal to configure AI persona, FAQs, intake fields, escalation rules, Twilio phone provisioning, and patient data deletion (GDPR Article 17)
- [ ] **Phase 4: Reseller Portal** - White-label multi-tenant portal with subdomain routing, clinic account management, reseller branding, and impersonation support
- [ ] **Phase 5: Analytics Dashboard** - Per-clinic and reseller-level analytics on call volume, booking rate, escalation rate, and top unanswered questions

## Phase Details

### Phase 1: Voice Pipeline + GDPR Foundation
**Goal**: A patient can call a clinic's Twilio number, hear the AI identify itself and obtain consent, state their intent, and receive a natural conversational response — with all audio processed in under 2 seconds per turn and all consent events durably logged
**Depends on**: Nothing (first phase) — includes hardening of existing Redis idempotency store before voice booking goes live
**Requirements**: VOICE-01, VOICE-02, VOICE-03, VOICE-04, VOICE-05, VOICE-06, BOOK-05, GDPR-01, GDPR-03, GDPR-04
**Success Criteria** (what must be TRUE):
  1. A phone call to a test clinic Twilio number is answered by the AI within 2 rings and the AI responds within 2 seconds per conversational turn
  2. The AI identifies itself as an AI and obtains verbal GDPR consent at the start of every call — consent timestamp is written to the audit log in the database
  3. A patient saying "transfer me to a human" or triggering a configured escalation keyword is immediately transferred to the staff number — the call does not drop
  4. The AI gracefully ends calls it cannot handle and logs the reason
  5. End-of-call summaries (actions taken, intake collected) are saved to the appointment record in QueueUp
  6. All EU patient conversation data is stored in EU infrastructure and auto-deleted after the configured retention period (default 90 days)
**Plans**: TBD

### Phase 2: Booking AI + Web Chat
**Goal**: A patient can book, reschedule, or cancel an appointment via either voice or a chat widget embedded on any clinic website — with real-time availability checks, double-booking prevention, and a confirmation email sent on success
**Depends on**: Phase 1
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, BOOK-01, BOOK-02, BOOK-03, BOOK-04, BOOK-06, INTAKE-01, INTAKE-02, FAQ-02, FAQ-03
**Success Criteria** (what must be TRUE):
  1. A clinic can embed `<script src="...">` on their website and a functioning chat window appears — the patient can book an appointment without leaving the page
  2. The chat widget shows a GDPR consent gate before the patient can type any message — no data is sent until consent is granted
  3. A patient who books via voice or chat receives a SendGrid confirmation email with appointment details within 60 seconds
  4. Two concurrent callers attempting to book the same slot cannot both succeed — the second caller is told the slot is no longer available
  5. The AI collects name, DOB, phone, email, reason for visit, and insurance during or after booking and the data is saved to the appointment record in QueueUp
  6. The AI correctly answers standard FAQ questions (hours, location, pricing, services, insurance) from the clinic knowledge base
**Plans**: TBD

### Phase 3: Clinic Admin Portal
**Goal**: A clinic admin can log in, configure every aspect of the AI (greeting, voice, FAQs, escalation, intake fields, business hours, staff transfer number, and phone provisioning), and fulfill a patient's GDPR erasure request with a single action
**Depends on**: Phase 2
**Requirements**: CLINIC-01, CLINIC-02, CLINIC-03, CLINIC-04, CLINIC-05, CLINIC-06, CLINIC-07, CLINIC-08, INTAKE-03, FAQ-01, FAQ-04, GDPR-02
**Success Criteria** (what must be TRUE):
  1. A clinic admin can set the AI greeting, choose an ElevenLabs voice, and configure escalation keywords — changes take effect on the next call without redeployment
  2. A clinic admin can provision a Twilio phone number for their clinic directly from the portal — the number is ready to receive calls within 5 minutes
  3. A clinic admin can create, edit, and delete FAQ entries — the AI uses the updated knowledge base on the next conversation
  4. A clinic admin can configure which intake fields the AI collects (and which are required) — the AI collects only those fields on subsequent calls
  5. A clinic admin can delete all data for a specific patient in a single action — all conversation turns, transcripts, and intake data for that patient are removed within 60 seconds
  6. Questions the AI could not answer are surfaced in the portal so the admin can add them to the FAQ
**Plans**: TBD

### Phase 4: Reseller Portal
**Goal**: A reseller can log into a fully white-labeled portal on their own subdomain, create and manage clinic accounts, and view usage across all their clinics — with no QueueUp branding visible anywhere
**Depends on**: Phase 3
**Requirements**: RESELLER-01, RESELLER-02, RESELLER-03, RESELLER-04
**Success Criteria** (what must be TRUE):
  1. A reseller can visit `portal.theirbrand.com`, log in, and see only their branding (logo, primary color) — no QueueUp name, logo, or favicon appears anywhere in the portal
  2. A reseller can create, suspend, and delete clinic accounts — suspended clinic AI stops answering calls immediately
  3. A reseller can view per-clinic usage (call volume, chat volume, AI booking rate) rolled up across all their clinics
  4. A reseller can click "View as clinic admin" to impersonate a clinic admin account for support — the action is logged in the audit trail
**Plans**: TBD

### Phase 5: Analytics Dashboard
**Goal**: Clinic admins and resellers can see time-series data on how the AI is performing — call volume, booking completion rate, escalation rate, and top unanswered questions — giving them enough signal to tune the AI and demonstrate ROI to their practice
**Depends on**: Phase 4
**Requirements**: ANALYTICS-01, ANALYTICS-02, ANALYTICS-03, ANALYTICS-04
**Success Criteria** (what must be TRUE):
  1. A clinic admin can view a chart of call and chat volume over time (daily/weekly) and see the trend at a glance
  2. A clinic admin can see the percentage of conversations that completed a booking without human intervention (AI booking completion rate)
  3. A clinic admin can view a ranked list of questions the AI could not answer, ordered by frequency — so they know what to add to their FAQ
  4. A clinic admin can see missed call rate reduction compared to a configured baseline date
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Voice Pipeline + GDPR Foundation | 4/5 | In Progress|  |
| 2. Booking AI + Web Chat | 0/TBD | Not started | - |
| 3. Clinic Admin Portal | 0/TBD | Not started | - |
| 4. Reseller Portal | 0/TBD | Not started | - |
| 5. Analytics Dashboard | 0/TBD | Not started | - |
