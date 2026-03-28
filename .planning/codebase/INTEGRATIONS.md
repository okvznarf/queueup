# External Integrations

**Analysis Date:** 2026-03-28

## APIs & External Services

**Email Delivery:**
- SendGrid - Default email provider for transactional and reminder emails
  - SDK/Client: `@sendgrid/mail@^8.1.6`
  - Auth: `SENDGRID_API_KEY` environment variable
  - Implementation: `src/lib/email.ts` with pluggable provider interface (supports Resend, Nodemailer fallback)
  - Usage: Booking confirmations, password resets, 24h appointment reminders, welcome emails
  - Resilience: Circuit breaker + exponential backoff retry (3 retries, 1s base delay)

**Search & Web Scraping:**
- Serper (Google Search API) - B2B lead discovery in outreach agent
  - SDK/Client: Native fetch wrapper
  - Auth: `SERPER_API_KEY` environment variable
  - Implementation: `outreach-agent/src/apis/serper.ts`
  - Usage: Search for Croatian SMEs by category and city

**AI & LLM:**
- Anthropic Claude API - B2B outreach email generation
  - SDK/Client: `@anthropic-ai/sdk@^0.39.0`
  - Auth: `ANTHROPIC_API_KEY` environment variable
  - Implementation: `outreach-agent/src/apis/claude.ts`
  - Usage: Generate personalized outreach emails with business context

**Google Services:**
- Google OAuth 2.0 - Customer social login
  - Implementation: `src/app/api/auth/google/route.ts`, `src/app/api/auth/google/callback/route.ts`
  - Auth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` environment variables
  - Flow: Authorization code exchange with CSRF token protection
  - Scope: `openid email profile`
  - Cookie: `oauth_state` (httpOnly, 10-min expiry)

- Google Sheets API - Lead tracking in outreach agent
  - SDK/Client: `googleapis@^144.0.0`
  - Implementation: `outreach-agent/src/apis/sheets.ts`
  - Usage: Store and manage B2B lead data (CSV fallback in `leads.csv`)

## Data Storage

**Databases:**
- PostgreSQL (self-hosted or cloud)
  - Connection: `DATABASE_URL` environment variable
  - Client: Prisma 7 with `@prisma/adapter-pg`
  - Schema: `prisma/schema.prisma` - 8 models (Shop, User, Staff, Service, Customer, Appointment, WorkingHours, StaffWorkingHours)
  - Migrations: Auto-created by Prisma, stored in `prisma/migrations/`

**Job Queue Storage:**
- PostgreSQL `_jobs` table
  - Structure: Generic JSON-based job store created on first use in `src/lib/jobs.ts`
  - Fields: type, payload (JSONB), status, run_at, max_retries, attempts, last_error
  - Processing: Cron endpoint at `src/app/api/cron/jobs/route.ts` polls and executes jobs
  - Job types: `email:confirmation`, `email:reminder`

**File Storage:**
- Local filesystem only
  - Outreach agent CSV: `outreach-agent/leads.csv`
  - Config files: `pitch-ideas.txt` or `pitch-ideas.pdf` (optional, for outreach)

**Caching:**
- In-memory cache with TTL (serverless-safe)
  - Implementation: `src/lib/cache.ts` - simple Map-based cache
  - Use case: Availability queries, shop settings
  - Note: Per-Vercel-instance, not distributed. Suitable until traffic requires Redis.

## Authentication & Identity

**Auth Providers:**

**Custom JWT (Primary):**
- Implementation: `src/lib/auth.ts`
- Admin tokens: `auth_token` cookie, 7-day expiry
- Customer tokens: `customer_token` cookie, 30-day expiry
- Secret: `NEXTAUTH_SECRET` environment variable (HS256 algorithm)
- Middleware: Password hashing via `bcryptjs@^3.0.3` (12 rounds)

**Google OAuth (Customer Social Login):**
- Redirect flow with CSRF token (randomized 16-byte hex)
- State parameter encodes shop slug and CSRF token
- Callback: `src/app/api/auth/google/callback/route.ts`
- Returns `customer_token` on successful sign-up/login

**Two-Factor Authentication (2FA):**
- TOTP (Time-based One-Time Password) via `otpauth@^9.5.0`
- Admin 2FA: `src/app/api/superadmin/2fa/route.ts` - sends OTP via email
- OTP validity: 6-digit codes, 30-second window

## Monitoring & Observability

**Error Tracking:**
- None configured (no Sentry, LogRocket, etc.)

**Logs:**
- Custom logger: `src/lib/logger.ts` (basic console-based)
- Outreach agent logger: `outreach-agent/src/lib/logger.ts`
- Log levels: info, warn, error (tagged by domain, e.g., "email:sendgrid")

## CI/CD & Deployment

**Hosting:**
- Vercel (serverless Next.js platform)
- `.vercel/` directory present

**CI Pipeline:**
- None detected (no GitHub Actions, CircleCI, etc.)
- Manual deployments via `git push` to Vercel

**Build Command:**
- `npm run build` - Next.js production build
- **Cron Jobs:**
  - Reminder cron: Triggered externally, hits `src/app/api/cron/reminders/route.ts` (must be Vercel Cron or external trigger)
  - Job processor cron: Triggered externally, hits `src/app/api/cron/jobs/route.ts`
  - Authentication: `CRON_SECRET` header checked via `timingSafeEqual`

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - JWT signing secret (minimum 32 bytes recommended)
- `SENDGRID_API_KEY` - Email service authentication
- `GOOGLE_CLIENT_ID` - OAuth client ID
- `GOOGLE_CLIENT_SECRET` - OAuth client secret
- `CRON_SECRET` - Bearer token for cron endpoints

**Optional env vars:**
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` - Distributed rate limiting (falls back to in-memory)
- `EMAIL_FROM`, `EMAIL_FROM_NAME` - Email sender identity (defaults to "info@queueup.me", "QueueUp")
- `NEXTAUTH_URL` - OAuth callback base URL (defaults to "http://localhost:3000")
- `NODE_ENV` - "production" | "development" (affects cookie security, CSP policy)
- `SERPER_API_KEY` - Google Search API (outreach agent only)
- `ANTHROPIC_API_KEY` - Claude API (outreach agent only)

**Secrets location:**
- `.env` and `.env.local` files (gitignored, not committed)
- Vercel environment variable dashboard for production

## Webhooks & Callbacks

**Incoming:**
- `src/app/api/cron/reminders/route.ts` - External cron trigger (must provide `CRON_SECRET` header)
- `src/app/api/cron/jobs/route.ts` - External job processor trigger (must provide `CRON_SECRET` header)
- Outreach agent can POST to sheets/sendgrid internally

**Outgoing:**
- SendGrid callback webhooks (not implemented; configured at provider level if needed)
- Google OAuth callback: `src/app/api/auth/google/callback/route.ts`

## Rate Limiting

**Implementation:**
- `src/lib/security.ts` - Distributed via Upstash Redis, falls back to in-memory
- Rate limit keys: `cron-reminders:{ip}`, `google-auth:{ip}`, and per-route custom keys
- Limits: 25 req/hour for reminders, 5 req/15min for Google Auth
- Storage: In-memory map on Vercel (per-instance), cleaned every 60s to prevent leaks

---

*Integration audit: 2026-03-28*
