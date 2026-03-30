# Phase 1: Voice Pipeline + GDPR Foundation - Research

**Researched:** 2026-03-29
**Domain:** Twilio Media Streams / Deepgram STT / ElevenLabs TTS / Claude tool use / Fastify WebSocket / GDPR Article 9 / Railway deployment
**Confidence:** HIGH (core protocol facts verified against official docs; version numbers confirmed against npm registry)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Voice service deployed as `/voice-service/` monorepo subfolder — own `package.json`, deploys to Railway
- Twilio Media Streams (not TwiML IVR) for all inbound call handling
- Deepgram Nova-2 STT (streaming WebSocket, mulaw 8kHz input)
- ElevenLabs turbo TTS with `ulaw_8000` output format
- Claude `claude-sonnet-4-6` as AI brain
- Node.js/Fastify WebSocket orchestrator
- Reuse QueueUp PostgreSQL with new Prisma tables (`VoiceCall`, `VoiceAuditLog`, `VoiceTranscript`)
- Internal service token (long-lived secret in `.env`) for voice → QueueUp API auth
- Explicit verbal consent ("I agree" or equivalent) before AI proceeds; refusal triggers immediate warm transfer
- Warm transfer for all escalation scenarios
- AI persona name "Aria", warm and friendly tone
- Escalation after 2 unanswered questions OR Claude confidence below threshold
- GDPR audit log fields: consent timestamp, call SID, clinic ID, actions taken, phone hash (last 4 digits), call duration, escalation flag
- Redis-backed idempotency via existing `@upstash/redis` client (migrate from in-memory `resilience.ts`)
- Per-call consent logging (not per-patient with TTL)
- Consent declined: immediate warm transfer, no AI data processing

### Claude's Discretion
- Exact wording of the GDPR consent script (must: identify as AI, mention health data, request explicit affirmative)
- Exact confidence threshold value for automatic escalation (tune empirically)
- Specific handling of edge cases like very short calls (patient hangs up immediately)
- Fastify vs bare Node.js `http` module for WebSocket server internals

### Deferred Ideas (OUT OF SCOPE)
- Medical urgency keyword auto-escalation ("pain", "emergency") — Phase 3 CLINIC-03
- Clinic-branded AI names — Phase 3 CLINIC-01
- Re-consent TTL per patient — Phase 2 or 3
- Barge-in / interruption handling — Phase 2 or 3
- Outbound callback scheduling — Phase 2
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VOICE-01 | Patient can call a clinic's Twilio phone number and be answered by the AI in real-time (Twilio Media Streams) | Twilio Media Streams protocol fully verified; Fastify+ws WebSocket server pattern confirmed |
| VOICE-02 | AI identifies itself as an AI at the start of every call (EU AI Act Article 52) | Consent script design covered; pre-generated TTS greeting pattern documented |
| VOICE-03 | AI obtains verbal consent for health data processing at call start (GDPR Article 9) | Consent flow state machine documented; "I agree" affirmative detection via Deepgram transcript |
| VOICE-04 | Patient can say "talk to a human" at any point and be transferred to a configured staff number | Twilio warm transfer via `client.calls.update()` REST API call pattern verified |
| VOICE-05 | AI hands off to human automatically when it cannot confidently handle the patient's request | Claude confidence threshold pattern + 2-unanswered-question counter in session state |
| VOICE-06 | End-of-call summary saved to appointment in QueueUp | Call `stop` event handler → QueueUp API PATCH; session transcript summary via Claude |
| BOOK-05 | AI prevents double-booking via Redis-backed idempotency key per slot | Existing `resilience.ts` idempotency functions identified; migration to `@upstash/redis` documented |
| GDPR-01 | Patient conversation transcripts auto-deleted after configurable retention period (default 90 days) | `deleteAfter` timestamp on `VoiceTranscript`; cron job query pattern documented |
| GDPR-03 | Audit log of all AI interactions per call | `VoiceAuditLog` schema documented with all required fields |
| GDPR-04 | All EU patient data stored on EU infrastructure | Railway EU region selection; `DATABASE_URL` pointed at same EU-hosted PostgreSQL |
</phase_requirements>

---

## Summary

Phase 1 builds the non-negotiable runtime and compliance base. The core challenge is assembling a low-latency audio pipeline from three independent streaming APIs (Twilio, Deepgram, ElevenLabs) coordinated by a fourth service (Claude), all within a 2-second per-turn latency budget. Every step in the pipeline must use streaming — buffering at any stage breaks the latency target.

The compliance layer is equally non-negotiable. EU patients discussing health conditions over phone calls are generating GDPR Article 9 special-category health data before the first word is transcribed. The consent gate, per-call audit log, and transcript retention system must be operational from the first real call — they cannot be retrofitted.

Three verified facts from current documentation materially affect the implementation versus prior research: (1) the `elevenlabs` npm package is deprecated — the current package is `@elevenlabs/elevenlabs-js`; (2) ElevenLabs now recommends `eleven_flash_v2_5` over `eleven_turbo_v2_5` for lower latency; (3) Twilio warm transfer from a Media Streams session requires calling the Twilio REST API to redirect the live call to a new TwiML document containing `<Dial>` — the WebSocket alone cannot initiate a transfer.

**Primary recommendation:** Build the voice service in this order: Fastify+WebSocket skeleton → Twilio Media Stream receive → Deepgram live transcription → GDPR consent state machine → Claude conversation loop → ElevenLabs TTS→Twilio playback → warm transfer → per-call audit log → transcript retention cron.

---

## Standard Stack

### Core

| Library | Verified Version | Purpose | Why Standard |
|---------|-----------------|---------|--------------|
| fastify | 5.8.4 | HTTP server + WebSocket host | Faster than Express; built-in TypeScript support; plugin encapsulation |
| @fastify/websocket | 11.2.0 | WebSocket route handler plugin for Fastify | Official Fastify plugin; integrates ws internally; hooks apply to WS routes |
| ws | 8.20.0 | Low-level WebSocket library (used by @fastify/websocket internally) | Battle-tested; used in Twilio's own Node.js Media Streams examples |
| @deepgram/sdk | 5.0.0 | Deepgram STT streaming client | Official SDK; supports live WebSocket with Nova-2, mulaw, endpointing params |
| @elevenlabs/elevenlabs-js | 1.59.0 | ElevenLabs TTS streaming client | Official JS SDK (replaces deprecated `elevenlabs` package) |
| @anthropic-ai/sdk | 0.80.0 | Claude API client | Already in project; tool use API stable; streaming supported |
| twilio | 5.13.1 | Twilio REST API client (TwiML generation + call management) | Already in `package.json`; needed for TwiML response and `calls.update()` for warm transfer |
| @upstash/redis | 1.37.0 | Redis-backed idempotency store | Already installed; `UPSTASH_REDIS_REST_URL` already in `.env` |

**Version verification:** All versions confirmed against npm registry on 2026-03-29.

### Supporting

| Library | Verified Version | Purpose | When to Use |
|---------|-----------------|---------|-------------|
| tsx | 4.21.0 | TypeScript execution for dev | Run `src/server.ts` directly during development |
| @types/ws | 8.18.1 | TypeScript types for ws | Required when using `@fastify/websocket` in TypeScript |
| dotenv | 17.3.1 | Env variable loading | Load `.env` in standalone voice-service process |
| zod | (latest) | Runtime validation of Twilio WebSocket events and tool inputs | Validate Twilio event payloads before processing |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @elevenlabs/elevenlabs-js 1.59.0 | `elevenlabs` (old npm package) | `elevenlabs` is deprecated; use `@elevenlabs/elevenlabs-js` |
| `eleven_flash_v2_5` | `eleven_turbo_v2_5` | Turbo models now functionally equivalent to Flash; Flash has lower average latency — prefer Flash |
| Fastify | bare Node.js `http` + `ws` | Fastify adds structured routing, logging, plugin system; minor overhead vs bare node.js |
| Railway | Fly.io | Railway simpler setup; Fly.io has better global edge proximity to Twilio media infra (consider for latency optimization post-MVP) |

### Installation

```bash
# Create voice-service as standalone Node.js app
mkdir -p voice-service/src/handlers voice-service/src/routes voice-service/src/lib
cd voice-service
npm init -y

npm install fastify @fastify/websocket ws @deepgram/sdk @elevenlabs/elevenlabs-js @anthropic-ai/sdk twilio @upstash/redis dotenv zod

npm install -D typescript @types/node @types/ws tsx
```

---

## Architecture Patterns

### Recommended Project Structure

```
voice-service/
  src/
    server.ts              # Fastify instance + plugin registration + start()
    handlers/
      twilioStream.ts      # WebSocket route handler for /voice-stream
      consentFlow.ts       # GDPR consent state machine (pending/granted/declined)
      deepgramClient.ts    # Deepgram live connection manager per call
      elevenLabsTts.ts     # ElevenLabs sentence-streaming TTS → Twilio output
      claudeSession.ts     # Per-call Claude conversation state + tool loop
      escalation.ts        # Warm transfer execution + confidence threshold logic
    routes/
      twiml.ts             # POST /twiml → returns TwiML <Connect><Stream> XML
      health.ts            # GET /health → 200 OK for Railway health checks
    lib/
      prisma.ts            # Copy of QueueUp prisma.ts pattern (PrismaPg adapter)
      idempotency.ts       # Redis-backed idempotency (migrated from resilience.ts)
      logger.ts            # Structured logger (copy pattern from src/lib/logger.ts)
      auditLog.ts          # Write VoiceAuditLog entries to PostgreSQL
    types/
      session.ts           # Session, ConsentState, CallEvent TypeScript interfaces
  prisma/
    (no separate schema — voice tables added to root prisma/schema.prisma)
  package.json             # Standalone; does not inherit root package.json
  tsconfig.json
  .env                     # Same DATABASE_URL, UPSTASH_*, DEEPGRAM_*, ELEVENLABS_*, etc.
```

### Pattern 1: Twilio Media Streams WebSocket Message Protocol

**What:** Twilio opens a WebSocket to your server immediately after the call connects. The first two messages are always `connected` then `start`. All subsequent messages are `media` (audio frames). On call end, Twilio sends `stop`.

**Exact message formats (verified from official Twilio docs):**

```typescript
// Source: https://www.twilio.com/docs/voice/media-streams/websocket-messages

// Event 1: connected (first message)
{ event: "connected", protocol: "Call", version: "1.0.0" }

// Event 2: start (second message — extract callSid and streamSid here)
{
  event: "start",
  sequenceNumber: "1",
  start: {
    streamSid: "MZ...",
    accountSid: "AC...",
    callSid: "CA...",          // ← key for all per-call state
    tracks: ["inbound"],       // or ["inbound", "outbound"] for bidirectional
    customParameters: {},
    mediaFormat: {
      encoding: "audio/x-mulaw",  // ← mulaw 8kHz confirmed
      sampleRate: 8000,
      channels: 1
    }
  }
}

// Event 3+: media (audio frames, continuously)
{
  event: "media",
  sequenceNumber: "2",
  media: {
    track: "inbound",
    chunk: "1",
    timestamp: "5",
    payload: "<base64-encoded mulaw audio>"    // ← decode → send to Deepgram
  }
}

// Event N: stop (call ended)
{
  event: "stop",
  sequenceNumber: "N",
  stop: { accountSid: "AC...", callSid: "CA..." }
}
```

**Sending audio back to Twilio (TTS playback):**

```typescript
// Source: https://www.twilio.com/docs/voice/media-streams/websocket-messages

// Send audio to caller (must be mulaw 8kHz base64)
ws.send(JSON.stringify({
  event: "media",
  streamSid: session.streamSid,
  media: { payload: base64MulawAudio }
}));

// Clear Twilio's audio buffer (for interruption / barge-in)
ws.send(JSON.stringify({
  event: "clear",
  streamSid: session.streamSid
}));

// Mark event (to track playback completion)
ws.send(JSON.stringify({
  event: "mark",
  streamSid: session.streamSid,
  mark: { name: "tts-complete" }
}));
```

**When to use:** Every inbound call. The TwiML route (`POST /twiml`) initiates the stream; this handler processes it.

### Pattern 2: TwiML Initiation Response

**What:** Twilio calls `POST /twiml` when a patient dials the clinic number. Return XML that tells Twilio to open a bidirectional Media Stream to your server.

```typescript
// Source: https://www.twilio.com/docs/voice/twiml/stream
import twilio from 'twilio';

export async function twimlRoute(request: FastifyRequest, reply: FastifyReply) {
  // Validate Twilio signature before processing
  const twilioSignature = request.headers['x-twilio-signature'] as string;
  const isValid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    twilioSignature,
    process.env.VOICE_SERVICE_PUBLIC_URL + '/twiml',
    request.body as Record<string, string>
  );
  if (!isValid) return reply.status(403).send('Forbidden');

  const response = new twilio.twiml.VoiceResponse();
  const connect = response.connect();
  connect.stream({
    url: `wss://${process.env.VOICE_SERVICE_HOST}/voice-stream`,
    // Pass clinic identifier so handler can load config
    // Twilio calls come in on a specific number; look up clinic from callSid in handler
  });
  // <Pause> keeps the call alive while WebSocket handles it
  response.pause({ length: 120 });

  reply.type('text/xml').send(response.toString());
}
```

### Pattern 3: Deepgram Live Transcription

**What:** Open a Deepgram WebSocket per call. Forward mulaw audio frames from Twilio directly. React to `transcript` events with `speech_final: true` to detect complete utterances.

```typescript
// Source: https://developers.deepgram.com/docs/live-streaming-audio

import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

export function createDeepgramConnection(onFinalTranscript: (text: string) => void) {
  const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

  const connection = deepgram.listen.live({
    model: 'nova-2',
    encoding: 'mulaw',
    sample_rate: 8000,
    channels: 1,
    punctuate: true,
    interim_results: false,     // only fire on speech_final to reduce noise
    endpointing: 300,           // 300ms silence = end of utterance (sweet spot for conversation)
    utterance_end_ms: 1000,     // fallback: fire if no speech for 1000ms
  });

  connection.on(LiveTranscriptionEvents.Transcript, (data) => {
    const transcript = data.channel?.alternatives?.[0]?.transcript;
    const isFinal = data.speech_final;
    if (isFinal && transcript?.trim()) {
      onFinalTranscript(transcript.trim());
    }
  });

  return connection;
}
```

**Sending Twilio audio to Deepgram:**

```typescript
// In Twilio media event handler:
const audioBuffer = Buffer.from(event.media.payload, 'base64');
deepgramConnection.send(audioBuffer);
```

### Pattern 4: ElevenLabs TTS Streaming to Twilio

**What:** Generate speech from Claude's text response sentence-by-sentence. Stream audio chunks as they arrive — do not buffer the full audio. Chunks are already in mulaw 8kHz when `output_format: 'ulaw_8000'` is set.

**Critical: Model name changed.** Use `eleven_flash_v2_5` (not `eleven_turbo_v2_5`). Flash is the current low-latency model; Turbo models are functionally equivalent but deprecated in ElevenLabs guidance.

```typescript
// Source: https://elevenlabs.io/docs/api-reference/text-to-speech/stream
// Package: @elevenlabs/elevenlabs-js (NOT deprecated `elevenlabs`)

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

export async function streamTtsToTwilio(
  text: string,
  voiceId: string,
  streamSid: string,
  twilioWs: WebSocket
): Promise<void> {
  const audioStream = await client.textToSpeech.stream(voiceId, {
    text,
    modelId: 'eleven_flash_v2_5',    // NOT eleven_turbo_v2_5 — Flash has lower latency
    outputFormat: 'ulaw_8000',        // Twilio-native format; no transcoding needed
  });

  for await (const chunk of audioStream) {
    if (chunk instanceof Buffer || chunk instanceof Uint8Array) {
      twilioWs.send(JSON.stringify({
        event: 'media',
        streamSid,
        media: { payload: Buffer.from(chunk).toString('base64') }
      }));
    }
  }
}
```

**Sentence-streaming pattern (critical for latency):**

```typescript
// Do NOT wait for Claude to finish its full response before starting TTS.
// Buffer Claude's token stream until a sentence boundary, then fire TTS immediately.

function extractFirstSentence(buffer: string): { sentence: string; remainder: string } | null {
  const match = buffer.match(/^(.+?[.!?])\s+(.*)/s);
  if (match) return { sentence: match[1], remainder: match[2] };
  return null;  // no sentence boundary yet
}

// In Claude stream handler:
let textBuffer = '';
for await (const event of claudeStream) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    textBuffer += event.delta.text;
    const result = extractFirstSentence(textBuffer);
    if (result) {
      // Fire first TTS immediately — don't wait for Claude to finish
      streamTtsToTwilio(result.sentence, voiceId, streamSid, ws);
      textBuffer = result.remainder;
    }
  }
}
// Flush remaining text
if (textBuffer.trim()) {
  streamTtsToTwilio(textBuffer.trim(), voiceId, streamSid, ws);
}
```

### Pattern 5: GDPR Consent State Machine

**What:** Before any health data is processed, the AI must obtain explicit verbal consent. This is a state machine that gates all subsequent conversation.

```typescript
// Source: CONTEXT.md decisions + GDPR Article 9 requirements

type ConsentState = 'pending' | 'granted' | 'declined';

const CONSENT_AFFIRMATIVES = ['yes', 'sure', 'okay', 'ok', 'i agree', 'agree', 'go ahead', 'yep', 'yeah'];
const CONSENT_REFUSALS = ['no', 'i do not agree', "i don't agree", 'i decline', 'decline', 'refuse', 'nope'];

export function detectConsentResponse(transcript: string): ConsentState | null {
  const normalized = transcript.toLowerCase().trim();
  if (CONSENT_AFFIRMATIVES.some(a => normalized.includes(a))) return 'granted';
  if (CONSENT_REFUSALS.some(r => normalized.includes(r))) return 'declined';
  return null;  // unclear — prompt once more then offer transfer
}

// GDPR consent script (Claude's discretion on exact wording, but MUST include):
// 1. Identification as AI
// 2. Mention of health data processing
// 3. Request for explicit affirmative
const CONSENT_SCRIPT = `Hi, I'm Aria, an AI assistant. Before we continue, I need to let you know that this call is handled by an AI and may be recorded and processed to manage your appointment. This involves handling health-related information. Do you agree to proceed on those terms? Please say yes or no.`;

const CONSENT_TIMEOUT_SCRIPT = `I didn't catch that — would you like to proceed with the AI assistant, or would you prefer to speak with a team member?`;
```

### Pattern 6: Warm Transfer Execution

**What:** When the AI needs to transfer a call (patient request, confidence threshold hit, consent declined), use the Twilio REST API to redirect the live call to a new TwiML document that dials the staff number.

**Key insight (verified):** You cannot initiate a call transfer from the Media Streams WebSocket alone. You must call the Twilio REST API (`client.calls(callSid).update()`) with a new TwiML URL. This triggers Twilio to stop the current Media Stream and execute the new TwiML.

```typescript
// Source: https://www.twilio.com/docs/voice/api/call-resource

import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function executeWarmTransfer(
  callSid: string,
  staffPhoneNumber: string,
  bridgeMessage?: string  // AI says this before bridging (e.g., "Connecting you now")
): Promise<void> {
  // 1. Speak the bridge message to caller first (already sent via ElevenLabs if needed)
  // 2. Update call to new TwiML that dials staff number
  await client.calls(callSid).update({
    twiml: `<Response><Dial timeout="30" action="/transfer-complete"><Number>${staffPhoneNumber}</Number></Dial></Response>`
  });
  // Twilio closes the Media Stream WebSocket after this call
}
```

### Pattern 7: Session State Object

**What:** Every inbound call gets a `Session` object keyed by `callSid`. All per-call state is stored here — never in module-level variables.

```typescript
// Source: ARCHITECTURE.md + decisions

interface Session {
  callSid: string;
  streamSid: string;
  clinicId: string;
  consentState: 'pending' | 'granted' | 'declined';
  consentTimestamp?: Date;

  // Claude conversation
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;

  // Escalation tracking
  unansweredQuestions: number;      // trigger transfer at 2
  escalationTriggered: boolean;

  // Call metadata (for GDPR audit log)
  startedAt: Date;
  actionsLog: string[];             // ["consent_granted", "greeted", "escalated"]

  // Patient context
  patientPhoneHash?: string;        // hash of last 4 digits only
}

// Store: Map keyed by callSid; garbage-collected on call end
const sessions = new Map<string, Session>();
```

### Pattern 8: Per-Call GDPR Audit Log Write

**What:** At call end (or at key events), write a `VoiceAuditLog` row to PostgreSQL with all required GDPR fields.

```typescript
// Write on call `stop` event
await prisma.voiceAuditLog.create({
  data: {
    callSid: session.callSid,
    clinicId: session.clinicId,
    consentTimestamp: session.consentTimestamp,
    consentType: 'explicit_verbal',
    phoneHash: session.patientPhoneHash ?? null,
    durationSeconds: Math.floor((Date.now() - session.startedAt.getTime()) / 1000),
    actionsJson: JSON.stringify(session.actionsLog),
    wasEscalated: session.escalationTriggered,
  }
});
```

### Pattern 9: Redis-Backed Idempotency Migration

**What:** Replace the in-memory `processedKeys` Map in `src/lib/resilience.ts` with Upstash Redis calls. The existing function signatures (`checkIdempotency`, `setIdempotency`) stay the same — only the backing store changes.

**Existing code to migrate** (`src/lib/resilience.ts` lines 128–153):

```typescript
// BEFORE (in-memory — breaks on serverless cold starts):
const processedKeys = new Map<string, { result: unknown; expiresAt: number }>();

// AFTER (Redis-backed via @upstash/redis):
import { Redis } from '@upstash/redis';
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const IDEMPOTENCY_TTL_SECONDS = 5 * 60; // 5 minutes

export async function checkIdempotency(key: string): Promise<unknown | null> {
  const result = await redis.get(key);
  return result ?? null;
}

export async function setIdempotency(key: string, result: unknown): Promise<void> {
  await redis.set(key, JSON.stringify(result), { ex: IDEMPOTENCY_TTL_SECONDS });
}
```

Note: `checkIdempotency` and `setIdempotency` become `async` — callers in `src/app/api/appointments/route.ts` must be updated with `await`.

### Pattern 10: Prisma Schema Additions

**What:** Three new models added to the root `prisma/schema.prisma`. The voice service uses the same `DATABASE_URL` and Prisma client via the same PrismaPg adapter pattern from `src/lib/prisma.ts`.

```prisma
// Add to prisma/schema.prisma

model VoiceCall {
  id          String   @id @default(cuid())
  callSid     String   @unique                    // Twilio call SID
  clinicId    String                              // FK to Shop.id (rename when clinic model added)
  startedAt   DateTime @default(now())
  endedAt     DateTime?
  durationSec Int?
  status      String   @default("active")        // active | completed | transferred | failed
  createdAt   DateTime @default(now())

  transcripts VoiceTranscript[]
  auditLog    VoiceAuditLog?

  @@index([clinicId])
  @@index([callSid])
}

model VoiceTranscript {
  id          String   @id @default(cuid())
  callId      String
  call        VoiceCall @relation(fields: [callId], references: [id], onDelete: Cascade)
  role        String                              // "user" | "assistant"
  content     String
  createdAt   DateTime @default(now())
  deleteAfter DateTime                            // set to createdAt + retentionDays; cron deletes WHERE deleteAfter < NOW()

  @@index([callId])
  @@index([deleteAfter])                          // for efficient cron queries
}

model VoiceAuditLog {
  id               String    @id @default(cuid())
  callId           String    @unique
  call             VoiceCall @relation(fields: [callId], references: [id], onDelete: Cascade)
  callSid          String
  clinicId         String
  consentTimestamp DateTime?
  consentType      String?                        // "explicit_verbal"
  phoneHash        String?                        // hash of last 4 digits only
  durationSeconds  Int?
  actionsJson      String                         // JSON array: ["consent_granted", "escalated"]
  wasEscalated     Boolean   @default(false)
  createdAt        DateTime  @default(now())

  @@index([clinicId])
  @@index([callSid])
}
```

### Anti-Patterns to Avoid

- **Using `elevenlabs` npm package:** It is deprecated. Use `@elevenlabs/elevenlabs-js`.
- **Using `eleven_turbo_v2_5` model:** Functionally deprecated. Use `eleven_flash_v2_5`.
- **Waiting for full Claude response before starting TTS:** Adds 1–3s latency. Stream sentence-by-sentence.
- **Buffering all Deepgram transcripts before acting:** Act on `speech_final: true` events in real-time.
- **Module-level session state:** All per-call state must be in a `Map<callSid, Session>`. Never use a module-level variable for conversation state.
- **Trusting clinicId from Claude tool call inputs:** Always load clinicId from the authenticated `Session` object, never from AI-generated parameters. Multi-tenant isolation violation otherwise.
- **Calling `client.calls.update()` from WebSocket frame handler synchronously:** This is an async REST API call. Use `await` and ensure errors are caught so a failed transfer attempt doesn't crash the session handler.
- **Initiating warm transfer only via WebSocket:** The Twilio WebSocket protocol does not have a "transfer" message. Transfer always requires a `client.calls(callSid).update()` REST API call.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Speech-to-text from raw mulaw audio | Custom audio decoder + ML inference | Deepgram Nova-2 streaming SDK | Deepgram handles mulaw natively, streaming latency 200–300ms, endpointing built-in |
| Text-to-speech to mulaw for Twilio | PCM encoder + audio format conversion | ElevenLabs `ulaw_8000` output | ElevenLabs outputs Twilio-native format directly; avoids real-time transcoding |
| Twilio webhook signature validation | Custom HMAC verification | `twilio.validateRequest()` from twilio SDK | Timing-safe comparison; handles URL normalization edge cases |
| WebSocket message framing | Custom binary protocol | Twilio's JSON envelope format (already defined) | Protocol is fixed; implement to spec, not custom |
| Redis idempotency TTL management | Manual TTL tracking | `@upstash/redis` `set(key, val, { ex: N })` | Redis TTL is atomic, survives process restarts, works across serverless instances |
| Claude conversation history format | Custom string concatenation | `messages` array in Anthropic API format | Tool call results require specific `tool_result` block structure; custom format loses this |
| GDPR retention cleanup | Application-level row-by-row delete | Single `prisma.voiceTranscript.deleteMany({ where: { deleteAfter: { lt: new Date() } } })` in cron | Set-based delete is far more efficient; index on `deleteAfter` makes it O(deleted rows) |

**Key insight:** The hardest part of this pipeline is the *coordination* between streaming APIs, not implementing any individual piece. The three external streams (Twilio WS, Deepgram WS, ElevenLabs stream) must be managed concurrently within a single async call session. Do not let any one stream block the Node.js event loop — all three use async iterators and event emitters correctly.

---

## Common Pitfalls

### Pitfall 1: ElevenLabs Package Name and Model Name are Both Wrong in Prior Research

**What goes wrong:** Using `elevenlabs` npm package (deprecated) or specifying `eleven_turbo_v2_5` model ID.

**Why it happens:** Prior research (from training data) had the old package name and model. npm will install the deprecated package without error but it may not receive updates.

**How to avoid:** Install `@elevenlabs/elevenlabs-js`. Specify model `eleven_flash_v2_5`.

**Warning signs:** `npm install elevenlabs` does NOT error — it installs silently but is the deprecated package.

### Pitfall 2: Warm Transfer Cannot Be Done from the WebSocket Alone

**What goes wrong:** Developer tries to transfer a call by sending a special WebSocket message to Twilio. No such message exists. The call does not transfer. The WebSocket just stays open.

**Why it happens:** Intuition says "I control the call from the WebSocket." That is only true for audio — not for call routing.

**How to avoid:** When a transfer is needed, call `client.calls(callSid).update({ twiml: "<Response><Dial>...</Dial></Response>" })` via the Twilio REST client. Twilio will stop the Media Stream and execute the new TwiML.

**Warning signs:** Nothing happens when escalation is triggered; call stays on AI instead of transferring.

### Pitfall 3: Twilio Webhook Signature Not Validated

**What goes wrong:** Any HTTP client can send fake `POST /twiml` requests, injecting calls with arbitrary parameters.

**Why it happens:** Easy to skip in development; no immediate visible failure.

**How to avoid:** Call `twilio.validateRequest(authToken, signature, url, body)` at the top of the `/twiml` handler. Return 403 on failure.

**Warning signs:** External actors can make the voice service create audit log entries or initiate Deepgram connections without real calls.

### Pitfall 4: Session State Keyed Incorrectly

**What goes wrong:** Two concurrent calls share the same session because `callSid` was not set as the Map key (or worse, a module-level variable was used).

**Why it happens:** In development with one call at a time, bugs like this are invisible.

**How to avoid:** `const sessions = new Map<string, Session>()` at module level. Key is always `callSid` from the `start` event. Never use `streamSid` as the primary key (it can change if a stream reconnects).

**Warning signs:** Patient B hears responses meant for Patient A; GDPR breach.

### Pitfall 5: endpointing Value Too Short or Too Long

**What goes wrong:** Too short (e.g., 10ms default) and Deepgram fires `speech_final` on every micro-pause mid-sentence. Too long (>700ms) and the conversation feels unresponsive.

**Why it happens:** Deepgram's default `endpointing` is 10ms — optimized for short chatbot utterances, not natural phone conversation.

**How to avoid:** Set `endpointing: 300` (verified recommendation from Deepgram docs for conversational agents).

**Warning signs:** AI responds before patient finishes sentence; or AI is slow to respond after patient stops talking.

### Pitfall 6: Forgetting to Garbage-Collect Sessions

**What goes wrong:** Sessions accumulate in the `Map` as calls end. On high-volume deployments, this causes unbounded memory growth.

**Why it happens:** The Twilio `stop` event fires but the session delete code isn't written yet (deferred to "later").

**How to avoid:** In the `stop` event handler, always call `sessions.delete(callSid)` after writing the audit log.

### Pitfall 7: VoiceTranscript deleteAfter Not Indexed

**What goes wrong:** The nightly GDPR retention cron runs a `deleteMany` query. Without an index on `deleteAfter`, it does a full table scan as transcript volume grows.

**Why it happens:** Migrations are written without thinking about cron query patterns.

**How to avoid:** The schema above includes `@@index([deleteAfter])` on `VoiceTranscript`. Verify the migration includes this index.

---

## Code Examples

### Fastify WebSocket Server Bootstrap

```typescript
// Source: https://github.com/fastify/fastify-websocket + official Fastify docs

import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';

const app = Fastify({ logger: true });
await app.register(websocketPlugin);

// WebSocket route for Twilio Media Streams
app.get('/voice-stream', { websocket: true }, (socket, request) => {
  // socket is a ws.WebSocket instance
  // One handler invocation per call = one WebSocket connection
  handleTwilioStream(socket, request);
});

// HTTP route for TwiML webhook
app.post('/twiml', twimlRouteHandler);
app.get('/health', (_, reply) => reply.send({ ok: true }));

await app.listen({ port: parseInt(process.env.PORT ?? '3001'), host: '0.0.0.0' });
```

### Deepgram SDK v5 Live Connection

```typescript
// Source: https://developers.deepgram.com/docs/live-streaming-audio
// SDK version: @deepgram/sdk@5.0.0

import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

const live = deepgram.listen.live({
  model: 'nova-2',
  encoding: 'mulaw',
  sample_rate: 8000,
  channels: 1,
  punctuate: true,
  interim_results: false,
  endpointing: 300,
});

live.on(LiveTranscriptionEvents.Open, () => {
  console.log('Deepgram connection open');
});

live.on(LiveTranscriptionEvents.Transcript, (data) => {
  const transcript = data.channel.alternatives[0].transcript;
  if (data.speech_final && transcript.trim()) {
    // Pass to conversation handler
  }
});

live.on(LiveTranscriptionEvents.Close, () => {
  console.log('Deepgram connection closed');
});
```

### GDPR Transcript Retention Cron Query

```typescript
// Run daily (or hourly) — deletes expired transcripts
await prisma.voiceTranscript.deleteMany({
  where: {
    deleteAfter: { lt: new Date() }
  }
});
```

### Internal Service Token Middleware

```typescript
// Voice service calls QueueUp API routes with this header
const response = await fetch(`${process.env.QUEUEUP_API_BASE_URL}/api/availability`, {
  headers: {
    'Authorization': `Bearer ${process.env.VOICE_SERVICE_TOKEN}`,
    'Content-Type': 'application/json',
  }
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `elevenlabs` npm package | `@elevenlabs/elevenlabs-js` | 2024/2025 — old package deprecated | Must use new package name in `package.json` |
| `eleven_turbo_v2_5` model | `eleven_flash_v2_5` model | ElevenLabs guidance updated 2025 | Flash has lower average latency; turbo models functionally deprecated |
| In-memory idempotency Map | Redis-backed via `@upstash/redis` | BOOK-05 requirement in Phase 1 | Survives process restarts; works across serverless instances |
| Default Deepgram `endpointing=10ms` | `endpointing=300` for conversations | Deepgram docs guidance | Prevents premature speech_final on mid-sentence pauses |

**Deprecated/outdated:**
- `elevenlabs` npm package: deprecated, moved to `@elevenlabs/elevenlabs-js`
- `eleven_turbo_v2_5`: functionally superseded by `eleven_flash_v2_5`; lower latency on Flash
- In-memory idempotency store: confirmed bug in CONCERNS.md; must migrate before voice goes live

---

## Open Questions

1. **ElevenLabs `outputFormat: 'ulaw_8000'` exact parameter name in new SDK**
   - What we know: `ulaw_8000` format is confirmed available via API. Official Twilio integration cookbook confirms it exists.
   - What's unclear: The exact parameter name in `@elevenlabs/elevenlabs-js` SDK (may be `outputFormat`, `output_format`, or `format`).
   - Recommendation: Check TypeScript types generated by the SDK on install (`node_modules/@elevenlabs/elevenlabs-js/dist`) before using. The API reference URL is https://elevenlabs.io/docs/api-reference/text-to-speech/stream.

2. **Deepgram SDK v5 `listen.live()` vs `transcription.live()` naming**
   - What we know: `@deepgram/sdk@5.0.0` is the current version. Prior SDK versions used different namespaces.
   - What's unclear: Whether `deepgram.listen.live()` is the correct v5 API call.
   - Recommendation: Check the README at https://github.com/deepgram/deepgram-js-sdk immediately before writing the Deepgram handler. SDK v3 → v5 had breaking namespace changes.

3. **Railway EU region availability and WebSocket timeout**
   - What we know: Railway supports WebSocket, bills by actual utilization, has European deployment.
   - What's unclear: Whether Railway's EU region is within acceptable latency of Twilio's EU media infrastructure (Dublin is Twilio's primary EU media PoP).
   - Recommendation: Deploy to Railway EU and measure turn latency with a real call before committing to the region. Fly.io (with iad and lhr regions) may be a fallback if Railway adds >100ms.

4. **QueueUp API service token validation approach**
   - What we know: Internal service token in `.env`; passed as `Authorization: Bearer` header.
   - What's unclear: Whether QueueUp's existing middleware (`src/middleware.ts`) needs a new condition to accept service tokens, or if a new middleware layer is needed for voice-called API routes.
   - Recommendation: Add a `VOICE_SERVICE_TOKEN` env var; check for it in the specific API routes the voice service calls (availability, appointments). Do not route through the existing admin JWT middleware.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None currently configured in project — Wave 0 must install |
| Recommended framework | Vitest (fast, TypeScript-native, ESM support) |
| Config file | `voice-service/vitest.config.ts` — Wave 0 creates |
| Quick run command | `cd voice-service && npx vitest run --reporter=verbose` |
| Full suite command | `cd voice-service && npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VOICE-01 | Twilio `start` event creates a Session keyed by callSid | unit | `npx vitest run tests/twilioStream.test.ts` | Wave 0 |
| VOICE-01 | Twilio `media` event forwards audio buffer to Deepgram connection | unit | `npx vitest run tests/twilioStream.test.ts` | Wave 0 |
| VOICE-02 | First AI message includes AI self-identification phrase | unit | `npx vitest run tests/consentFlow.test.ts` | Wave 0 |
| VOICE-03 | `detectConsentResponse("yes")` returns `granted` | unit | `npx vitest run tests/consentFlow.test.ts` | Wave 0 |
| VOICE-03 | `detectConsentResponse("no")` returns `declined` | unit | `npx vitest run tests/consentFlow.test.ts` | Wave 0 |
| VOICE-03 | Consent declined → `executeWarmTransfer()` called immediately | unit | `npx vitest run tests/consentFlow.test.ts` | Wave 0 |
| VOICE-03 | VoiceAuditLog row written with consent timestamp and type | unit | `npx vitest run tests/auditLog.test.ts` | Wave 0 |
| VOICE-04 | Patient utterance containing "talk to a human" triggers `executeWarmTransfer()` | unit | `npx vitest run tests/escalation.test.ts` | Wave 0 |
| VOICE-05 | `unansweredQuestions >= 2` triggers escalation | unit | `npx vitest run tests/escalation.test.ts` | Wave 0 |
| VOICE-06 | `stop` event handler writes call summary to QueueUp API | unit (with mock HTTP) | `npx vitest run tests/callSummary.test.ts` | Wave 0 |
| BOOK-05 | `checkIdempotency(key)` returns null when key not in Redis | unit (mock Redis) | `npx vitest run tests/idempotency.test.ts` | Wave 0 |
| BOOK-05 | `setIdempotency(key)` then `checkIdempotency(key)` returns value | unit (mock Redis) | `npx vitest run tests/idempotency.test.ts` | Wave 0 |
| BOOK-05 | Concurrent calls with same slot only succeed once | integration | manual / separate k6 script | manual |
| GDPR-01 | `VoiceTranscript` has `deleteAfter` set to `now + 90 days` on creation | unit | `npx vitest run tests/transcriptRetention.test.ts` | Wave 0 |
| GDPR-01 | Cron `deleteMany(where: deleteAfter < now)` removes expired rows | unit (mock prisma) | `npx vitest run tests/transcriptRetention.test.ts` | Wave 0 |
| GDPR-03 | `VoiceAuditLog` row contains callSid, clinicId, consentTimestamp, actionsJson, wasEscalated | unit | `npx vitest run tests/auditLog.test.ts` | Wave 0 |
| GDPR-04 | Railway deployment region is configured to EU | manual verification | check Railway dashboard | manual |

### Sampling Rate

- **Per task commit:** `cd voice-service && npx vitest run --reporter=verbose`
- **Per wave merge:** `cd voice-service && npx vitest run` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `voice-service/vitest.config.ts` — test framework config
- [ ] `voice-service/tests/twilioStream.test.ts` — VOICE-01 WebSocket event handling
- [ ] `voice-service/tests/consentFlow.test.ts` — VOICE-02, VOICE-03 consent state machine
- [ ] `voice-service/tests/escalation.test.ts` — VOICE-04, VOICE-05 escalation triggers
- [ ] `voice-service/tests/callSummary.test.ts` — VOICE-06 end-of-call summary
- [ ] `voice-service/tests/idempotency.test.ts` — BOOK-05 Redis idempotency
- [ ] `voice-service/tests/auditLog.test.ts` — GDPR-03 audit log fields
- [ ] `voice-service/tests/transcriptRetention.test.ts` — GDPR-01 deleteAfter logic
- [ ] Framework install: `cd voice-service && npm install -D vitest`

---

## Sources

### Primary (HIGH confidence)
- [Twilio Media Streams — WebSocket Messages](https://www.twilio.com/docs/voice/media-streams/websocket-messages) — exact event formats, message types, `clear` behavior
- [Twilio Media Streams Overview](https://www.twilio.com/docs/voice/media-streams) — bidirectional streaming, `<Connect><Stream>` TwiML
- [TwiML `<Stream>`](https://www.twilio.com/docs/voice/twiml/stream) — TwiML verb for initiating Media Stream
- [Twilio warm transfer Node.js tutorial](https://www.twilio.com/docs/voice/tutorials/warm-transfer/node) — conference-based transfer pattern
- [ElevenLabs Models page](https://elevenlabs.io/docs/overview/models) — `eleven_flash_v2_5` as current low-latency model; turbo models deprecated
- [Deepgram endpointing docs](https://developers.deepgram.com/docs/understand-endpointing-interim-results) — `endpointing: 300` recommended for conversational agents
- [Deepgram live streaming docs](https://developers.deepgram.com/docs/live-streaming-audio) — `@deepgram/sdk` v5 API shape
- npm registry: @deepgram/sdk@5.0.0, @elevenlabs/elevenlabs-js@1.59.0, @fastify/websocket@11.2.0, ws@8.20.0, fastify@5.8.4, twilio@5.13.1, @upstash/redis@1.37.0, @anthropic-ai/sdk@0.80.0

### Secondary (MEDIUM confidence)
- ElevenLabs `ulaw_8000` output format confirmed available for Twilio integration via multiple WebSearch results + scribd PDF of API docs
- Railway WebSocket support and EU deployment confirmed via WebSearch (medium: pricing may change)
- Twilio `calls.update()` REST API for warm transfer from Media Streams confirmed via WebSearch

### Tertiary (LOW confidence)
- Exact ElevenLabs `@elevenlabs/elevenlabs-js` SDK parameter name for `outputFormat` — needs verification against installed package types
- Deepgram SDK v5 exact namespace (`deepgram.listen.live()`) — verify against current README before implementation

---

## Metadata

**Confidence breakdown:**
- Standard stack (versions): HIGH — all versions verified against npm registry on 2026-03-29
- Twilio protocol: HIGH — official docs confirmed; protocol stable since 2019
- ElevenLabs model/package names: HIGH — confirmed model deprecation from official ElevenLabs docs
- Deepgram endpointing: HIGH — official Deepgram docs confirmed 300ms recommendation
- Warm transfer mechanism: HIGH — confirmed REST API approach via official Twilio docs
- Architecture patterns: HIGH — verified against existing codebase patterns
- Prisma schema design: HIGH — follows existing schema conventions in project
- GDPR requirements: HIGH — GDPR Article 9 text is authoritative; consent flow design follows locked decisions

**Research date:** 2026-03-29
**Valid until:** 2026-04-29 (stable APIs; ElevenLabs model names most likely to change)
