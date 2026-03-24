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
| Login (admin/customer) | 10 | 15 min |
| Register | 5 | 1 hour |
| Booking | 20 | 1 hour |
| Forgot password | 5 | 1 hour |
| Availability | 60 | 1 min |
| Services/Staff/Shops | 60 | 1 min |
| Superadmin 2FA | 10 | 15 min |
| Cron reminders | 25 | 1 hour |

## Security Headers (middleware.ts)
- `Strict-Transport-Security` (HSTS)
- `Content-Security-Policy` (CSP)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

## CORS
- Production: only `NEXTAUTH_URL` origin allowed
- Development: all origins (for local testing)
- Methods: GET, POST, PATCH, DELETE, OPTIONS

## Input Validation
- `sanitize()` — removes HTML tags, escapes `<>"'&`, limits length
- `isValidEmail()` — regex check
- `isValidPhone()` — 7-20 digits, optional `+`
- `validateRequired()` — non-empty check
- All Prisma queries are parameterized (no SQL injection)

## Google OAuth CSRF
- Cryptographic state parameter
- CSRF cookie: httpOnly, 10-min expiry
- State validated on callback

## Links
- [[Architecture]]
- [[Reliability]]
- [[Outreach Agent]]
