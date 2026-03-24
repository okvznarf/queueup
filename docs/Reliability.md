# Reliability

## Retry with Exponential Backoff
**File:** `src/lib/resilience.ts`

All external service calls use `withRetry()`:
- Max 3 retries
- Exponential delay: 1s → 2s → 4s (with jitter)
- Only retries transient errors: network failures, 429, 5xx
- Non-transient errors (400, 401, 403) throw immediately

```
withRetry(() => sendEmail(), {
  maxRetries: 3,
  baseDelayMs: 1000,
  retryOn: isTransientError,
})
```

## Circuit Breaker
Prevents cascading failures when external services are down.

| Service | Failure Threshold | Reset Timeout |
|---------|------------------|---------------|
| SendGrid | 3 failures | 60 seconds |
| Serper | 5 failures | 30 seconds |
| Anthropic | 3 failures | 60 seconds |

States: **closed** (normal) → **open** (rejecting) → **half-open** (testing)

When open, calls are skipped immediately instead of waiting for timeout.

## Idempotency
**Prevents duplicate bookings from double-clicks or retries.**

Key format: `booking:{shopId}:{date}:{startTime}:{phone}`
- 5-minute TTL in memory
- Same request returns cached 201 response
- No duplicate appointments created

## Database Transactions
**File:** `src/app/api/appointments/route.ts`

Appointment creation uses `prisma.$transaction()`:
1. Find or create customer
2. Re-check slot conflict inside transaction
3. Create appointment
4. All or nothing — if any step fails, everything rolls back

## Resilient Email
All email functions go through `sendMail()`:
1. Circuit breaker checks if SendGrid is healthy
2. Retry with backoff on transient failures
3. If circuit is open, email is skipped gracefully (logged, no crash)

## Error Handling
- **Structured logger** (`src/lib/logger.ts`) replaces all `console.error`
- Last 100 errors buffered in memory, queryable via `/api/health`
- Error boundaries catch React crashes: `error.tsx`, `global-error.tsx`, `not-found.tsx`

## Health Check
**GET `/api/health`** returns:
```json
{ "status": "ok", "db": "connected", "timestamp": "..." }
```
Returns 503 if database is disconnected.

## SSE Real-Time Updates
**GET `/api/events?shopId=X`** — Server-Sent Events stream
- Admin dashboards get live appointment updates
- 30-second heartbeat keeps connection alive
- `broadcastToShop()` pushes events on booking creation

## Links
- [[Architecture]]
- [[Security]]
