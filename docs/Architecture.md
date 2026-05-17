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
- 4 email types: welcome, password reset, booking confirmation, appointment reminder (24h before, once per appointment)

## AI Receptionist Services

Two additional services run alongside the main Next.js app:

### voice-service (Railway, eu-west)
Persistent Node.js + Fastify server handling voice calls and web chat.
```
voice-service/
  src/
    handlers/
      twilioStream.ts      # Twilio WebSocket router + session lifecycle
      deepgramClient.ts    # Deepgram Nova-2 STT (mulaw 8kHz)
      consentFlow.ts       # GDPR consent state machine
      claudeSession.ts     # Claude brain: system prompt, tool_use loop
      bookingTools.ts      # 5 Anthropic tools → QueueUp API dispatcher
      elevenLabsTts.ts     # ElevenLabs TTS → Twilio audio stream
      escalation.ts        # Phrase detection + warm transfer
      chatSession.ts       # In-memory chat session map (30-min expiry)
    routes/
      twiml.ts             # POST /twiml (Twilio signature validation)
      chatRoute.ts         # POST /chat (SSE) + OPTIONS preflight
      health.ts            # GET /health
    lib/
      auditLog.ts          # GDPR audit log + call summary → QueueUp
      retentionCron.ts     # 24h cron deleting expired transcripts
      idempotency.ts       # Redis-backed idempotency
      prisma.ts, logger.ts
  Dockerfile               # Multi-stage build
  railway.json             # eu-west region (GDPR-04)
```

**Why Railway, not Vercel?** Twilio Media Streams hold an open WebSocket for the full call duration — serverless execution limits would drop calls mid-conversation.

### chat-widget (Preact IIFE)
Embeddable widget built with Preact + esbuild → `public/widget/chat.js` (21KB minified).
```
chat-widget/
  src/
    widget.tsx     # Entry: reads data-shop-id, mounts in Shadow DOM
    App.tsx        # Bubble, panel, consent gate, messages, input
    Consent.tsx    # GDPR overlay
    Messages.tsx   # Auto-scrolling message list
    api.ts         # SSE fetch to POST /chat
    session.ts     # sessionStorage per shopId
    styles.ts      # CSS string (injected into shadow root)
  build.js         # esbuild IIFE config
```

### Service-to-service auth
`INTERNAL_SERVICE_TOKEN` Bearer header. `requireServiceOrAdmin()` in [serviceAuth.ts](../src/lib/serviceAuth.ts) tries service token first (no DB lookup), falls back to admin JWT. Used on all AI-callable endpoints.

See [[AI Receptionist]] for full details.

## Links
- [[Security]]
- [[Reliability]]
- [[Database Schema]]
- [[API Routes]]
- [[Outreach Agent]]
- [[AI Receptionist]]
- [[Environment Variables]]
