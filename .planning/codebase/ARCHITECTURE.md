# Architecture

**Analysis Date:** 2026-03-28

## Pattern Overview

**Overall:** Next.js 16 Full-Stack with App Router — REST API backend + React client-side components

**Key Characteristics:**
- Server-side rendering (Next.js App Router) for public pages, client components for interactive flows
- Token-based JWT authentication (separate `auth_token` for admins, `customer_token` for customers)
- PostgreSQL with Prisma 7 ORM (using PrismaPg adapter, no URL in schema)
- Resilience patterns: exponential backoff retry, circuit breakers, idempotency keys, rate limiting
- Real-time server-sent events (SSE) for shop updates without polling
- Multi-tenant architecture: shop-scoped data access via `shopId`

## Layers

**Presentation (Client):**
- Purpose: React components rendered server-side and hydrated on client
- Location: `src/app/*/page.tsx`, `src/app/*/layout.tsx`
- Contains: Route pages, layouts, error boundaries, interactive client components
- Depends on: API routes via HTTP, hooks, lib utilities
- Used by: Browser, Next.js runtime

**API (Routes):**
- Purpose: REST endpoints for data mutations and reads
- Location: `src/app/api/**/route.ts`
- Contains: POST/GET/PATCH/DELETE handlers, auth checks, validation, error responses
- Depends on: Prisma ORM, auth lib, security lib, email/job services
- Used by: Client components, external services (webhooks, cron)

**Business Logic (Services):**
- Purpose: Reusable domain logic extracted from API routes
- Location: `src/lib/*.ts` (availability, email, jobs, cache, security)
- Contains: Availability calculation, email sending, job queue, caching, input sanitization
- Depends on: Prisma, external APIs (SendGrid, Redis), standard library
- Used by: API routes, client-side hooks

**Data (Persistence):**
- Purpose: Data models and queries
- Location: `prisma/schema.prisma`, `src/lib/prisma.ts`
- Contains: Shop, User, Staff, Service, Appointment, Customer, WorkingHours models
- Depends on: PostgreSQL (external)
- Used by: All layers via Prisma client

**Infrastructure (Cross-cutting):**
- Purpose: Request/response security, logging, monitoring
- Location: `src/middleware.ts`, `src/lib/logger.ts`, `src/lib/security.ts`
- Contains: Security headers, CORS, CSRF protection, rate limiting, structured logging
- Depends on: Next.js runtime, Upstash Redis (optional), PostgreSQL
- Used by: All layers via middleware + explicit calls

## Data Flow

**Booking Flow (Customer):**

1. Customer visits `/booking/[slug]` → Public route with shop data
2. BookingClient (React) renders 14-day date picker + service/staff selectors
3. On date + service selection → Fetch `/api/availability?shopId=X&date=Y&duration=Z`
4. Server calculates available slots: query WorkingHours + existing Appointments for conflicts
5. Customer selects slot + fills form → POST `/api/appointments` with booking data
6. Server validates, creates Appointment record, enqueues confirmation email job
7. Email job processed async by cron → SendGrid sends confirmation
8. Admin is notified via SSE `/api/events?shopId=X` with `appointment:created` event

**Admin Dashboard Flow (Shop Owner):**

1. Admin logs in → POST `/api/auth/login` → JWT token set as `auth_token` cookie
2. Redirect to `/admin/[slug]/appointments`
3. AdminClient renders appointment list for selected date (fetches via `/api/appointments?shopId=X&date=Y`)
4. Admin updates status → PATCH `/api/appointments/[id]` → Broadcast SSE event
5. Tab switches (Services/Staff/Hours) → Fetch from `/api/admin/{services,staff,hours}?shopId=X`
6. Admin edits service → PATCH `/api/admin/services` → Validates, updates DB, cache invalidation

**Email Reminder (Cron Job):**

1. Daily cron `/api/cron/jobs` invoked by external scheduler
2. Server queries jobs table for PENDING jobs with `runAt <= NOW()`
3. For type `email:reminder`, handler queries appointments 24h away (in shop timezone)
4. EnqueueJob to send email → Job processor picks it up, calls SendGrid
5. Error → Retry with exponential backoff, circuit breaker prevents cascading failures

**State Management:**

- **Admin token:** HttpOnly cookie `auth_token`, 7-day JWT with HS256
- **Customer token:** HttpOnly cookie `customer_token`, 30-day JWT
- **Shop state:** Queried from Prisma on each admin request (no session storage, stateless)
- **Client component state:** React hooks (useState, useCallback, useRef)
- **Rate limit state:** In-memory Map (fallback) or Upstash Redis (production)
- **Real-time updates:** SSE connection per shop, client auto-reconnects on disconnect

## Key Abstractions

**Availability Calculator (`src/lib/availability.ts`):**
- Purpose: Given shop, date, staff, service duration → list of available 30-min slots
- Examples: `getAvailableSlots(shopId: string, date: Date, staffId?: string, serviceDuration?: number): TimeSlot[]`
- Pattern: Pure function, no side effects; queries WorkingHours + Appointments; detects conflicts + past slots

**Email Provider Interface (`src/lib/email.ts`):**
- Purpose: Swap email backends without changing caller code
- Examples: SendGridProvider (default), extensible to Resend/Mailgun
- Pattern: Dependency injection via `setEmailProvider()`, resilience wrapper with circuit breaker

**Job Queue (`src/lib/jobs.ts`):**
- Purpose: Reliable async execution on Vercel serverless (no long-running processes)
- Examples: Enqueue `email:reminder`, `email:confirmation` jobs with payload + scheduled run time
- Pattern: Jobs stored in PostgreSQL `_jobs` table, cron endpoint polls and processes batch atomically

**Authentication Functions (`src/lib/auth.ts`):**
- Purpose: Token creation, verification, role-based access control
- Examples: `createToken()`, `verifyToken()`, `requireAdmin(request, shopId)`, `requireAuth(request)`
- Pattern: JWT verification with role checking; `requireAdmin` also verifies shop ownership (unless superadmin)

**Rate Limiter (`src/lib/security.ts`):**
- Purpose: Prevent brute force and abuse on public endpoints
- Examples: Login throttled to 5 attempts per 15 min per IP; booking throttled to 20 per hour
- Pattern: Redis-backed with in-memory fallback; lazy init on first use

**Resilience Patterns (`src/lib/resilience.ts`):**
- Purpose: Graceful degradation under failures
- Examples: `withRetry()` with exponential backoff, `CircuitBreaker` to fail fast when service is down
- Pattern: Used by email sending to tolerate transient SendGrid outages

## Entry Points

**Public Booking Page:**
- Location: `src/app/booking/[slug]/page.tsx`
- Triggers: Direct URL visit (public, no auth required)
- Responsibilities: Server-fetch shop + services/staff; hydrate BookingClient component

**Admin Dashboard:**
- Location: `src/app/admin/[slug]/appointments/page.tsx`
- Triggers: Admin login redirect (requires `auth_token` cookie)
- Responsibilities: Enforce admin auth via middleware; server-fetch shop data; hydrate AdminClient

**API Booking Endpoint:**
- Location: `src/app/api/appointments/route.ts`
- Triggers: POST from BookingClient
- Responsibilities: Validate customer data, check availability, create Appointment, enqueue email, broadcast event

**API Admin CRUD:**
- Location: `src/app/api/admin/{services,staff,hours,shop}/route.ts`
- Triggers: PATCH/POST from AdminClient tabs
- Responsibilities: Validate input, enforce admin+shop ownership, update DB, invalidate cache

**Cron Job Processor:**
- Location: `src/app/api/cron/jobs/route.ts`
- Triggers: External HTTP POST (e.g., Vercel Cron, GitHub Actions)
- Responsibilities: Dequeue PENDING jobs from `_jobs` table, execute handlers, retry on failure

**Real-time Events:**
- Location: `src/app/api/events/route.ts`
- Triggers: SSE client connection from admin or public
- Responsibilities: Subscribe to shop events (appointment created/updated), stream as text/event-stream

**Customer Auth Routes:**
- Location: `src/app/api/auth/{login-customer,register-customer}/route.ts`
- Triggers: Booking confirmation or account creation
- Responsibilities: Hash password, create Customer record, set `customer_token` cookie

## Error Handling

**Strategy:** Explicit error responses with status codes + structured logging

**Patterns:**

- **Validation Errors:** Return 400 with `{ error: "Missing fields" }`
- **Auth Errors:** Return 401 (unauthorized) or 403 (forbidden)
- **Rate Limit:** Return 429 with message
- **Not Found:** Return 404
- **Server Errors:** Return 500, log with context to `logger.error()`
- **Retry Logic:** `withRetry()` handles transient errors (network, 5xx, 429); logs and re-throws after max retries
- **Circuit Breaker:** Fails fast if service (e.g., SendGrid) is down for >30s; prevents cascading failures

## Cross-Cutting Concerns

**Logging:** Structured logger at `src/lib/logger.ts` — replaces raw console.error; buffers last 100 errors in memory; context tags (e.g., `"api:appointments"`, `"email:sendgrid"`) aid debugging

**Validation:** Input sanitization via `sanitize(input, maxLength)` strips HTML tags + limits string length; email/phone validators; Prisma schema enforces type + uniqueness constraints

**Authentication:** Middleware at `src/middleware.ts` enforces auth on `/admin/*` and `/fran/*` routes; API routes call `requireAdmin()` or `requireAuth()`; shop ownership verified for multi-tenant isolation

**CORS & CSRF:** Middleware allows requests from whitelisted origins only; POST/PATCH/DELETE from unknown origins rejected unless cron endpoint (uses Authorization header instead of cookies)

**Rate Limiting:** Per-IP bucketing via Redis (or in-memory); login: 5 per 15 min; booking: 20 per hour

**Caching:** In-memory cache at `src/lib/cache.ts` for availability slots (TTL 5 min); invalidated on appointment create/update

**Security Headers:** Middleware applies CSP, X-Frame-Options, X-Content-Type-Options, HSTS, Permissions-Policy

---

*Architecture analysis: 2026-03-28*
