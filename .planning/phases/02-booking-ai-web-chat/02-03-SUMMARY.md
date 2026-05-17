---
phase: 02-booking-ai-web-chat
plan: 03
subsystem: voice-service
tags: [chat-api, sse, fastify, chat-session, widget-config, gdpr, cors]

# Dependency graph
requires: [02-02]
provides:
  - "POST /chat on voice-service — SSE-streamed Claude response, shared brain with voice"
  - "OPTIONS /chat CORS preflight"
  - "In-memory chat session map keyed by sessionId, 30-min inactivity expiry"
  - "Server-side GDPR enforcement: 403 when consentGranted !== true"
  - "GET /api/widget/config on Next.js — public shop branding (shopName, primaryColor, slug)"
affects: [02-04, chat-widget]

# Tech tracking
tech-stack:
  added: []
  patterns: [sse-streaming, in-memory-session-map, shop-existence-cache, per-ip-rate-limit]

key-files:
  created:
    - voice-service/src/handlers/chatSession.ts
    - voice-service/src/routes/chatRoute.ts
    - voice-service/tests/chatRoute.test.ts
    - src/app/api/widget/config/route.ts
  modified:
    - voice-service/src/server.ts

key-decisions:
  - "ChatSession structurally satisfies Session — voice-specific callSid/streamSid are set to 'chat-<sessionId>' so processPatientUtterance and the tool dispatcher work unchanged for chat"
  - "Consent enforced server-side with 403 — client cannot bypass GDPR gate by editing widget code"
  - "shopId + sessionId validated with strict regex (/^[a-zA-Z0-9_-]{1,100}$/ and /^[a-zA-Z0-9_-]{16,128}$/) — prevents path/header injection"
  - "Shop existence checked against DB with 5-min in-memory cache — stops attackers burning LLM budget on fake shops without adding latency to repeat callers"
  - "Per-IP rate limit 20/min on /chat — in-memory is acceptable because voice-service is single-instance on Railway"
  - "Session cleanup is lazy (runs after each request) — no background timer needed"
  - "reply.raw.writeHead used for SSE (not Fastify reply.send) — required to stream before body completes"

patterns-established:
  - "Fastify SSE streaming pattern: reply.raw.writeHead(200, {Content-Type:'text/event-stream'}) then reply.raw.write('data: ...\\n\\n') then reply.raw.end() — reuse for any future streaming endpoint"
  - "Chat/voice session parity: keep ChatSession shape-compatible with Session so tool loop code stays channel-agnostic"

requirements-completed: [CHAT-03]

# Metrics
duration: ~15min (code) + ~5min (test fix during phase closeout)
completed: 2026-04-01
---

# Phase 2 Plan 03: Chat API Backend Summary

**POST /chat on voice-service (SSE, shared Claude brain) + widget config endpoint on Next.js — closes CHAT-03.**

## Accomplishments

- `voice-service/src/handlers/chatSession.ts` — in-memory Map keyed by sessionId, `getOrCreateChatSession()`, `processChatMessage()`, `cleanupExpiredSessions()` with 30-min inactivity threshold
- `voice-service/src/routes/chatRoute.ts` — Fastify plugin with `POST /chat` (SSE) + `OPTIONS /chat` (preflight), per-IP rate limit, body-size cap, shopId/sessionId regex validation, shop-existence DB check (5-min cache), server-side consent enforcement
- `voice-service/src/server.ts` — registers `chatRoutes`
- `src/app/api/widget/config/route.ts` — Next.js public GET returning `{ shopName, primaryColor, slug }` with CORS, tries shopId as UUID then falls back to slug, defaults `primaryColor` to `#6366f1` when unset
- `voice-service/tests/chatRoute.test.ts` — 12 tests covering session manager (8) + route integration (4: consent gate, missing fields, SSE happy path, OPTIONS)

## Files Created/Modified

- `voice-service/src/handlers/chatSession.ts` — ChatSession interface shape-compatible with Session (callSid/streamSid reused as identifiers); lastActiveAt touched on every `getOrCreateChatSession` call
- `voice-service/src/routes/chatRoute.ts` — SSE happy path uses `reply.raw.writeHead` → `reply.raw.write('data: ...\\n\\n')` → `reply.raw.end()`; error path writes `{type:'error'}` frame before closing
- `voice-service/src/server.ts` — `await app.register(chatRoutes);`
- `voice-service/tests/chatRoute.test.ts` — mocks `claudeSession.js` (`fetchShopContext`, `processPatientUtterance`) and `prisma.js` (`shop.findFirst`)
- `src/app/api/widget/config/route.ts` — public, unauthenticated, CORS-allowed; lookup prefers primary key then slug

## Decisions Made

- **Consent server-side** — route returns 403 if `consentGranted !== true`, regardless of what the widget sends. Prevents a tampered-client from bypassing GDPR.
- **Strict ID regex** — `shopId` = `/^[a-zA-Z0-9_-]{1,100}$/`, `sessionId` = `/^[a-zA-Z0-9_-]{16,128}$/`. Blocks header/path injection and forces the widget to use `crypto.randomUUID()` (which satisfies the 16-char minimum).
- **Shop existence check** — DB `findFirst` with `subscriptionActive: true`, cached 5 min. Cuts off LLM cost attacks against non-existent / suspended shops without adding latency for repeat users.
- **Session map expiry** — 30-min inactivity, cleaned up lazily after each request. No background timer needed; cost of a few stale sessions in memory is negligible.
- **ChatSession ↔ Session parity** — setting `callSid = streamSid = 'chat-<sessionId>'` lets `processPatientUtterance` and `dispatchTool` work with zero channel-specific branching.

## Deviations from Plan

- **Stricter validation than plan spec** — plan called for `if (!shopId || !sessionId || !message) → 400`. Implementation added regex validation, body size cap (8KB), per-IP rate limit, and DB shop-existence check. Security hardening; tests updated during phase closeout to match.
- **Test assertions relaxed on error strings** — plan's "Missing required fields" exact match replaced with regex `/missing|invalid/i` to accommodate the combined "Missing or invalid fields" error returned by the stricter route.

## Self-Check

- [x] `POST /chat` returns 403 on `consentGranted: false`
- [x] `POST /chat` returns 400 on missing/invalid fields
- [x] `POST /chat` happy path streams `data: {"type":"text"}...\ndata: {"type":"done"}\n\n`
- [x] `OPTIONS /chat` returns 204 with CORS headers
- [x] `getOrCreateChatSession` reuses session across calls
- [x] `cleanupExpiredSessions` removes >30min inactive, keeps fresh
- [x] `GET /api/widget/config?shopId=X` returns `{ shopName, primaryColor, slug }` with CORS
- [x] `chatRoutes` registered in `server.ts`
- [x] All 12 chatRoute tests pass
- [x] Full voice-service suite: 115 tests passing (was 103 before this plan)

**Self-Check: PASSED**

## Next Phase Readiness

- Widget (Plan 04) can call `POST /chat` with SSE streaming
- Widget can fetch `GET /api/widget/config?shopId=X` for branding
- No blockers

---
*Phase: 02-booking-ai-web-chat*
*Completed: 2026-04-01*
