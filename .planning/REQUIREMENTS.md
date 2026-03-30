# Requirements: QueueUp AI Receptionist

**Defined:** 2026-03-28
**Core Value:** A clinic patient can call or chat at any hour and get their appointment booked without waiting for a human — as naturally as talking to a real receptionist.

## v1 Requirements

### Voice AI Core

- [x] **VOICE-01**: Patient can call a clinic's Twilio phone number and be answered by the AI in real-time (Twilio Media Streams, not TwiML IVR)
- [ ] **VOICE-02**: AI identifies itself as an AI at the start of every call (EU AI Act Article 52 compliance)
- [ ] **VOICE-03**: AI obtains verbal consent for health data processing at call start (GDPR Article 9 special category)
- [ ] **VOICE-04**: Patient can say "talk to a human" at any point and be transferred to a configured staff number
- [ ] **VOICE-05**: AI hands off to human automatically when it cannot confidently handle the patient's request
- [ ] **VOICE-06**: End-of-call summary (key actions taken, intake collected) is saved to the appointment in QueueUp

### Web Chat

- [ ] **CHAT-01**: Clinic can embed a chat widget on their website with a single script tag
- [ ] **CHAT-02**: Chat widget displays a GDPR consent gate before the patient can send any message
- [ ] **CHAT-03**: Chat widget shares the same Claude AI brain as voice (same booking, FAQ, and intake capabilities)
- [ ] **CHAT-04**: Patient conversation persists within the browser tab session

### Booking AI

- [ ] **BOOK-01**: AI checks real-time availability from QueueUp before confirming any appointment
- [ ] **BOOK-02**: Patient can book a new appointment via voice or chat (service, date/time, staff preference)
- [ ] **BOOK-03**: Patient can reschedule an existing appointment (verified by name + DOB)
- [ ] **BOOK-04**: Patient can cancel an existing appointment (clinic's cancellation policy window enforced)
- [x] **BOOK-05**: AI prevents double-booking via Redis-backed idempotency key per slot
- [ ] **BOOK-06**: Booking confirmation sent to patient after successful booking (email via existing SendGrid integration)

### Intake Collection

- [ ] **INTAKE-01**: AI collects configured intake fields during or after booking (name, DOB, phone, email, reason for visit, insurance)
- [ ] **INTAKE-02**: Collected intake data is saved against the appointment record in QueueUp
- [ ] **INTAKE-03**: Clinic admin can configure which intake fields the AI collects per their practice

### FAQ & Knowledge Base

- [ ] **FAQ-01**: Clinic admin can create and edit a clinic-specific FAQ knowledge base (Q&A pairs)
- [ ] **FAQ-02**: AI answers patient questions from clinic FAQ first, falls back to general healthcare knowledge
- [ ] **FAQ-03**: AI covers standard FAQ topics: hours, location, pricing, services, insurance accepted
- [ ] **FAQ-04**: Questions the AI cannot answer are logged so clinic admin can add them to the FAQ

### Clinic Admin Portal

- [ ] **CLINIC-01**: Clinic admin can set AI greeting message and persona
- [ ] **CLINIC-02**: Clinic admin can choose AI voice (ElevenLabs voice options)
- [ ] **CLINIC-03**: Clinic admin can configure escalation rules (e.g. "if patient mentions pain, transfer to staff")
- [ ] **CLINIC-04**: Clinic admin can provision a Twilio phone number for their clinic
- [ ] **CLINIC-05**: Clinic admin can set business hours (AI answers vs. route to voicemail/transfer)
- [ ] **CLINIC-06**: Clinic admin can configure the staff transfer number for human handoffs
- [ ] **CLINIC-07**: Clinic admin can copy the chat widget embed snippet and configure appearance (color, position)
- [ ] **CLINIC-08**: Clinic admin can configure intake form fields (which fields to collect, required vs optional)

### Reseller Portal

- [ ] **RESELLER-01**: Reseller admin can create, suspend, and delete clinic accounts
- [ ] **RESELLER-02**: Reseller admin can configure portal branding (logo, primary color, subdomain: portal.resellerbrand.com)
- [ ] **RESELLER-03**: Reseller admin can view usage per clinic (call volume, chat volume, AI booking rate)
- [ ] **RESELLER-04**: Reseller admin can impersonate a clinic admin account for support purposes

### GDPR & Compliance

- [ ] **GDPR-01**: Patient conversation transcripts are automatically deleted after a configurable retention period (default: 90 days)
- [ ] **GDPR-02**: Clinic admin can delete all data for a specific patient on request (right to erasure)
- [x] **GDPR-03**: An audit log records all AI interactions per patient (timestamp, channel, actions taken)
- [x] **GDPR-04**: All EU patient data is stored on EU infrastructure (Vercel EU region, EU-hosted voice service)

### Analytics

- [ ] **ANALYTICS-01**: Clinic admin can view call and chat volume over time
- [ ] **ANALYTICS-02**: Clinic admin can view AI booking completion rate (% completed without human)
- [ ] **ANALYTICS-03**: Clinic admin can view top unanswered questions (to improve FAQ)
- [ ] **ANALYTICS-04**: Clinic admin can view missed call rate reduction vs baseline

## v2 Requirements

### Channels

- **CHAN-01**: Patient can interact via SMS (Twilio Messaging)
- **CHAN-02**: Patient can interact via WhatsApp (Twilio Messaging)
- **CHAN-03**: Patient can interact via email (inbound parsing + AI reply)
- **CHAN-04**: Proactive outbound SMS reminders triggered by upcoming appointments

### Compliance

- **COMP-01**: HIPAA compliance for US market (BAAs, PHI handling, encrypted storage)
- **COMP-02**: SOC 2 Type II audit readiness

### Intelligence

- **INT-01**: Multi-language support (Spanish, French, German)
- **INT-02**: Sentiment detection triggering automatic escalation
- **INT-03**: AI-suggested FAQ improvements (cluster unanswered questions)

### Integrations

- **INT-01**: PMS integration: Dentrix webhook
- **INT-02**: PMS integration: Eaglesoft webhook
- **INT-03**: Custom domain support for reseller portals (DNS + SSL provisioning)

## Out of Scope

| Feature | Reason |
|---------|--------|
| AI clinical advice / triage scoring | Permanent exclusion — medical liability |
| Voice biometric authentication | GDPR Article 9 biometric data — requires separate legal basis |
| EMR/PMS integrations (v1) | Complexity would sink MVP timeline; QueueUp-native only |
| Vapi/Retell/Bland.ai as voice platform | Would destroy reseller margins with per-minute markup and no white-labeling |
| Outbound calling | Different use case; v2 |
| Mobile app | Web-first; mobile later |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| VOICE-01 | Phase 1 | Complete |
| VOICE-02 | Phase 1 | Pending |
| VOICE-03 | Phase 1 | Pending |
| VOICE-04 | Phase 1 | Pending |
| VOICE-05 | Phase 1 | Pending |
| VOICE-06 | Phase 1 | Pending |
| BOOK-05 | Phase 1 | Complete |
| GDPR-01 | Phase 1 | Pending |
| GDPR-03 | Phase 1 | Complete |
| GDPR-04 | Phase 1 | Complete |
| CHAT-01 | Phase 2 | Pending |
| CHAT-02 | Phase 2 | Pending |
| CHAT-03 | Phase 2 | Pending |
| CHAT-04 | Phase 2 | Pending |
| BOOK-01 | Phase 2 | Pending |
| BOOK-02 | Phase 2 | Pending |
| BOOK-03 | Phase 2 | Pending |
| BOOK-04 | Phase 2 | Pending |
| BOOK-06 | Phase 2 | Pending |
| INTAKE-01 | Phase 2 | Pending |
| INTAKE-02 | Phase 2 | Pending |
| FAQ-02 | Phase 2 | Pending |
| FAQ-03 | Phase 2 | Pending |
| CLINIC-01 | Phase 3 | Pending |
| CLINIC-02 | Phase 3 | Pending |
| CLINIC-03 | Phase 3 | Pending |
| CLINIC-04 | Phase 3 | Pending |
| CLINIC-05 | Phase 3 | Pending |
| CLINIC-06 | Phase 3 | Pending |
| CLINIC-07 | Phase 3 | Pending |
| CLINIC-08 | Phase 3 | Pending |
| INTAKE-03 | Phase 3 | Pending |
| FAQ-01 | Phase 3 | Pending |
| FAQ-04 | Phase 3 | Pending |
| GDPR-02 | Phase 3 | Pending |
| RESELLER-01 | Phase 4 | Pending |
| RESELLER-02 | Phase 4 | Pending |
| RESELLER-03 | Phase 4 | Pending |
| RESELLER-04 | Phase 4 | Pending |
| ANALYTICS-01 | Phase 5 | Pending |
| ANALYTICS-02 | Phase 5 | Pending |
| ANALYTICS-03 | Phase 5 | Pending |
| ANALYTICS-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 43 total
- Mapped to phases: 43
- Unmapped: 0 ✓

**Note:** Original traceability listed 40 requirements but enumeration yields 43 (VOICE: 6, CHAT: 4, BOOK: 6, INTAKE: 3, FAQ: 4, CLINIC: 8, RESELLER: 4, GDPR: 4, ANALYTICS: 4 = 43). All 43 are mapped.

**Phase changes from initial draft:**
- BOOK-05 moved Phase 2 → Phase 1 (Redis idempotency must be in place before voice booking goes live — race condition is a Phase 1 risk)
- ANALYTICS-01–04 moved Phase 4 → Phase 5 (analytics depend on clean data from all prior phases; dedicated phase avoids premature aggregation)

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 — traceability updated after roadmap creation*
