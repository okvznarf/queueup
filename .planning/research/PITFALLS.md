# Domain Pitfalls

**Domain:** AI voice receptionist for healthcare clinics (Twilio + ElevenLabs + Claude)
**Researched:** 2026-03-28
**Confidence note:** Training data (Aug 2025 cutoff). No external sources available during this session. All pitfalls verified against known behavior of Twilio Media Streams, ElevenLabs Conversational AI, and Claude tool use patterns. Flag for re-verification before implementation.

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, compliance violations, or patient harm.

---

### Pitfall 1: Twilio Media Streams — Not Serverless-Compatible

**What goes wrong:** Twilio Media Streams sends real-time audio over a persistent WebSocket to your server. Next.js API routes and Vercel serverless functions cannot hold a persistent WebSocket connection. The connection drops within seconds (Vercel's 30s function timeout; Hobby plan: 10s). Audio is lost, calls hang silently.

**Why it happens:** Teams assume "it's just a webhook" or "I'll handle it in a route handler." Twilio's VoiceResponse XML specifies a `<Stream>` destination URL — that URL must maintain a stateful WebSocket for the call's full duration (often 5-10 minutes).

**Consequences:**
- Every inbound call drops after timeout
- Patient hears silence or dead air, not an error message
- Extremely difficult to debug without real call traffic

**Prevention:**
- Run the voice WebSocket server as a long-lived Node.js process, NOT a serverless function
- Use a separate deployment target: Railway, Fly.io, or a dedicated Vercel Edge Function with Durable Objects (if on Enterprise) — or a separate Express/Fastify server
- The Next.js app handles the admin portal and booking APIs; a separate Node.js WebSocket server handles all voice streams
- Architect this split from day 1 — retrofitting is expensive

**Detection:**
- Calls work in local development (no timeout) but drop in production
- Vercel function logs show "Function execution timeout" or "FUNCTION_INVOCATION_TIMEOUT"
- Twilio call status shows "completed" prematurely with 0 duration

**Phase:** Architecture (Phase 1) — must be a hard constraint before any code is written

---

### Pitfall 2: Voice Turn Latency Stacking — Exceeding 2s Budget

**What goes wrong:** The target is <2s perceived latency per turn. The actual pipeline is: end-of-speech detection → STT → Claude API → ElevenLabs TTS → Twilio playback. Each step adds latency that compounds. Real-world total can easily be 4-8 seconds without deliberate optimization.

**Latency breakdown (observed ranges):**
- Twilio end-of-speech detection: 0.3-1.5s (controlled by `speechTimeout` parameter — default is too long)
- ElevenLabs STT (if used): 0.5-1s
- Claude API (claude-sonnet-4-6, streaming): 0.5-1.5s to first token
- ElevenLabs TTS (non-streaming): 1-3s for full audio generation
- ElevenLabs TTS (streaming, first chunk): 200-500ms
- Network round-trips (2 extra hops if voice server is geographically distant): 100-400ms

**Why it happens:** Teams integrate each service individually and test each in isolation. Only when assembled does latency compound. Streaming is not used by default.

**Consequences:**
- Patients experience unnatural silence, assume the call dropped
- "Hello? Are you there?" loops
- Patients hang up and call a human — AI perceived as broken

**Prevention:**
- Use ElevenLabs WebSocket streaming TTS; never wait for full audio before starting playback
- Stream TTS audio chunks directly into Twilio Media Streams as they arrive (pipe ElevenLabs WebSocket output → encode to mulaw 8kHz → send to Twilio)
- Set Twilio `speechTimeout` to `auto` and tune `speechEndThreshold` (default 700ms; try 500ms)
- Use Claude streaming (SSE) and begin generating TTS from the first sentence/clause before Claude finishes the full response
- Deploy voice server in same region as Twilio's media processing (US East or Dublin for EU)
- Target: STT+LLM+TTS pipeline must stay under 1.8s p95 — measure with real calls, not API benchmarks

**Detection:**
- Add microsecond timestamps at each pipeline stage, log latency per turn
- Alert when p95 turn latency exceeds 2s

**Phase:** Phase 1 (voice pipeline) — bake in streaming from the start; retrofitting non-streaming to streaming requires re-architecting audio pipeline

---

### Pitfall 3: ElevenLabs Streaming — Audio Format Mismatch With Twilio

**What goes wrong:** Twilio Media Streams expects audio in mulaw (G.711 u-law) encoding, 8kHz sample rate, 20ms chunks. ElevenLabs by default outputs MP3 or PCM at 22kHz or 44kHz. If you feed the wrong format directly into Twilio, callers hear garbled noise, silence, or robotic distortion.

**Why it happens:** ElevenLabs WebSocket streaming returns audio chunks in the format you configure via `output_format`. Developers use a default format (MP3/PCM), then feed it directly to Twilio without transcoding.

**Consequences:**
- Audio completely unintelligible on phone calls
- Works fine in browser playback (browsers decode MP3 natively), so developers miss it in testing
- Difficult to diagnose without actually calling the Twilio number

**Prevention:**
- Configure ElevenLabs WebSocket `output_format` to `ulaw_8000` (U-law, 8000Hz) — this is the Twilio-native format
- If using PCM output, transcode in real-time using a lightweight library (e.g., `node-lame` or a custom mulaw encoder) — adds latency
- Always test via an actual phone call, not browser audio playback

**Detection:**
- Caller hears garbled audio, clicks, or silence
- Browser-based testing passes but phone testing fails

**Phase:** Phase 1 (voice pipeline)

---

### Pitfall 4: Claude Tool Use — Stale Availability in Long Conversations

**What goes wrong:** Claude is called with a conversation history that includes a previous availability check. Ten minutes into the call, the patient asks to confirm a slot that was available at turn 2. Claude's context still contains the tool result from turn 2 and assumes it's still valid. The slot may now be taken (another booking happened in the last 10 minutes).

**Why it happens:** Claude's tool use results are just text in the context window. There is no expiry or re-validation mechanism. Claude naturally trusts prior tool results.

**Consequences:**
- AI confidently tells patient "I've booked your 10am appointment" but the slot is gone
- Booking API returns a conflict error
- AI has no recovery path and either loops, apologizes awkwardly, or hangs

**Prevention:**
- Never rely on a cached availability tool result more than one conversational turn old
- On every booking confirmation (before calling `create_appointment` tool), always call `check_availability` again as the final step
- Include a system prompt instruction: "Always re-check availability immediately before confirming a booking — never use a previous availability result"
- Design the `create_appointment` tool to return a structured conflict response (not just a 409), so Claude can reason about it and offer alternatives

**Detection:**
- Double bookings in the database when two calls happen simultaneously
- Appointment creation API returning 409 during voice calls

**Phase:** Phase 1 (booking tool integration)

---

### Pitfall 5: GDPR — Voice Recording = Special Category Data in Healthcare

**What goes wrong:** Audio recordings of patients discussing their health conditions are "special category" health data under GDPR Article 9. Standard GDPR consent (Article 6 lawful basis) is insufficient. You need explicit Article 9(2) consent, which means:
1. Stated purpose must be specific, not general ("booking only" vs "AI training")
2. Consent must be freely given, not bundled with service access
3. The patient must have the ability to withdraw consent at any time
4. Records of consent must be retained

Teams add a generic "calls may be recorded" disclosure and believe they're compliant.

**Why it happens:** Health data classification of voice is under-understood. Legal teams not involved early.

**Consequences:**
- Regulatory fines (GDPR Article 83: up to €20M or 4% global revenue)
- Clinic customers liable by association (they're the data controller; you're the processor)
- Patients can file complaints with national Data Protection Authorities (DPAs) in any EU member state
- Enforcement is active: EU DPAs issued €4.2B in fines 2018-2024

**Prevention:**
- Voice recordings must be explicitly labeled as special category health data in your Data Processing Agreement (DPA)
- Provide disclosure at the start of every call: "This call is handled by an AI. [Clinic name] records calls to process your appointment. You may opt out by pressing 9 or calling us directly."
- Patient opt-out must immediately terminate AI and transfer to human (or take a message without recording)
- Transcripts stored separately from call recordings, with independent retention/deletion controls
- Implement `TRANSCRIPT_RETENTION_DAYS` per clinic (default 90 as planned), enforce at database level (scheduled deletion job), not just "configurable"
- Maintain consent audit log: who consented, when, call SID, what they consented to

**Detection:**
- No explicit Article 9 consent flow = non-compliant
- Review your disclosure flow with an EU GDPR specialist before any EU clinic goes live

**Phase:** Phase 1 (compliance infrastructure) — must be done before any EU patient touches the system

---

### Pitfall 6: Multi-Tenant Isolation — Clinic A Hearing Clinic B's Conversations

**What goes wrong:** The voice WebSocket server receives calls from all clinics. If the call routing logic maps a Twilio phone number to a clinic using an in-memory lookup that gets corrupted (cache collision, race condition, missing key), one clinic's call context bleeds into another clinic's conversation.

**Why it happens:** Phone number → clinic mapping is often loaded once at startup or cached per-process. If the cache is not properly scoped (e.g., uses phone number as key but two clinics share a trunk) or is not invalidated after provisioning changes, stale mappings cause cross-clinic context.

**Consequences:**
- Patient of Clinic A hears Clinic B's greeting, FAQs, and staff names
- Healthcare data from one clinic is served to another clinic's patients
- GDPR breach: special category health data shared across organizations

**Prevention:**
- Every incoming call must be validated: Twilio call SID → phone number → clinic ID lookup from database (not memory), at the start of every WebSocket connection
- Tenant ID (clinicId) must be the first thing established and attached to every message, log, and tool call for the duration of the call
- All tool calls (check availability, create booking, get FAQs) must pass clinicId as a validated parameter — never trust the AI to maintain tenant scope
- Add an integration test: spin up two clinics, call both simultaneously, verify conversations are fully isolated

**Detection:**
- Review every tool call handler: does it filter by clinicId from the session, or accept clinicId from the AI?
- Any tool call that accepts clinicId from the AI-generated message is a tenant isolation vulnerability

**Phase:** Phase 1 (voice server architecture) and Phase 2 (multi-tenant provisioning)

---

### Pitfall 7: Booking Race Condition — Simultaneous Callers, Same Slot

**What goes wrong:** Two patients call at 6:50am. Both ask for 10:00am tomorrow. Both pass the availability check at 6:50:05. Both Claude instances proceed to book. Both `create_appointment` calls hit the database within milliseconds. Without a database-level lock, both bookings succeed, creating a double-booking.

**Why it happens:** The existing QueueUp code has a double-check pattern (pre-check + in-transaction re-check with SELECT FOR UPDATE). But the voice server will call the booking API over HTTP — if that HTTP call goes to a serverless instance that does not share the in-memory idempotency store (confirmed concern in CONCERNS.md), the double-check does not help.

**Consequences:**
- Two patients show up for the same appointment slot
- Clinic calls both patients, one is turned away
- AI receptionist's credibility destroyed

**Prevention:**
- The booking API already has `SELECT FOR UPDATE` protection (per CONCERNS.md) — ensure the voice server calls the same `/api/appointments` endpoint, not a separate path
- Migrate the idempotency store from in-memory to Redis before voice goes live (confirmed gap in CONCERNS.md)
- Add a database UNIQUE constraint on (shopId, staffId, startTime) for appointment slots — this is the last line of defense
- The voice server should pass an idempotency key derived from the call SID + slot time, so retries do not duplicate bookings

**Detection:**
- Run concurrent booking tests with `k6` or `autocannon` targeting the booking endpoint
- Monitor for appointments with identical (shopId, staffId, startTime) combinations

**Phase:** Phase 1 (before any real calls) — critical, existing codebase has this partially implemented but incomplete for voice

---

## Moderate Pitfalls

---

### Pitfall 8: Claude Tool Use — Infinite Tool Call Loops

**What goes wrong:** Claude calls a tool, receives an error, and calls the same tool again in the next turn, receives the same error, and loops indefinitely. This is especially common with availability checks ("no slots available" → Claude re-checks with slightly different parameters → same result → re-check again).

**Prevention:**
- Set a hard limit: max 3 tool call retries per conversation turn (enforced in the orchestration layer, not relying on Claude to self-limit)
- If a tool fails 3 times, the orchestrator injects a system message: "Tool failed. Tell the patient you cannot complete this action and offer to transfer to a human."
- Design tools to return a `retryable: boolean` field — non-retryable errors (no availability, patient not found) should signal Claude to stop retrying

**Phase:** Phase 1 (conversation orchestration)

---

### Pitfall 9: ElevenLabs Streaming — Partial Sentence Playback on Interruption

**What goes wrong:** Patient interrupts the AI mid-sentence. The Twilio stream has already sent audio chunks for the first 3 seconds of the AI's response. You must detect the interruption, cancel the ElevenLabs TTS stream, and flush any pending audio from Twilio's buffer. If you don't flush, the rest of the AI's previous sentence plays after the patient speaks, creating a confusing overlap.

**Prevention:**
- Implement a "barge-in" handler: when Twilio detects speech from the caller, immediately:
  1. Send a `clear` message to the Twilio Media Stream WebSocket to flush queued audio
  2. Close or abort the current ElevenLabs WebSocket streaming response
  3. Start new STT processing on the interrupting speech
- ElevenLabs Conversational AI API handles this natively if you use their full conversational session — but if building a custom pipeline, barge-in must be explicitly handled

**Detection:**
- Test: start a long AI response and speak over it — does the AI continue over you or stop immediately?

**Phase:** Phase 1 (voice pipeline)

---

### Pitfall 10: Twilio Phone Number Provisioning — Regulatory Compliance by Country

**What goes wrong:** Twilio phone number provisioning for EU countries (Germany, France, Italy, Spain, Netherlands) requires regulatory documentation — typically a business address proof, VAT registration, or national business registration. Provisioning fails silently or is rejected without explanation if these documents are not pre-configured in your Twilio account's Regulatory Bundle.

**Why it happens:** Developers test with US numbers (no regulatory requirements), assume EU provisioning works the same way. EU clinics need local numbers, not US numbers.

**Consequences:**
- Clinics in Germany, France, Italy cannot get a local phone number
- Blocks EU go-live for multiple countries
- Regulatory bundle approval takes 1-5 business days — cannot be done at clinic signup

**Prevention:**
- Create Regulatory Bundles in Twilio for each target EU country before selling to clinics there
- In the clinic provisioning flow, show available number countries based on pre-approved bundles, not all possible countries
- Build a "phone number request" queue: clinic requests a number, admin approves/provisions (async), system notifies clinic when ready
- Document per-country requirements and lead times in the reseller onboarding guide

**Detection:**
- Test Twilio number provisioning in each target EU country before go-live, not at customer signup

**Phase:** Phase 2 (phone number provisioning feature)

---

### Pitfall 11: Claude Context Window — Long Call Transcripts Exceeding Token Limits

**What goes wrong:** A 20-minute call generates a transcript with 10,000+ tokens of history. Claude's context fills up. Tool results (availability JSON, FAQ content) add thousands more tokens. Once the context limit is approached, Claude's responses degrade — it forgets earlier conversation content, repeats itself, or refuses to respond.

**Prevention:**
- Implement a conversation summarizer: at every 10 turns, summarize the conversation history into 200-400 tokens and replace the raw history with the summary in the context
- Keep tool results concise: availability should return 5-10 slots max, not all slots for the next 2 weeks
- Set a call turn limit (20 turns max) — if exceeded, gracefully transfer to a human

**Detection:**
- Log token count per API call; alert when approaching 60% of context window
- Monitor for calls where Claude starts repeating earlier questions

**Phase:** Phase 1 (conversation orchestration)

---

### Pitfall 12: White-Label Portal — QueueUp Branding Leaking Through

**What goes wrong:** Resellers need a fully unbranded portal. QueueUp branding leaks through: browser tab favicons, email footers from SendGrid, error page text mentioning "QueueUp", API error messages with internal references, og:title tags on portal pages.

**Prevention:**
- Reseller portal must have a separate domain with a per-reseller `brand` configuration object (name, logo, primary color, support email)
- SendGrid email templates must use the reseller brand, not QueueUp brand
- Error messages must use generic text ("Unable to process request") not internal system names
- Conduct a "branding audit" — load the portal in a fresh browser, record every place text/logo appears, verify each is white-labeled

**Detection:**
- Reseller conducts a demo for their first clinic customer and sees "QueueUp" in the browser tab

**Phase:** Phase 2 (reseller portal)

---

### Pitfall 13: Conversation State Corruption — Concurrent Calls Sharing State

**What goes wrong:** The voice WebSocket server maintains per-call state (Claude conversation history, current patient data, booking in progress). If state is stored in a module-level variable or a simple in-memory Map keyed incorrectly, two concurrent calls can corrupt each other's state — patient A's history bleeds into patient B's conversation.

**Why it happens:** Serverless functions are stateless by design, but a long-lived Node.js WebSocket server persists state across calls. If the developer uses a module-level `currentConversation` variable instead of a per-call-SID Map, the second call overwrites the first.

**Prevention:**
- Use Twilio's `callSid` as the primary key for all per-call state (conversation history, collected patient data, booking state machine)
- Never use module-level mutable variables for conversation state
- State must be garbage-collected when the call ends (Twilio sends a disconnect event)
- Consider Redis for call state if multiple voice server instances run concurrently

**Detection:**
- Test: make two simultaneous calls and carry different conversations — verify neither leaks into the other

**Phase:** Phase 1 (voice server architecture)

---

### Pitfall 14: ElevenLabs — Non-Streaming Breaks at Sentence Length

**What goes wrong:** Using ElevenLabs non-streaming REST API (`/v1/text-to-speech/{voice_id}`) for long responses (3+ sentences) causes the full audio to be generated before any playback starts. For a typical 20-word AI response, this adds 2-4s latency (the full generation must complete). For error-recovery messages or disclaimers (which tend to be long), this can cause 6-10s pauses.

**When non-streaming is acceptable:**
- Short, pre-defined messages (clinic greeting, hold music announcements, GDPR disclosure)
- Responses that can be fully generated before the call needs them (pre-cached audio assets)

**When streaming is mandatory:**
- Any dynamically generated AI response
- Any response longer than ~1 sentence

**Prevention:**
- Default all dynamic TTS to streaming WebSocket mode from day 1
- Pre-generate and cache static audio files (greeting, on-hold, "transferring you now") using non-streaming REST API during clinic configuration, not at call time

**Phase:** Phase 1 (voice pipeline)

---

## Minor Pitfalls

---

### Pitfall 15: Patient Experience — AI Greeting Too Long

**What goes wrong:** The clinic configures a greeting like "Thank you for calling Sunshine Family Dental, we are happy to assist you with scheduling, answering your questions about our services, insurance, and helping you with any other needs you may have..." — 15 seconds of audio before the patient can speak. Patients hang up.

**Prevention:**
- Enforce a maximum greeting length (40 words / ~5 seconds)
- UI shows a character counter with a warning above 200 characters
- Default greeting template: "Thank you for calling [Clinic Name]. How can I help you today?"

**Phase:** Phase 2 (clinic configuration UI)

---

### Pitfall 16: Twilio Webhook Validation Skipped

**What goes wrong:** Twilio signs all webhooks with an `X-Twilio-Signature` header. If you don't validate this signature, any internet actor can POST fake call events to your webhook endpoint, injecting false transcripts or triggering fake bookings.

**Prevention:**
- Validate `X-Twilio-Signature` on every Twilio webhook (status callbacks, stream start/end events)
- Use Twilio's official SDK helper (`twilio.validateRequest()`)
- Return 403 for all requests failing signature validation

**Detection:**
- Try sending a POST to your webhook URL without a valid signature — it should return 403, not 200

**Phase:** Phase 1 (voice server)

---

### Pitfall 17: AI Booking Confirmation — Patient Not Getting Email

**What goes wrong:** AI says "I've booked your appointment and you'll receive a confirmation email." The booking API call succeeds, but the email job fails (SendGrid down, wrong email address collected, email in spam). Patient arrives at wrong time because they relied on verbal confirmation only.

**Prevention:**
- AI should verbally confirm the full booking details: "I've booked you in for Tuesday the 4th at 10am with Dr. Smith. Can you confirm that's correct?" — verbal confirmation is the primary confirmation, not email
- Email is secondary; if it fails, patient still has verbal confirmation
- Avoid saying "you'll receive a confirmation email" — say "we'll try to send a confirmation email"

**Phase:** Phase 1 (conversation design)

---

### Pitfall 18: Timezone Errors in Availability (Existing Bug, Voice Amplifies It)

**What goes wrong:** CONCERNS.md documents an existing bug: availability calculation uses server local time without normalizing to the shop's configured timezone. For voice calls from EU clinics on EU-based servers, this may work. But the moment a reseller deploys clinics across timezone boundaries (e.g., UK + Ireland, or a UK clinic with a US-based server), the availability window shifts and patients are offered slots that don't exist.

**Prevention:**
- This is the same fix documented in CONCERNS.md: normalize all time comparisons to `shop.timezone`
- Must be fixed before voice goes live — voice amplifies booking errors (patient told wrong time verbally = worse UX than website error)
- Voice booking should pass the clinic's IANA timezone to all availability tool calls

**Detection:**
- Book a slot "at the boundary" (e.g., last slot of the day) via voice; compare confirmed time to what appears in the admin dashboard

**Phase:** Phase 0 (fix before voice work begins)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Voice server architecture | WebSocket incompatible with serverless (Pitfall 1) | Separate long-lived Node process, not Vercel function |
| Audio pipeline | Latency stacking over 2s budget (Pitfall 2) | Stream everything; measure each stage; deploy close to Twilio |
| Twilio audio format | ElevenLabs format mismatch (Pitfall 3) | Configure `ulaw_8000` output format from day 1 |
| Booking tool integration | Stale availability in Claude context (Pitfall 4) | Re-check availability immediately before every booking confirmation |
| Booking API calls | Double-booking race condition (Pitfall 7) | Redis idempotency + DB UNIQUE constraint + existing SELECT FOR UPDATE |
| GDPR disclosure | Voice = special category health data (Pitfall 5) | Article 9 consent flow before any EU patient touches system |
| Multi-tenant routing | Clinic context bleed (Pitfall 6) | DB lookup per call SID, clinicId validated in every tool call |
| Conversation orchestration | Infinite tool loops (Pitfall 8) | Hard 3-retry limit enforced in orchestration layer |
| Barge-in handling | Partial audio overlap (Pitfall 9) | Twilio `clear` + abort ElevenLabs stream on speech detection |
| EU phone provisioning | Regulatory bundle delays (Pitfall 10) | Pre-approve bundles per country before clinic signup |
| Long calls | Context window exhaustion (Pitfall 11) | Summarize every 10 turns, cap tool result size |
| Reseller portal | QueueUp brand leaking (Pitfall 12) | Branding audit before first reseller demo |
| Clinic configuration | Overly long AI greeting (Pitfall 15) | 40-word / 200-char limit enforced in UI |
| Webhook security | Missing Twilio signature validation (Pitfall 16) | Validate on every incoming Twilio request |
| Existing booking bug | Timezone normalization absent (Pitfall 18) | Fix before voice work; voice amplifies this error |

---

## Sources

- Twilio Media Streams documentation (training data, Aug 2025 — verify against current docs before implementation): https://www.twilio.com/docs/voice/media-streams
- ElevenLabs WebSocket TTS documentation (training data): https://elevenlabs.io/docs/developer-guides/websockets
- Anthropic Claude tool use documentation (training data): https://docs.anthropic.com/en/docs/build-with-claude/tool-use
- GDPR Article 9 special category data guidance (training data, cross-reference with DPA guidance for target EU countries)
- QueueUp CONCERNS.md (HIGH confidence — live codebase): `.planning/codebase/CONCERNS.md`
- QueueUp PROJECT.md (HIGH confidence — live codebase): `.planning/PROJECT.md`

**Confidence by pitfall category:**
| Area | Confidence | Reason |
|------|------------|--------|
| Twilio Media Streams WebSocket pitfalls | HIGH | Well-documented architectural constraint; widely reported |
| Voice latency pipeline | HIGH | Latency ranges from ElevenLabs/Twilio docs widely published |
| ElevenLabs format mismatch | HIGH | Twilio mulaw requirement is documented; ElevenLabs output formats are documented |
| Claude tool use failure modes | HIGH | Directly observable from Claude API behavior patterns |
| GDPR special category | HIGH | GDPR Article 9 text is authoritative; well-established in EU |
| Race conditions (booking) | HIGH | Directly verified against live CONCERNS.md codebase analysis |
| Twilio EU regulatory bundles | MEDIUM | Verified from training data; confirm against current Twilio regulatory portal |
| ElevenLabs streaming vs non-streaming | MEDIUM | Core behavior verified; specific latency numbers are approximations |
| Multi-tenant isolation patterns | HIGH | General distributed systems knowledge; specific to this architecture |
