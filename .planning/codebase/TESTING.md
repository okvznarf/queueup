# Testing Patterns

**Analysis Date:** 2026-03-28

## Test Framework

**Status:** No automated test suite configured or in use

**Framework:**
- Not detected
- No Jest, Vitest, or testing library configured in `package.json`
- No test files in source tree (`src/`)

**Manual Testing:**
- Codebase relies on manual testing and integration testing
- Development server: `npm run dev` (Next.js dev mode)
- Linting only: `npm run lint` (ESLint, no test runner)

## Test Strategy (Implicit)

Based on codebase patterns, testing appears to follow this hierarchy:

**1. Type Safety (Primary)**
- Strict TypeScript (`strict: true` in `tsconfig.json`)
- All function parameters and returns explicitly typed
- Discriminated unions for error handling prevent type mismatches at compile time

**2. Validation at Boundaries**
- Input sanitization on all user inputs: `sanitize(input, maxLength)`
- Email format validation: `isValidEmail(email)`
- Phone format validation: `isValidPhone(phone)`
- Number validation: `isPositiveNumber(duration)`
- All validation errors return HTTP 400 immediately

**3. Request-Level Guards**
- Rate limiting on endpoints: `rateLimit("login:" + ip, 5, 900000)`
- Authentication checks before data access: `const auth = await requireAdmin(request, shopId)`
- Authorization: Shop ownership verified before modification
- Idempotency checks prevent double-booking: `checkIdempotency(idempKey)`

**4. Data Integrity**
- Database constraints at schema level (Prisma)
- Transaction-like behavior via atomic PostgreSQL queries for job processing
- Select only fields needed: `.select({ id: true, email: true })` prevents accidental data exposure

## Error Handling as Testing

**Catch Blocks:**
```typescript
try {
  const data = await prisma.service.findMany({ where: { shopId } });
  return NextResponse.json(data);
} catch (error) {
  logger.error("Failed to fetch services", "api:services", error);
  return NextResponse.json({ error: "Server error" }, { status: 500 });
}
```

**Pattern:** All async code wrapped in try-catch; errors logged with context; client receives safe error message

**Error Logging:**
- Errors captured by `logger.error()` with category (e.g., `"api:services"`)
- Last 100 errors buffered in-memory, queryable via `/api/health`
- Production monitoring hook available (commented in logger)

## Integration Points (Testable Systems)

These functions are integration-testable via HTTP requests or direct function calls:

**Authentication (`src/lib/auth.ts`):**
- `hashPassword(password)` → bcrypt
- `verifyPassword(password, hash)` → bcrypt compare
- `createToken(payload)` → JWT signed token
- `verifyToken(token)` → JWT verify or null
- `requireAdmin(request, shopId?)` → Auth check or error response

**Validation (`src/lib/security.ts`):**
- `sanitize(input, maxLength)` → Strips HTML, limits length
- `isValidEmail(email)` → Regex test
- `isValidPhone(phone)` → Cleaned length + regex
- `rateLimit(key, maxRequests, windowMs)` → Boolean (Redis or in-memory)

**Email (`src/lib/email.ts`):**
- `sendWelcomeEmail({...})` → SendGrid API call (with retry + circuit breaker)
- `sendPasswordResetEmail(to, resetLink, shopName)` → SendGrid with template
- `sendAppointmentReminder({...})` → SendGrid (timezone-aware)
- `sendBookingConfirmation({...})` → SendGrid with details

**Availability (`src/lib/availability.ts`):**
- `getAvailableSlots(shopId, date, staffId?, duration?)` → TimeSlot[]
- Logic: Working hours lookup → existing appointments → available times

**Job Queue (`src/lib/jobs.ts`):**
- `enqueueJob(type, payload, opts?)` → Inserts into `_jobs` table
- `processJobs(batchSize)` → Returns `{ processed, failed }`
- `registerJobHandler(type, handler)` → Registers processor

**Resilience (`src/lib/resilience.ts`):**
- `withRetry(fn, opts?)` → Executes with exponential backoff
- `isTransientError(err)` → Boolean (network, 429, 5xx detection)
- `CircuitBreaker.call(fn)` → Wraps function with circuit state management

## Manual Testing Checklist (Observed Patterns)

Based on AdminClient and BookingClient patterns:

**Booking Flow:**
1. GET `/api/availability?shopId=X&date=YYYY-MM-DD&duration=30` → slot availability
2. POST `/api/appointments` → Create appointment with sanitized inputs
3. GET `/api/appointments?shopId=X&date=YYYY-MM-DD` → Fetch daily appointments
4. PATCH `/api/appointments/[id]` → Update appointment status
5. Email sent asynchronously via job queue

**Admin Dashboard:**
1. GET `/api/admin/services?shopId=X` → List all services (incl. inactive)
2. POST `/api/admin/services` → Create service with validation
3. PATCH `/api/admin/services` → Update service (name, price, duration, isActive)
4. DELETE `/api/admin/services` → Soft delete
5. Same pattern for staff, hours, shop settings

**Authentication:**
1. POST `/api/auth/login` → Rate limited (5 per 15 min), returns token + shop slug
2. POST `/api/auth/register` → Rate limited, hashes password
3. GET `/api/auth/me` → Verifies token from cookie
4. POST `/api/auth/logout` → Clears auth_token cookie

## Test Data / Fixtures

**Demo Shop:**
- Slug: `demo-barber`
- Trial extended to 2027
- Pre-populated with sample services, staff, hours
- Used for demo bookings

**Environment:**
- `NEXTAUTH_SECRET`: Required for JWT signing
- `DATABASE_URL`: PostgreSQL connection
- `SENDGRID_API_KEY`: Email sending (env var checked at runtime)
- `UPSTASH_REDIS_REST_URL` / `TOKEN`: Rate limiting (optional, in-memory fallback if missing)

## Testing Gaps (Concerns)

**Unit Tests:**
- None: No test framework configured
- No tests for utility functions: `sanitize()`, validation, rate limiting
- No tests for token generation/verification
- No tests for availability calculation logic

**Integration Tests:**
- No automated tests for booking flow (availability → appointment → email)
- No tests for admin CRUD operations
- No tests for error cases (invalid input, database failures, email failures)

**E2E Tests:**
- None: Would require Playwright or similar
- Manual user journey testing only

**Coverage:**
- No coverage reports or targets enforced
- Type safety and linting serve as partial safety net

## How to Add Tests (Recommended Approach)

**Option 1: Vitest (Minimal, Fast)**
```bash
npm install -D vitest @vitest/ui
# Create src/__tests__/lib/security.test.ts
```

**Option 2: Jest (Batteries Included)**
```bash
npm install -D jest @types/jest ts-jest jest-environment-jsdom
# Create src/__tests__/lib/security.test.ts
```

**Suggested Test Structure:**
```
src/__tests__/
├── lib/
│   ├── security.test.ts      # sanitize, validation, rateLimit
│   ├── auth.test.ts          # token creation, verification
│   ├── availability.test.ts  # slot calculation
│   └── jobs.test.ts          # enqueue, process
├── api/
│   ├── appointments.test.ts  # POST (create), GET (list), PATCH (update)
│   ├── auth.test.ts          # login, register
│   └── availability.test.ts  # availability endpoint
└── integration/
    └── booking-flow.test.ts  # Full booking from availability → email
```

**Test Pyramid:**
1. **Unit (70%):** Utility functions (sanitize, validation, token creation)
2. **Integration (20%):** API endpoints with mock database
3. **E2E (10%):** Full user flows (optional, lower priority)

---

*Testing analysis: 2026-03-28*
