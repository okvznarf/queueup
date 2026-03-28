# Coding Conventions

**Analysis Date:** 2026-03-28

## Naming Patterns

**Files:**
- API routes: `src/app/api/[domain]/[action]/route.ts` (e.g., `route.ts`, `[id]/route.ts`)
- Client components: `[Component]Client.tsx` suffix for interactive client-side pages
- Pages: `page.tsx` for route components, `layout.tsx` for layouts
- Libraries: `src/lib/[feature].ts` (e.g., `auth.ts`, `email.ts`, `cache.ts`)
- Utilities: Named by domain: `cache.ts`, `resilience.ts`, `jobs.ts`, `security.ts`, `logger.ts`

**Functions:**
- camelCase for all functions and variables: `getAvailableSlots()`, `calculateEndTime()`, `formatError()`
- Exported utility functions: descriptive, action-first names: `cacheGet()`, `cacheSet()`, `withRetry()`
- Private helpers: lowercase with underscore: `markCompleted()`, `markFailed()`, `getClientIp()`
- Async functions: no special prefix, context from return type: `enqueueJob()`, `verifyToken()`

**Variables:**
- camelCase: `selectedDate`, `workingHours`, `rateLimit`, `shopId`
- Boolean variables: prefix with `is`, `has`, `can`: `isValidEmail()`, `isBooked`, `isTransientError()`
- Constants (exported): UPPER_SNAKE_CASE: `CACHE_TTL`, `CLEANUP_INTERVAL`, `MAX_BUFFER`, `DEFAULT_RETRY`
- Internal constants: descriptive camelCase: `STATUS_COLORS`, `DAYS`, `DAY_LABELS`, `INPUT`, `LABEL`
- CSS/styling objects: ALL_CAPS properties in object literals for inline styles

**Types:**
- Interfaces: PascalCase, action-oriented nouns: `EmailProvider`, `EmailMessage`, `JwtUser`, `JobPayload`
- Type aliases: PascalCase with `Type` suffix or bare noun: `TimeSlot`, `CircuitState`, `LogLevel`
- Generic type parameters: Single letter uppercase: `<T>`, `<E>` (standard TS convention)

## Code Style

**Formatting:**
- Next.js + TypeScript, ESLint with `eslint-config-next` for core-web-vitals and TypeScript
- No Prettier (relying on ESLint auto-fix)
- Line length: pragmatic (long lines acceptable where readability doesn't suffer)
- Indentation: 2 spaces (implicit Next.js default)

**Linting:**
- Config: `eslint.config.mjs` (flat config format)
- Rules: Next.js recommended rules + TypeScript strict mode
- Run: `npm run lint` (ESLint only, no Prettier run command)

## Import Organization

**Order:**
1. External packages (e.g., `import jwt from "jsonwebtoken"`)
2. Next.js modules (e.g., `import { NextRequest, NextResponse } from "next/server"`)
3. Internal lib/utils (e.g., `import prisma from "@/lib/prisma"`)
4. Internal app modules (e.g., `import { broadcastToShop } from "@/app/api/events/route"`)
5. Type imports (implicit in most files, no separate group)

**Path Aliases:**
- Configured: `@/*` → `src/*`
- Always use absolute `@/` imports, never relative paths in shared code
- Example: `import prisma from "@/lib/prisma"` (not `../../../lib/prisma`)

## Error Handling

**Patterns:**

**API Routes (NextResponse pattern):**
```typescript
// Return error response directly
if (!shopId) return NextResponse.json({ error: "shopId required" }, { status: 400 });

// Use discriminated union for auth checks
const auth = await requireAdmin(request, shopId);
if (auth.error) return auth.error;  // Early return with error response

// Try-catch with logger
try {
  const data = await prisma.service.findMany({ ... });
  return NextResponse.json(data);
} catch (error) {
  logger.error("Failed to fetch services", "api:services", error);
  return NextResponse.json({ error: "Server error" }, { status: 500 });
}
```

**Auth Functions (Discriminated Union):**
```typescript
export async function requireAdmin(request: Request, shopId?: string): Promise<
  { user: JwtUser; error?: never } | { user?: never; error: Response }
> {
  if (!token) return { error: new Response(...) };
  return { user };
}
// Caller checks: const auth = await requireAdmin(...); if (auth.error) return auth.error;
```

**Token Verification (Null Return):**
```typescript
export function verifyToken(token: string): JwtUser | null {
  try {
    return jwt.verify(...) as JwtUser;
  } catch {
    return null;  // Silent fail, caller checks for null
  }
}
```

**Promise.all Error Handling:**
```typescript
// Parallel queries with await Promise.all() — if any fails, whole thing throws
const [shop, service, conflict] = await Promise.all([
  prisma.shop.findUnique(...),
  prisma.service.findUnique(...),
  prisma.appointment.findFirst(...),
]);
```

**Utility Functions (No Throw):**
- `rateLimit()` returns boolean: `if (!rateLimit(...)) return error`
- `checkIdempotency()` returns cached value or null
- `cacheGet()` returns T | null

## Logging

**Framework:** Custom `logger` object in `src/lib/logger.ts`

**Patterns:**
```typescript
// Import
import { logger } from "@/lib/logger";

// Usage — 3 levels
logger.info("User logged in", "api:auth", { userId: "123" });
logger.warn("Rate limit approaching", "api:auth", { remaining: 2 });
logger.error("Login failed", "api:auth", error, { ip: "1.2.3.4" });
```

**Context strings:** `"api:auth"`, `"api:appointments"`, `"email:sendgrid"` format — domain:subdomain

**Error calls:** require context string + error object as second-to-last parameter

**Buffer:** Last 100 errors stored in-memory, queryable via `/api/health` endpoint

## Comments

**When to Comment:**
- Architectural decisions or non-obvious logic
- Section dividers for large components: `// ── Appointments ──────`
- Rate limit logic, idempotency patterns, circuit breaker states
- Workarounds or temporary fixes (marked with context)

**Examples from codebase:**
```typescript
// ── Idempotency: prevent duplicate bookings from double-clicks / retries ──
const idempKey = bookingIdempotencyKey(...);

// Parallel: check shop status + service + time conflict in one batch
const [shop, service, conflict] = await Promise.all([...]);

// Get shop slug separately to avoid Prisma adapter relation issues
const ownedShop = await prisma.shop.findFirst(...);

// Superadmins can access any shop
if (shopId && user.role !== "superadmin") { ... }
```

**JSDoc/TSDoc:**
- No formal JSDoc blocks in codebase
- Types documented via TypeScript interfaces and type aliases
- Function parameters typed inline: `async function sendMail(msg: EmailMessage): Promise<void>`

## Function Design

**Size:** Functions kept under 50-100 lines
- API route handlers: ~50-100 lines
- Helper utilities: ~20-40 lines
- Large components (AdminClient.tsx): 600+ lines split into logical sections with dividers

**Parameters:**
- Destructure from request: `const { id } = await request.json()`
- Pass typed interfaces: `payload: JobPayload`, `opts: EnqueueOptions`
- No long parameter lists; use object for optional config

**Return Values:**
- APIs: Always `NextResponse.json(...)`
- Auth checks: Discriminated union `{ user } | { error }`
- Utilities: Explicit types (`boolean`, `T | null`, `Promise<void>`)
- No implicit undefined returns; use explicit `null` or `void`

## Module Design

**Exports:**
- Named exports for functions: `export async function enqueueJob(...)`
- Default export for Prisma client: `export default prisma`
- Type exports for shared interfaces: `export interface EmailMessage`

**Barrel Files:**
- No barrel files (`index.ts` re-exports) in codebase
- Import directly from source: `import { logger } from "@/lib/logger"`

**Separation of Concerns:**
- `src/lib/auth.ts`: JWT creation, token verification, password hashing
- `src/lib/security.ts`: Input sanitization, validation, rate limiting, IP detection
- `src/lib/email.ts`: Email providers, email sending with retry logic
- `src/lib/jobs.ts`: Job queue with PostgreSQL storage
- `src/lib/resilience.ts`: Retry logic, circuit breaker, transient error detection
- `src/lib/cache.ts`: Simple TTL-based in-memory cache
- `src/lib/logger.ts`: Structured logging with error buffering

## Specific Patterns

**Input Sanitization:**
```typescript
const email = sanitize(body.email, 200).toLowerCase();
const name = sanitize(body.customerName, 100);
```

**Validation Chain:**
```typescript
if (!email || !password) return error;
if (!isValidEmail(email)) return error;
if (!isValidPhone(phone)) return error;
```

**Rate Limiting Key Format:**
```typescript
"login:" + ip            // api:auth:login
"booking:" + ip          // api:bookings
"avail:" + ip            // api:availability
```

**Idempotency Keys:**
```typescript
const idempKey = bookingIdempotencyKey(shopId, date, startTime, customerPhone);
const cached = checkIdempotency(idempKey);
if (cached) return cached;  // Duplicate request detected
```

---

*Convention analysis: 2026-03-28*
