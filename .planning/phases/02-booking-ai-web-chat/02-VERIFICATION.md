---
phase: 02-booking-ai-web-chat
verified: 2026-04-01T19:05:00Z
status: gaps_found
score: 8/13 requirements verified (CHAT-01 through CHAT-04 not implemented)
re_verification: false
gaps:
  - truth: "Patient can book, reschedule, or cancel via a chat widget embedded on any clinic website"
    status: failed
    reason: "No chat widget exists. No chat-service directory, no chat API route, no embeddable JS bundle, no ChatWidget component. CHAT-01 through CHAT-04 are entirely unimplemented."
    artifacts:
      - path: "chat-widget/"
        issue: "Directory does not exist"
      - path: "voice-service/src/handlers/chatRoute.ts"
        issue: "File does not exist — chat API endpoint not implemented"
      - path: "src/app/api/chat/route.ts"
        issue: "File does not exist"
    missing:
      - "chat-widget/ Preact/vanilla JS bundle with floating bubble + panel UI"
      - "GDPR consent gate rendered before first message (CHAT-02)"
      - "POST /api/chat route using shared processPatientUtterance() brain (CHAT-03)"
      - "sessionStorage-backed session persistence per shopId (CHAT-04)"
      - "Script tag embed: GET /widget/[shopId].js served from QueueUp (CHAT-01)"

  - truth: "TypeScript is clean — no type errors introduced by Phase 2 changes"
    status: failed
    reason: "Changing Session.messages to Anthropic.MessageParam[] broke auditLog.ts: msg.content is now string | ContentBlockParam[] but VoiceTranscript Prisma model expects String. Phase 2 introduced this regression."
    artifacts:
      - path: "voice-service/src/lib/auditLog.ts"
        issue: "Line 54: Type 'string | ContentBlockParam[]' is not assignable to type 'string' — VoiceTranscript.content field cannot hold tool_use content blocks"
    missing:
      - "Serialize msg.content to string before saving (JSON.stringify arrays, passthrough strings)"
      - "Or update VoiceTranscript schema to allow Json type for content field"
---

# Phase 2: Booking AI + Web Chat — Verification Report

**Phase Goal:** A patient can book, reschedule, or cancel an appointment via either voice or a chat widget embedded on any clinic website — with real-time availability checks, double-booking prevention, and a confirmation email sent on success.

**Verified:** 2026-04-01T19:05:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Voice-service can authenticate to QueueUp APIs using INTERNAL_SERVICE_TOKEN | VERIFIED | `src/lib/serviceAuth.ts` — `verifyServiceToken()` and `requireServiceOrAdmin()` implemented, substantive, imported in lookup and shop-context routes |
| 2 | Voice-service can look up patient appointments by phone + shopId | VERIFIED | `src/app/api/appointments/lookup/route.ts` — full implementation, uses `requireServiceOrAdmin`, queries Prisma with customer+appointments includes |
| 3 | Voice-service can fetch full shop context in one API call | VERIFIED | `src/app/api/internal/shop-context/route.ts` — single query with services/staff/workingHours includes, 2-min cache, 404/403 guards |
| 4 | PATCH /api/appointments/[id] accepts service token for AI-initiated changes | VERIFIED | `src/app/api/appointments/[id]/route.ts` line 20-25 — `verifyServiceToken()` checked first, skips requireAuth if true |
| 5 | AI checks real-time availability before confirming any appointment (BOOK-01) | VERIFIED | `bookingTools.ts` `check_availability` case — fetches `/api/availability`, filters to `available: true` only. 3 tests pass. |
| 6 | Patient can book a new appointment via voice (BOOK-02) | VERIFIED | `book_appointment` tool — maps snake_case to camelCase, calls POST /api/appointments, handles 409 SLOT_TAKEN. Tests pass. |
| 7 | Patient can reschedule an existing appointment (BOOK-03) | VERIFIED | `reschedule_appointment` tool — 3-step: lookup + book new + cancel old. Aborts if new slot 409 (never cancels old). Tests pass. |
| 8 | Patient can cancel an existing appointment (BOOK-04) | VERIFIED | `cancel_appointment` tool — lookup by phone, PATCH to CANCELLED, uses appointment_id if provided else most recent. Tests pass. |
| 9 | Booking confirmation email sent on successful booking (BOOK-06) | VERIFIED | Fires automatically through existing `POST /api/appointments` SendGrid hook (Phase 1). `book_appointment` calls that endpoint. No new code needed. |
| 10 | AI collects intake data (reason for visit) during booking (INTAKE-01, INTAKE-02) | VERIFIED | `buildSystemPrompt()` includes: "After confirming the booking, ask 'What's the reason for your visit?'... Include their answer in the notes field." `book_appointment` tool accepts `notes` field. Test line 164-168 confirms. |
| 11 | AI answers FAQ questions from injected shop context (FAQ-02, FAQ-03) | VERIFIED | `buildSystemPrompt()` injects clinic info, working hours, services, staff count. System prompt includes address, phone, email, hours, services. 12 tests for `buildSystemPrompt` all pass. |
| 12 | Patient can book/cancel/reschedule via a chat widget (CHAT-01 to CHAT-04) | FAILED | No chat widget exists anywhere in the codebase. No chat-widget directory, no chat API route, no embeddable bundle, no GDPR consent gate UI. |
| 13 | TypeScript is clean — no Phase 2 regressions | FAILED | `voice-service/src/lib/auditLog.ts` line 54 has a type error introduced by Phase 2: `msg.content` is now `string \| ContentBlockParam[]` but Prisma `VoiceTranscript.content` expects `String`. |

**Score: 11/13 truths verified** (2 gaps blocking goal achievement)

---

## Required Artifacts

### Plan 01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/serviceAuth.ts` | Service token verification middleware | VERIFIED | Exports `verifyServiceToken` and `requireServiceOrAdmin`. 44 lines, substantive. |
| `src/app/api/appointments/lookup/route.ts` | Appointment lookup by customer phone | VERIFIED | Full GET handler, Prisma query, rate-limited, service/admin auth. |
| `src/app/api/internal/shop-context/route.ts` | Full shop context bundle for AI system prompt | VERIFIED | Single Prisma query with all includes, 2-min cache, 404/403 guards. |

### Plan 02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `voice-service/src/handlers/bookingTools.ts` | Tool definitions + dispatcher | VERIFIED | Exports `BOOKING_TOOLS` (5 tools), `dispatchTool`, `MAX_TOOL_ITERATIONS`. 250 lines. |
| `voice-service/src/handlers/claudeSession.ts` | Agentic tool_use loop + FAQ system prompt | VERIFIED | Exports `buildSystemPrompt`, `fetchShopContext`, `processPatientUtterance`, `extractFirstSentence`. |
| `voice-service/src/types/session.ts` | Extended Session type with ShopContext | VERIFIED | Exports `ShopContext`, `ShopService`, `ShopStaff`, `WorkingHours`, `Session` with `channel` and `shopContext?`. |
| `voice-service/tests/bookingTools.test.ts` | Unit tests for all booking tool dispatchers | VERIFIED | 23 tests, all passing. Covers all 5 tools plus error paths. |
| `voice-service/tests/claudeSession.test.ts` | Unit tests for tool_use loop and system prompt | VERIFIED | 29 tests, all passing. Covers buildSystemPrompt, fetchShopContext, processPatientUtterance text + tool_use paths. |
| `chat-widget/` | Embeddable Preact/JS widget bundle | MISSING | Directory does not exist. |
| `voice-service/src/handlers/chatRoute.ts` | Chat API route using shared brain | MISSING | File does not exist. |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `serviceAuth.ts` | `appointments/lookup/route.ts` | `requireServiceOrAdmin` | WIRED | Import at line 3, used at line 32 |
| `serviceAuth.ts` | `internal/shop-context/route.ts` | `requireServiceOrAdmin` | WIRED | Import at line 4, used at line 34 |
| `serviceAuth.ts` | `appointments/[id]/route.ts` | `verifyServiceToken` | WIRED | Import at line 4, used at line 20 |
| `shop-context/route.ts` | `prisma.shop.findUnique` | database query with includes | WIRED | Line 45, includes services/staff/workingHours |
| `bookingTools.ts` | `/api/availability` | fetch with service token | WIRED | Line 114: `fetch(apiUrl('/api/availability?...'))` |
| `bookingTools.ts` | `/api/appointments` POST | fetch with service token | WIRED | Line 143: `fetch(apiUrl('/api/appointments'), { method: 'POST' })` |
| `bookingTools.ts` | `/api/appointments/lookup` | fetch with service token | WIRED | Lines 159, 221: `fetch(apiUrl('/api/appointments/lookup?...'))` |
| `claudeSession.ts` | `bookingTools.ts` | import BOOKING_TOOLS + dispatchTool | WIRED | Line 3: `import { BOOKING_TOOLS, dispatchTool, MAX_TOOL_ITERATIONS } from './bookingTools.js'` |
| `claudeSession.ts` | `/api/internal/shop-context` | fetch on session init | WIRED | Lines 58-72 in `fetchShopContext()` |
| `twilioStream.ts` | `claudeSession.ts` | `fetchShopContext` + `processPatientUtterance` | WIRED | Line 8 import, lines 45-52 and 195 usage |
| `chatRoute` | `claudeSession.ts` | shared brain | NOT WIRED | `chatRoute` does not exist |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| BOOK-01 | 02-02 | AI checks real-time availability | SATISFIED | `check_availability` tool fetches `/api/availability`, filters available slots |
| BOOK-02 | 02-02 | Patient can book via voice or chat | PARTIAL | Voice: satisfied. Chat: blocked — no chat channel exists. |
| BOOK-03 | 02-01, 02-02 | Patient can reschedule (name + phone verification) | SATISFIED (voice only) | `reschedule_appointment` tool; lookup endpoint in Plan 01 |
| BOOK-04 | 02-01, 02-02 | Patient can cancel | SATISFIED (voice only) | `cancel_appointment` tool; lookup endpoint in Plan 01 |
| BOOK-06 | 02-02 | Booking confirmation email | SATISFIED | Inherits from Phase 1 SendGrid hook via `POST /api/appointments` |
| INTAKE-01 | 02-02 | AI collects intake fields during booking | SATISFIED | `buildSystemPrompt` reason-for-visit instruction + `notes` field in `book_appointment` |
| INTAKE-02 | 02-02 | Intake data saved against appointment | SATISFIED | `notes` passed to `POST /api/appointments` and persisted via existing Prisma model |
| FAQ-02 | 02-01, 02-02 | AI answers FAQ from clinic data first | SATISFIED | `buildSystemPrompt` injects full clinic context; AI can answer hours/location/services without tools |
| FAQ-03 | 02-01, 02-02 | AI covers standard FAQ topics | SATISFIED | System prompt includes hours, address, phone, email, services with prices |
| CHAT-01 | Not claimed in any plan | Clinic can embed chat widget (single script tag) | NOT SATISFIED | No chat-widget directory, no embeddable JS bundle, no serving endpoint |
| CHAT-02 | Not claimed in any plan | Chat widget GDPR consent gate | NOT SATISFIED | No chat widget exists to have a consent gate |
| CHAT-03 | Not claimed in any plan | Chat widget shares same Claude brain | NOT SATISFIED | No chat API route consuming `processPatientUtterance()` |
| CHAT-04 | Not claimed in any plan | Conversation persists within tab session | NOT SATISFIED | No chat widget, no sessionStorage implementation |

### Orphaned Requirements

CHAT-01, CHAT-02, CHAT-03, and CHAT-04 are mapped to Phase 2 in REQUIREMENTS.md and listed in the Phase 2 CONTEXT.md scope. However, **neither 02-01-PLAN.md nor 02-02-PLAN.md** include these in their `requirements:` frontmatter. They were researched (02-RESEARCH.md contains full implementation designs) but no execution plan was created for them. These 4 requirements are orphaned — documented in scope but not planned or delivered.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `voice-service/src/lib/auditLog.ts` | 54 | `msg.content` used as string but is now `string \| ContentBlockParam[]` after Phase 2 type change | BLOCKER | TypeScript compilation error; transcript save will fail at runtime when tool_use messages are present — GDPR audit logs will be incomplete for bookings that use tools |
| `voice-service/tests/auditLog.test.ts` | 45 | `channel` field optional in test fixture but now required in Session type | WARNING | Pre-existing Phase 1 tests broken by Phase 2 type tightening — `channel` is not optional in Session but tests don't provide it |
| `voice-service/tests/callSummary.test.ts` | 34 | Same `channel` optional vs required mismatch | WARNING | Same root cause as above |
| `voice-service/tests/escalation.test.ts` | 22 | Same `channel` optional vs required mismatch | WARNING | Same root cause as above |

**Root cause for warnings:** Phase 2 added `channel: 'voice' | 'chat'` as a **required** (non-optional) field to `Session`. Three Phase 1 test fixtures build Session objects without `channel`, causing TypeScript errors. These tests still run under Vitest (which doesn't type-check), but `tsc --noEmit` fails.

---

## Human Verification Required

### 1. Booking confirmation email fires via voice

**Test:** Call the voice service with a test clinic, complete a full booking via voice through the AI tool loop.
**Expected:** A confirmation email arrives at the customer email address provided during booking.
**Why human:** Cannot verify SendGrid delivery programmatically without a live end-to-end call.

### 2. Voice AI conversation quality — FAQ accuracy

**Test:** Call the voice service and ask: "What are your opening hours?", "Where are you located?", "How much does a check-up cost?", "What services do you offer?"
**Expected:** Aria answers each question correctly from the injected shop context without calling any tools.
**Why human:** Response quality and factual accuracy require real API call to Claude with live shop data.

### 3. Double-booking prevention under concurrent requests

**Test:** Send two simultaneous `book_appointment` requests for the same slot from two voice sessions.
**Expected:** One gets the booking; the other gets a 409 SLOT_TAKEN error (handled by Phase 1 Redis idempotency key).
**Why human:** Requires concurrent load test or manual timing; cannot verify race condition with static analysis.

---

## Gaps Summary

Phase 2 delivered two things: (1) the API prerequisites layer (Plan 01 — all 4 files created and verified), and (2) the Claude agentic brain for voice (Plan 02 — all 6 files created, 52 tests passing).

**What was not delivered:** The chat channel — CHAT-01, CHAT-02, CHAT-03, and CHAT-04. The phase goal explicitly states "via either voice or a chat widget." Only voice was implemented. The research phase mapped out exactly how to build the chat widget and chat API route, but no execution plan (Plan 03) was created for it.

**Phase 2 is incomplete relative to its stated goal.** The voice booking AI is production-ready. The chat widget is not started.

**Secondary gap:** The `Session.messages` type change to `Anthropic.MessageParam[]` in Plan 02 introduced a TypeScript error in `voice-service/src/lib/auditLog.ts` — the content field of GDPR audit log transcripts cannot hold `ContentBlockParam[]`. At runtime, bookings that trigger tool calls will produce unsaveable transcript records. This is a GDPR compliance risk (GDPR-03 broken for tool-use calls).

---

*Verified: 2026-04-01T19:05:00Z*
*Verifier: Claude (gsd-verifier)*
