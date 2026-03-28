# Codebase Concerns

**Analysis Date:** 2026-03-28

## Tech Debt

**Billing/Subscription Logic Disabled:**
- Issue: Trial/subscription checks are commented out in `/src/app/api/shops/route.ts` line 43-49
- Files: `src/app/api/shops/route.ts`
- Impact: All shops can book indefinitely regardless of trial expiration or payment status. Revenue collection is blocked.
- Fix approach: Implement billing system integration and re-enable subscription validation checks before production release

**Type Safety: Widespread `any` Type Usage:**
- Issue: Large components use `any` types extensively instead of proper TypeScript interfaces
- Files:
  - `src/app/admin/[slug]/appointments/AdminClient.tsx` (lines 4-5, 37, 40-41, 44, 98, etc.)
  - `src/app/booking/[slug]/BookingClient.tsx` (lines 55, 65-66, 285, 305, 357, 380, 469)
  - `src/app/api/admin/hours/route.ts` (lines 13, 23, 25)
  - `src/lib/availability.ts` (line 34)
- Impact: Reduces IDE autocomplete, increases runtime errors, makes refactoring dangerous. Large admin component (635 lines) is especially risky.
- Fix approach: Define proper TypeScript interfaces for Shop, Appointment, Service, Staff, WorkingHours. Export from Prisma types. Replace all `any` with concrete types.

## Known Bugs

**Timezone Handling in Availability Calculation:**
- Symptoms: Slot availability calculation may show incorrect times or past slots as available when comparing across timezones
- Files: `src/lib/availability.ts` (lines 65-68)
- Trigger: When appointment date is in different timezone than server, `new Date()` comparison may be off by hours
- Cause: Using local `new Date()` to check if slot is in past without timezone normalization. Slots are stored as UTC in DB but compared against local time.
- Workaround: Currently working in single timezone (America/New_York as default), breaks with multi-timezone shops
- Fix approach: Normalize all time comparisons to use shop's timezone (stored in `Shop.timezone`), convert server time to shop timezone before isPast check

**Email Reminder Scheduling Edge Case:**
- Symptoms: 1-hour reminders still enqueued even though comments suggest removal
- Files: `src/app/api/appointments/route.ts` (lines 218-221)
- Trigger: Appointment created close to start time where 1h reminder window already passed
- Current state: Code enqueues but only if `remind1h > now`, so it's safe but confusing given memory comment
- Fix approach: Per memory notes, 1h reminders were removed for Hobby plan limits. Clean up dead code in lines 211, 218-221.

**Availability Cache Key Prefix Bug:**
- Symptoms: Deleting availability cache with prefix match may delete unrelated caches
- Files: `src/app/api/appointments/route.ts` (line 184)
- Trigger: `cacheDelete("avail:" + body.shopId)` only matches exact prefix, could fail to clear if cache structure changes
- Cause: Using string prefix matching instead of specific key
- Fix approach: Change to `cacheDelete("avail:" + body.shopId + ":")` or use versioned cache key pattern

## Security Considerations

**Rate Limiting on Serverless (In-Memory Only):**
- Risk: In-memory rate limiting doesn't persist across serverless function invocations. Attackers can bypass limits by hitting different instances.
- Files: `src/lib/security.ts` (lines 37-106)
- Current mitigation: Falls back to Redis if `UPSTASH_REDIS_REST_URL` is set; warns in logs if not. In-memory cleanup runs every 60s.
- Recommendation:
  - Make Redis required in production (not optional)
  - Increase log verbosity when Redis is unavailable
  - Document that Hobby/free tier deployments have weak rate limiting
  - Consider using API Gateway rate limiting as backup on Vercel

**HTML Escaping in Email Templates:**
- Risk: User input in email subject/body is not consistently HTML-escaped, only in confirmation email
- Files: `src/lib/email.ts` (lines 114, 129, 189, 243)
- Current: Shop name is used directly in email text without validation. If shop name contains quotes/HTML, it could break email rendering.
- Recommendation: Escape all user inputs (shop name, customer name, staff name) before inserting into email text/HTML. Create helper that normalizes all email parameters.

**Password Reset Token Validation Missing:**
- Risk: `isValidHexToken` checks format but not entropy or TTL
- Files: `src/lib/security.ts` (lines 146-148)
- Current: Tokens are 16-128 hex chars, but no check that they were generated securely or recently
- Recommendation: Add mandatory TTL check when validating reset tokens. Verify token was generated with `crypto.randomBytes()` or use UUIDs.

**Idempotency Store Not Persistent:**
- Risk: In-memory idempotency cache is lost on serverless cold starts. Duplicate bookings possible.
- Files: `src/lib/resilience.ts` (lines 130-147)
- Current mitigation: Database transaction prevents double-inserts, but idempotency key won't be found on retry after restart
- Recommendation: Migrate to Redis-backed idempotency store for production. Or use database `UNIQUE` constraint as final defense (already in place for some fields).

**Circuit Breaker State Not Persistent:**
- Risk: Circuit breaker state resets on serverless cold start, may reopen immediately when service recovers
- Files: `src/lib/resilience.ts` (lines 121-126)
- Current mitigation: SendGrid circuit breaker is generous (5 failures to open, 30s reset timeout), gracefully degrades by skipping emails
- Recommendation: For critical integrations (payment, auth), use Redis-backed state or add metrics/monitoring to detect cascading failures

**Job Queue Race Condition in Retry Logic:**
- Risk: If a job fails and is marked for retry but crashes before update completes, it could be picked up twice
- Files: `src/lib/jobs.ts` (lines 60-112)
- Current mitigation: `FOR UPDATE SKIP LOCKED` prevents double-processing, but if handler crashes mid-execution, state is inconsistent
- Recommendation: Wrap handler execution in try/finally, ensure status is always updated. Consider dead-letter queue for permanently failed jobs.

## Performance Bottlenecks

**Large Admin Component (635 lines):**
- Problem: `AdminClient.tsx` handles appointments, services, staff, hours, and settings in one component with deep nesting
- Files: `src/app/admin/[slug]/appointments/AdminClient.tsx`
- Cause: All admin UI state managed together, re-renders entire dashboard when single field changes
- Impact: Slow interaction on large shops (500+ appointments/day), sluggish modal updates, potential memory leaks with event listeners
- Improvement path:
  1. Split into separate route segments: `/appointments`, `/staff`, `/services`, `/hours`, `/settings`
  2. Extract modals to independent components with local state
  3. Use React Query or SWR for data fetching to enable background updates
  4. Memoize expensive computations (revenue calculation on line 198)

**Availability Calculation O(n*m) Complexity:**
- Problem: For each time slot, checks all existing appointments
- Files: `src/lib/availability.ts` (lines 41-63)
- Current: `bookedSlots.some()` is O(m) where m = existing appointments, called for each 30-min slot (n)
- Impact: With 500 appointments/day and 10 working hours = slow response (5000 iterations)
- Improvement path:
  1. Pre-process booked slots into interval tree or sorted array
  2. Use binary search to find overlapping intervals
  3. Cache availability for date at shop level with 5-min TTL

**In-Memory Cache Not Scalable:**
- Problem: Store grows unbounded with TTL-based expiry
- Files: `src/lib/cache.ts`, `src/lib/resilience.ts` (processedKeys)
- Impact: Memory usage grows during high-traffic periods. On Vercel, doesn't persist across instances.
- Improvement path:
  1. Migrate to Redis for cache (already dependency available)
  2. Set hard size limit with LRU eviction
  3. Add monitoring for cache hit/miss ratio

**Email Sending Not Async-Safe:**
- Problem: Email sends are fire-and-forget with `.catch()` silently swallowing errors
- Files: `src/app/api/appointments/route.ts` (lines 193-203)
- Impact: If SendGrid is down, customer loses confirmation email with no retry. Users don't know if booking succeeded.
- Current mitigation: Jobs queue handles reminders with exponential backoff, but confirmation is unmanaged
- Improvement path:
  1. Always enqueue confirmation email as a job
  2. Only return 201 after job is enqueued, not after email sends
  3. Add dashboard widget showing pending emails

## Fragile Areas

**Appointment Slot Locking (Race Condition Potential):**
- Files: `src/app/api/appointments/route.ts` (lines 92-178)
- Why fragile: Double-check pattern (pre-transaction check + in-transaction recheck) is correct but complex. High risk of introducing bugs if modified.
- Safe modification: Any change to conflict detection must include automated tests simulating concurrent bookings. Currently no test coverage.
- Test coverage: None. No test file exists for appointment creation. Manual testing only.
- Risk: If someone removes the re-check on line 149-158, concurrent bookings will be possible.

**Working Hours Calendar Logic:**
- Files: `src/app/admin/[slug]/appointments/AdminClient.tsx` (lines 166-195)
- Why fragile: State mutations directly modify workingHours array, modal can close without saving, timezone not considered
- Safe modification: Changes to hour validation should preserve 24-hour wraparound logic. Opening 18:00-08:00 (overnight) may not work.
- Test coverage: Manual only. No validation that overnight hours work correctly.
- Risk: If business is open 22:00-06:00, availability calculation may break (closeTime < openTime).

**Customer Authentication (Phone/Email Deduplication):**
- Files: `src/app/api/appointments/route.ts` (lines 126-146)
- Why fragile: Customer lookup uses `findFirst()` with OR condition across phone and email. If both exist for same customer in different shops, behavior is unpredictable.
- Safe modification: Document that customer identity is (phone, email, shopId) tuple. If modifying lookup, must maintain this invariant.
- Test coverage: None. Deduplication logic untested.
- Risk: If customer books at two different shops with same phone number, they may get different customer records.

## Scaling Limits

**In-Memory Job Queue:**
- Current capacity: Depends on available RAM. Default batch size = 10 jobs/poll.
- Limit: With daily cron every hour, can process ~240 jobs/day. If appointments exceed 240/day, reminders will back up.
- Scaling path:
  1. Migrate to BullMQ + Redis (interface already documented in `src/lib/jobs.ts`)
  2. Increase batch size or polling frequency on higher plans
  3. Add dead-letter queue for failed jobs

**Shop Cache (In-Memory):**
- Current capacity: Each shop data cached for 5 minutes. Multiple requests within window reuse cache.
- Limit: With 100 shops, memory usage ~100KB. Scales linearly with shops + inventory size.
- Scaling path: Migrate to Redis with key expiration. Add cache warming on shop update.

**Database Indexes:**
- Current: Proper indexes on (shopId, date), (staffId, date), (status), (shopId, status, date) for appointments
- Limit: Without BRIN index on timestamp, date range queries may be slow at scale. No index on customer (email, shopId) lookup.
- Scaling path:
  1. Add index on (shopId, date, status) for appointment queries
  2. Consider BRIN index on createdAt for time-series queries
  3. Test query performance with 10M+ appointments

## Dependencies at Risk

**Prisma 7 (Recent Major Version):**
- Risk: Only released Oct 2024, still finding edge cases. Schema changes may break migrations.
- Impact: Bug in adapter could corrupt data. No LTS version available yet.
- Current: Using `@prisma/adapter-pg` with PrismaPg connection pooling
- Migration plan: Monitor Prisma changelog. Stay within Prisma 7.x. If critical bug discovered, have rollback plan to Prisma 6.x (old client available but schema migration required).

**NextAuth (Version 4 in NextAuth 5 era):**
- Risk: Version 4 is in maintenance mode. Version 5 has breaking changes.
- Impact: Security updates may stop. Ecosystem plugins may not work.
- Current: Only using JWT token management, not full NextAuth provider flow
- Migration plan: NextAuth is used minimally (just for session). Safe to migrate to custom auth completely. Currently possible with existing JWT code.

**SendGrid Rate Limiting at 100 emails/sec:**
- Risk: Circuit breaker opens at 3 failures in 60s, but SendGrid may rate-limit without 429 error
- Impact: Silent email loss if rate limit exceeded
- Current mitigation: Queue system with exponential backoff
- Recommendation: Monitor SendGrid API response codes, add explicit rate limit detection

## Missing Critical Features

**Billing System Not Implemented:**
- Problem: No way to collect payment or enforce subscription limits
- Blocks: Revenue collection, pricing tiers, enterprise features, churn metrics
- Current state: Demo shop hardcoded with trial extended to 2027, all subscription checks disabled
- Impact: Can't transition to production without billing. Currently $0 ARR.

**No Backup/Disaster Recovery:**
- Problem: No automated backups of PostgreSQL database
- Blocks: Recovery from accidental data loss, ransomware
- Recommendation: Set up daily automated backups to S3 with encryption. Test restore procedure monthly.

**No Audit Trail:**
- Problem: No record of who changed shop settings or appointments
- Blocks: Debugging customer disputes, compliance with regulations
- Recommendation: Add audit table logging user ID, action, old/new values, timestamp

**No Search Functionality:**
- Problem: Admins can't search customers or appointments by name
- Blocks: Support workflow when customer calls
- Recommendation: Add full-text search on customer name, email, phone in admin dashboard

## Test Coverage Gaps

**Appointment Creation (Concurrent Bookings):**
- What's not tested: Race condition prevention. What happens when two requests try to book the same slot simultaneously?
- Files: `src/app/api/appointments/route.ts`
- Risk: Bug could allow double-booking without detection until production incident
- Priority: High

**Availability Calculation (Edge Cases):**
- What's not tested: Overnight hours (closeTime < openTime), slots at business boundary (9:59 AM when open is 10:00), timezone transitions
- Files: `src/lib/availability.ts`
- Risk: Customers see unavailable slots or miss available ones
- Priority: High

**Email Resilience (Circuit Breaker):**
- What's not tested: Behavior when SendGrid is down for 60+ seconds. Does circuit open? Do reminders still get enqueued?
- Files: `src/lib/email.ts`, `src/lib/resilience.ts`
- Risk: Email failures during outage not handled gracefully
- Priority: Medium

**Authentication (Multi-Shop Access):**
- What's not tested: Admin with multiple shops can only access their own. Superadmin can access any.
- Files: `src/lib/auth.ts`, all `/api/admin/*` routes
- Risk: Authorization bug could leak customer data across shops
- Priority: High

**Payment Flow (Stripe Integration):**
- What's not tested: Any payment logic. Stripe is imported but never used.
- Files: `package.json` has `stripe` dependency
- Risk: When billing is enabled, payment flow may have critical bugs
- Priority: Blocker until billing release

**Data Validation (Input Sanitization):**
- What's not tested: Malicious inputs: XSS in shop name, SQL injection patterns, oversized payloads
- Files: `src/lib/security.ts` has sanitize but not used everywhere
- Risk: XSS in email templates, injection attacks
- Priority: Medium

---

*Concerns audit: 2026-03-28*
