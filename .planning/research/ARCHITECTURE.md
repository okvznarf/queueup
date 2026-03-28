# Architecture Patterns: AI Voice Receptionist

**Domain:** AI voice receptionist SaaS for healthcare clinics
**Researched:** 2026-03-28
**Confidence:** MEDIUM-HIGH (training data through Aug 2025; web verification blocked in this session)

---

## Recommended Architecture

The system is a **real-time voice/chat orchestration layer** that sits between telephony/web channels and an existing booking engine. It is not a monolith — it is a set of distinct runtime concerns that must be separated because they have incompatible hosting requirements: long-lived WebSocket connections cannot run on serverless (Vercel Hobby), while the portal and booking API can.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PATIENT CHANNELS                            │
│   [Phone Call (Twilio)]          [Web Chat (Embedded Widget)]       │
└──────────┬───────────────────────────────────┬──────────────────────┘
           │ Media Stream WebSocket            │ WebSocket / HTTP
           ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      VOICE/CHAT ORCHESTRATOR                        │
│           (Node.js WebSocket server — persistent process)           │
│                                                                     │
│  ┌─────────────────┐   ┌──────────────────┐   ┌─────────────────┐  │
│  │  Audio Pipeline │   │  Session Manager │   │  Tool Executor  │  │
│  │ Twilio ↔ EL11   │   │  (per-call/chat) │   │  (Claude tools) │  │
│  └────────┬────────┘   └────────┬─────────┘   └────────┬────────┘  │
│           │ transcribed text    │ context              │ results   │
│           └─────────────────────▼──────────────────────┘           │
│                         ┌─────────────┐                             │
│                         │  Claude API │                             │
│                         │  (claude-   │                             │
│                         │  sonnet-4-6)│                             │
│                         └─────────────┘                             │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTP (tool calls)
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                     ▼
┌──────────────────┐  ┌───────────────────┐  ┌──────────────────────┐
│  QueueUp API     │  │  Transcript Store │  │  White-Label Portal  │
│  (availability,  │  │  (PostgreSQL)     │  │  (Next.js App Router)│
│   appointments,  │  │  conversation     │  │  Reseller + Clinic   │
│   intake)        │  │  turns, sessions  │  │  admin panel         │
└──────────────────┘  └───────────────────┘  └──────────────────────┘
```

---

## Component Boundaries

### Component 1: Voice/Chat Orchestrator

**What it is:** A persistent Node.js WebSocket server. This is the core runtime. It cannot run on Vercel serverless because Twilio Media Streams require a WebSocket connection that stays alive for the duration of a call (typically 2-10 minutes).

**Responsibility:**
- Accept Twilio Media Stream WebSocket connections
- Accept web chat WebSocket connections
- Route audio bytes → ElevenLabs STT → transcript text
- Maintain per-session conversation context
- Drive Claude API with conversation history + tool definitions
- Execute tool calls (availability check, book appointment, etc.)
- Route Claude text responses → ElevenLabs TTS → audio bytes back to Twilio
- Handle DTMF, silence detection, call end events
- Persist session turns to transcript store

**Communicates with:**
- Twilio (inbound WebSocket from Media Stream)
- ElevenLabs (outbound WebSocket for STT streaming; outbound HTTP/WebSocket for TTS)
- Claude API (outbound HTTP, streaming)
- QueueUp booking API (outbound HTTP, tool call execution)
- PostgreSQL transcript store (write conversation turns)

**Hosting:** Long-running Node.js process. Railway, Render, Fly.io, or self-hosted VPS. NOT Vercel.

**Confidence:** HIGH — Twilio Media Streams architecture is well-documented; the WebSocket persistence requirement is a hard constraint.

---

### Component 2: Audio Pipeline (within Orchestrator)

**What it is:** The low-latency audio processing chain inside the orchestrator.

**Twilio → STT path:**
1. Twilio sends binary WebSocket frames: `{ event: "media", media: { payload: "<base64 mulaw 8kHz>" } }`
2. Orchestrator decodes base64, converts mulaw 8kHz → PCM 16kHz (standard for STT)
3. PCM chunks stream to ElevenLabs STT WebSocket in real time
4. ElevenLabs returns incremental transcripts with end-of-utterance signal
5. When utterance complete: text → Session Manager for AI processing

**TTS → Twilio path:**
1. Claude generates response text (streamed token by token)
2. Each sentence boundary (`.`, `?`, `!`) triggers ElevenLabs TTS request (don't wait for full response — sentence streaming)
3. ElevenLabs streams back audio chunks (MP3 or mulaw)
4. Convert to mulaw 8kHz, base64-encode
5. Send `{ event: "media", media: { payload: "<base64>" } }` frame to Twilio WebSocket

**Latency budget for < 2 second turn:**
- STT (end-of-utterance detection): ~300-600ms
- Claude API (first token, streaming): ~400-800ms
- TTS (first audio chunk, sentence streaming): ~300-500ms
- Network round trips: ~200-400ms
- **Total realistic target: 1.2s - 2.3s** — achievable with sentence streaming but tight

**Key technique — sentence streaming:** Do not wait for Claude to finish its full response before starting TTS. Stream Claude's output token by token, buffer until a sentence boundary, then fire TTS immediately. The first sentence plays while Claude is still generating the rest.

**Confidence:** HIGH for architecture; MEDIUM for exact latency numbers (depend on infrastructure geography and ElevenLabs model choice).

---

### Component 3: Session Manager (within Orchestrator)

**What it is:** Per-session state object that holds conversation context for the lifetime of one call or chat session.

**State held per session:**
```typescript
interface Session {
  sessionId: string;
  clinicId: string;            // which clinic's AI is configured
  channel: "voice" | "chat";
  twilioCallSid?: string;      // for voice: Twilio call identifier
  chatConnectionId?: string;   // for web chat: WebSocket connection ID

  // Conversation context
  messages: ClaudeMessage[];   // full history sent to Claude on each turn
  patientContext: {
    name?: string;
    phone?: string;
    email?: string;
    dob?: string;
    intentType?: "book" | "reschedule" | "cancel" | "faq" | "intake";
    collectedIntake: Record<string, string>;
  };

  // Session metadata
  startedAt: Date;
  lastActivityAt: Date;
  turnCount: number;
  status: "active" | "transferring" | "ended";
  gdprConsentGiven: boolean;
}
```

**Multi-turn context management:**

Sessions are held in memory on the orchestrator node (Map<sessionId, Session>). For a single-node deployment this is fine. For multi-node deployments (horizontal scaling), sessions must be stored in Redis to ensure all nodes can handle a given session.

The `messages` array is the full Claude conversation history. On each patient turn:
1. Append `{ role: "user", content: transcript }` to `messages`
2. Send entire `messages` array to Claude with system prompt + tool definitions
3. Claude returns response (possibly with tool calls)
4. Execute tool calls, append tool results
5. Append final `{ role: "assistant", content: response }` to `messages`
6. Persist turn to transcript store

**Context window management:** Claude Sonnet 4.6 has a 200k token context window. A typical 10-minute call generates ~2,000-5,000 tokens of conversation. Context overflow is not a practical concern for v1 (single call sessions).

**Confidence:** HIGH — this is standard agentic conversation loop pattern.

---

### Component 4: Tool Executor / Claude Tool Call Patterns

**What it is:** The bridge between Claude's decisions and QueueUp's booking API.

**Tool definitions given to Claude at session start:**

```typescript
const tools = [
  {
    name: "check_availability",
    description: "Check available appointment slots for a given date and service",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "ISO date (YYYY-MM-DD)" },
        serviceId: { type: "string" },
        staffId: { type: "string", description: "Optional — specific staff member" }
      },
      required: ["date", "serviceId"]
    }
  },
  {
    name: "book_appointment",
    description: "Book an appointment after patient has confirmed details",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string" },
        time: { type: "string", description: "HH:MM 24h format" },
        serviceId: { type: "string" },
        staffId: { type: "string" },
        patientName: { type: "string" },
        patientPhone: { type: "string" },
        patientEmail: { type: "string" },
        reasonForVisit: { type: "string" },
        intakeData: { type: "object" }
      },
      required: ["date", "time", "serviceId", "patientName", "patientPhone"]
    }
  },
  {
    name: "lookup_appointment",
    description: "Look up existing appointment by patient phone or email",
    input_schema: {
      type: "object",
      properties: {
        phone: { type: "string" },
        email: { type: "string" }
      }
    }
  },
  {
    name: "cancel_appointment",
    description: "Cancel an existing appointment",
    input_schema: {
      type: "object",
      properties: {
        appointmentId: { type: "string" }
      },
      required: ["appointmentId"]
    }
  },
  {
    name: "transfer_to_human",
    description: "Transfer call or chat to a human staff member",
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

**Tool call execution flow:**

```
Claude response → has tool_use block?
  YES:
    1. Parse tool name + input from response
    2. Execute tool (HTTP call to QueueUp API)
    3. Append tool_result to messages
    4. Re-invoke Claude with updated messages (no new user turn)
    5. Claude returns text response → speak to patient
  NO:
    1. Text response → TTS → speak to patient
    2. Wait for next patient utterance
```

**Important:** Claude may chain multiple tool calls (check availability → book). Handle this as a loop: keep calling Claude until it returns a text-only response.

**Confidence:** HIGH — this is the standard Claude tool use loop, consistent with Anthropic documentation.

---

### Component 5: Twilio Webhook Handling

**What it is:** The HTTP endpoints that Twilio calls to initiate a Media Stream.

**Call lifecycle via Twilio webhooks:**

```
1. Patient dials clinic number
2. Twilio POST → /webhooks/twilio/voice  (TwiML request)
   Response: TwiML instructing Twilio to open Media Stream:
   <Response>
     <Start>
       <Stream url="wss://orchestrator.yourdomain.com/voice-stream" />
     </Start>
     <Pause length="60"/>
   </Response>

3. Twilio opens WebSocket to orchestrator at wss://...
4. First WS message: { event: "connected" }
5. Second WS message: { event: "start", streamSid, callSid, customParameters }
6. Ongoing: { event: "media", streamSid, media: { chunk, timestamp, payload } }
7. On call end: { event: "stop" }
8. Orchestrator sends audio back: { event: "media", streamSid, media: { payload } }
9. To clear audio buffer: { event: "clear", streamSid }
```

**TwiML webhook handler** is a simple HTTP POST endpoint (can live in the portal Next.js app or the orchestrator itself). It returns TwiML XML and must respond in < 5 seconds or Twilio retries.

**Additional Twilio webhooks:**
- `statusCallback` — call status updates (ringing, answered, completed)
- `recordingStatusCallback` — if call recording is enabled
- Phone number provisioning — Twilio REST API (not a webhook; called from portal when clinic sets up their number)

**Confidence:** HIGH — Twilio Media Streams spec is stable and well-documented as of Aug 2025.

---

### Component 6: Web Chat Widget

**What it is:** An embeddable JavaScript snippet that clinics paste into their website HTML.

**Architecture recommendation: hosted JS bundle with WebSocket connection**

```html
<!-- Clinic pastes this one line into their site -->
<script src="https://ai.yourplatform.com/widget.js?clinic=abc123" async></script>
```

The bundle:
1. Injects a chat button + modal into the DOM (no iframe needed)
2. Applies clinic branding (colors, logo) fetched from widget config endpoint
3. Opens a WebSocket connection to the orchestrator when patient starts chatting
4. Displays chat messages, typing indicators, and GDPR consent banner on first load

**Why not iframe:**
- Iframes create a full browsing context with its own origin — harder to style to match the clinic's site
- JS widget can read/inject the host page's DOM for context (e.g., current page = "Services" page)
- Postmessage across iframe boundary adds complexity without benefit for this use case

**Why not Web Components:**
- Web Components are technically sound but add build complexity with no meaningful advantage over a well-scoped JS widget for this use case
- Shadow DOM would prevent easy clinic-specific theming

**Chat session handling vs voice:**

| Concern | Voice (Twilio) | Web Chat |
|---------|----------------|----------|
| Connection | Twilio Media Stream WS | Direct WS from browser |
| Session start | Twilio `start` event | Widget `connect` event |
| Audio | mulaw 8kHz binary frames | Text messages only (no audio in web chat v1) |
| Session end | Twilio `stop` event | WS close / browser close |
| Identity | Caller ID (phone number) from Twilio | Anonymous until patient provides name/email |
| GDPR consent | Verbal disclosure at call start | Banner before first message |

**Confidence:** HIGH for the architectural choice; MEDIUM for exact widget implementation details.

---

### Component 7: White-Label Portal

**What it is:** A Next.js App Router application for resellers and clinic admins.

**Multi-tenant routing:**

```
Reseller accesses:   https://portal.yourplatform.com     (internal admin)
Reseller white-label: https://portal.theircompany.com    (custom domain)
                   or: https://theircompany.yourplatform.com  (subdomain)
Clinic admin accesses: through reseller's portal URL
```

**Subdomain routing pattern:**
- Vercel supports wildcard subdomains via `*.yourplatform.com` → single Next.js deployment
- `middleware.ts` reads `request.headers.get("host")` → extract subdomain → look up reseller config → inject branding
- Custom domain support: reseller adds a CNAME pointing their domain to your Vercel deployment; Next.js middleware resolves branding from the hostname

```typescript
// middleware.ts in portal app
const host = request.headers.get("host");
const subdomain = host.split(".")[0]; // "theircompany" from "theircompany.yourplatform.com"
// OR match full custom domain: "portal.theircompany.com"
const reseller = await getResellerByHostname(host);
// Inject reseller config into request headers for use by server components
```

**Portal tenant hierarchy:**

```
Superadmin (you)
  └── Reseller (e.g., "ClinicTech Ltd")
        ├── Branding: logo, primary color, portal subdomain
        └── Clinics
              ├── Clinic A (dental)
              │     ├── Twilio phone number
              │     ├── AI configuration (greeting, FAQs, voice, escalation)
              │     ├── Intake form fields
              │     └── Chat widget snippet
              └── Clinic B (physio)
```

**Portal data model additions to QueueUp:**

```
Reseller
  id, name, slug, customDomain, brandingLogo, brandingColor
  createdAt, plan, stripeCustomerId

ClinicAccount
  id, resellerId, shopId (FK to existing QueueUp Shop)
  twilioPhoneNumber, twilioPhoneSid
  aiGreeting, aiVoiceId (ElevenLabs voice)
  escalationPhone, escalationEmail
  gdprConsentText, retentionDays
  chatWidgetEnabled, widgetColor

IntakeField
  id, clinicAccountId, fieldKey, label, required, order

FAQ
  id, clinicAccountId, question, answer

ConversationSession
  id, clinicAccountId, channel, callSid/chatId
  startedAt, endedAt, turnCount, bookingMade
  patientPhone, patientEmail

ConversationTurn
  id, sessionId, role (user/assistant/tool)
  content, timestamp
  -- auto-deleted after retentionDays via cron
```

**Confidence:** HIGH for multi-tenant subdomain pattern (standard Next.js Vercel approach); MEDIUM for exact data model (will evolve during implementation).

---

### Component 8: QueueUp API Integration

**What it is:** The tool executor makes HTTP calls to QueueUp's existing REST API. No new booking engine is built.

**Endpoints the orchestrator will call:**

| Tool | QueueUp Endpoint | Notes |
|------|-----------------|-------|
| check_availability | `GET /api/availability?shopId=X&date=Y&serviceId=Z` | Already exists |
| book_appointment | `POST /api/appointments` | Already exists; extend for intake fields |
| lookup_appointment | `GET /api/appointments?shopId=X&phone=Y` | New query param needed |
| cancel_appointment | `DELETE /api/appointments/[id]` | Already exists |
| get_services | `GET /api/admin/services?shopId=X` | Already exists; needs public variant |
| get_staff | `GET /api/admin/staff?shopId=X` | Already exists; needs public variant |

**Authentication between orchestrator and QueueUp:**
- Orchestrator uses a service-account API key (not a user JWT)
- New endpoint: `POST /api/service-auth` → returns short-lived token scoped to a specific shopId
- Alternatively: shared secret in environment variables (simpler for v1)

**Data that must be added to QueueUp `POST /api/appointments`:**

Current payload lacks intake fields. Add optional `intakeData: Record<string, string>` to appointment creation. Store as JSON column on Appointment model (or separate IntakeSubmission table for queryability).

**Confidence:** HIGH — integrating orchestrator as an API consumer of existing endpoints is a clean pattern. The specific endpoint additions are design decisions, not research findings.

---

## Data Flow: Voice Call End-to-End

```
Patient dials clinic number
        │
        ▼
[Twilio] — POST → /webhooks/twilio/voice
        │         Returns: <Stream url="wss://orchestrator/voice-stream"/>
        │
        ▼
[Twilio Media Stream] — WS connect → Orchestrator
        │
        ▼
Orchestrator: Session created
  - Load clinic config from portal DB (AI greeting, voice, intake fields, FAQs)
  - Build system prompt with clinic context
  - Send greeting via TTS → Twilio → patient hears welcome
        │
        ▼
Patient speaks
        │
        ▼
[Twilio] — WS media frames (mulaw) → Orchestrator
        │
        ▼
[ElevenLabs STT] — streaming transcript → Orchestrator
        │
        ▼
Orchestrator: End-of-utterance detected
  - Append user turn to messages[]
  - POST to Claude API with messages + tools
        │
        ▼
[Claude API] — response (text or tool_call) → Orchestrator
        │
        ├── tool_call: check_availability
        │       │
        │       ▼
        │   [QueueUp API] → available slots → tool_result
        │       │
        │       ▼
        │   Claude API (again, with tool results) → text response
        │
        ▼
Orchestrator: Text response ready
  - Sentence-stream to ElevenLabs TTS
        │
        ▼
[ElevenLabs TTS] — audio chunks → Orchestrator
        │
        ▼
[Twilio] — WS media frames (mulaw) → Patient hears response
        │
        ▼
Persist turn to PostgreSQL transcript store
        │
        ▼
(Loop until call ends or transfer_to_human tool called)
        │
        ▼
[Twilio] — WS stop event → Orchestrator
  - Mark session ended
  - Enqueue transcript retention check job
```

---

## Data Flow: Web Chat End-to-End

```
Patient visits clinic website
        │
        ▼
Widget script loads (widget.js?clinic=abc123)
  - Fetch clinic branding config
  - Inject chat button into DOM
        │
        ▼
Patient clicks chat button
  - Show GDPR consent banner
  - Patient accepts consent
        │
        ▼
Widget opens WebSocket to Orchestrator
  - Session created (chat channel)
  - Send clinic welcome message (text)
        │
        ▼
Patient types message → Widget sends over WS
        │
        ▼
Orchestrator: same Claude + tool execution loop as voice
  (no audio — text in, text out)
        │
        ▼
Orchestrator sends text response → Widget displays in chat UI
        │
        ▼
Session ends on WS close (patient leaves page / closes tab)
```

---

## Suggested Build Order (Phase Dependencies)

The architecture has hard dependencies that dictate build order:

```
Phase 1: Orchestrator Core (WebSocket server + audio pipeline)
  MUST come first: everything else depends on the WebSocket server existing
  - Node.js WS server scaffolding
  - Twilio Media Streams connection + audio decode/encode
  - ElevenLabs STT + TTS integration
  - Basic Claude conversation loop (no tools yet)
  - Session state management

Phase 2: Claude Tool Calls + QueueUp Integration
  DEPENDS ON: Phase 1 (needs working orchestrator), QueueUp booking API
  - Tool definitions for availability, booking, cancel
  - Tool executor HTTP calls to QueueUp
  - Intake data collection
  - End-to-end: patient can book via voice

Phase 3: Web Chat Widget
  DEPENDS ON: Phase 1 (WebSocket orchestrator must support text sessions)
  - Text-channel session type in orchestrator
  - Widget JS bundle
  - Embeddable snippet delivery
  CAN PARALLELIZE with Phase 2 (different channel, same orchestrator)

Phase 4: White-Label Portal
  DEPENDS ON: Phase 2 (needs clinic config to be meaningful)
  - Portal Next.js app
  - Reseller + clinic data model in PostgreSQL
  - Subdomain routing + custom domain
  - Clinic AI configuration UI
  - Phone number provisioning via Twilio REST API
  - Widget snippet generation

Phase 5: GDPR + Compliance
  DEPENDS ON: Phases 1-4 (needs all data flows to exist before adding consent/retention)
  - Consent recording in sessions
  - Transcript retention + auto-delete cron
  - Patient data deletion API
  - Audit log

Phase 6: Analytics
  DEPENDS ON: Phase 5 (needs clean transcript data)
  - Call/chat volume metrics
  - AI booking rate
  - Top questions
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Hosting the Orchestrator on Vercel Serverless

**What goes wrong:** Twilio Media Stream WebSocket connections last the entire call duration (2-10+ minutes). Vercel serverless functions have a maximum execution timeout. Even Vercel Pro's 5-minute function timeout is too short for a 10-minute call. The connection drops mid-call.

**Instead:** Host the orchestrator on Railway, Render, Fly.io, or a VPS. These support long-lived WebSocket connections. The portal (Next.js) can stay on Vercel.

### Anti-Pattern 2: Waiting for Full Claude Response Before Starting TTS

**What goes wrong:** Claude generates ~100-300 token responses. At typical streaming speeds, waiting for the full response adds 1-3 seconds to latency. Combined with STT processing time, this breaks the 2-second target.

**Instead:** Stream Claude's output token by token. Buffer until the first sentence boundary (period, question mark, exclamation). Fire the first TTS request immediately. The patient hears the first sentence within ~800ms of Claude starting to generate.

### Anti-Pattern 3: Per-Request Clinic Config Lookup

**What goes wrong:** Every Claude invocation fetches clinic config (system prompt, FAQs, voice settings) from the database. This adds 50-200ms per turn and creates DB load.

**Instead:** Cache clinic config in memory when the session starts. Config is loaded once at `start` event and stored in the Session object. It does not change during a call.

### Anti-Pattern 4: Sending the Full Transcript to Claude on Every Turn

**What goes wrong:** Naive implementation sends a growing string of "User: ... Assistant: ..." on each turn. This is wasteful, doesn't match the Claude API format, and loses tool call context.

**Instead:** Maintain the `messages[]` array in Claude API format (`{ role, content }[]`) on the Session object. Claude receives the complete structured history on each turn. Tool call results are appended as `tool_result` blocks, which Claude uses for context.

### Anti-Pattern 5: Blocking the Orchestrator Event Loop During Tool Calls

**What goes wrong:** Tool calls to QueueUp API are async HTTP requests. If awaited synchronously in the event loop, all other sessions' audio processing stalls while one session waits for the booking API.

**Instead:** Use async/await correctly with Node.js event loop — each session runs its own async chain without blocking the event loop. The WS server processes audio frames from other sessions while one session awaits a QueueUp API response.

---

## Scalability Considerations

| Concern | Single Node (MVP) | Multi-Node (Scale) |
|---------|-----------------|-------------------|
| Session state | In-memory Map | Redis session store |
| Orchestrator instances | 1 | Load balancer + sticky sessions (WebSockets require same server) |
| QueueUp API | Direct HTTP | Same — stateless |
| Transcript store | Same PostgreSQL as QueueUp | Same DB or separate read replica |
| Audio processing | CPU-bound (mulaw conversion) | May need worker threads at high volume |
| Chat widget CDN | Single origin | CDN (Cloudflare) for widget.js |

**MVP recommendation:** Start with a single orchestrator node. The architecture supports horizontal scaling later by moving session state to Redis, but this adds complexity that is not needed until > ~50 concurrent calls.

---

## Component Summary Table

| Component | Where It Runs | Technology | Communicates With |
|-----------|--------------|------------|-------------------|
| Voice/Chat Orchestrator | Railway / Render (persistent Node.js) | Node.js, ws library | Twilio WS, ElevenLabs API, Claude API, QueueUp API, PostgreSQL |
| Audio Pipeline | Inside Orchestrator | Node.js buffers, mulaw codec library | ElevenLabs STT/TTS, Twilio WS |
| Session Manager | Inside Orchestrator (memory/Redis) | In-memory Map or Redis | Orchestrator internal, PostgreSQL |
| Tool Executor | Inside Orchestrator | HTTP client (fetch) | QueueUp REST API |
| Twilio Webhook Handler | Portal Next.js OR Orchestrator HTTP | Next.js API route | Twilio (inbound), Orchestrator (returns WS URL) |
| Web Chat Widget | CDN (static JS bundle) | Vanilla JS or minimal framework | Orchestrator WebSocket |
| White-Label Portal | Vercel (Next.js) | Next.js App Router, Prisma, PostgreSQL | Browser, Orchestrator config DB, Twilio REST API |
| QueueUp Booking API | Vercel (existing) | Next.js App Router (existing) | Orchestrator (as API consumer) |
| Transcript Store | PostgreSQL | Prisma (shared DB or separate schema) | Orchestrator (writes), Portal (reads for analytics) |

---

## Sources

- Twilio Media Streams documentation (training data, verified architecture pattern; HIGH confidence)
- Anthropic Claude tool use / agentic loop documentation (training data; HIGH confidence)
- ElevenLabs Conversational AI WebSocket streaming (training data through Aug 2025; MEDIUM confidence — verify current SDK at https://elevenlabs.io/docs/conversational-ai)
- Next.js multi-tenant subdomain routing patterns (training data; HIGH confidence)
- Web embed widget patterns (general industry knowledge; HIGH confidence)
- Latency estimates: MEDIUM confidence — actual numbers depend on region, ElevenLabs model tier, and Claude API response times; validate with real measurements in Phase 1

---

*Architecture research: 2026-03-28 | Confidence: MEDIUM-HIGH | Web verification blocked in this session — flag ElevenLabs SDK version for validation in Phase 1*
