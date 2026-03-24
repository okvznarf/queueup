# Architecture

## Project Structure
```
src/
  app/
    api/          # API routes (Next.js route handlers)
    admin/        # Admin dashboard (shop owners)
    booking/      # Customer-facing booking flow
    customer/     # Customer dashboard
    fran/         # Superadmin panel
    privacy/      # Privacy policy
    cookies/      # Cookie policy
  lib/
    auth.ts       # JWT auth, password hashing
    prisma.ts     # Prisma client singleton
    security.ts   # Rate limiting, input sanitization
    email.ts      # SendGrid email functions
    cache.ts      # In-memory caching
    logger.ts     # Structured logging
    resilience.ts # Retry logic, circuit breaker
  middleware.ts   # CORS, CSP, auth redirects
prisma/
  schema.prisma   # Database schema
  prisma.config.ts # Prisma 7 config (no url in schema)
```

## Auth Flow
- **Admin:** `auth_token` cookie, 7-day JWT, role = "owner" or "superadmin"
- **Customer:** `customer_token` cookie, 30-day JWT
- **Superadmin:** role = "superadmin" + email 2FA via SendGrid

## Database Models
- Shop, User, Customer, Appointment, Service, Staff, WorkingHours, StaffWorkingHours
- Subscription fields on Shop: `subscriptionActive`, `trialEndsAt`, `employeeCount`, `paidUntil`, `monthlyPrice`
- See [[Database Schema]] for full details

## Reliability Patterns
- Retry with exponential backoff for external APIs
- Circuit breakers for SendGrid, Serper, Anthropic
- Idempotency keys prevent duplicate bookings
- Database transactions for appointment creation
- See [[Reliability]] for details

## Email Architecture
- Provider interface (DI pattern) — swap SendGrid without changing routes
- Circuit breaker + retry wraps every send
- 4 email types: welcome, password reset, booking confirmation, appointment reminder

## Links
- [[Security]]
- [[Reliability]]
- [[Database Schema]]
- [[API Routes]]
- [[Outreach Agent]]
- [[Environment Variables]]
