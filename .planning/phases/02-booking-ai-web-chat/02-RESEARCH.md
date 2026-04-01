# Phase 02: Booking AI + Web Chat - Research

**Researched:** 2026-04-01
**Domain:** Claude tool_use, chat API architecture, embeddable JS widget, QueueUp API integration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Booking conversation flow**: Service selection by asking "What type of appointment are you looking for?" — AI matches answer to available services, reads 2-3 closest if ambiguous.
- **Time selection**: Patient picks day first — "What day works best for you?" — then AI shows slots for that day.
- **No slots available**: Suggest next 2-3 available days.
- **Staff preference**: Only ask if clinic has 2+ active staff; use shop's `staffLabel` dynamically.
- **Booking confirmation**: Aria reads back full booking details then triggers SendGrid confirmation email.
- **Identity verification**: Name + phone number for reschedule/cancel.
- **Verification failure**: Transfer to staff.
- **Cancellation policy**: Phase 2 defaults to no restriction; enforcement deferred to Phase 3.
- **Reschedule flow**: Verify identity first, then follow normal booking flow for new time.
- **Widget appearance**: Floating bubble + panel, bottom-right corner, clinic brand color on bubble and header bar.
- **GDPR consent**: Blocking banner before first message — "This chat is handled by an AI assistant. Your data is processed per GDPR. By continuing, you consent to AI-assisted processing of your inquiry." Patient must click Accept before typing.
- **Widget technology**: Standalone JS bundle, single `<script>` tag, Preact or vanilla JS, < 50KB.
- **Session persistence**: sessionStorage only; clears on tab close. No login required.
- **Chat API**: New endpoint on QueueUp or voice-service; same Claude brain, same system prompt, same tool definitions as voice.
- **Intake timing**: During booking, woven in conversationally after confirming slot.
- **Intake style**: One question at a time: "What's the reason for your visit?"
- **Intake required fields**: Name + phone always. DOB, email, reason for visit, insurance optional. Phase 2 default: collect reason for visit if patient volunteers it.
- **Internal service token auth**: Voice-service and chat API authenticate to QueueUp APIs with a long-lived service token in request headers.

### Claude's Discretion
- Exact Claude tool definitions (function names, parameter schemas) for booking/reschedule/cancel
- How to structure the chat API (REST vs WebSocket)
- Service matching algorithm (fuzzy match, keyword match, or Claude's own judgment)
- Chat widget internal state management approach
- How to handle concurrent booking attempts in chat (idempotency already solved in Phase 1)

### Deferred Ideas (OUT OF SCOPE)
- Configurable intake fields per clinic — Phase 3 (INTAKE-03)
- Admin-managed FAQ knowledge base — Phase 3 (FAQ-01)
- Unanswered question logging for FAQ improvement — Phase 3 (FAQ-04)
- Clinic-branded AI persona name — Phase 3 (CLINIC-01)
- Barge-in / interruption handling on voice — future
- Re-consent TTL per patient — future
- Waitlist functionality — future
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BOOK-01 | AI checks real-time availability from QueueUp before confirming | Existing `GET /api/availability` called via service token; 1-min cache already present |
| BOOK-02 | Patient can book a new appointment via voice or chat | Claude `book_appointment` tool calling `POST /api/appointments`; voice extends claudeSession.ts, chat uses new POST /api/chat |
| BOOK-03 | Patient can reschedule an existing appointment (verified by name + phone) | Claude `reschedule_appointment` tool; new `GET /api/appointments` lookup by customer phone |
| BOOK-04 | Patient can cancel an existing appointment (policy enforced) | Claude `cancel_appointment` tool; PATCH/DELETE on appointment; Phase 2 no cancellation window restriction |
| BOOK-06 | Booking confirmation email sent via existing SendGrid integration | `POST /api/appointments` already triggers `sendBookingConfirmation()`; no extra work |
| CHAT-01 | Clinic can embed a chat widget on their website with a single script tag | Preact widget built with esbuild, served from `/widget/[shopId].js` on QueueUp Vercel |
| CHAT-02 | Chat widget displays GDPR consent gate before patient can type | Blocking overlay rendered by widget before any input is enabled; consent flag in component state |
| CHAT-03 | Chat widget shares the same Claude AI brain as voice | New `POST /api/chat` route on voice-service using same `processPatientUtterance()` with tool_use |
| CHAT-04 | Patient conversation persists within the browser tab session | sessionStorage key per shopId; loaded on mount, cleared on window close |
| INTAKE-01 | AI collects intake fields during or after booking | Collected by Claude conversationally via system prompt instructions; reason for visit if volunteered |
| INTAKE-02 | Collected intake data saved against appointment record | Passed as `notes` field to `POST /api/appointments`; intake fields stored in appointment.notes JSON |
| FAQ-02 | AI answers patient questions from clinic FAQ | Shop data (hours, services, location, staff) injected into system prompt at session start; Claude answers from that context |
| FAQ-03 | AI covers standard FAQ topics (hours, location, pricing, services, insurance) | Same shop data injection; Claude answers from injected context and general healthcare knowledge |
</phase_requirements>

---

## Summary

Phase 2 extends the Phase 1 voice pipeline in two orthogonal directions: adding Claude tool_use to the conversation engine so the AI can actually perform bookings, and shipping an embeddable web chat widget. The critical insight is that both channels share the exact same Claude session logic — `processPatientUtterance()` is extended once with tool definitions, and both voice and chat call it. The chat channel adds HTTP session management (replacing the Twilio WebSocket session) and a Preact widget bundle served from Vercel.

The existing QueueUp booking APIs (`GET /api/availability`, `POST /api/appointments`) are exactly what the AI tools call. No new booking engine is needed. The voice service calls these APIs via an internal service token. The tool_use agentic loop is synchronous from Claude's perspective: Claude emits a `tool_use` content block, the voice/chat handler executes the API call, and the result is fed back as a `tool_result` message before the next Claude streaming call begins.

For FAQ support without a knowledge base (FAQ-02, FAQ-03), the approach is system prompt injection: shop data (working hours, services, location, staff, description) is fetched from QueueUp at session start and injected into the Claude system prompt. Claude then answers FAQ questions from that context. This is sufficient for Phase 2; admin-managed FAQ knowledge base arrives in Phase 3.

**Primary recommendation:** Use `messages.create()` (non-streaming) for the agentic tool loop — the loop must complete before Aria speaks, so sentence-boundary streaming of the tool-calling turns is not useful. Stream only the final Claude response after tool results are consumed. For voice, this means the tool loop runs silently then Aria speaks the result. For chat, the final response can stream via SSE.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | 0.81.0 | Claude API client with tool_use and streaming | Already in voice-service; has `.stream()` and `.messages.create()` with tool support |
| Preact | 10.29.0 | Widget UI framework | 4.5KB gzipped; React-compatible API; ideal for embeddable widgets |
| esbuild | 0.27.4 | Widget bundler | Fastest bundler; produces IIFE bundles; native JSX support for Preact |
| Vitest | (latest) | Test framework | Already used in voice-service; no config change needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `preact/signals` | bundled with Preact | Widget state management | Simple reactive state; no Redux needed for a widget |
| `preact/compat` | bundled with Preact | React compatibility shim | Only if pulling in any React-targeting library |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Preact + esbuild | Vanilla JS | Vanilla avoids framework overhead but requires manual DOM diffing; Preact is 4.5KB and buys component model |
| Preact + esbuild | Svelte | Svelte produces ~9KB for similar widget; Preact preferred at < 50KB budget |
| REST POST /api/chat | WebSocket for chat | WebSocket adds persistent connection management; REST is simpler for chat (request-response, no real-time audio) |
| Streaming SSE for chat responses | Polling | SSE streams Claude's text response to the widget incrementally; polling adds unnecessary latency |

**Widget installation:**
```bash
# chat-widget package.json (standalone subfolder: /chat-widget/)
npm install preact esbuild
```

**Voice-service tool_use:**
```bash
# Already installed in voice-service:
# @anthropic-ai/sdk@^0.80.0 (update to 0.81.0 for latest)
```

**Version verification:** Confirmed via `npm view` — `@anthropic-ai/sdk` 0.81.0, `preact` 10.29.0, `esbuild` 0.27.4 as of 2026-04-01.

---

## Architecture Patterns

### Recommended Project Structure

New files/folders added to the monorepo:

```
/voice-service/src/handlers/
├── claudeSession.ts           # EXTEND: add tool_use loop, build_system_prompt()
├── bookingTools.ts            # NEW: tool definitions + tool dispatcher
└── chatSession.ts             # NEW: chat-specific session (no Twilio/TTS)

/voice-service/src/routes/
└── chatRoute.ts               # NEW: POST /chat HTTP endpoint (Fastify)

/voice-service/src/types/
└── session.ts                 # EXTEND: add shopId, shopContext, bookingState

/chat-widget/
├── package.json               # Preact + esbuild; builds to /public/widget/
├── src/
│   ├── widget.tsx             # Root Preact component (bubble + panel)
│   ├── consent.tsx            # GDPR consent overlay component
│   ├── messages.tsx           # Message list component
│   └── api.ts                 # fetch POST /chat, SSE streaming
└── build.js                   # esbuild script → /public/widget/[shopId].js (or generic)

/src/app/api/
└── widget/[shopId]/route.ts   # NEW on Next.js: serves per-shop widget config JSON
```

### Pattern 1: Claude Tool_Use Agentic Loop (non-streaming round trips)

**What:** Claude emits `stop_reason: "tool_use"` with a `tool_use` content block. The handler executes the tool (API call), sends back a `tool_result` user message, and calls Claude again. This repeats until `stop_reason: "end_turn"`.

**When to use:** Every booking, reschedule, cancel, and availability check action.

**Critical constraint for voice:** The tool loop must complete fully before speaking any output. Do not stream the tool-calling turn to TTS — the tool_use block contains no speakable text and the API call must complete before Aria can confirm the booking.

**Pattern:**

```typescript
// Source: https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls
// voice-service/src/handlers/claudeSession.ts (extended)

export async function processPatientUtterance(
  session: Session,
  transcript: string,
  onSentence: (sentence: string) => Promise<void>,
): Promise<void> {
  session.messages.push({ role: 'user', content: transcript });

  // Agentic loop — tools may require multiple round trips
  while (true) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: buildSystemPrompt(session.shopContext),
      tools: BOOKING_TOOLS,
      messages: session.messages,
    });

    // Accumulate assistant content (may contain both text and tool_use blocks)
    session.messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      // Extract and emit text blocks for TTS
      for (const block of response.content) {
        if (block.type === 'text') {
          await streamTextToOutput(block.text, onSentence);
        }
      }
      break;
    }

    if (response.stop_reason === 'tool_use') {
      // Execute each tool call, collect results
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          const result = await dispatchTool(block.name, block.input as Record<string, unknown>, session);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
          session.actionsLog.push(`tool:${block.name}`);
        }
      }
      // Feed results back — tool_result blocks MUST come first in content array
      session.messages.push({ role: 'user', content: toolResults });
      // Loop continues — Claude will process results and either call more tools or end_turn
    }
  }
}
```

### Pattern 2: Tool Definitions (Booking Tools)

**What:** Four client tools passed in every Claude API call once booking is needed.

**Example definitions:**

```typescript
// Source: https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools
// voice-service/src/handlers/bookingTools.ts

import type Anthropic from '@anthropic-ai/sdk';

export const BOOKING_TOOLS: Anthropic.Tool[] = [
  {
    name: 'check_availability',
    description: `Checks available appointment slots for a specific date at the clinic.
      Call this BEFORE attempting to book. Returns a list of available time slots for the given date.
      If no slots are available on the requested date, suggest calling with adjacent dates.
      Use the service duration from check_services if known, otherwise default 30 minutes.`,
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        staff_id: { type: 'string', description: 'Optional staff ID if patient expressed a preference' },
        duration: { type: 'number', description: 'Service duration in minutes, defaults to 30' },
      },
      required: ['date'],
    },
  },
  {
    name: 'book_appointment',
    description: `Books a new appointment after the patient has confirmed all details.
      Only call this AFTER the patient has confirmed: service, date, time, and provided name + phone.
      If the slot is taken (409 response), inform the patient and call check_availability again.
      Returns the booked appointment ID and confirmation details on success.`,
    input_schema: {
      type: 'object',
      properties: {
        service_id: { type: 'string', description: 'Service ID from check_services' },
        staff_id: { type: 'string', description: 'Optional staff ID' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        start_time: { type: 'string', description: 'Start time in HH:MM format (24h)' },
        customer_name: { type: 'string', description: 'Patient full name' },
        customer_phone: { type: 'string', description: 'Patient phone number' },
        customer_email: { type: 'string', description: 'Patient email address (optional)' },
        notes: { type: 'string', description: 'Reason for visit or other intake notes (optional)' },
      },
      required: ['service_id', 'date', 'start_time', 'customer_name', 'customer_phone'],
    },
  },
  {
    name: 'reschedule_appointment',
    description: `Reschedules an existing appointment after verifying patient identity by name + phone.
      First find the existing appointment, then book the new slot, then cancel the old one.
      Verify the patient owns the appointment before making changes.`,
    input_schema: {
      type: 'object',
      properties: {
        customer_name: { type: 'string', description: 'Patient name for identity verification' },
        customer_phone: { type: 'string', description: 'Patient phone for identity verification' },
        new_date: { type: 'string', description: 'New date in YYYY-MM-DD format' },
        new_start_time: { type: 'string', description: 'New start time in HH:MM 24h format' },
        appointment_id: { type: 'string', description: 'Existing appointment ID if known' },
      },
      required: ['customer_name', 'customer_phone', 'new_date', 'new_start_time'],
    },
  },
  {
    name: 'cancel_appointment',
    description: `Cancels an existing appointment after verifying patient identity by name + phone.
      Find the appointment by customer phone + name, confirm the patient wants to cancel, then cancel it.
      In Phase 2 there is no cancellation window restriction — cancel immediately.`,
    input_schema: {
      type: 'object',
      properties: {
        customer_name: { type: 'string', description: 'Patient name for identity verification' },
        customer_phone: { type: 'string', description: 'Patient phone for identity verification' },
        appointment_id: { type: 'string', description: 'Specific appointment ID if known' },
      },
      required: ['customer_name', 'customer_phone'],
    },
  },
  {
    name: 'check_services',
    description: `Returns the list of active services at this clinic with IDs, names, durations, and prices.
      Call this when the patient asks about available services or at the start of a booking flow to
      match their requested service type to an actual service ID.`,
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];
```

### Pattern 3: System Prompt Injection for FAQ (no knowledge base)

**What:** Shop context data fetched from QueueUp at session start, injected into the system prompt. Claude answers FAQ from this injected context. No separate knowledge base table needed for Phase 2.

**Data to inject:** shop name, address, phone, email, timezone, working hours (day-by-day), active services (name, duration, price), active staff (name, role), business type.

**When to use:** Built once per session in `buildSystemPrompt(shopContext)`.

```typescript
// voice-service/src/handlers/claudeSession.ts
export function buildSystemPrompt(ctx: ShopContext): string {
  const hoursText = ctx.workingHours
    .filter(h => !h.isClosed)
    .map(h => `  ${h.day}: ${h.openTime}–${h.closeTime}`)
    .join('\n');

  const servicesText = ctx.services
    .map(s => `  - ${s.name} (${s.duration} min, ${s.price} ${ctx.currency})`)
    .join('\n');

  return `You are Aria, a warm and friendly AI receptionist assistant for ${ctx.shopName}.

CLINIC INFORMATION (answer patient questions from this data):
Name: ${ctx.shopName}
Address: ${ctx.address ?? 'Not provided'}
Phone: ${ctx.phone ?? 'Not provided'}
Email: ${ctx.email ?? 'Not provided'}
Timezone: ${ctx.timezone}

WORKING HOURS:
${hoursText}

SERVICES AVAILABLE:
${servicesText}

STAFF: ${ctx.staffCount} active ${ctx.staffLabel}${ctx.staffCount !== 1 ? 's' : ''}

BOOKING RULES:
- Ask patient what day works for them first, then show available slots for that day
- ${ctx.staffCount >= 2 ? `Ask "Do you have a preferred ${ctx.staffLabel}?" after service is selected` : 'No staff preference needed (single provider)'}
- Read back full booking before confirming: service, date, time, ${ctx.staffLabel}
- Always collect patient name and phone number

CONVERSATION RULES:
- Keep responses short and conversational — this is a ${ctx.channel === 'voice' ? 'phone call' : 'chat'}
- Use patient's first name once naturally after they provide it
- Never provide medical advice, diagnosis, or triage
- If uncertain after 2 questions, offer to connect with a team member
- When you cannot answer confidently, say "I'm not sure about that"`;
}
```

### Pattern 4: Chat API (REST with SSE streaming)

**What:** New `POST /chat` endpoint on voice-service (Fastify). Receives a message and session state, calls `processChatMessage()` (same tool loop as voice but without TTS), streams Claude's text response back as Server-Sent Events.

**Why REST not WebSocket:** Chat is request-response (patient types, AI responds). No continuous audio stream. WebSocket would add connection management complexity for no benefit. SSE for streaming gives the widget incremental text without polling.

**Request shape:**
```typescript
// POST /chat
interface ChatRequest {
  shopId: string;     // clinic identifier
  sessionId: string;  // from widget's sessionStorage
  message: string;    // patient's message text
  consentGranted: boolean; // must be true or 400
}

// Response: text/event-stream (SSE)
// data: {"type":"text","delta":"Hello, "}
// data: {"type":"text","delta":"I can help you book an appointment."}
// data: {"type":"done","actions":["tool:book_appointment"]}
```

**Session storage:** Chat sessions are stored in memory on the voice-service process (Map<sessionId, ChatSession>). The widget sends its sessionId on every request. Sessions expire after 30 minutes of inactivity. This matches CHAT-04 (tab session persistence) — sessionId is in sessionStorage so it's lost when the tab closes.

### Pattern 5: Embeddable Widget (Preact + esbuild)

**What:** Single JS bundle served from `https://[queueup-domain]/widget/chat.js?shopId=[id]`. Embed via one script tag. Widget self-initializes, fetches shop branding from a config endpoint, mounts into a shadow DOM element.

**Embed code:**
```html
<script src="https://app.queueup.com/widget/chat.js" data-shop-id="demo-barber" async></script>
```

**Widget behavior:**
1. Script loads, reads `data-shop-id` from its own script tag
2. Fetches `/api/widget/config?shopId=[id]` (brand color, shop name, welcome message)
3. Mounts Preact app inside a shadow DOM root (style isolation from host page)
4. Shows floating bubble in bottom-right corner
5. On bubble click: shows panel, renders GDPR consent gate first
6. On consent accepted: enables input, loads prior messages from sessionStorage
7. On message submit: POST /chat with sessionId; streams SSE response into message list

**esbuild config (chat-widget/build.js):**
```javascript
// Source: https://esbuild.github.io/api/#bundle
import { build } from 'esbuild';

await build({
  entryPoints: ['src/widget.tsx'],
  bundle: true,
  minify: true,
  format: 'iife',           // Self-executing for script tag embed
  globalName: 'QueueUpWidget',
  jsxImportSource: 'preact',
  jsx: 'automatic',
  outfile: '../public/widget/chat.js',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});
```

**Shadow DOM mounting (style isolation):**
```typescript
// chat-widget/src/widget.tsx
import { render } from 'preact';
import { App } from './App';

function mount() {
  const script = document.currentScript as HTMLScriptElement;
  const shopId = script?.dataset?.shopId ?? script?.getAttribute('data-shop-id');
  if (!shopId) return;

  const host = document.createElement('div');
  host.id = 'queueup-widget-host';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  const mountPoint = document.createElement('div');
  shadow.appendChild(mountPoint);

  render(<App shopId={shopId} />, mountPoint);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
```

### Anti-Patterns to Avoid

- **Streaming the tool_use turn to TTS:** The content blocks during `stop_reason: "tool_use"` contain `tool_use` blocks, not natural language. If you pipe this to ElevenLabs you get garbled output. Only stream final `end_turn` text to TTS.
- **Tool_result text before tool_result blocks:** The Anthropic API requires `tool_result` blocks to appear FIRST in the content array of the user message. Putting a text block before tool results causes a 400 error.
- **Stateless chat API with full history resent each request:** The voice-service holds session state in memory. For chat, the widget only sends the new message and sessionId — the server reconstructs `messages[]` from the session. Don't make the widget manage or resend conversation history.
- **Blocking the booking POST on email confirmation:** `sendBookingConfirmation()` is fire-and-forget in the existing appointments API. The tool result should include appointment confirmation data without waiting for email delivery.
- **Using `input_schema: {type: "object", properties: {}}` without `required: []`:** Claude may not call no-arg tools correctly without an explicit empty `required` array.
- **Rebuilding the widget on each shop request:** The widget JS bundle is static. Per-shop customization (brand color, shop name) comes from the `/api/widget/config` JSON endpoint, not from building separate JS per shop.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Booking conflict detection | Custom overlap check in tool handler | `POST /api/appointments` already has double-check inside DB transaction | Prisma transaction with re-check is the only safe place; race condition between check and insert otherwise |
| Idempotency for concurrent chat bookings | Custom lock | `checkIdempotency` / `setIdempotency` in `src/lib/resilience.ts` | Redis-backed, already in the codebase; same key format works for chat sessions |
| Service name matching | Fuzzy string match library | Claude's own judgment | Claude understands "cleaning" → "deep cleaning service" without code; let it match, then confirm with patient |
| Widget CSS scoping | CSS prefixing or CSS Modules | Shadow DOM | Shadow DOM provides native style isolation; no host-page conflicts |
| Tool agentic loop retry logic | Manual retry counter | `anthropic.messages.create()` with error handling + the existing `withRetry()` from `src/lib/resilience.ts` | Already handles 429 / 5xx with exponential backoff |
| Chat session timeout cleanup | Manual interval in Fastify | Per-session `lastActiveAt` timestamp + cleanup on next request | Avoids memory leak without needing a background timer process |

**Key insight:** The booking pipeline is already production-quality. The AI tools are thin HTTP wrappers around existing API routes. Tool handler code should be < 20 lines per tool.

---

## Common Pitfalls

### Pitfall 1: Tool_use loop doesn't terminate
**What goes wrong:** Claude keeps calling tools in a loop (e.g., keeps rechecking availability) and never reaches `end_turn`.
**Why it happens:** Tool descriptions are ambiguous, or tool results don't give Claude enough information to conclude.
**How to avoid:** Set `max_tokens: 600` per turn (limits runaway generation). Add a loop counter (max 5 iterations). Tool descriptions must say "Only call X after Y is confirmed."
**Warning signs:** Response time > 5 seconds on a single turn; `actionsLog` has 5+ tool calls.

### Pitfall 2: 409 conflict on concurrent voice + chat bookings
**What goes wrong:** Two patients (one on voice, one on chat) book the same slot milliseconds apart; both see "Confirmed" because the availability check passed for both.
**Why it happens:** The Redis idempotency key uses `(shopId, date, startTime, phone)` — different patients have different phones, so the key doesn't block them.
**How to avoid:** The existing `POST /api/appointments` Prisma transaction re-checks the slot inside the transaction and throws `SLOT_TAKEN`. The tool handler must handle `409` responses gracefully and tell Claude "slot is now taken" so it asks for an alternative.
**Warning signs:** Two appointments with identical `(shopId, date, startTime, staffId)` in the DB.

### Pitfall 3: Widget style bleeding from host page
**What goes wrong:** The widget's CSS is overridden by the clinic's website stylesheet. Buttons look broken, font changes, modal is hidden behind clinic elements.
**Why it happens:** Plain `<div>` injection into the host page inherits all host styles.
**How to avoid:** Mount the widget inside a Shadow DOM root. All widget CSS is scoped to the shadow root and invisible to the host page. Host page CSS cannot leak in.
**Warning signs:** Widget looks correct on QueueUp's own site but broken on a WordPress clinic site.

### Pitfall 4: Message history grows unbounded in voice
**What goes wrong:** Long calls accumulate many messages including `tool_use` and `tool_result` blocks. Claude API token limits (~200K context) are hit on a 60+ minute session.
**Why it happens:** Every tool call round trip adds 3-4 messages to the history.
**How to avoid:** For Phase 2 (short booking calls), this is unlikely. Add a sliding window guard: if `session.messages.length > 40`, trim the oldest non-system messages while preserving the most recent tool_use/tool_result pair.
**Warning signs:** Anthropic 400 error with "prompt too long" or truncation warnings.

### Pitfall 5: sessionStorage key collision between clinics
**What goes wrong:** A patient visits two different clinic sites that both use QueueUp. Their chat history from Clinic A leaks into the Clinic B widget.
**Why it happens:** Both widgets use a generic sessionStorage key like `queueup_messages`.
**How to avoid:** Namespace the sessionStorage key by shopId: `queueup_session_[shopId]`.
**Warning signs:** Patient sees messages from a different clinic's conversation.

### Pitfall 6: Chat API served from Vercel hits cold-start on first message
**What goes wrong:** First chat message takes 3-5 seconds to respond because the serverless function cold-starts.
**Why it happens:** The chat API is on Vercel serverless (Next.js API route). Claude streaming only starts after the function warms up.
**How to avoid:** Host the `POST /chat` endpoint on the voice-service (Railway persistent process), NOT as a Next.js API route. Voice-service is always warm. This is consistent with the context decision to route chat through the same backend as voice.
**Warning signs:** First message latency > 2s; subsequent messages < 500ms.

### Pitfall 7: GDPR consent gate bypassed via direct API call
**What goes wrong:** A patient bypasses the widget consent gate by calling `/api/chat` directly with any message.
**Why it happens:** The widget enforces consent client-side only.
**How to avoid:** The `/api/chat` endpoint must validate `consentGranted: true` in the request body. If absent or false, return `403 Consent required`. Log the consent action in the audit log (extend VoiceAuditLog or create ChatAuditLog — use the same pattern from Phase 1).
**Warning signs:** Messages appearing in the DB without a corresponding consent event in the audit log.

---

## Code Examples

Verified patterns from official sources and codebase analysis:

### Tool Call Round Trip (complete agentic loop)
```typescript
// Source: https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls
// Tool result message format — tool_result blocks MUST come first

// After receiving stop_reason: "tool_use":
const toolResults = response.content
  .filter(block => block.type === 'tool_use')
  .map(block => ({
    type: 'tool_result' as const,
    tool_use_id: block.id,
    content: JSON.stringify(await dispatchTool(block.name, block.input)),
  }));

// Feed results back:
messages.push({ role: 'assistant', content: response.content });
messages.push({ role: 'user', content: toolResults }); // tool_result blocks first
```

### Booking Tool Dispatcher
```typescript
// voice-service/src/handlers/bookingTools.ts
export async function dispatchTool(
  name: string,
  input: Record<string, unknown>,
  session: Session,
): Promise<unknown> {
  const baseUrl = process.env.QUEUEUP_API_URL;
  const token = process.env.INTERNAL_SERVICE_TOKEN;
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  switch (name) {
    case 'check_availability': {
      const url = `${baseUrl}/api/availability?shopId=${session.shopId}&date=${input.date}` +
        (input.staff_id ? `&staffId=${input.staff_id}` : '') +
        `&duration=${input.duration ?? 30}`;
      const res = await fetch(url, { headers });
      return res.json();
    }
    case 'book_appointment': {
      const res = await fetch(`${baseUrl}/api/appointments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          shopId: session.shopId,
          serviceId: input.service_id,
          staffId: input.staff_id,
          date: input.date,
          startTime: input.start_time,
          customerName: input.customer_name,
          customerPhone: input.customer_phone,
          customerEmail: input.customer_email,
          notes: input.notes,
        }),
      });
      if (res.status === 409) return { error: 'SLOT_TAKEN', message: 'This time slot was just booked by someone else. Please check availability again.' };
      return res.json();
    }
    // ... reschedule_appointment, cancel_appointment, check_services
    default:
      return { error: 'UNKNOWN_TOOL' };
  }
}
```

### Session Initialization with Shop Context
```typescript
// voice-service/src/handlers/chatSession.ts
// Fetch shop context on session creation (for FAQ injection into system prompt)
export async function buildShopContext(shopId: string): Promise<ShopContext> {
  const baseUrl = process.env.QUEUEUP_API_URL;
  const token = process.env.INTERNAL_SERVICE_TOKEN;
  const headers = { Authorization: `Bearer ${token}` };

  const [shopRes, servicesRes, staffRes, hoursRes] = await Promise.all([
    fetch(`${baseUrl}/api/shops/${shopId}`, { headers }),
    fetch(`${baseUrl}/api/admin/services?shopId=${shopId}`, { headers }),
    fetch(`${baseUrl}/api/admin/staff?shopId=${shopId}`, { headers }),
    fetch(`${baseUrl}/api/admin/hours?shopId=${shopId}`, { headers }),
  ]);

  return {
    shopId,
    ...(await shopRes.json()),
    services: (await servicesRes.json()).filter((s: any) => s.isActive),
    staff: (await staffRes.json()).filter((s: any) => s.isActive),
    workingHours: await hoursRes.json(),
  };
}
```

### GDPR Consent Gate (Preact widget)
```typescript
// chat-widget/src/consent.tsx
import { useState } from 'preact/hooks';

interface ConsentGateProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function ConsentGate({ onAccept, onDecline }: ConsentGateProps) {
  return (
    <div class="consent-overlay">
      <div class="consent-box">
        <p>This chat is handled by an AI assistant. Your data is processed per GDPR.
          By continuing, you consent to AI-assisted processing of your inquiry.</p>
        <div class="consent-actions">
          <button onClick={onAccept} class="btn-primary">Accept</button>
          <button onClick={onDecline} class="btn-secondary">Decline</button>
        </div>
      </div>
    </div>
  );
}
```

### SSE Streaming in Chat Route (Fastify)
```typescript
// voice-service/src/routes/chatRoute.ts
app.post('/chat', async (request, reply) => {
  const { shopId, sessionId, message, consentGranted } = request.body as ChatRequest;
  if (!consentGranted) return reply.code(403).send({ error: 'Consent required' });

  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const session = getOrCreateChatSession(sessionId, shopId);
  await processChatMessage(session, message, async (chunk: string) => {
    reply.raw.write(`data: ${JSON.stringify({ type: 'text', delta: chunk })}\n\n`);
  });
  reply.raw.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  reply.raw.end();
});
```

### Widget SSE Consumer (Preact)
```typescript
// chat-widget/src/api.ts
export async function sendMessage(
  shopId: string,
  sessionId: string,
  message: string,
  onChunk: (text: string) => void,
): Promise<void> {
  const response = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shopId, sessionId, message, consentGranted: true }),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        if (data.type === 'text') onChunk(data.delta);
      }
    }
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tool use with `functions` array (OpenAI style) | `tools` array with `input_schema` (Anthropic native) | Always Anthropic-native | No migration needed — the codebase uses Anthropic SDK directly |
| `messages.stream()` for all turns | `messages.create()` for tool loops, `messages.stream()` for final response | SDK 0.80+ | Tool loop needs full response to extract tool_use blocks; streaming is for text output only |
| React for embeddable widgets | Preact (4.5KB) for embed, React only for full apps | Community standard | React is 45KB+; too large for third-party embed |
| Polling for AI chat responses | SSE (Server-Sent Events) | ~2023 standard | SSE is simpler than WebSocket for one-way streaming; no upgrade handshake |
| In-memory idempotency store | Redis-backed idempotency (completed Phase 1) | Phase 1 | Phase 2 booking is safe for concurrent voice + chat |

**Deprecated/outdated:**
- `anthropic.messages.stream()` for tool-calling turns: Use `messages.create()` for turns that include tool calls; streaming doesn't help when you need the full response to extract `tool_use` blocks.
- WebSocket for chat API: REST + SSE is simpler, sufficient, and avoids persistent connection management.

---

## Open Questions

1. **Cancellation and reschedule API: does `PATCH /api/appointments/[id]` exist?**
   - What we know: `POST /api/appointments` creates; `GET /api/appointments` lists (admin-only). No PATCH or DELETE found in the codebase.
   - What's unclear: The tool dispatcher needs to cancel/reschedule existing appointments. These API routes do not currently exist.
   - Recommendation: Wave 0 of Phase 2 planning must create `PATCH /api/appointments/[id]` (status update to CANCELLED) and the lookup-by-phone endpoint for identity verification. These are prerequisite APIs for the reschedule and cancel tools.

2. **Service token auth: does `/api/admin/services` and `/api/admin/staff` accept a bearer token from voice-service?**
   - What we know: These endpoints currently use admin JWT auth (`requireAdmin`). Voice-service uses an internal service token (decided in Phase 1 context).
   - What's unclear: The existing admin auth middleware may not accept the service token format. A service token bypass or separate internal route may be needed.
   - Recommendation: Add a service token check in `requireAdmin()` (or a new `requireInternalService()` middleware) that accepts `Authorization: Bearer [INTERNAL_SERVICE_TOKEN]` in addition to admin cookies.

3. **Shop context API: does `/api/shops/[slug]` or `/api/shops/[shopId]` exist for internal use?**
   - What we know: `GET /api/shops/[slug]` is referenced in CONTEXT.md but was not found in the codebase scan.
   - What's unclear: Whether the route exists and whether it returns working hours, services, and staff or just shop metadata.
   - Recommendation: Verify or create a `/api/internal/shop-context?shopId=[id]` route that returns the full shop context bundle (shop + services + staff + hours) in one call. Avoids 4 parallel fetches in `buildShopContext()`.

4. **Chat audit log: extend VoiceAuditLog or create a new ChatAuditLog model?**
   - What we know: Phase 1 created `VoiceAuditLog` (linked to `VoiceCall`). Chat has no equivalent call.
   - What's unclear: Whether to add a `ChatSession` model to Prisma schema (mirroring `VoiceCall`) or use a unified `AIInteraction` model.
   - Recommendation: Add `ChatSession` model to Prisma schema for Phase 2, mirroring `VoiceCall`. Both link to the same `VoiceAuditLog` pattern. A unified model can be a Phase 3 refactor if needed.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (latest, installed in voice-service) |
| Config file | `voice-service/vitest.config.ts` (exists) |
| Quick run command | `cd voice-service && npm test -- --reporter=verbose` |
| Full suite command | `cd voice-service && npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BOOK-01 | `check_availability` tool calls `GET /api/availability` and returns slots | unit | `vitest run tests/bookingTools.test.ts -t check_availability` | ❌ Wave 0 |
| BOOK-02 | `book_appointment` tool calls `POST /api/appointments` and returns confirmation | unit | `vitest run tests/bookingTools.test.ts -t book_appointment` | ❌ Wave 0 |
| BOOK-02 | Tool_use agentic loop runs until `end_turn`, emits text sentences | unit | `vitest run tests/claudeSession.test.ts -t tool_use_loop` | ❌ Wave 0 |
| BOOK-03 | `reschedule_appointment` verifies patient identity before modifying | unit | `vitest run tests/bookingTools.test.ts -t reschedule` | ❌ Wave 0 |
| BOOK-04 | `cancel_appointment` finds and cancels by name + phone | unit | `vitest run tests/bookingTools.test.ts -t cancel` | ❌ Wave 0 |
| BOOK-04 | 409 slot-taken response causes tool to return descriptive error message | unit | `vitest run tests/bookingTools.test.ts -t slot_conflict` | ❌ Wave 0 |
| BOOK-06 | `POST /api/appointments` triggers SendGrid (existing test coverage) | unit | `npm test` (existing coverage) | ✅ existing |
| CHAT-01 | Widget JS file is served from the expected URL | smoke | manual browser test | ❌ Wave 0 |
| CHAT-02 | Consent gate is rendered; input disabled before acceptance | unit | `vitest run chat-widget/tests/consentGate.test.tsx` | ❌ Wave 0 |
| CHAT-02 | `/api/chat` returns 403 when `consentGranted: false` | unit | `vitest run tests/chatRoute.test.ts -t consent_gate` | ❌ Wave 0 |
| CHAT-03 | `/api/chat` processes message through same `processPatientUtterance()` | unit | `vitest run tests/chatRoute.test.ts -t brain_shared` | ❌ Wave 0 |
| CHAT-04 | sessionStorage key is namespaced by shopId | unit | `vitest run chat-widget/tests/session.test.ts` | ❌ Wave 0 |
| INTAKE-02 | `notes` field in `book_appointment` tool input is passed to appointments API | unit | `vitest run tests/bookingTools.test.ts -t intake_notes` | ❌ Wave 0 |
| FAQ-02 | `buildSystemPrompt()` includes shop working hours, services, location | unit | `vitest run tests/claudeSession.test.ts -t system_prompt_injection` | ❌ Wave 0 |
| FAQ-03 | System prompt includes service names, prices, and staff count | unit | `vitest run tests/claudeSession.test.ts -t faq_context` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd voice-service && npm test`
- **Per wave merge:** `cd voice-service && npm test` (full suite, all passing)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `voice-service/tests/bookingTools.test.ts` — covers BOOK-01, BOOK-02, BOOK-03, BOOK-04, INTAKE-02
- [ ] `voice-service/tests/chatRoute.test.ts` — covers CHAT-02 (server-side), CHAT-03
- [ ] `voice-service/tests/claudeSession.test.ts` — extend existing file: add tool_use loop test, buildSystemPrompt tests
- [ ] `chat-widget/tests/consentGate.test.tsx` — covers CHAT-02 (client-side)
- [ ] `chat-widget/tests/session.test.ts` — covers CHAT-04
- [ ] `chat-widget/package.json` — Preact + esbuild + Vitest (or use jsdom environment in voice-service vitest)
- [ ] `PATCH /api/appointments/[id]/route.ts` — prerequisite API for cancel/reschedule tools (see Open Questions)
- [ ] `GET /api/appointments/by-phone/route.ts` (or query param variant) — prerequisite for identity verification

---

## Sources

### Primary (HIGH confidence)
- Anthropic official docs — tool definition format, `input_schema` JSON Schema, `tool_use` stop_reason, `tool_result` message format: https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls
- Anthropic official docs — `define-tools`, `tool_choice` options, best practices: https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools
- Anthropic official docs — streaming overview and `finalMessage()`: https://platform.claude.com/docs/en/build-with-claude/streaming
- `voice-service/src/handlers/claudeSession.ts` — existing `processPatientUtterance()` with `messages.stream()` pattern (direct read)
- `src/app/api/appointments/route.ts` — full booking pipeline, idempotency, conflict detection (direct read)
- `src/app/api/availability/route.ts` — availability GET, 1-min cache (direct read)
- `voice-service/vitest.config.ts` — test framework config (direct read)
- `npm view` output — `@anthropic-ai/sdk` 0.81.0, `preact` 10.29.0, `esbuild` 0.27.4 (verified 2026-04-01)

### Secondary (MEDIUM confidence)
- Preact official site and Sentry engineering blog — widget bundle size 4.5KB, Shadow DOM integration pattern: https://sentry.engineering/blog/preact-or-svelte-an-embedded-widget-use-case/
- esbuild IIFE bundle format for embeddable scripts — verified against esbuild docs: https://esbuild.github.io/api/#format-iife

### Tertiary (LOW confidence)
- Anthropic tools-streaming.ts GitHub example — referenced but full content not extracted; patterns inferred from docs and SDK type signatures

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified via `npm view`; Anthropic tool_use from official docs
- Architecture (tool_use loop): HIGH — from official Anthropic docs with TypeScript examples
- Architecture (chat REST vs WebSocket): HIGH — derived from requirements (request-response chat, no audio)
- Architecture (widget/Shadow DOM): MEDIUM — Preact + Shadow DOM is community standard; bundle size from published benchmarks
- Pitfalls: HIGH — booking conflict and tool loop pitfalls from direct codebase analysis; widget pitfalls from known browser behavior
- Open Questions: HIGH — gaps identified from direct code scan; no existing cancel/reschedule API confirmed absent

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (Anthropic SDK evolves; verify tool_use API before implementing if > 30 days)
