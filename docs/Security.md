# Security

## Authentication
- **Admin:** `auth_token` cookie, 7-day JWT, httpOnly, secure (prod), sameSite=lax
- **Customer:** `customer_token` cookie, 30-day JWT, same flags
- **Superadmin:** role = "superadmin" + email 2FA (6-digit OTP, 5-min expiry)
- **Password hashing:** bcryptjs, salt rounds = 12, min 8 chars

## Authorization
- Admin routes verify token + shop ownership (`requireAdmin()`)
- Superadmins bypass shop ownership check
- Customer routes verify `customer_token` + role = "customer"
- All admin CRUD checks `shop.ownerId === user.userId`

## Password Reset
- Token: `crypto.randomBytes(32)` — 256-bit, 64-char hex
- Expiry: 1 hour
- One-time use: cleared after successful reset
- Email enumeration protection: always returns `{ ok: true }`
- Rate limited: 5 attempts/hour/IP

## Rate Limiting
| Endpoint | Limit | Window |
|----------|-------|--------|
| Login (admin/customer) | 5 | 15 min |
| Register | 5 | 1 hour |
| Booking | 20 | 1 hour |
| Forgot password | 5 | 1 hour |
| Availability | 60 | 1 min |
| Services/Staff/Shops | 60 | 1 min |
| Superadmin 2FA | 10 | 15 min |
| Cron reminders | 25 | 1 hour |
| Health check | 60 | 1 min |
| SSE events | 10 | 1 min |
| Google OAuth callback | 5 | 15 min |

## Account Lockout
Layered on top of per-IP rate limiting to defeat distributed credential stuffing.
- **Threshold:** 10 failed logins per account within a 1-hour rolling window
- **Lockout:** 30 minutes
- **Scope:**
  - Admin: per email (`admin:<email>`)
  - Customer: per `(email, shopId)` — lockout on one shop doesn't affect others
- **Reset:** successful auth clears the counter
- **Implementation:** `isAccountLocked`, `recordFailedLogin`, `clearFailedLogins` in [src/lib/security.ts](../src/lib/security.ts)

## Security Headers (middleware.ts)
- `Strict-Transport-Security` (HSTS, prod only, 2-year max-age, `includeSubDomains; preload`)
- `Content-Security-Policy` (CSP — see below)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

> `X-XSS-Protection` was removed — deprecated by modern browsers and superseded by CSP.

### Content Security Policy directives
- `default-src 'self'`
- `script-src 'self' 'unsafe-inline' [+ 'unsafe-eval' in dev] https://accounts.google.com https://apis.google.com`
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
- `font-src 'self' https://fonts.gstatic.com`
- `img-src 'self' data: https:`
- `connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com`
- `frame-src https://accounts.google.com`
- `frame-ancestors 'self'` — blocks clickjacking embeds
- `base-uri 'self'` — blocks `<base>` tag injection
- `object-src 'none'` — blocks plugin/Flash execution
- `form-action 'self'` — forms cannot POST to third-party origins

## CORS
- Allowed origins: `http://localhost:3000`, `https://queueup.me`, `https://www.queueup.me`, `NEXTAUTH_URL`
- Methods: GET, POST, PATCH, DELETE, OPTIONS
- State-changing requests (POST/PATCH/DELETE) rejected when `Origin` is not in allowlist — Origin-based CSRF defense
- `/api/cron/*` endpoints exempt (use `Authorization` header, not cookies)

## Input Validation
- `sanitize()` — removes HTML tags, escapes `<>"'&`, limits length
- `isValidEmail()` — regex check
- `isValidPhone()` — 7-20 digits, optional `+`
- `validateRequired()` — non-empty check
- `parseBody()` — JSON parse with 100 KB size cap, returns null on oversize/malformed
- Middleware rejects any request body over 100 KB with HTTP 413
- All Prisma queries are parameterized (no SQL injection)
- `$queryRawUnsafe` calls in [src/lib/jobs.ts](../src/lib/jobs.ts) use positional parameters (`$1`, `$2`) — no string interpolation

## Google OAuth CSRF
- Cryptographic `state` parameter: `{ shop, csrf }` base64url-encoded
- CSRF cookie: httpOnly, 10-min expiry, verified against `state.csrf` on callback
- `shop` slug validated against `/^[a-z0-9-]{1,64}$/i` before use
- All redirect URLs wrap `shopSlug` with `encodeURIComponent` — prevents open-redirect and header-injection via crafted state

## Server-Sent Events (DoS Protection)
[src/app/api/events/route.ts](../src/app/api/events/route.ts) maintains an in-memory listener map. Caps prevent memory-exhaustion attacks:
- **Per-shop cap:** 20 concurrent listeners → HTTP 429
- **Global cap:** 500 total listeners → HTTP 503
- Checks run *before* stream allocation
- Auth required: shop owner or superadmin only

## Health Endpoint Auth
[src/app/api/health/route.ts](../src/app/api/health/route.ts) exposes public status (`status`, `db`, `circuits`, `timestamp`). Error details gated behind bearer auth:
- `Authorization: Bearer <CRON_SECRET>` required to receive `errorCount`
- `?errors=true` adds `recentErrors` array (authorized only)
- Comparison uses `crypto.timingSafeEqual` — no timing side-channel

---

## Hardening Changelog

### 2026-04-15 — Security hardening pass
Based on full security audit; top-5 + medium-priority fixes landed in this pass.

**Fixed:**
1. **Account lockout** — 10 failed logins per email → 30 min lockout. Applied to admin + customer login routes.
2. **CSP hardening** — added `frame-ancestors`, `base-uri`, `object-src 'none'`, `form-action` directives.
3. **Deprecated header removal** — dropped `X-XSS-Protection`.
4. **Health endpoint info leak** — `errorCount` moved inside authorized block, gated by `timingSafeEqual` on `CRON_SECRET`.
5. **SSE DoS** — per-shop (20) + global (500) listener caps added before stream allocation.
6. **OAuth redirect hardening** — slug charset validation (`/^[a-z0-9-]{1,64}$/i`) and `encodeURIComponent` on every `shopSlug` interpolation in error redirects.

**Deferred (architectural — require design input or coordinated frontend work):**
- **MFA on regular admin accounts** — needs TOTP enrollment UI, QR, backup codes, recovery flow
- **CSRF double-submit token** — existing Origin-header check is already in place; double-submit needs every client `fetch` updated to read cookie + send `X-CSRF-Token`
- **Drop `'unsafe-inline'` from `script-src`** — requires per-request nonce pipeline; would break Next.js inline scripts until migration completes
- **`$queryRawUnsafe` → tagged template** — stylistic; current calls are already parameterized

---

## Links
- [[Architecture]]
- [[Reliability]]
- [[Outreach Agent]]
- [[Environment Variables]]
