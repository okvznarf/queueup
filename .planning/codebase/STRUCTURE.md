# Codebase Structure

**Analysis Date:** 2026-03-28

## Directory Layout

```
queueup/
├── src/                          # Main source code
│   ├── app/                      # Next.js App Router (routes + pages + api)
│   │   ├── admin/                # Admin dashboard (protected routes)
│   │   ├── api/                  # REST API endpoints
│   │   ├── booking/              # Public booking flow
│   │   ├── customer/             # Customer dashboard & auth
│   │   ├── fran/                 # Franchise partner dashboard (future)
│   │   ├── onboarding/           # Shop setup wizard
│   │   ├── layout.tsx            # Root layout (metadata, fonts)
│   │   ├── page.tsx              # Home/landing page
│   │   ├── globals.css           # Tailwind + global styles
│   │   └── error.tsx             # Error boundary
│   ├── lib/                      # Shared business logic & utilities
│   │   ├── auth.ts               # JWT token creation/verification, role-based access
│   │   ├── availability.ts       # Slot calculation for booking
│   │   ├── cache.ts              # In-memory caching
│   │   ├── email.ts              # Email sending (SendGrid wrapper + DI)
│   │   ├── jobs.ts               # Job queue (PostgreSQL-backed)
│   │   ├── logger.ts             # Structured logging
│   │   ├── prisma.ts             # Prisma client singleton
│   │   ├── resilience.ts         # Retry + circuit breaker
│   │   └── security.ts           # Input sanitization, rate limiting, validation
│   ├── middleware.ts             # Request-level security & auth checks
│   ├── middleware/               # Middleware plugins (unused currently)
│   ├── hooks/                    # React hooks (useShopEvents for SSE)
│   ├── types/                    # TypeScript type definitions
│   └── globals.css               # Tailwind + custom CSS
├── prisma/                       # Database schema & migrations
│   ├── schema.prisma             # Data models (Shop, User, Appointment, etc.)
│   ├── migrations/               # Automatically generated SQL migrations
│   ├── seed.ts                   # Optional seed script
│   └── seed-demo.ts              # Demo shop setup (demo-barber)
├── generated/                    # Prisma client output
│   └── prisma/                   # @prisma/client types & runtime
├── public/                       # Static assets (images, icons, fonts)
├── scripts/                      # CLI utilities (e.g., create-shop.ts)
├── docs/                         # Project documentation
├── .planning/                    # GSD mapping documents
├── outreach-agent/               # Separate Node.js agent (email campaigns)
├── package.json                  # Dependencies & build scripts
├── tsconfig.json                 # TypeScript config (@ alias to src/)
├── next.config.ts                # Next.js config (React compiler enabled)
├── prisma.config.ts              # Prisma 7 config (DATABASE_URL, migrations path)
├── postcss.config.mjs            # Tailwind CSS config
├── eslint.config.mjs             # ESLint rules
└── .env, .env.local              # Environment variables (DO NOT COMMIT)
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next.js App Router — all routes live here (file-based routing)
- Contains: Page components, layout wrappers, API route handlers
- Key files: `page.tsx` (any directory = route), `layout.tsx` (wraps children), `route.ts` (HTTP handler)

**`src/app/admin/[slug]/`:**
- Purpose: Admin dashboard (protected by middleware + `auth_token` cookie)
- Contains: Shop management UI — appointments, staff, services, hours, settings
- Key files:
  - `appointments/page.tsx` → AdminClient.tsx (React component, state management)
  - `services/page.tsx` → Add/edit service modal
  - `staff/page.tsx` → Add/edit staff modal
  - `hours/page.tsx` → Working hours toggle + save

**`src/app/api/`:**
- Purpose: REST API endpoints
- Contains: Request handlers, validation, DB mutations, response serialization
- Pattern: `GET` for reads (with auth), `POST` for creates, `PATCH` for updates, `DELETE` for deletes

**`src/app/api/admin/{services,staff,hours,shop}/`:**
- Purpose: Admin CRUD operations
- Key files:
  - `route.ts` → GET all items (for admin shop), POST create, PATCH update, DELETE soft-delete

**`src/app/api/auth/`:**
- Purpose: Authentication flows
- Key files:
  - `login/route.ts` → Admin login, returns JWT + sets `auth_token` cookie
  - `login-customer/route.ts` → Customer login/registration, sets `customer_token` cookie
  - `logout/route.ts` → Clears cookies
  - `forgot-password/route.ts`, `reset-password/route.ts` → Password recovery

**`src/app/api/appointments/`:**
- Purpose: Appointment CRUD
- Key files:
  - `route.ts` → GET appointments for a date/shop, POST new booking
  - `[id]/route.ts` → PATCH status update, DELETE cancellation

**`src/app/api/availability/`:**
- Purpose: Calculate available slots
- Key files: `route.ts` → GET available time slots for date + service + optional staff

**`src/app/api/cron/jobs/`:**
- Purpose: Job queue processor (invoked by external cron)
- Key files: `route.ts` → Dequeue and execute pending jobs (email reminders, etc.)

**`src/app/api/events/`:**
- Purpose: Server-sent events (SSE) for real-time shop updates
- Key files: `route.ts` → Open SSE connection, stream events (appointment created/updated)

**`src/app/booking/[slug]/`:**
- Purpose: Public-facing booking interface
- Contains: Multi-step form (date/service/staff selection → confirmation)
- Key files:
  - `page.tsx` → Server component that fetches shop data
  - `BookingClient.tsx` → Interactive React component with animation + socket CSS

**`src/app/customer/`:**
- Purpose: Customer account & dashboard
- Contains: Customer login, dashboard (my appointments), profile

**`src/lib/`:**
- Purpose: Shared business logic (not tied to routes)
- Contains: Database queries, email sending, caching, auth, availability logic
- Key distinction: Library code used by multiple routes; tested independently

**`src/lib/prisma.ts`:**
- Purpose: Singleton Prisma client instance with PrismaPg adapter
- Key detail: Uses Prisma 7 with PrismaPg adapter (no URL in schema)
- Usage: Import in all route handlers: `import prisma from "@/lib/prisma"`

**`src/lib/auth.ts`:**
- Purpose: Token lifecycle management
- Functions: `createToken()`, `verifyToken()`, `requireAdmin(request, shopId)`, `requireAuth(request)`
- Pattern: `requireAdmin()` checks ownership; superadmin role bypasses shop checks

**`src/lib/availability.ts`:**
- Purpose: Slot calculation algorithm
- Key logic: Query WorkingHours + existing Appointments → detect conflicts → return available 30-min slots
- Input: `shopId`, `date`, optional `staffId`, `serviceDuration` (minutes)
- Output: Array of TimeSlot objects with `hour`, `minute`, `label`, `available`, `startTime`

**`src/lib/email.ts`:**
- Purpose: Abstracted email sending (SendGrid wrapper by default)
- Key functions:
  - `sendBookingConfirmation(appointment)` → HTML email to customer
  - `sendAppointmentReminder(appointment)` → 24h reminder
  - `sendMail(msg)` → Generic send with retry + circuit breaker
- Resilience: Retries 3x with exponential backoff; circuit breaker fails fast after 5 SendGrid failures

**`src/lib/jobs.ts`:**
- Purpose: Background job queue (PostgreSQL-backed)
- Key functions: `enqueueJob(type, payload, opts)`, `processJobs(batchSize)`, `registerJobHandler(type, handler)`
- Job types: `email:reminder`, `email:confirmation`
- Storage: `_jobs` table (created via raw SQL on first use)
- Pattern: Cron endpoint calls `processJobs()`, atomically claims batch, executes handlers, retries on failure

**`src/lib/cache.ts`:**
- Purpose: In-memory caching (with TTL)
- Key functions: `get()`, `set()`, `delete()`
- Use case: Availability slots cached 5 min to reduce DB load during booking rush

**`src/lib/security.ts`:**
- Purpose: Input validation, rate limiting, IP detection
- Key functions:
  - `sanitize(input, maxLength)` → Strip HTML, limit length
  - `isValidEmail()`, `isValidPhone()` → Regex validation
  - `rateLimit(key, maxRequests, windowMs)` → Per-IP throttling
  - `getClientIp(request)` → Extract real IP (Vercel header preferred)

**`src/lib/resilience.ts`:**
- Purpose: Fault tolerance patterns
- Key functions:
  - `withRetry(fn, opts)` → Retry async with exponential backoff
  - `isTransientError(err)` → Detect network/5xx/429 errors (retryable)
  - `CircuitBreaker` → Fail fast if service down; half-open to retry periodically

**`src/lib/logger.ts`:**
- Purpose: Structured logging (replaces console.error/log)
- Key functions: `logger.info()`, `logger.warn()`, `logger.error(context, msg, err)`
- Context: Tags like `"api:appointments"`, `"email:sendgrid"` aid debugging
- Buffer: In-memory last 100 errors, queryable via `/api/health`

**`src/middleware.ts`:**
- Purpose: Request-level security & authentication
- Responsibilities:
  - Apply security headers (CSP, X-Frame-Options, HSTS, etc.)
  - CORS enforcement (whitelist origins)
  - CSRF protection (reject POST/PATCH/DELETE from unknown origins)
  - Auth redirect (protect `/admin/*` and `/fran/*` routes)
  - Payload size check (reject >100KB)
- Matcher: `["/admin/:path*", "/fran/:path*", "/api/:path*"]`

**`src/hooks/useShopEvents.ts`:**
- Purpose: React hook for real-time SSE subscriptions
- Usage: `useShopEvents(shopId, { "appointment:created": (data) => refetch() })`
- Pattern: Opens EventSource, registers handlers, auto-cleanup on unmount

**`prisma/schema.prisma`:**
- Purpose: Data model definitions (Prisma schema language)
- Contains: Enums (BusinessType, BookingStatus, DayOfWeek), models (Shop, User, Appointment, etc.)
- Key models:
  - `Shop` → multi-tenant root; owns services, staff, working hours, appointments
  - `User` → admin; relation to owned shops
  - `Customer` → end-user (may have account or be anonymous)
  - `Appointment` → booking; references shop, service, staff, customer
  - `Service` → duration, price, shop-specific
  - `Staff` → shop employee
  - `WorkingHours` → shop hours per day; `StaffWorkingHours` for per-staff schedules

**`prisma/migrations/`:**
- Purpose: SQL version history
- Auto-generated by: `npx prisma migrate dev` (create new schema)
- Committed: Yes (track schema evolution)

**`generated/prisma/`:**
- Purpose: Prisma client output
- Contents: `index.js`, `schema.prisma` (copy), type definitions
- Generated: Automatically by `prisma generate` after schema changes
- Committed: No (regenerated on `npm install`)

**`public/`:**
- Purpose: Static assets served by Next.js
- Contains: Favicons, fonts, logos, images
- Accessed: Via `<img src="/image.png" />`

**`scripts/`:**
- Purpose: CLI utilities
- Key files:
  - `create-shop.ts` → Admin command to create demo shop (runs via `npm run create-shop`)

**`.planning/codebase/`:**
- Purpose: GSD mapping documents (this directory)
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, STACK.md, INTEGRATIONS.md, CONCERNS.md
- Committed: Yes (consumed by GSD planner/executor)

**`outreach-agent/`:**
- Purpose: Separate Node.js app for email campaigns (out of scope for SaaS booking core)
- Status: Active but separate from main Next.js app
- Note: Excluded from tsconfig.json

## Key File Locations

**Entry Points:**

- `src/app/layout.tsx` → Root layout (fonts, global CSS, metadata)
- `src/app/page.tsx` → Home/landing page
- `src/app/booking/[slug]/page.tsx` → Public booking (no auth)
- `src/app/admin/[slug]/appointments/page.tsx` → Admin dashboard (auth required)
- `src/app/api/appointments/route.ts` → Booking creation endpoint
- `src/app/api/cron/jobs/route.ts` → Background job processor

**Configuration:**

- `prisma.config.ts` → Prisma 7 setup (DATABASE_URL, schema path)
- `tsconfig.json` → TypeScript settings (@ alias)
- `next.config.ts` → Next.js config (React compiler enabled)
- `postcss.config.mjs` → Tailwind CSS
- `eslint.config.mjs` → ESLint rules

**Core Logic:**

- `src/lib/prisma.ts` → Database client
- `src/lib/auth.ts` → Token & role management
- `src/lib/availability.ts` → Slot availability calculation
- `src/lib/email.ts` → Email sending (SendGrid)
- `src/lib/jobs.ts` → Background job queue
- `src/middleware.ts` → Security middleware

**Database:**

- `prisma/schema.prisma` → All data models
- `prisma/migrations/` → SQL version history
- `prisma/seed.ts` (optional) → Initial data setup

## Naming Conventions

**Files:**

- `page.tsx` → Route page component (required by App Router)
- `layout.tsx` → Route layout wrapper
- `route.ts` → API endpoint handler
- `[param].tsx` → Dynamic route segment
- `ComponentName.tsx` → React component (PascalCase)
- `utility.ts` → Helper functions (camelCase)
- `.ts` → Server-side utilities (Node.js)
- `.tsx` → React components (client + server)

**Directories:**

- `src/app/[path]/` → File-based routes (App Router convention)
- `src/app/api/[feature]/` → Grouped API routes by feature
- `src/lib/` → Non-route utilities
- `src/hooks/` → React hooks
- `src/types/` → TypeScript definitions
- `prisma/` → Database schema + migrations

**Functions & Variables:**

- `getXxx()` → Fetch/compute (returns value)
- `fetchXxx()` → Async fetch from DB or API
- `setXxx()` → State setter (React) or config setter
- `handleXxx()` → Event handler
- `validateXxx()` → Return error message or null
- `requireXxx()` → Auth check, throw on failure
- `withXxx()` → Wrapper/middleware pattern

**Types & Enums:**

- `PascalCase` → All types (interfaces, types, enums, classes)
- `SCREAMING_SNAKE_CASE` → Constants (CLEANUP_INTERVAL, MAX_BUFFER)
- `camelCase` → Variables & functions

## Where to Add New Code

**New Feature (e.g., new booking step, new admin tab):**

- Primary code: `src/app/{booking|admin}/[slug]/[feature]/page.tsx` + client component
- API endpoints: `src/app/api/[feature]/route.ts`
- Business logic: `src/lib/[feature].ts` if reused; otherwise inline in lib/

**New Component/Module:**

- Implementation: `src/app/components/ComponentName.tsx` (if route-scoped) or extract to reusable
- If shared across routes: Place in `src/app/` root or create `src/components/`

**Utilities & Helpers:**

- Shared helpers: `src/lib/[feature].ts` (if ~100+ lines of logic)
- Small utils: Add to existing `src/lib/security.ts` or `src/lib/availability.ts` if related
- React hooks: `src/hooks/[hookName].ts`

**Database Changes:**

1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name [description]` (generates SQL)
3. Commit both schema.prisma and migrations/
4. Run seed script if needed: `npx tsx prisma/seed.ts`

**New API Route:**

1. Create `src/app/api/[feature]/route.ts`
2. Add auth check: `const auth = await requireAdmin(request, shopId)` or `requireAuth(request)`
3. Validate input via `src/lib/security.ts` functions
4. Use Prisma: `const result = await prisma.[model].findMany(...)`
5. Return: `NextResponse.json(data, { status: 200 })`
6. Error: `NextResponse.json({ error: "message" }, { status: 400|401|500 })`

**Background Job:**

1. Register handler: `registerJobHandler("email:type", async (payload) => { ... })`
2. Enqueue: `await enqueueJob("email:type", { appointmentId, ... }, { runAt: future })`
3. Cron endpoint `/api/cron/jobs/route.ts` automatically invokes handlers

**Styles & UI:**

- Use Tailwind CSS classes directly in JSX (global styles in `src/app/globals.css`)
- Component-scoped styles: Inline `<style>` tag (e.g., BookingClient's CSS)
- Dark mode: Managed per-shop via `shop.darkMode` boolean; apply via className logic

## Special Directories

**`generated/`:**
- Purpose: Prisma client output
- Generated: By `npm install` or `prisma generate`
- Committed: No (gitignored, regenerated)
- Edit: Never modify directly; edit `prisma/schema.prisma` instead

**`.planning/codebase/`:**
- Purpose: GSD mapping documents
- Generated: By `/gsd:map-codebase` command
- Committed: Yes (consumed by planner/executor)
- Edit: Only if updating documentation, not code

**`prisma/migrations/`:**
- Purpose: SQL version history
- Generated: By `prisma migrate dev`
- Committed: Yes (essential for reproducibility)
- Edit: Never (unless fixing failed migration)

**`node_modules/`:**
- Purpose: Dependencies
- Generated: By `npm install`
- Committed: No (gitignored)

---

*Structure analysis: 2026-03-28*
