# Technology Stack

**Project:** QueueUp AI Receptionist
**Researched:** 2026-03-28
**Research mode:** Ecosystem — AI voice receptionist for dental/medical clinics

> **Note on sources:** WebSearch and WebFetch tools were unavailable during this research session.
> All findings are from training data (cutoff August 2025). Confidence levels reflect this.
> Critical version numbers should be verified against npm/official docs before build begins.

---

## Recommended Stack

### Telephony Layer

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| twilio (Node SDK) | ^5.x | Inbound call handling, phone number provisioning, call routing | Industry standard; `twilio@^5.12.2` already in project dependencies |
| Twilio Media Streams | Protocol (no version) | Real-time bidirectional audio over WebSocket | **Required for voice AI** — streams raw audio both ways; TwiML alone cannot do real-time AI responses |
| Twilio TwiML | Built into SDK | Initial call routing verb (`<Connect><Stream>`) | Used only to initiate the Media Stream connection, not for response generation |

**Twilio Media Streams vs TwiML — Decision: Use Media Streams.**

TwiML (`<Say>`, `<Gather>`) is a request/response telephony model: Twilio plays audio, waits for DTMF or speech, then POSTs to your webhook. This model has 2–5 second round-trip overhead per turn and cannot stream AI-generated audio progressively. It is suitable only for simple IVR menus.

Twilio Media Streams opens a persistent WebSocket from Twilio's media servers to your backend. Raw mulaw/PCMU audio (8kHz, 8-bit) streams continuously in both directions. Your server receives the caller's audio frames in real time, pipes them to STT, runs Claude, pipes TTS output back, and Twilio plays it. This is the only architecture that achieves sub-2-second turn latency. All real-time voice AI products (Bland.ai, Vapi, Retell) use this model.

The TwiML `<Connect><Stream>` verb is still needed — it is how you tell Twilio to open the Media Stream WebSocket to your server URL. So TwiML is used once at call start; Media Streams handles everything after.

**Confidence: HIGH** (well-documented Twilio pattern, unchanged since 2023)

---

### Speech-to-Text (STT)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Deepgram Nova-2 | API (streaming) | Real-time transcription of caller audio | Best latency/accuracy tradeoff for telephony audio; 200–300ms streaming latency |

**Decision: Deepgram over ElevenLabs STT, AssemblyAI, and OpenAI Whisper.**

Rationale by option:

- **Deepgram Nova-2:** Purpose-built for real-time streaming. Connects via WebSocket, returns partials + finals. Latency ~200–300ms from speech end to final transcript. Handles telephony audio (8kHz mulaw) natively with `encoding=mulaw&sample_rate=8000` params. Has `endpointing` parameter to detect end-of-utterance. Best-in-class for this use case. Cost: ~$0.0043/min.
- **ElevenLabs STT:** ElevenLabs added STT (via acquisition of Scribe in 2024) but it is not yet optimized for real-time telephony streaming as of mid-2025. ElevenLabs' strength is TTS, not STT. Using ElevenLabs for both STT+TTS creates vendor lock-in and their STT adds latency vs Deepgram.
- **AssemblyAI:** Good streaming STT, slightly higher latency than Deepgram (~400ms). Better for long-form transcription use cases. Overkill for this project.
- **OpenAI Whisper (API):** Batch-only via OpenAI API — no streaming. You must buffer audio, send chunks, wait for response. This adds 1–3 seconds per turn. Unusable for real-time voice. The open-source whisper.cpp can stream but requires self-hosting.
- **Google Speech-to-Text:** Comparable to Deepgram but more complex API, higher cost, less telephony-optimized.

**Confidence: HIGH** (Deepgram's streaming WebSocket API is well-established; latency figures are from official Deepgram benchmarks in my training data)

---

### Text-to-Speech (TTS)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| ElevenLabs Streaming TTS | API v1 | Convert Claude's text responses to natural speech | Best naturalness for healthcare context; streaming API enables progressive audio delivery |

**Decision: ElevenLabs over Google WaveNet, Azure Neural TTS, and Amazon Polly.**

Rationale:

- **ElevenLabs:** Produces the most natural-sounding speech of any commercial TTS as of 2025. Supports streaming (audio chunks streamed as text is generated, reducing time-to-first-audio to ~300–500ms). Has a `eleven_turbo_v2_5` model optimized for low latency (~300ms TTFA). Supports custom voice cloning — useful for clinics that want a branded voice. Cost: ~$0.30/1000 chars (Creator plan; check current pricing).
- **Google WaveNet / Azure Neural:** Cheaper but noticeably more robotic. Patients in healthcare contexts are sensitive to unnatural voices — ElevenLabs quality justifies cost.
- **Amazon Polly:** Fast (low latency), cheap, but quality is noticeably lower than ElevenLabs. Acceptable for IVR, not acceptable for a premium AI receptionist product.
- **OpenAI TTS:** Good quality, cheaper than ElevenLabs, but no streaming — response must complete before audio starts. Adds ~500ms–1s latency vs ElevenLabs streaming.

**ElevenLabs streaming model:** Use `eleven_turbo_v2_5` (not `eleven_multilingual_v2`) — turbo is 50% faster TTFA. Stream audio chunks as they arrive from ElevenLabs directly into the Twilio Media Stream WebSocket. Do not buffer the full response.

**Confidence: HIGH** (ElevenLabs streaming API and turbo model are well-documented in my training data; model names may have updated — verify current model names at elevenlabs.io/docs)

---

### AI Brain

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @anthropic-ai/sdk | ^0.39.0 (already installed) | Conversation reasoning, tool use, booking actions | Already chosen; team familiar; tool use API is best-in-class for structured function calling |
| claude-sonnet-4-6 | Current | Primary model | Already in use in project; good balance of speed vs capability for booking tasks |

**Claude Tool Use Pattern for booking actions:**

Use the Messages API with `tools` parameter. Define tools as JSON schemas that map to QueueUp booking API actions:

```typescript
const tools = [
  {
    name: "check_availability",
    description: "Check available appointment slots for a given service, staff member, and date range",
    input_schema: {
      type: "object",
      properties: {
        service_id: { type: "string" },
        staff_id: { type: "string", description: "Optional — omit to check any staff" },
        date_from: { type: "string", format: "date" },
        date_to: { type: "string", format: "date" }
      },
      required: ["service_id", "date_from", "date_to"]
    }
  },
  {
    name: "book_appointment",
    description: "Book an appointment slot for a patient",
    input_schema: {
      type: "object",
      properties: {
        slot_id: { type: "string" },
        patient_name: { type: "string" },
        patient_phone: { type: "string" },
        patient_email: { type: "string" },
        reason_for_visit: { type: "string" }
      },
      required: ["slot_id", "patient_name", "patient_phone"]
    }
  },
  {
    name: "cancel_appointment",
    description: "Cancel an existing appointment by appointment ID",
    input_schema: {
      type: "object",
      properties: {
        appointment_id: { type: "string" },
        reason: { type: "string" }
      },
      required: ["appointment_id"]
    }
  },
  {
    name: "transfer_to_human",
    description: "Transfer the call to a human staff member when the patient requests it or when AI cannot help",
    input_schema: {
      type: "object",
      properties: {
        reason: { type: "string" }
      },
      required: ["reason"]
    }
  }
];
```

**Streaming tool use:** Use `stream: true` on the Messages API. Handle `content_block_delta` events to extract text tokens as they arrive. Start TTS as soon as the first sentence boundary is detected — do not wait for Claude to finish the full response. This is critical for achieving sub-2-second perceived latency.

**Turn management:** Claude does not maintain conversation state. Pass the full conversation history (`messages` array) on every call. Store the history in memory on the WebSocket session object (not the database — per-call, ephemeral).

**System prompt placement:** Put clinic-specific context (name, hours, services, FAQs, booking rules) in the system prompt. Regenerate the system prompt per call from the clinic's database record. Do not hardcode.

**Confidence: HIGH** (Anthropic SDK 0.39.0 already in project; tool use API stable since 2023)

---

### WebSocket Orchestration Layer

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Node.js | 20+ | WebSocket server runtime | Already project runtime; non-blocking I/O ideal for audio streaming |
| ws | ^8.x | WebSocket server library | Minimal, battle-tested; used by Twilio's own Node examples for Media Streams |
| Fastify | ^4.x | HTTP + WebSocket server | Faster than Express for high-throughput; built-in WebSocket plugin (`@fastify/websocket`) |

**Architecture: Dedicated WebSocket microservice, not Next.js API routes.**

Next.js API routes (App Router) do not support persistent WebSocket connections. Vercel serverless functions have a 10-second execution limit and cannot hold a 3-minute phone call. The voice orchestration layer must be a separate long-running Node.js process.

**Recommended deployment:** Railway or Fly.io (not Vercel) for the voice microservice. Railway supports persistent Node.js processes, auto-deploys from GitHub, and has WebSocket support. Fly.io is an alternative with better global edge latency (important for voice).

**Recommended structure:**

```
voice-service/         ← separate Node.js app (not in Next.js)
  src/
    server.ts          ← Fastify + WebSocket server
    handlers/
      twilioStream.ts  ← handles Twilio Media Stream WebSocket
      deepgramStream.ts ← manages Deepgram STT WebSocket
      elevenLabsStream.ts ← manages ElevenLabs TTS streaming
      claudeSession.ts ← manages Claude conversation state per call
    routes/
      twiml.ts         ← POST /twiml — returns TwiML to initiate Media Stream
      health.ts        ← GET /health
```

**Audio pipeline per call:**

```
Twilio WS (mulaw 8kHz) → Deepgram WS (STT) → Claude API (tool use) → ElevenLabs API (TTS streaming) → Twilio WS
```

Each call = one Twilio WebSocket connection + one Deepgram WebSocket connection + one ElevenLabs HTTP stream. These three must be managed concurrently within the same session context.

**Barge-in (interruption) handling:** When Deepgram returns a final transcript while ElevenLabs audio is still streaming to Twilio, the patient is interrupting. Detect this: if a new Deepgram `SpeechFinal` event arrives before the previous TTS stream completes, cancel the ElevenLabs stream, send a Twilio `clear` message on the Media Stream to stop playback, then process the new input.

**Confidence: HIGH** for architecture pattern. MEDIUM for specific library versions (verify `ws@8.x` and `@fastify/websocket` current versions on npm).

---

### Web Chat Widget

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vanilla JS (no framework) | ES2020+ | Embeddable chat widget script | Framework-free = no conflicts with clinic's existing website tech stack |
| WebSocket (native browser API) | — | Real-time chat communication | Native, no library needed in browser |
| Shadow DOM | — | Widget style isolation | Prevents CSS conflicts between widget and host page |

**Decision: Vanilla JS widget over React.**

Clinics embed the widget with a one-line snippet: `<script src="https://cdn.queueup.me/widget.js" data-clinic="demo-dental"></script>`. A React bundle (even tree-shaken) adds 40–100KB. A vanilla JS widget with Shadow DOM can be under 10KB gzipped. Clinics' websites may already use React or Vue — shipping another React instance creates conflicts.

**Widget architecture:**

```javascript
// widget.js — self-contained IIFE
(function() {
  const shadow = document.createElement('div').attachShadow({ mode: 'closed' });
  // Inject styles into shadow root (no bleed-through)
  // Create chat UI elements
  // Connect to WebSocket at wss://voice-service-host/chat
  // Handle send/receive messages
})();
```

**Chat backend:** The same voice microservice (Fastify) handles chat WebSocket connections at `/chat`. The chat pipeline is: WebSocket message → Claude API (same tool use schema) → stream response tokens back to client. No STT/TTS needed for chat.

**GDPR consent:** Widget shows consent banner before first message. `localStorage` stores consent flag per clinic ID. No conversation data stored in browser beyond the session.

**Confidence: HIGH** for pattern. MEDIUM for bundle size targets (verify with actual build).

---

### White-Label Reseller Portal

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js App Router | 16.x (match existing) | Reseller + clinic admin portal | Already in use; team familiar; App Router handles subdomain routing |
| Prisma 7 | 7.x (match existing) | ORM for portal database | Already in use; reuse existing patterns |
| Tailwind CSS 4 | 4.x (match existing) | Styling | Already in use |

**Subdomain routing strategy:**

Option A — **Wildcard subdomain on the portal app** (recommended): Deploy portal at `portal.queueup.me`. Resellers get `reseller-name.portal.queueup.me`. Clinics get `clinic-slug.portal.queueup.me`. Use Next.js middleware to read `request.headers.get('host')`, look up the subdomain in database, and inject reseller branding into the layout.

Option B — **Custom domains**: Resellers bring their own domain (e.g., `portal.dentalgroup.com`). Requires DNS CNAME to your platform + SSL certificate provisioning. Implement with Vercel's custom domain API or Caddy as reverse proxy. This is a v2 feature — do not build for MVP.

**Next.js middleware for subdomain routing:**

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const subdomain = host.split('.')[0]; // e.g., "acme-dental"

  // Rewrite to /portal/[subdomain]/... internally
  // The subdomain slug is used to load branding from DB
  const url = request.nextUrl.clone();
  url.pathname = `/portal/${subdomain}${url.pathname}`;
  return NextResponse.rewrite(url);
}
```

**Branding data model (additions to existing Prisma schema):**

```
Reseller { id, slug, name, logoUrl, primaryColor, domain? }
Clinic { id, resellerId, slug, name, twilioPhoneNumber, aiConfig (JSON), ... }
```

**AI config per clinic** (stored as JSON in `Clinic.aiConfig`):

```json
{
  "greeting": "Hello, thank you for calling City Dental. How can I help you today?",
  "voice_id": "EXAVITQu4vr4xnSDxMaL",
  "escalation_phone": "+441234567890",
  "faqs": [
    { "q": "Do you accept NHS patients?", "a": "Yes, we accept NHS patients on Mondays and Wednesdays." }
  ],
  "intake_fields": ["name", "dob", "phone", "email", "reason", "insurance"]
}
```

**Confidence: HIGH** for Next.js subdomain middleware pattern. MEDIUM for wildcard subdomain DNS setup details (verify with Vercel docs for wildcard domain support on the Pro plan).

---

### Infrastructure & Deployment

| Component | Platform | Why |
|-----------|----------|-----|
| Portal (Next.js) | Vercel | Already deployed here; App Router optimized for Vercel |
| Voice microservice | Railway | Persistent Node.js process, WebSocket support, simple GitHub deploy |
| Database | Vercel Postgres (or Supabase) | Already in use; add new tables for AI Receptionist data |
| CDN (widget.js) | Vercel Edge / Cloudflare | Low-latency widget delivery globally |
| Phone numbers | Twilio (per clinic provisioning) | Twilio's API allows purchasing numbers programmatically |

**Voice microservice on Railway vs alternatives:**
- **Railway:** Simple deploys, ~$5/month for always-on service, WebSocket native. Best for getting to MVP fast.
- **Fly.io:** Better global latency (closer to Twilio's media infrastructure), but more config. Use if voice latency becomes a problem in production.
- **Render:** Similar to Railway; slightly less mature WebSocket support.
- **AWS EC2 / ECS:** Overkill for MVP. Revisit at scale.

**Confidence: MEDIUM** (Railway and Fly.io capabilities from training data; pricing may have changed — verify current Railway pricing)

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Telephony protocol | Twilio Media Streams | Twilio TwiML `<Say>`/`<Gather>` | TwiML is request/response; 2–5s per turn; cannot stream AI audio |
| STT | Deepgram Nova-2 | OpenAI Whisper API | Whisper API is batch-only; no streaming; adds 1–3s latency |
| STT | Deepgram Nova-2 | AssemblyAI streaming | Comparable but ~400ms vs 200ms latency; higher cost |
| STT | Deepgram Nova-2 | ElevenLabs STT (Scribe) | Not optimized for telephony streaming as of mid-2025 |
| TTS | ElevenLabs turbo_v2_5 | Amazon Polly | Polly is cheap but sounds robotic; poor fit for premium healthcare product |
| TTS | ElevenLabs turbo_v2_5 | OpenAI TTS | No streaming; full response must complete before audio starts |
| TTS | ElevenLabs turbo_v2_5 | Google WaveNet | Lower quality; no progressive streaming |
| Voice orchestration server | Fastify + ws | Next.js API routes | Next.js serverless cannot hold persistent WebSocket connections |
| Voice orchestration server | Fastify + ws | Express.js + ws | Fastify is 2–3x faster than Express under load; better TypeScript types |
| Chat widget | Vanilla JS | React widget | React adds 40–100KB; causes conflicts on clinics' existing React sites |
| Voice platform (all-in-one) | Build own (Twilio + Deepgram + ElevenLabs + Claude) | Vapi.ai or Retell.ai | All-in-one platforms charge per-minute markup (~$0.05–0.10/min) with no white-labeling; unacceptable margin compression at reseller pricing model |
| Portal hosting | Vercel | AWS Amplify | Already on Vercel; no reason to switch |

---

## Voice Latency Budget

Target: **< 2 second turn latency** (speech end → AI response audio starts)

| Stage | Latency | Notes |
|-------|---------|-------|
| Deepgram STT (speech end → transcript) | ~200–300ms | Nova-2 streaming with `endpointing=300` |
| Network: transcript → Claude | ~10–30ms | Internal service call |
| Claude (first token) | ~300–600ms | Sonnet; streaming enabled; tool-free turns faster |
| Claude tool call round-trip (if booking) | +400–800ms | QueueUp API call; adds one extra turn |
| ElevenLabs TTFA (first audio chunk) | ~300–500ms | `eleven_turbo_v2_5`; streaming |
| Network: ElevenLabs → Twilio | ~20–50ms | |
| **Total (no tool call)** | **~830ms–1.5s** | Comfortable under 2s target |
| **Total (with tool call)** | **~1.2s–2.3s** | Borderline; optimize Claude prompt to batch tool calls |

**Optimization levers if latency exceeds target:**
1. Switch to `claude-haiku-3-5` for simple turns (availability check, FAQ answers); use Sonnet only for complex reasoning
2. Pre-warm Deepgram WebSocket (connect before patient starts speaking)
3. Cache clinic system prompt — do not re-fetch from DB on every turn
4. Use Deepgram `interim_results=true` to start Claude processing before patient finishes speaking (speculative execution; discard if transcript changes)

**Confidence: MEDIUM** (latency figures are benchmarks from training data; real-world numbers depend on network geography, server region, and audio quality — measure in production)

---

## Installation

```bash
# Voice microservice (new package)
mkdir voice-service && cd voice-service
npm init -y
npm install fastify @fastify/websocket ws @deepgram/sdk @anthropic-ai/sdk elevenlabs twilio

# Dev dependencies
npm install -D typescript @types/node @types/ws tsx

# Existing QueueUp portal — add portal-specific deps
cd ..
npm install twilio  # already at ^5.12.2 — verify version
```

**New environment variables required:**

```bash
# Voice microservice
DEEPGRAM_API_KEY=
ELEVENLABS_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
ANTHROPIC_API_KEY=
QUEUEUP_API_BASE_URL=https://queueup.me/api   # internal booking API

# Portal additions
TWILIO_ACCOUNT_SID=     # for phone number provisioning
TWILIO_AUTH_TOKEN=
```

---

## Key Library Versions to Verify

These versions are from training data (cutoff August 2025). Verify before adding to package.json:

| Library | Training Data Version | Verify At |
|---------|----------------------|-----------|
| @deepgram/sdk | ^3.x | npmjs.com/@deepgram/sdk |
| elevenlabs | ^1.x | npmjs.com/elevenlabs |
| @fastify/websocket | ^9.x | npmjs.com/@fastify/websocket |
| ws | ^8.18.x | npmjs.com/ws |
| twilio | ^5.12.2 | already in project |
| @anthropic-ai/sdk | ^0.39.0 | already in project |

---

## Sources

> Web search and official documentation were unavailable during this research session.
> All findings are based on training data (knowledge cutoff August 2025).

| Claim | Confidence | Basis |
|-------|------------|-------|
| Twilio Media Streams for real-time voice AI | HIGH | Twilio Media Streams is documented since 2019; the architecture is well-established and unchanged |
| Deepgram Nova-2 latency ~200–300ms | MEDIUM | From Deepgram's published benchmarks in training data; verify at deepgram.com |
| ElevenLabs `eleven_turbo_v2_5` TTFA ~300–500ms | MEDIUM | From ElevenLabs documentation in training data; model names may have changed — verify at elevenlabs.io/docs |
| Claude streaming tool use pattern | HIGH | Anthropic SDK 0.39.0 already in project; tool use API stable since 2023 |
| Next.js middleware subdomain routing | HIGH | Standard Next.js App Router pattern; well-documented |
| Railway for persistent WebSocket service | MEDIUM | Training data; verify current Railway WebSocket support and pricing |
| Vanilla JS Shadow DOM widget pattern | HIGH | Standard web platform feature; no external verification needed |
| Vapi/Retell per-minute pricing making them uneconomical | MEDIUM | From training data; verify current pricing before ruling out |
