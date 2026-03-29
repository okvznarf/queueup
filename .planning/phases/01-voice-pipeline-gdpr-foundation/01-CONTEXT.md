# Phase 1: Voice Pipeline + GDPR Foundation - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy the voice orchestrator (persistent Node.js/Fastify service on Railway), wire Twilio Media Streams → Deepgram → Claude → ElevenLabs, and establish GDPR consent infrastructure. This phase delivers the non-negotiable runtime and compliance base that all subsequent phases depend on.

Phase 1 does NOT include: booking tool calls (Phase 2), web chat widget (Phase 2), clinic admin portal (Phase 3), FAQ knowledge base management (Phase 3). The AI in Phase 1 can identify itself, obtain consent, have a basic conversation, and escalate — but cannot book appointments yet (that comes in Phase 2).

**In scope:**
- VOICE-01: Twilio Media Streams inbound call answering
- VOICE-02: AI self-identification (EU AI Act Article 52)
- VOICE-03: GDPR Article 9 explicit verbal consent at call start
- VOICE-04: Patient-initiated human handoff (call transfer)
- VOICE-05: Automatic AI handoff when confidence threshold hit
- VOICE-06: End-of-call summary saved to QueueUp appointment record
- BOOK-05: Redis-backed idempotency store (migrate from in-memory)
- GDPR-01: Auto-delete conversation transcripts (default 90 days)
- GDPR-03: Audit log of all AI interactions per call
- GDPR-04: EU data residency (EU infrastructure)

</domain>

<decisions>
## Implementation Decisions

### AI Persona & Conversation Style
- Tone: **warm and friendly** — approachable, uses patient's first name once naturally after they provide it, conversational feel (not clinical/robotic)
- AI name: **generic persona name** — a single name like "Aria" used across all clinics for the MVP (not "the AI assistant for [Clinic]" — a persona name was chosen). Note: clinic-branded names configurable in Phase 3 portal.
- Name usage: AI uses patient's first name **once or twice naturally** after patient provides it (e.g., "Thanks, John, let me check that for you")
- Silence / confusion handling: **prompt once, then offer transfer** — after ~4 seconds of silence or two confused/uncaught responses: "I didn't catch that — would you like me to connect you with our staff?"

### Escalation & Call Failure Behavior
- Primary escalation method: **warm transfer** — AI bridges to the staff number via Twilio; call stays live, patient doesn't have to call back
- Automatic escalation triggers (VOICE-05):
  - Patient explicitly requests a human ("talk to someone", "speak to a receptionist", "real person")
  - Claude's confidence falls below threshold (Claude is clearly speculating rather than answering from knowledge)
- Proactive escalation threshold: **after 2 unanswered questions** AI offers: "I'm not sure about that one either — let me get you to someone who can help"
- Out-of-hours / staff unavailable: **offer callback + continue trying to help** — "Our staff aren't available right now — can I take a number for a callback, or shall I try to help you with something else?"
- Medical urgency keywords ("emergency", "pain", "bleeding", "urgent") are NOT an automatic trigger in Phase 1 (not in scope — can be added via escalation rules config in Phase 3)

### GDPR Verbal Consent Flow
- Consent type: **explicit verbal consent required** — patient must say "I agree" (or equivalent affirmative) before AI proceeds. Not implicit/inferred from continued use.
- Consent script: AI identifies itself as AI (EU AI Act Article 52) and requests explicit consent for health data processing before doing anything else
- Patient declines consent: **immediate warm transfer to staff** — "No problem — let me connect you with a team member." Human handles the call with no AI data processing.
- Consent logging: **per-call** (not per-patient with TTL) — every call logs independently regardless of prior consents
- Audit log fields (GDPR-03) per call:
  - Consent timestamp + type (explicit verbal)
  - Call SID (Twilio)
  - Clinic ID
  - Actions taken (booked, rescheduled, transferred, escalated, etc.)
  - Partial phone number hash (last 4 digits hashed for patient linkage without storing raw number)
  - Call duration
  - Escalation flag (was call escalated to staff, yes/no)

### Voice Service Repo Structure
- Location: **monorepo subfolder `/voice-service/`** alongside existing `/src` and `/outreach-agent/`
- Database: **reuse QueueUp's PostgreSQL** — same `DATABASE_URL`, same Prisma client, new tables added to existing schema for voice transcripts, audit log, and GDPR retention tracking
- Auth to QueueUp API: **internal service token** — long-lived secret in `.env`, voice service passes it as a request header when calling QueueUp booking API routes. No JWT refresh complexity.
- Deployment: `/voice-service/` deployed to Railway separately from Vercel (Next.js stays on Vercel)

### Redis Idempotency Migration (BOOK-05)
- Migrate `src/lib/resilience.ts` in-memory idempotency store to Redis-backed using existing Upstash Redis client (`@upstash/redis` already in package.json)
- This fix must land before voice booking goes live — concurrent callers could double-book without it

### Claude's Discretion
- Exact wording of the GDPR consent script (within the constraint: must be explicit verbal consent, must identify as AI)
- Exact confidence threshold value for automatic escalation (tune empirically)
- Specific handling of edge cases like very short calls (patient hangs up immediately)
- Fastify vs bare Node.js `http` module for the WebSocket server internals

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/REQUIREMENTS.md` — VOICE-01–06, BOOK-05, GDPR-01, GDPR-03, GDPR-04 are the v1 requirements for this phase

### Architecture & Constraints
- `.planning/research/STACK.md` — Technology choices: Twilio Media Streams, Deepgram Nova-2 STT, ElevenLabs turbo TTS (ulaw_8000), Node.js/Fastify orchestrator
- `.planning/research/ARCHITECTURE.md` — Component boundaries, WebSocket audio pipeline design, build order, anti-patterns
- `.planning/research/PITFALLS.md` — 18 domain-specific pitfalls with prevention strategies (voice latency, GDPR, race conditions, multi-tenant isolation)

### Existing Codebase
- `.planning/codebase/STACK.md` — Existing QueueUp tech stack (Twilio already in package.json, Upstash Redis client, Anthropic SDK, Prisma 7)
- `.planning/codebase/CONCERNS.md` — Known bugs: idempotency store in-memory (must fix), timezone bug in availability.ts
- `.planning/codebase/ARCHITECTURE.md` — Existing patterns: withRetry, CircuitBreaker, structured logger, Prisma adapter setup

### Compliance Context
- `.planning/research/FEATURES.md` — GDPR Article 9 special category health data requirements, EU AI Act Article 52 AI self-identification obligation, table stakes features

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/resilience.ts`: `withRetry()`, `CircuitBreaker` — reuse in voice service for Deepgram/ElevenLabs/Twilio API calls
- `src/lib/logger.ts`: Structured logger — extend or copy pattern for voice service logging
- `@upstash/redis` (`@upstash/redis@^1.37.0` in package.json): Already installed — use for Redis-backed idempotency store
- `@anthropic-ai/sdk@^0.39.0`: Already installed in outreach-agent — add to voice-service package.json
- `twilio@^5.12.2`: Already in package.json but not actively used — available for Media Streams setup
- `src/lib/prisma.ts`: PrismaPg adapter pattern — reuse in voice service with same DATABASE_URL

### Established Patterns
- Auth: HttpOnly cookies + JWT (admin) — voice service uses internal service token instead (decided above)
- Error handling: `{ error: "message" }` JSON responses with HTTP status codes
- Environment config: `.env.local` with dotenv — voice service adds to same file
- Async job pattern: `src/lib/jobs.ts` PostgreSQL-backed job queue — can reuse for end-of-call summary saves

### Integration Points
- New tables needed in `prisma/schema.prisma`: `VoiceCall`, `VoiceAuditLog`, `VoiceTranscript` (with `deleteAfter` timestamp for GDPR-01)
- Existing QueueUp API routes the voice service will call: availability check, appointment fetch (for VOICE-06 summary save)
- Existing `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` env vars — voice service reuses same Redis instance for idempotency

</code_context>

<specifics>
## Specific Ideas

- AI persona name chosen: something like "Aria" — warm, human-sounding, gender-neutral-ish. Exact name is Claude's discretion.
- Consent script must literally include: (1) identification as AI, (2) mention of health data processing, (3) request for explicit affirmative response. This is non-negotiable for GDPR Article 9 and EU AI Act Article 52.
- Patient says "I agree", "yes", "sure", "okay", "go ahead" → consent granted. Patient says "no", "I don't agree", "I decline" → immediate warm transfer to staff.
- The voice service `/voice-service/` is a **standalone Node.js app** with its own `package.json` — not sharing the root `package.json`. Deploys independently to Railway.

</specifics>

<deferred>
## Deferred Ideas

- Medical urgency keyword auto-escalation ("pain", "emergency", "bleeding") — belongs in Phase 3 clinic admin escalation rules config (CLINIC-03)
- Clinic-branded AI names (per-clinic persona name instead of generic "Aria") — Phase 3 portal config (CLINIC-01)
- Re-consent TTL per patient (skip consent on repeat calls within 12 months) — Phase 2 or Phase 3 after patient identity linking is built
- Barge-in / interruption handling (patient can cut off AI mid-sentence) — Phase 2 or Phase 3 enhancement, not Phase 1 MVP
- Outbound callback scheduling when staff unavailable — Phase 2 (requires booking system integration)

</deferred>

---

*Phase: 01-voice-pipeline-gdpr-foundation*
*Context gathered: 2026-03-28*
