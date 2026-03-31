# Phase 2: Booking AI + Web Chat - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

A patient can book, reschedule, or cancel an appointment via either voice or a chat widget embedded on any clinic website — with real-time availability checks, double-booking prevention, and a confirmation email sent on success.

Phase 2 adds two major capabilities to the Phase 1 voice pipeline:
1. **Claude tool calls** for booking, rescheduling, and cancelling appointments (voice + chat)
2. **Embeddable web chat widget** that shares the same AI brain as voice

**In scope (from REQUIREMENTS.md):**
- BOOK-01: AI checks real-time availability from QueueUp before confirming
- BOOK-02: Patient can book a new appointment via voice or chat
- BOOK-03: Patient can reschedule an existing appointment (verified by name + phone)
- BOOK-04: Patient can cancel an existing appointment (cancellation policy enforced)
- BOOK-06: Booking confirmation email sent via existing SendGrid integration
- CHAT-01: Clinic can embed a chat widget on their website with a single script tag
- CHAT-02: Chat widget displays a GDPR consent gate before the patient can send any message
- CHAT-03: Chat widget shares the same Claude AI brain as voice
- CHAT-04: Patient conversation persists within the browser tab session
- INTAKE-01: AI collects configured intake fields during or after booking
- INTAKE-02: Collected intake data is saved against the appointment record
- FAQ-02: AI answers patient questions from clinic FAQ (falls back to general knowledge)
- FAQ-03: AI covers standard FAQ topics (hours, location, pricing, services, insurance)

**NOT in scope:**
- INTAKE-03 (admin configures intake fields) — Phase 3
- FAQ-01 (admin creates FAQ knowledge base) — Phase 3
- FAQ-04 (unanswered question logging) — Phase 3
- Clinic admin portal — Phase 3
- Configurable AI persona/voice/greeting — Phase 3

</domain>

<decisions>
## Implementation Decisions

### Booking Conversation Flow
- Service selection: Aria asks "What type of appointment are you looking for?" and matches the answer to available services. If ambiguous, reads out 2-3 closest matches.
- Time slot selection: **Patient picks the day first** — "What day works best for you?" Then Aria shows available slots for that day.
- No slots available: Suggest closest alternatives — "That day is full, but I have openings on [next 2-3 available days]. Would any of those work?"
- Staff preference: Ask only if the clinic has 2+ active staff — "Do you have a preferred [staffLabel]?" Uses the shop's staffLabel for natural phrasing (e.g., "dentist", "therapist", "barber").
- Booking confirmation: After all details confirmed, Aria reads back the full booking ("You're booked for [service] on [date] at [time] with [staff]. A confirmation email is on its way!") and triggers SendGrid confirmation email.

### Reschedule & Cancel Verification
- Identity verification: **Name + phone number** — "Can I have your name and the phone number on the booking?" Matches against existing customer record.
- Verification failure: Transfer to staff — "I wasn't able to find a matching booking. Let me connect you with a team member who can look into it."
- Cancellation policy: Enforce if configured — if the clinic has set a cancellation window (e.g., 24h before), Aria refuses cancellations inside it: "This appointment is within the cancellation window. Would you like me to connect you with staff?" Cancellation window is configurable per clinic in Phase 3; Phase 2 defaults to no restriction.
- Reschedule flow: Verify identity first, then confirm which appointment to modify (if multiple), then follow the normal booking flow for the new time.

### Chat Widget Design & Behavior
- Appearance: **Floating bubble + panel** — small circular chat icon in bottom-right corner of the clinic's website. Clicking opens a chat panel that slides up. Clinic's brand color applied to the bubble and header bar.
- GDPR consent: **Consent banner before first message** — when chat opens, show a brief consent notice: "This chat is handled by an AI assistant. Your data is processed per GDPR. By continuing, you consent to AI-assisted processing of your inquiry." Patient must click Accept before typing.
- Technology: **Standalone JS bundle** — single `<script>` tag embeds the widget on any website (WordPress, Wix, static HTML, React). Framework-agnostic. Built with Preact or vanilla JS for minimal bundle size (<50KB).
- Session persistence: **Persist within tab session** — chat history stays as long as the browser tab is open (sessionStorage). Closing the tab clears it. No login required.
- Chat API: Widget communicates with a new chat API endpoint on QueueUp (or voice-service). Messages processed by the same Claude brain with the same system prompt, same tool definitions.

### Intake Data Collection
- Timing: **During booking, woven in** — collected naturally as part of the booking conversation: "And what's the reason for your visit?" after confirming the slot. Feels seamless, single conversation flow.
- Style: **Conversational flow** — Aria asks one question at a time naturally: "What's the reason for your visit?" ... "And do you have insurance?" Feels like talking to a receptionist.
- Required fields: **Name + phone always required** (needed for booking). DOB, email, reason for visit, insurance are optional. Phase 2 defaults: collect reason for visit if patient volunteers it. Full field configurability deferred to Phase 3 (INTAKE-03).
- Data saved against appointment record in QueueUp via the existing appointments API.

### Claude's Discretion
- Exact Claude tool definitions (function names, parameter schemas) for booking/reschedule/cancel
- How to structure the chat API (REST vs WebSocket)
- Service matching algorithm (fuzzy match, keyword match, or Claude's own judgment)
- Chat widget internal state management approach
- How to handle concurrent booking attempts in chat (idempotency already solved in Phase 1)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/REQUIREMENTS.md` — BOOK-01–06, CHAT-01–04, INTAKE-01–02, FAQ-02–03 are the v1 requirements for this phase

### Prior Phase Context & Summaries
- `.planning/phases/01-voice-pipeline-gdpr-foundation/01-CONTEXT.md` — Phase 1 decisions (AI persona, consent flow, escalation behavior, repo structure)
- `.planning/phases/01-voice-pipeline-gdpr-foundation/01-02-SUMMARY.md` — Twilio WebSocket + consent flow implementation details
- `.planning/phases/01-voice-pipeline-gdpr-foundation/01-03-SUMMARY.md` — Claude session + ElevenLabs TTS implementation details
- `.planning/phases/01-voice-pipeline-gdpr-foundation/01-04-SUMMARY.md` — Escalation + audit log + twilioStream wiring details

### Existing Booking API (integration points)
- `src/app/api/availability/route.ts` — GET availability slots (shopId, date, staffId, duration)
- `src/app/api/appointments/route.ts` — POST booking with idempotency, conflict check, customer upsert, SendGrid email
- `src/lib/availability.ts` — Slot calculation logic
- `src/lib/resilience.ts` — Redis-backed idempotency (checkIdempotency, setIdempotency, bookingIdempotencyKey)

### Voice Service Handlers (to extend with tool calls)
- `voice-service/src/handlers/claudeSession.ts` — processPatientUtterance, SYSTEM_PROMPT, extractFirstSentence
- `voice-service/src/handlers/twilioStream.ts` — Full call lifecycle handler with consent gate
- `voice-service/src/types/session.ts` — Session type definition

### Architecture & Research
- `.planning/research/ARCHITECTURE.md` — Component boundaries, WebSocket audio pipeline design
- `.planning/research/PITFALLS.md` — Domain-specific pitfalls (voice latency, GDPR, race conditions)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GET /api/availability` — Real-time slot availability with 1-minute cache. Voice service can call this directly with internal service token.
- `POST /api/appointments` — Full booking pipeline: validation, idempotency check, conflict detection, customer upsert, appointment creation, SendGrid confirmation email. The AI's booking tool call should call this endpoint.
- `src/lib/resilience.ts` — Redis-backed `checkIdempotency()` / `setIdempotency()` with `bookingIdempotencyKey()`. Already async, ready for concurrent voice/chat booking.
- `src/lib/email.ts` — `sendBookingConfirmation()` already triggered by POST /api/appointments. No extra work needed for confirmation emails.
- `voice-service/src/handlers/claudeSession.ts` — `processPatientUtterance()` with streaming. Needs to be extended with Claude tool_use for booking actions.
- `voice-service/src/handlers/elevenLabsTts.ts` — `streamTtsToTwilio()` for voice output. Chat doesn't need this.

### Established Patterns
- Booking API expects: `shopId, serviceId, date, startTime, customerName, customerPhone, customerEmail, notes`
- Customer upsert: If customer_token cookie exists, uses that. Otherwise matches by phone/email. Voice/chat will use phone matching.
- Services/staff fetched via `GET /api/admin/services?shopId=X` and `GET /api/admin/staff?shopId=X`
- Shop settings (including brand color for widget) via `GET /api/shops/[slug]`

### Integration Points
- Claude tool calls will call QueueUp API routes internally (availability, appointments, services, staff)
- Chat widget needs a new API endpoint: `/api/chat` (or extend voice-service with HTTP chat endpoint)
- Chat messages processed by same `processPatientUtterance()` logic but without TTS output
- Widget embed script served from QueueUp domain (e.g., `https://app.queueup.com/widget/[shopId].js`)

</code_context>

<specifics>
## Specific Ideas

- Booking flow is **patient-directed for day selection** — Aria doesn't assume "tomorrow" or "this week", she asks what day the patient prefers first
- Staff preference question uses the shop's **staffLabel** dynamically (e.g., "Do you have a preferred dentist?" not "Do you have a preferred staff member?")
- Chat widget should feel **lightweight and fast** — Preact or vanilla JS, < 50KB bundle, instant load
- GDPR consent in chat is a **blocking banner** (not inline chat message) — patient must explicitly click Accept before any input is enabled

</specifics>

<deferred>
## Deferred Ideas

- Configurable intake fields per clinic — Phase 3 (INTAKE-03)
- Admin-managed FAQ knowledge base — Phase 3 (FAQ-01)
- Unanswered question logging for FAQ improvement — Phase 3 (FAQ-04)
- Clinic-branded AI persona name — Phase 3 (CLINIC-01)
- Barge-in / interruption handling on voice — future enhancement
- Re-consent TTL per patient (skip consent on repeat calls) — future enhancement
- Waitlist functionality for full days — future enhancement

</deferred>

---

*Phase: 02-booking-ai-web-chat*
*Context gathered: 2026-03-31*
