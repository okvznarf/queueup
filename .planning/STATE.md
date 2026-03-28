# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)

**Core value:** A clinic patient can call or chat at any hour and get their appointment booked without waiting for a human — as naturally as talking to a real receptionist.
**Current focus:** Phase 1 — Voice Pipeline + GDPR Foundation

## Current Position

Phase: 1 of 5 (Voice Pipeline + GDPR Foundation)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-03-28 — Roadmap created from requirements and research

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: none yet
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Voice orchestrator MUST be a persistent Node.js service on Railway (not Vercel serverless) — Twilio Media Streams WebSocket lasts the full call duration; serverless execution limits will drop calls mid-conversation
- [Roadmap]: GDPR consent infrastructure built in Phase 1 alongside the audio pipeline — cannot defer to a later "compliance phase" as EU patients cannot touch the system without it
- [Roadmap]: Deepgram Nova-2 (streaming WebSocket) chosen for STT over ElevenLabs STT — ~200-300ms latency for telephony audio; configured for mulaw 8kHz to accept Twilio audio directly
- [Roadmap]: ElevenLabs output_format=ulaw_8000 must be configured from day 1 — defaults (MP3/PCM at 22-44kHz) produce garbled audio on Twilio calls

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: ElevenLabs model names and SDK shape need verification against current docs (elevenlabs.io/docs) before implementation — training data has `eleven_turbo_v2_5` and `ulaw_8000` but names may have changed
- [Phase 1]: Deepgram `endpointing` and `speechEndThreshold` parameter values must be measured with real telephony audio — hardcoded values from training data may not be optimal
- [Phase 1]: Existing timezone bug in QueueUp availability calculations must be scoped before Phase 1 voice booking work begins (may be 1-hour fix or multi-day data migration)
- [Phase 3]: Twilio EU Regulatory Bundle approval lead times vary by country (Germany, France, Italy, Spain, Netherlands) — start approval process early in Phase 3 to avoid go-live delays

## Session Continuity

Last session: 2026-03-28
Stopped at: Roadmap created — ROADMAP.md, STATE.md, REQUIREMENTS.md traceability updated
Resume file: None
