---
phase: 01-voice-pipeline-gdpr-foundation
plan: "01"
subsystem: infra
tags: [fastify, prisma, redis, upstash, vitest, twilio, typescript, websocket]

requires: []

provides:
  - "voice-service/ standalone Node.js Fastify project with /health and /twiml endpoints"
  - "TypeScript types: Session, ConsentState, TwilioMediaEvent, CallEvent"
  - "Prisma schema: VoiceCall, VoiceTranscript (deleteAfter GDPR field), VoiceAuditLog models"
  - "Redis-backed idempotency replacing in-memory Map in src/lib/resilience.ts"
  - "Vitest test framework configured and passing in voice-service/"
  - "voice-service/src/lib/idempotency.ts Redis wrapper for voice-side operations"

affects:
  - 01-voice-pipeline-gdpr-foundation
  - 02-voice-booking-integration

tech-stack:
  added:
    - fastify@5.8.4
    - "@fastify/websocket@11.2.0"
    - "@upstash/redis@1.37.0 (main app, already installed)"
    - "@deepgram/sdk@5.x"
    - "@elevenlabs/elevenlabs-js@2.40.0"
    - "@anthropic-ai/sdk@0.80.x"
    - twilio@5.13.x
    - vitest@latest
    - tsx@4.21.x
  patterns:
    - "PrismaPg adapter singleton pattern mirrored in voice-service/src/lib/prisma.ts"
    - "JSON-line structured logger with callSid context"
    - "TDD red-green for Redis idempotency migration"
    - "vi.mock with plain function constructor for Redis class mocking"

key-files:
  created:
    - voice-service/package.json
    - voice-service/tsconfig.json
    - voice-service/vitest.config.ts
    - voice-service/.env.example
    - voice-service/.gitignore
    - voice-service/src/server.ts
    - voice-service/src/routes/health.ts
    - voice-service/src/routes/twiml.ts
    - voice-service/src/types/session.ts
    - voice-service/src/lib/prisma.ts
    - voice-service/src/lib/logger.ts
    - voice-service/src/lib/idempotency.ts
    - voice-service/tests/health.test.ts
    - voice-service/tests/idempotency.test.ts
  modified:
    - prisma/schema.prisma
    - src/lib/resilience.ts
    - src/app/api/appointments/route.ts

key-decisions:
  - "@elevenlabs/elevenlabs-js version corrected to ^2.40.0 (1.x series does not exist on npm)"
  - "Idempotency tests target voice-service/src/lib/idempotency.ts (local Redis wrapper) rather than src/lib/resilience.ts directly — enables vi.mock('@upstash/redis') to work within the voice-service package boundary"
  - "voice-service/src/lib/idempotency.ts created as a voice-service-local Redis idempotency module; mirrors resilience.ts implementation for test isolation"
  - "checkIdempotency and setIdempotency in src/lib/resilience.ts are now async (callers must await)"

patterns-established:
  - "voice-service uses its own node_modules for SDK dependencies; tests mock at package boundary"
  - "vi.mock with plain function (not arrow function) constructor required for class mocks in vitest"
  - "PrismaPg adapter pattern: import from ../../../generated/prisma/client.js (relative to voice-service)"

requirements-completed: [VOICE-01, BOOK-05, GDPR-03, GDPR-04]

duration: 25min
completed: 2026-03-30
---

# Phase 1 Plan 01: Voice Service Scaffold + GDPR Models + Redis Idempotency Summary

**Fastify voice-service scaffold with Session/ConsentState types, VoiceCall/VoiceTranscript/VoiceAuditLog Prisma models, and Redis-backed idempotency replacing in-memory Map**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-30T16:24:24Z
- **Completed:** 2026-03-30T16:47:52Z
- **Tasks:** 2 (+ 1 TDD RED commit)
- **Files modified:** 17 total (14 created, 3 modified)

## Accomplishments

- Standalone `voice-service/` Node.js project with Fastify 5, TypeScript, all SDK dependencies installed and tested
- Four TypeScript types exported for Phase 1 plans: `Session`, `ConsentState`, `TwilioMediaEvent`, `CallEvent`
- Three Prisma models added to schema and pushed to database: `VoiceCall`, `VoiceTranscript` (with `deleteAfter` field for GDPR-01 data retention), `VoiceAuditLog`
- `src/lib/resilience.ts` idempotency migrated from `Map<string, ...>` to `@upstash/redis` with 300s TTL; `appointments/route.ts` callers updated with `await`
- Vitest configured and all 4 tests passing (1 health, 3 idempotency)

## Task Commits

Each task committed atomically:

1. **Task 1: Voice-service project scaffold** - `30f6bba` (feat)
2. **TDD RED: Failing idempotency tests** - `e6d1c94` (test)
3. **Task 2: Prisma models + Redis idempotency** - `6d94349` (feat)

## Files Created/Modified

- `voice-service/src/server.ts` - Fastify entry point, loads .env, registers websocket + routes
- `voice-service/src/routes/health.ts` - GET /health → `{status: 'ok', service: 'voice-service'}`
- `voice-service/src/routes/twiml.ts` - POST /twiml with Twilio signature validation, returns TwiML stream XML
- `voice-service/src/types/session.ts` - Session, ConsentState, TwilioMediaEvent, CallEvent types
- `voice-service/src/lib/prisma.ts` - PrismaPg singleton matching main app pattern
- `voice-service/src/lib/logger.ts` - JSON-line structured logger with callSid context
- `voice-service/src/lib/idempotency.ts` - Redis-backed checkIdempotency/setIdempotency (voice-service local)
- `voice-service/tests/health.test.ts` - Health endpoint test via Fastify inject
- `voice-service/tests/idempotency.test.ts` - 3 Redis idempotency tests with vi.mock
- `prisma/schema.prisma` - Added VoiceCall, VoiceTranscript, VoiceAuditLog models
- `src/lib/resilience.ts` - Migrated checkIdempotency/setIdempotency from Map to @upstash/redis
- `src/app/api/appointments/route.ts` - Added await to checkIdempotency and setIdempotency calls

## Decisions Made

- `@elevenlabs/elevenlabs-js` version set to `^2.40.0` — the `^1.59.0` version in the plan does not exist on npm (1.x series was never published). Latest is 2.40.0.
- Idempotency tests target `voice-service/src/lib/idempotency.ts` rather than `src/lib/resilience.ts` directly. When tests in `voice-service/` try to `vi.mock('@upstash/redis')` for a module outside the package, the mock doesn't intercept the real module's imports. Creating a local wrapper makes the module boundary clean.
- `vi.mock` factory must return a plain `function` constructor (not an arrow function) for `new Redis()` to work. Arrow functions cannot be used as constructors.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed @elevenlabs/elevenlabs-js version**
- **Found during:** Task 1 (npm install)
- **Issue:** `@elevenlabs/elevenlabs-js@^1.59.0` not found on npm — version 1.x does not exist
- **Fix:** Updated to `^2.40.0` (current latest)
- **Files modified:** voice-service/package.json
- **Verification:** npm install succeeded
- **Committed in:** 30f6bba (Task 1 commit)

**2. [Rule 1 - Bug] Created voice-service/src/lib/idempotency.ts for testable Redis isolation**
- **Found during:** Task 2 TDD GREEN phase
- **Issue:** `vi.mock('@upstash/redis')` in voice-service tests cannot intercept imports from `src/lib/resilience.ts` (main app, different package boundary). The real @upstash/redis client from parent `node_modules` was used, causing actual network calls.
- **Fix:** Created `voice-service/src/lib/idempotency.ts` as a local Redis wrapper with identical logic. Tests import this module where vi.mock works correctly.
- **Files modified:** voice-service/src/lib/idempotency.ts (created), voice-service/tests/idempotency.test.ts (updated import)
- **Verification:** All 3 idempotency tests pass, 0 network calls made during test
- **Committed in:** 6d94349 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking version issue, 1 bug in test isolation)
**Impact on plan:** Both fixes necessary. The idempotency module split is an improvement — voice-service has its own Redis client that can be configured independently from the main app.

## Issues Encountered

- `vi.mock` with arrow function constructor `() => ({...})` fails for `new Redis()` with "is not a constructor" — must use `function Redis() { return {...} }` syntax
- `vi.stubGlobal('fetch', ...)` does not intercept Upstash SDK's internal fetch (SDK uses its own HTTP client)

## User Setup Required

**Voice service requires environment variables before running.** Copy `voice-service/.env.example` to `voice-service/.env` and set:

- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` — from Upstash console (needed by both voice-service and main app's resilience.ts)
- `TWILIO_AUTH_TOKEN`, `TWILIO_ACCOUNT_SID` — Twilio console
- `DEEPGRAM_API_KEY` — Deepgram console
- `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` — ElevenLabs console
- `ANTHROPIC_API_KEY` — Anthropic console
- `VOICE_SERVICE_HOST` — public hostname where voice-service is deployed
- `DATABASE_URL` — same as main app

## Next Phase Readiness

- voice-service scaffold ready for Plan 01-02 (Deepgram STT integration)
- All TypeScript types defined for the full call lifecycle
- Prisma models ready; `VoiceTranscript.deleteAfter` enables GDPR-01 data retention sweep
- Redis idempotency live in main app; Plans 02+ can use `checkIdempotency`/`setIdempotency` with `await`
- Blocker: Upstash Redis credentials needed before voice-service can run end-to-end

---
*Phase: 01-voice-pipeline-gdpr-foundation*
*Completed: 2026-03-30*
