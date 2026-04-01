---
phase: 02-booking-ai-web-chat
plan: 02
subsystem: voice-service
tags: [tool-use, booking, claude, agentic-loop, faq, system-prompt, tdd]

# Dependency graph
requires: [02-01]
provides:
  - "BOOKING_TOOLS: 5 Anthropic.Tool[] definitions for check_availability, book_appointment, reschedule_appointment, cancel_appointment, check_services"
  - "dispatchTool(): HTTP dispatcher calling QueueUp APIs with service token auth"
  - "buildSystemPrompt(ctx, channel): FAQ system prompt with injected clinic context"
  - "fetchShopContext(shopId): fetches shop bundle from /api/internal/shop-context"
  - "processPatientUtterance(): agentic tool_use loop with MAX_TOOL_ITERATIONS guard"
  - "ShopContext + extended Session type with Anthropic.MessageParam[] messages"
affects: [02-03, voice-service, chat-service]

# Tech tracking
tech-stack:
  added: []
  patterns: [agentic-tool-use-loop, tool-dispatcher-pattern, system-prompt-injection, tdd-red-green]

key-files:
  created:
    - voice-service/src/handlers/bookingTools.ts
    - voice-service/tests/bookingTools.test.ts
  modified:
    - voice-service/src/types/session.ts
    - voice-service/src/handlers/claudeSession.ts
    - voice-service/src/handlers/twilioStream.ts
    - voice-service/tests/claudeSession.test.ts

key-decisions:
  - "processPatientUtterance uses anthropic.messages.create() (non-streaming) for tool loop — tool calls must complete before speaking; only final end_turn text goes to TTS"
  - "MAX_TOOL_ITERATIONS = 5 triggers escalation + graceful message instead of hard error — prevents runaway loops without crashing the call"
  - "fetchShopContext called fire-and-forget in twilioStream 'start' event — call proceeds immediately; shop context arrives before first patient utterance in practice"
  - "dispatchTool reschedule: aborts after 3 fetch calls if new slot is 409 — never cancels old appointment when new booking fails"
  - "buildSystemPrompt uses staffLabel dynamically and omits staff preference question when staffCount < 2"
  - "messages type changed to Anthropic.MessageParam[] — supports tool_use and tool_result content blocks alongside plain string messages"

patterns-established:
  - "Agentic tool_use loop: while(true) + stop_reason check + MAX_TOOL_ITERATIONS guard — use for all future Claude tool loops"
  - "Tool dispatcher pattern: switch/case with apiUrl() + authHeaders() helpers — reuse for chat-service tool dispatcher"

requirements-completed: [BOOK-01, BOOK-02, BOOK-03, BOOK-04, BOOK-06, INTAKE-01, INTAKE-02, FAQ-02, FAQ-03]

# Metrics
duration: 10min
completed: 2026-04-01
---

# Phase 2 Plan 02: Claude Agentic Tool_Use Loop + Booking Tools Summary

**5 booking tool definitions + agentic tool_use loop rewrite + FAQ system prompt injection from live shop context — Claude can now book, reschedule, cancel, and answer FAQ questions**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-01T16:49:38Z
- **Completed:** 2026-04-01T16:59:15Z
- **Tasks:** 2
- **Files modified:** 5 (2 new handlers, 1 extended type, 2 updated test files)

## Accomplishments

- Session type extended with `ShopContext` interface, `channel: 'voice' | 'chat'`, and `messages: Anthropic.MessageParam[]` to support tool_use/tool_result content blocks
- `bookingTools.ts` with 5 typed tool definitions matching Anthropic Tool format and a `dispatchTool()` HTTP dispatcher that calls QueueUp APIs with service token auth
- `processPatientUtterance()` rewritten as agentic loop: non-streaming `messages.create()`, tool dispatch, tool_result feedback, MAX_TOOL_ITERATIONS safety guard
- `buildSystemPrompt()` injects clinic info, working hours, services, staff count, booking rules, and intake instructions — enables FAQ answering from live data
- `fetchShopContext()` and non-blocking async fetch in twilioStream 'start' event with graceful error fallback
- 52 new tests (23 bookingTools + 29 claudeSession), all passing. Total suite: 103 tests passing.

## Task Commits

Each task was committed atomically using TDD (RED then GREEN):

1. **Test(02-02): add failing tests for booking tools dispatcher** - `47bb283` (test - RED)
2. **Feat(02-02): session type extension + booking tool definitions and dispatcher** - `f62f2dd` (feat - GREEN)
3. **Test(02-02): add failing tests for claude agentic tool_use loop and FAQ system prompt** - `4289029` (test - RED)
4. **Feat(02-02): claude agentic tool_use loop + FAQ system prompt + session init** - `9e08983` (feat - GREEN)

## Files Created/Modified

- `voice-service/src/types/session.ts` — Added `ShopContext`, `ShopService`, `ShopStaff`, `WorkingHours` interfaces; extended `Session` with `shopContext?`, `channel`, and changed `messages` to `Anthropic.MessageParam[]`
- `voice-service/src/handlers/bookingTools.ts` — `BOOKING_TOOLS` array with 5 tools, `dispatchTool()` dispatcher, `MAX_TOOL_ITERATIONS` constant
- `voice-service/src/handlers/claudeSession.ts` — Replaced static `SYSTEM_PROMPT` with `buildSystemPrompt()`, added `fetchShopContext()`, rewrote `processPatientUtterance()` with agentic loop
- `voice-service/src/handlers/twilioStream.ts` — Added `channel: 'voice'` on session creation, async `fetchShopContext()` call with error fallback
- `voice-service/tests/bookingTools.test.ts` — 23 tests covering all 5 tool dispatchers with mocked fetch
- `voice-service/tests/claudeSession.test.ts` — 29 tests covering `buildSystemPrompt`, `fetchShopContext`, `extractFirstSentence`, `processPatientUtterance` text and tool_use paths

## Decisions Made

- `processPatientUtterance` uses `anthropic.messages.create()` (non-streaming) for the tool loop — the loop must complete in full before Aria can speak; streaming the tool_use turn to TTS would produce garbled output (tool_use blocks, not natural language)
- `MAX_TOOL_ITERATIONS = 5` triggers escalation and a graceful "Let me connect you with a team member" message — prevents runaway loops without crashing the voice call
- `fetchShopContext` is called fire-and-forget in the 'start' event — the call can proceed while context is loading; in practice the first patient utterance arrives well after the async fetch completes
- `reschedule_appointment` aborts if new slot returns 409 and does NOT cancel the old appointment — ensures patients are never left without any booking
- `buildSystemPrompt` uses `staffLabel` dynamically and omits the staff preference question when `staffCount < 2` — matches the locked UX decision from CONTEXT.md

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check

- [x] `voice-service/src/handlers/bookingTools.ts` exists
- [x] `voice-service/src/handlers/claudeSession.ts` exports `buildSystemPrompt`, `fetchShopContext`, `processPatientUtterance`
- [x] `voice-service/src/types/session.ts` exports `ShopContext`, `Session` with `channel` and `shopContext`
- [x] `voice-service/tests/bookingTools.test.ts` — 23 tests, all passing
- [x] `voice-service/tests/claudeSession.test.ts` — 29 tests, all passing
- [x] Full suite: 103 tests passing, 0 failures

## Self-Check: PASSED

---
*Phase: 02-booking-ai-web-chat*
*Completed: 2026-04-01*
