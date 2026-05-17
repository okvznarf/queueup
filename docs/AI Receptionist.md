# AI Receptionist

AI receptionist for auto repair shops (mechanics, body shops, tire shops). Handles inbound **phone calls** and **web chat** 24/7 — booking jobs, rescheduling, cancelling, quoting basic services, and collecting vehicle info (year / make / model, complaint, contact). Designed for small independent shops where the owner is under a car or with a customer when the phone rings.

> **Core value:** A driver can call at 8pm with a brake issue and have a slot booked for tomorrow morning — as naturally as talking to a real receptionist. Captures the revenue currently lost to voicemail.

> **Codebase note:** The historical field name `clinicId` (from the original healthcare positioning) now semantically represents `shopId`. Field/function names are preserved for backwards compatibility; product-facing language uses *shop* / *driver* / *customer*.

## Architecture

```
Voice:  Twilio Media Streams  ──▶  voice-service (Railway, eu-west)
                                    ├─ Deepgram Nova-2 (STT, mulaw 8kHz)
                                    ├─ Claude Sonnet 4.6 (brain + tool_use loop)
                                    └─ ElevenLabs (TTS, eleven_flash_v2_5, ulaw_8000)

Chat:   <script src="chat.js"> ──▶  chat-widget (Preact IIFE in Shadow DOM)
                                    └─ POST /chat (SSE) ──▶ voice-service (same Claude brain)

Both channels ──▶ QueueUp APIs (booking, availability, shop context, appointment lookup)
                 via INTERNAL_SERVICE_TOKEN Bearer auth
```

- **Voice orchestrator:** persistent Node.js service on Railway — Twilio Media Streams hold an open WebSocket for the full call, so Vercel serverless is not an option
- **Chat backend:** same voice-service process — one Claude brain, both channels
- **Data residency:** Railway `region: eu-west` for GDPR-04
- **AI model:** `claude-sonnet-4-6` (fast enough for real-time voice)

## Code Layout

```
voice-service/               ── Railway Node.js (voice + chat backend)
├── src/handlers/
│   ├── twilioStream.ts      Twilio WebSocket router + session lifecycle + consent gate
│   ├── deepgramClient.ts    Per-call Deepgram Nova-2 STT
│   ├── consentFlow.ts       GDPR consent state machine + Aria script
│   ├── claudeSession.ts     Claude brain: buildSystemPrompt, fetchShopContext, processPatientUtterance
│   ├── bookingTools.ts      5 Anthropic tools + dispatchTool() → QueueUp APIs
│   ├── elevenLabsTts.ts     ElevenLabs TTS → Twilio mulaw streaming
│   ├── escalation.ts        Phrase detection + warm transfer via Twilio REST
│   └── chatSession.ts       In-memory chat session map (30-min expiry)
├── src/routes/
│   ├── twiml.ts             POST /twiml with Twilio signature validation
│   ├── chatRoute.ts         POST /chat (SSE) + OPTIONS preflight
│   └── health.ts            GET /health
├── src/lib/
│   ├── auditLog.ts          GDPR audit log + call summary → QueueUp
│   ├── retentionCron.ts     24h cron deleting VoiceTranscripts past `deleteAfter`
│   ├── idempotency.ts       Redis-backed idempotency wrapper
│   ├── prisma.ts, logger.ts
├── Dockerfile               Multi-stage build
└── railway.json             eu-west region

chat-widget/                 ── Embeddable Preact widget (built IIFE)
├── src/
│   ├── widget.tsx           Entry: reads data-shop-id, mounts in Shadow DOM
│   ├── App.tsx              Bubble, panel, consent gate, message list, input
│   ├── Consent.tsx          GDPR consent overlay (Accept / Decline)
│   ├── Messages.tsx         Message list with auto-scroll
│   ├── api.ts               SSE fetch to POST /chat, decodes chunks
│   ├── session.ts           sessionStorage namespaced by shopId
│   └── styles.ts            getStyles(primaryColor) → CSS string
├── build.js                 esbuild IIFE → public/widget/chat.js
└── package.json             preact ^10.29, esbuild ^0.27

public/widget/chat.js        Built bundle (served by Next.js)

QueueUp (Next.js) integration points:
├── src/lib/serviceAuth.ts           verifyServiceToken + requireServiceOrAdmin
├── src/app/api/appointments/lookup  GET by phone + shopId (service-token auth)
├── src/app/api/appointments/[id]    PATCH now accepts service token
├── src/app/api/internal/shop-context GET shop bundle (2-min cache)
├── src/app/api/voice/summary        PATCH endpoint for end-of-call summary
└── src/app/api/widget/config        GET shop name + primaryColor (public, CORS)

prisma/schema.prisma         VoiceCall, VoiceTranscript, VoiceAuditLog models
```

## Voice Pipeline (Phase 1 — shipped 2026-03-31)

Incoming call flow:
1. Twilio hits `POST /twiml` → TwiML returns `<Stream url="wss://.../voice-stream">`
2. WebSocket opens — `twilioStream.ts` creates per-call `Session` (callSid, streamSid, clinicId, consentState)
3. **Consent gate** (`consentFlow.ts`) — Aria self-identifies and asks: _"This call is handled by an AI... may involve recording your contact details and vehicle information. Do you agree to proceed?"_ Classifies granted / declined / ambiguous. All conversation blocked until granted.
4. Caller audio (mulaw 8kHz) streams through Deepgram Nova-2 → transcript
5. Claude (`processPatientUtterance`) runs the agentic tool_use loop (see below), streams sentences to ElevenLabs
6. ElevenLabs `eleven_flash_v2_5` with `output_format=ulaw_8000` → Twilio stream
7. On stop: `generateCallSummary()` → PATCH `/api/voice/summary` (fire-and-forget; never blocks cleanup)

Escalation: 2 unanswered questions (detected via _"I'm not sure about that"_) OR explicit phrases ("talk to a human", etc.) → `executeWarmTransfer()` uses Twilio REST `calls(sid).update()` with TwiML Dial to the staff number.

## Agentic Tool Loop (Phase 2-02 — shipped 2026-04-01)

`processPatientUtterance` uses **non-streaming** `anthropic.messages.create()` — tool calls must resolve before speaking; only final `end_turn` text is streamed to TTS.

```
while (true) {
  response = anthropic.messages.create({ tools: BOOKING_TOOLS, messages })
  if (response.stop_reason === 'end_turn') → stream text to TTS, break
  if (response.stop_reason === 'tool_use') → dispatchTool() → append tool_result, continue
  if (iterations >= MAX_TOOL_ITERATIONS = 5) → escalate + graceful message, break
}
```

**Tools (`BOOKING_TOOLS`):**

| Tool | QueueUp API |
|------|-------------|
| `check_availability` | `GET /api/availability` |
| `book_appointment` | `POST /api/appointments` |
| `reschedule_appointment` | `POST` new + `PATCH` old — aborts if new slot 409, never cancels old on failure |
| `cancel_appointment` | `PATCH /api/appointments/[id]` with status CANCELLED |
| `check_services` | reads `session.shopContext.services` (no API call) |

**System prompt** (`buildSystemPrompt(ctx, channel)`):
- Injects live shop name, hours, services (oil change, brake job, diagnostic, etc.), staff (mechanics on duty), timezone, currency
- Uses `staffLabel` dynamically; omits the mechanic-preference question when `staffCount < 2` (one-bay shops)
- Channel-aware: voice vs chat
- Persona guardrails: AI confirms appointments and prices from the service catalog only — **never diagnoses repairs or quotes parts/labor outside the configured price list** (liability)

## Web Chat Widget (Phase 2-03/04 — shipped 2026-04-01)

**Embed:**
```html
<script src="https://www.queueup.me/widget/chat.js"
        data-shop-id="demo-barber"
        data-api-url="https://voice.queueup.com"></script>
```

- **Shadow DOM** isolation — no CSS leaks to/from host page
- **GDPR consent gate** blocks the input field until patient clicks Accept. Consent persisted in `sessionStorage['queueup_session_<shopId>_consent']`
- **sessionStorage persistence** per shopId — conversation survives page refresh, dies with tab close
- **SSE streaming** — `api.ts` reads `data: {"type":"text","delta":"..."}` events, streams to UI in real time
- **Shop branding** — fetches [api/widget/config](../src/app/api/widget/config/route.ts) for `shopName` + `primaryColor`

**Backend (`chatRoute.ts`):**
- `POST /chat` — validates `consentGranted` server-side (**403 if false** — never trust client)
- In-memory session map keyed by `sessionId`, 30-min inactivity expiry, lazy cleanup on each request
- Delegates to `processPatientUtterance()` — same Claude brain as voice
- Chat sessions satisfy the `Session` interface by setting `callSid` and `streamSid` to `'chat-<sessionId>'`

## GDPR Compliance

| Requirement | Implementation |
|-------------|----------------|
| **GDPR-01** (retention) | `VoiceTranscript.deleteAfter` (default now + 90d); `retentionCron.ts` runs every 24h deleting expired records |
| **GDPR-03** (audit) | Every call → `VoiceAuditLog` row (callSid, clinicId, consentState, actionsLog, timestamps) |
| **GDPR-04** (EU residency) | Railway `region: eu-west` in [railway.json](../voice-service/railway.json) |
| **Voice consent** | `consentFlow.ts` — verbal consent at call start, timestamp in audit log, conversation gated until granted |
| **Chat consent** | Widget consent gate + server-side 403 if `consentGranted !== true` |

## Integration with QueueUp

Service-to-service auth pattern ([serviceAuth.ts](../src/lib/serviceAuth.ts)):
- `INTERNAL_SERVICE_TOKEN` Bearer header
- `requireServiceOrAdmin()` tries service token (no DB lookup) first, falls back to admin JWT
- Service-token path **skips role-based checks** — AI is a trusted agent, not a user
- Pattern used on all internal AI-callable endpoints under `/api/internal/*` and the patched `/api/appointments/[id]`

## Environment Variables

Required on voice-service (Railway):
- `ANTHROPIC_API_KEY`, `DEEPGRAM_API_KEY`, `ELEVENLABS_API_KEY`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
- `INTERNAL_SERVICE_TOKEN` — must match the value set on QueueUp
- `QUEUEUP_API_URL` — base URL of QueueUp Next.js app
- `DATABASE_URL` — shared PostgreSQL (VoiceCall / VoiceTranscript / VoiceAuditLog)
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — idempotency store

## Phase Status

| Phase | Title | Status | Requirements |
|-------|-------|--------|--------------|
| 1 | Voice Pipeline + GDPR Foundation | **Complete** 2026-03-31 | VOICE-01..06, BOOK-05, GDPR-01/03/04 |
| 2 | Booking AI + Web Chat | **Complete** 2026-04-01 | CHAT-01..04, BOOK-01..04/06, INTAKE-01/02, FAQ-02/03 |
| 3 | Shop Admin Portal | Not started | CLINIC-01..08, INTAKE-03, FAQ-01/04, GDPR-02 |
| 4 | Multi-Tenant White-Label Portal | Not started | RESELLER-01..04 |
| 5 | Analytics Dashboard | Not started | ANALYTICS-01..04 |

### Phase 2 last checkpoint

Plan 02-04 ends with a **blocking human-verify checkpoint** — embed the built widget on a test HTML page with both dev servers running (Next.js on :3000, voice-service on :3001) and walk through the 12-step flow: bubble appears, consent blocks input, AI responds with demo-barber hours, conversation persists across refresh, clears on tab close, branding uses shop's primary color. Still to be signed off before Phase 2 can be marked verified.

## What's Still To Do

### Phase 2 — finish verification
- [ ] Run the human-verify checkpoint from [02-04-PLAN.md](../.planning/phases/02-booking-ai-web-chat/02-04-PLAN.md) — 12-step end-to-end flow on a real test page
- [ ] Write `02-03-SUMMARY.md` and `02-04-SUMMARY.md` (STATE.md shows plan 2/4 done — needs updating to 4/4 once checkpoint signs off)
- [ ] **Live E2E voice test** deferred from Phase 1 — requires a purchased Twilio EU number and live Deepgram/ElevenLabs keys; all unit tests pass with mocks (10 files, 61 tests)

### Phase 3 — Shop Admin Portal
Shop owners need a portal to self-serve everything currently hardcoded or configured via DB:
- [ ] AI greeting, ElevenLabs voice selection, escalation keyword editor (CLINIC-01) — changes take effect on next call without redeploy
- [ ] In-portal Twilio phone number provisioning (CLINIC-02) — number ready in < 5 min
- [ ] **Service catalog + price list** (CLINIC-03, FAQ-01) — owner enters services (oil change, brake pads, alignment, diagnostic fee, etc.) with flat price or "from X €"; AI quotes only from this list
- [ ] Vehicle intake field configuration (CLINIC-04, INTAKE-03) — admin picks which fields AI collects (year/make/model required; license plate, VIN, mileage optional) and which are required
- [ ] **GDPR Article 17 erasure** (CLINIC-05, GDPR-02) — single-action delete of a customer's conversation turns, transcripts, and intake within 60s
- [ ] Unanswered-question surfacing (FAQ-04) — AI's "I'm not sure" moments flagged for admin to add to service catalog or FAQ
- [ ] Business hours + mechanic transfer number configuration (CLINIC-06..08)

### Phase 4 — Multi-Tenant White-Label Portal
White-label multi-tenant portal for partners (regional parts distributors, multi-location shop groups, franchise chains) who manage many shops at once:
- [ ] Subdomain routing (`portal.partner-brand.com`) with partner logo + primary color (RESELLER-01) — no QueueUp branding anywhere
- [ ] Shop account CRUD + suspend (RESELLER-02) — suspended shop AI stops answering calls immediately
- [ ] Per-shop usage rollup (RESELLER-03) — call/chat volume, AI booking rate across all their shops
- [ ] Impersonation: "View as shop admin" (RESELLER-04) — logged in audit trail

### Phase 5 — Analytics Dashboard
Time-series data for both shop admins and white-label partners:
- [ ] Call + chat volume chart, daily/weekly (ANALYTICS-01)
- [ ] AI booking completion rate (ANALYTICS-02) — % of conversations that booked without human handoff
- [ ] **Recovered revenue estimate** — count of after-hours / missed-while-on-other-line bookings × average ticket value (mechanics' #1 ROI metric)
- [ ] Top unanswered questions, ranked by frequency (ANALYTICS-03)
- [ ] Missed-call-rate reduction vs baseline date (ANALYTICS-04)

### Known follow-ups / blockers
- **Deepgram tuning** — `endpointing` / `speechEndThreshold` values need to be measured against real telephony audio; hardcoded values may not be optimal
- **QueueUp timezone bug** — availability calculations have a pre-existing timezone issue that must be scoped before any Phase 3 booking polish (1-hour fix vs multi-day migration is unknown)
- **Twilio EU Regulatory Bundle** approval lead times vary by country (DE/FR/IT/ES/NL) — start early in Phase 3 to avoid go-live delay

### Explicitly out of scope (v1)
SMS/WhatsApp/email channels, multi-language, deep DMS integrations (Shopmonkey / Mitchell 1 / Tekmetric / AutoFluent — defer until first 20 customers prove which one matters), AI repair diagnosis or labor-time estimates (permanent — liability), parts ordering, outbound calling.

---

## Links
- [[Architecture]]
- [[API Routes]]
- [[Database Schema]]
- [[Security]]
- [[Reliability]]
- [[Environment Variables]]
- [[Roadmap]]
- [Planning root](../.planning/PROJECT.md) · [Roadmap](../.planning/ROADMAP.md) · [State](../.planning/STATE.md)
