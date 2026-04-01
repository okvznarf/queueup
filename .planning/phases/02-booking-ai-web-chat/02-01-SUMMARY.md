---
phase: 02-booking-ai-web-chat
plan: 01
subsystem: api
tags: [service-token, auth, appointments, shop-context, internal-api, voice-service, chat-service]

# Dependency graph
requires: []
provides:
  - "INTERNAL_SERVICE_TOKEN Bearer auth via verifyServiceToken() and requireServiceOrAdmin()"
  - "GET /api/appointments/lookup — find upcoming appointments by customer phone + shopId"
  - "GET /api/internal/shop-context — full shop bundle (services, staff, hours) for AI system prompt"
  - "PATCH /api/appointments/[id] updated to accept service token auth"
affects: [02-02, 02-03, voice-service, chat-service]

# Tech tracking
tech-stack:
  added: []
  patterns: [service-token-auth, requireServiceOrAdmin-pattern, internal-api-pattern]

key-files:
  created:
    - src/lib/serviceAuth.ts
    - src/app/api/appointments/lookup/route.ts
    - src/app/api/internal/shop-context/route.ts
  modified:
    - src/app/api/appointments/[id]/route.ts

key-decisions:
  - "requireServiceOrAdmin() tries service token first (no DB lookup), falls back to requireAdmin() — allows voice/chat service and admin dashboard to share the same endpoints"
  - "Appointment lookup filters by date >= today and status != CANCELLED by default — callers can override status with comma-separated list"
  - "Shop context cached 2 minutes in-memory (cacheSet/cacheGet) — balances freshness with latency reduction for session initialization"
  - "PATCH /api/appointments/[id] service-token path skips role-based checks entirely — AI acts as trusted service agent, not as a user"

patterns-established:
  - "requireServiceOrAdmin pattern: Bearer token first, admin JWT fallback — use for all internal AI-callable endpoints"
  - "Internal endpoints under /api/internal/ for AI/service-to-service calls; not to be exposed publicly"

requirements-completed: [BOOK-03, BOOK-04, FAQ-02, FAQ-03]

# Metrics
duration: 3min
completed: 2026-04-01
---

# Phase 2 Plan 01: QueueUp API Prerequisites for AI Services Summary

**Service token auth layer + appointment lookup + shop context bundle enabling voice-service/chat-service to call QueueUp APIs without user JWTs**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-01T16:42:34Z
- **Completed:** 2026-04-01T16:45:10Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Service token authentication layer (`verifyServiceToken` + `requireServiceOrAdmin`) allowing voice/chat services to bypass user JWT requirements
- Appointment lookup API returning customer identity + upcoming bookings by phone number, enabling reschedule/cancel identity verification
- Consolidated shop context API returning all fields needed for AI system prompt in a single cached call

## Task Commits

Each task was committed atomically:

1. **Task 1: Service token auth middleware + appointment lookup API** - `74e8d10` (feat)
2. **Task 2: Consolidated shop context API for AI system prompt** - `d31633d` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/serviceAuth.ts` - verifyServiceToken() checks Bearer header, requireServiceOrAdmin() tries service token then admin JWT fallback
- `src/app/api/appointments/lookup/route.ts` - GET by phone + shopId, returns customer + upcoming appointments (rate limited, service/admin auth)
- `src/app/api/internal/shop-context/route.ts` - GET full shop bundle for AI system prompt, 2-min cache, 404/403 guards
- `src/app/api/appointments/[id]/route.ts` - PATCH updated to accept INTERNAL_SERVICE_TOKEN Bearer auth as trusted service path

## Decisions Made
- `requireServiceOrAdmin()` tries service token first (synchronous, no DB) then falls back to `requireAdmin()` — allows both voice service and admin UI to call the same endpoints without duplicating routes
- Service token path in PATCH bypasses all role-based checks — the AI acts as a trusted agent, not as a user; this matches the pattern of an automated system acting on behalf of patients
- Shop context cached 2 minutes in-memory — shop configuration rarely changes mid-session; reduces latency for parallel AI session initializations
- Appointment lookup returns `{ customer: null, appointments: [] }` for unknown phone (not 404) — voice service needs to handle new callers gracefully without error branches

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript error in `src/app/api/voice/summary/route.ts` (named import instead of default import for prisma) discovered during `tsc --noEmit` — out of scope per deviation rules, logged here for awareness. No new errors introduced by this plan.

## User Setup Required
None - no external service configuration required. The `INTERNAL_SERVICE_TOKEN` env var must be set in both QueueUp and voice-service/chat-service environments but this is documented in Phase 1.

## Next Phase Readiness
- All three endpoints are ready for voice-service and chat-service to call
- Plan 02-02 (booking tools) can now implement the Claude tool calls using these endpoints
- `requireServiceOrAdmin` pattern established — use for all future AI-callable endpoints
- No blockers

---
*Phase: 02-booking-ai-web-chat*
*Completed: 2026-04-01*
