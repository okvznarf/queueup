---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 02-04-PLAN.md (awaiting human-verify checkpoint)
last_updated: "2026-04-15T00:00:00.000Z"
last_activity: 2026-04-15 — Phase 2 code complete; chatRoute tests fixed, summaries written, test page scaffolded
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 9
  completed_plans: 9
  percent: 20
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)

**Core value:** A clinic patient can call or chat at any hour and get their appointment booked without waiting for a human — as naturally as talking to a real receptionist.
**Current focus:** Phase 1 — Voice Pipeline + GDPR Foundation

## Current Position

Phase: 2 of 5 (Booking AI + Web Chat)
Plan: 4 of 4 code complete; Plan 04 human-verify checkpoint pending
Status: Executing — code shipped, awaiting E2E human sign-off before marking Phase 2 PASS
Last activity: 2026-04-15 — chatRoute test fixes (115 tests passing), 02-03/04 summaries, test page at public/widget/test.html

Progress: [██░░░░░░░░] 20%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: ~25 min
- Total execution time: ~1.5 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 3/5 | ~75 min | ~25 min |

**Recent Trend:**
- Last 3 plans: 01-01 (25m), 01-02 (25m), 01-03 (25m)
- Trend: stable

*Updated after each plan completion*
| Phase 01-voice-pipeline-gdpr-foundation P04 | 7 | 2 tasks | 10 files |
| Phase 01-voice-pipeline-gdpr-foundation P05 | 8 | 2 tasks | 5 files |
| Phase 02-booking-ai-web-chat P01 | 3 | 2 tasks | 4 files |
| Phase 02-booking-ai-web-chat P01 | 3 | 2 tasks | 4 files |
| Phase 02-booking-ai-web-chat P02 | 10 | 2 tasks | 5 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Voice orchestrator MUST be a persistent Node.js service on Railway (not Vercel serverless) — Twilio Media Streams WebSocket lasts the full call duration; serverless execution limits will drop calls mid-conversation
- [Roadmap]: GDPR consent infrastructure built in Phase 1 alongside the audio pipeline — cannot defer to a later "compliance phase" as EU patients cannot touch the system without it
- [Roadmap]: Deepgram Nova-2 (streaming WebSocket) chosen for STT over ElevenLabs STT — ~200-300ms latency for telephony audio; configured for mulaw 8kHz to accept Twilio audio directly
- [Roadmap]: ElevenLabs output_format=ulaw_8000 must be configured from day 1 — defaults (MP3/PCM at 22-44kHz) produce garbled audio on Twilio calls
- [Phase 01]: @elevenlabs/elevenlabs-js version corrected to ^2.40.0 — 1.x series does not exist on npm
- [Phase 01]: voice-service idempotency tests use local src/lib/idempotency.ts wrapper to maintain vi.mock within package boundary; avoids cross-package module resolution issues
- [Phase 01]: checkIdempotency/setIdempotency in src/lib/resilience.ts are now async — all callers must await
- [Phase 01]: Consent detection checks refusals before affirmatives — "I don't agree" contains "agree" but is a refusal
- [Phase 01]: Claude conversation engine uses claude-sonnet-4-6 for voice (fast enough for real-time)
- [Phase 01]: ElevenLabs uses eleven_flash_v2_5 (not deprecated turbo) with ulaw_8000 output
- [Phase 01]: Escalation triggered at 2 unanswered questions via "I'm not sure about that" phrase detection
- [Phase 01]: Warm transfer uses Twilio REST API calls(callSid).update() with TwiML Dial — closes Media Stream WebSocket automatically after redirect
- [Phase 01]: Audit log write is fire-and-forget on stop event — errors are logged but call cleanup is never blocked
- [Phase 01]: startRetentionCron called inside listen callback — cron starts after server fully bound; 60s startup delay for DB connection settling
- [Phase 01]: Dockerfile multi-stage build — builder compiles TS, production stage only contains compiled JS and prod deps, reducing image size
- [Phase 01]: Railway eu-west region — satisfies GDPR-04 EU data residency requirement for voice call data
- [Phase 02-01]: requireServiceOrAdmin() tries service token first (no DB lookup), falls back to requireAdmin() — allows voice/chat service and admin dashboard to share the same endpoints
- [Phase 02-01]: PATCH /api/appointments/[id] service-token path skips role-based checks entirely — AI acts as trusted service agent, not as a user
- [Phase 02-01]: Shop context cached 2 minutes in-memory — reduces latency for parallel AI session initializations
- [Phase 02-02]: processPatientUtterance uses anthropic.messages.create() non-streaming for tool loop — tool calls must complete before speaking; only end_turn text goes to TTS
- [Phase 02-02]: MAX_TOOL_ITERATIONS=5 triggers escalation with graceful message instead of hard error — prevents runaway Claude loops without crashing calls
- [Phase 02-02]: messages type changed to Anthropic.MessageParam[] — supports tool_use and tool_result content blocks alongside plain string messages

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: Deepgram `endpointing` and `speechEndThreshold` parameter values must be measured with real telephony audio — hardcoded values from training data may not be optimal
- [Phase 1]: Existing timezone bug in QueueUp availability calculations must be scoped before Phase 1 voice booking work begins (may be 1-hour fix or multi-day data migration)
- [Phase 3]: Twilio EU Regulatory Bundle approval lead times vary by country (Germany, France, Italy, Spain, Netherlands) — start approval process early in Phase 3 to avoid go-live delays

## Session Continuity

Last session: 2026-04-15T00:00:00.000Z
Stopped at: Completed 02-04-PLAN.md code (human-verify checkpoint pending — user to run public/widget/test.html)
Resume file: None

### Resume instructions
1. Open two terminals: `npm run dev` in queueup root (port 3000) and `npm run dev` in voice-service (port 3001)
2. Visit `http://localhost:3000/widget/test.html` and walk the 12-step checklist
3. On approval, mark Phase 2 VERIFICATION PASS and proceed to Phase 3 planning (Clinic Admin Portal)
