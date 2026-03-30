---
phase: 1
slug: voice-pipeline-gdpr-foundation
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-29
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (fast, TypeScript-native, ESM support) |
| **Config file** | `voice-service/vitest.config.ts` — Plan 01 Task 1 creates |
| **Quick run command** | `cd voice-service && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd voice-service && npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd voice-service && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd voice-service && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 01-01-T1 | 01 | 1 | VOICE-01 | unit | `npx vitest run tests/health.test.ts` | pending |
| 01-01-T2 | 01 | 1 | BOOK-05, GDPR-03, GDPR-04 | unit (mock Redis) | `npx vitest run tests/idempotency.test.ts` | pending |
| 01-02-T1 | 02 | 2 | VOICE-02, VOICE-03 | unit | `npx vitest run tests/consentFlow.test.ts` | pending |
| 01-02-T2 | 02 | 2 | VOICE-01 | unit | `npx vitest run tests/twilioStream.test.ts` | pending |
| 01-03-T1 | 03 | 2 | VOICE-04, VOICE-05 | unit (mock Anthropic) | `npx vitest run tests/claudeSession.test.ts` | pending |
| 01-03-T2 | 03 | 2 | VOICE-04, VOICE-05 | unit (mock ElevenLabs) | `npx vitest run tests/elevenLabsTts.test.ts` | pending |
| 01-04-T1 | 04 | 3 | VOICE-04, VOICE-05 | unit | `npx vitest run tests/escalation.test.ts` | pending |
| 01-04-T2 | 04 | 3 | VOICE-06, GDPR-03 | unit (mock Prisma, mock fetch) | `npx vitest run tests/auditLog.test.ts tests/callSummary.test.ts` | pending |
| 01-05-T1 | 05 | 4 | GDPR-01 | unit (mock Prisma) | `npx vitest run tests/transcriptRetention.test.ts` | pending |
| 01-05-T2 | 05 | 4 | ALL | checkpoint:human-verify | Manual end-to-end flow | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

All test infrastructure is created within Plan 01 Task 1 (voice-service scaffold):

- [ ] `voice-service/vitest.config.ts` — test framework config
- [ ] `voice-service/tests/health.test.ts` — VOICE-01 server health check

Subsequent test files are created within each plan's tasks (TDD pattern):

- [ ] `voice-service/tests/idempotency.test.ts` — BOOK-05 Redis idempotency (Plan 01 Task 2)
- [ ] `voice-service/tests/consentFlow.test.ts` — VOICE-02, VOICE-03 consent state machine (Plan 02 Task 1)
- [ ] `voice-service/tests/twilioStream.test.ts` — VOICE-01 WebSocket event handling (Plan 02 Task 2)
- [ ] `voice-service/tests/claudeSession.test.ts` — VOICE-04, VOICE-05 Claude conversation (Plan 03 Task 1)
- [ ] `voice-service/tests/elevenLabsTts.test.ts` — VOICE-04, VOICE-05 TTS streaming (Plan 03 Task 2)
- [ ] `voice-service/tests/escalation.test.ts` — VOICE-04, VOICE-05 escalation triggers (Plan 04 Task 1)
- [ ] `voice-service/tests/auditLog.test.ts` — GDPR-03 audit log fields (Plan 04 Task 2)
- [ ] `voice-service/tests/callSummary.test.ts` — VOICE-06 end-of-call summary + QueueUp API save (Plan 04 Task 2)
- [ ] `voice-service/tests/transcriptRetention.test.ts` — GDPR-01 deleteAfter logic (Plan 05 Task 1)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Concurrent calls with same slot only succeed once | BOOK-05 | Requires real concurrent HTTP requests against live Redis | Run k6 script or manual parallel curl against booking endpoint |
| Railway deployment region is configured to EU | GDPR-04 | Infrastructure configuration, not code | Check Railway dashboard region setting |
| End-to-end call flow (dial -> consent -> conversation -> transfer/hangup) | ALL | Requires live Twilio/Deepgram/ElevenLabs API keys | Plan 05 Task 2 checkpoint |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers test framework setup
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
