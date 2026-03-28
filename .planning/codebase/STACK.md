# Technology Stack

**Analysis Date:** 2026-03-28

## Languages

**Primary:**
- TypeScript 5 - All source code in `src/`, `outreach-agent/src/`, and configuration files
- JavaScript (ES modules) - Build config, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`

**Secondary:**
- HTML/JSX/TSX - React components in `src/app/`
- CSS - Tailwind utility classes via Tailwind CSS 4

## Runtime

**Environment:**
- Node.js 20+ (from `@types/node@^20`)
- Vercel serverless (deployment target, indicated by serverless-compatible architecture)

**Package Manager:**
- npm 10+ (implied by `package-lock.json`)
- Lockfile: Present at `package-lock.json`

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack app framework with App Router
- React 19.2.3 - UI framework
- Prisma 7.4.2 - ORM with PostgreSQL adapter

**Testing:**
- No test framework configured (none in `package.json`, no `jest.config.js`, `vitest.config.js`, or test files found)

**Build/Dev:**
- TypeScript 5 - Compilation and type checking
- Tailwind CSS 4 - Utility-first CSS framework with @tailwindcss/postcss
- Babel React Compiler 1.0.0 - Auto-memoization of React components (enabled in `next.config.ts`)
- ESLint 9 with Next.js config - Linting via `eslint.config.mjs`
- PostCSS 4 - CSS processing pipeline

## Key Dependencies

**Critical:**
- `@prisma/client@^7.4.2` - ORM client generated at `generated/prisma/client`
- `@prisma/adapter-pg@^7.4.2` - PostgreSQL adapter for Prisma 7 (required instead of connection URL in schema)
- `pg@^8.20.0` - Native PostgreSQL driver (used by PrismaPg adapter)
- `jsonwebtoken@^9.0.3` - JWT token creation/verification for auth
- `bcryptjs@^3.0.3` - Password hashing (12 rounds)
- `@sendgrid/mail@^8.1.6` - Email delivery service

**Infrastructure:**
- `@upstash/redis@^1.37.0` - Redis client for distributed rate limiting (optional, falls back to in-memory on Vercel)
- `dotenv@^17.3.1` - Environment variable loading
- `cookie@^1.1.1` - Cookie parsing/serialization

**Features:**
- `next-auth@^4.24.13` - Auth middleware (imported but custom JWT auth preferred in routes)
- `stripe@^20.4.1` - Payment processing (mentioned in marketing but not actively used in code)
- `twilio@^5.12.2` - SMS/communication (added but not actively used in current code)
- `resend@^6.9.4` - Email service alternative (fallback option, not default)
- `nodemailer@^7.0.13` - SMTP email alternative (fallback option)
- `otpauth@^9.5.0` - OTP generation for 2FA
- `qrcode@^1.5.4` - QR code generation (used in outreach agent)
- `cheerio@^1.0.0` - HTML parsing (outreach agent)
- `commander@^12.0.0` - CLI argument parsing (outreach agent)
- `googleapis@^144.0.0` - Google Sheets API (outreach agent)
- `@anthropic-ai/sdk@^0.39.0` - Claude API (outreach agent)

## Configuration

**Environment:**
- Configured via `.env` and `.env.local` (files present, contents not shared per security policy)
- Required vars: `DATABASE_URL`, `NEXTAUTH_SECRET`, `SENDGRID_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- Optional vars: `EMAIL_FROM`, `EMAIL_FROM_NAME`, `CRON_SECRET`, `NEXTAUTH_URL`, `NODE_ENV`

**Build:**
- `tsconfig.json` - Root TypeScript config
- `next.config.ts` - Next.js configuration (React Compiler enabled)
- `prisma.config.ts` - Prisma configuration with `DATABASE_URL` datasource and migrations path
- `prisma/schema.prisma` - Prisma schema (PostgreSQL provider, no datasource URL)
- `postcss.config.mjs` - Tailwind CSS PostCSS configuration
- `eslint.config.mjs` - ESLint config with Next.js and TypeScript rules

## Platform Requirements

**Development:**
- Node.js 20+
- npm 10+
- PostgreSQL 12+ (local or remote via `DATABASE_URL`)
- Git

**Production:**
- Vercel serverless platform (primary deployment)
- PostgreSQL 12+ (cloud database, e.g., Vercel Postgres)
- Upstash Redis (optional, for distributed rate limiting)
- SendGrid account (email delivery)
- Google OAuth credentials (customer Google login)

---

*Stack analysis: 2026-03-28*
