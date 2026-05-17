# QueueUp

Multi-industry appointment booking SaaS at [queueup.me](https://www.queueup.me)

> ⚠️ **STALE — 2026-05-16 afternoon pivot supersedes this doc.** v3 ships as a multi-vertical AI receptionist platform launching with **mechanic + barber + dentist** packs. Pricing is reopened per vertical. See [[Platform Strategy]] for current direction. The v2 mechanic-only positioning below is preserved temporarily; full rewrite of this overview pending.

## Tech Stack
- **Frontend:** Next.js App Router + TypeScript + Tailwind
- **Database:** PostgreSQL (Neon) + Prisma 7
- **Auth:** Custom JWT (admin + customer tokens)
- **Email:** SendGrid
- **Hosting:** Vercel
- **Rate Limiting:** Upstash Redis + in-memory fallback

## Pricing

**Legacy tier (multi-industry, currently in code & Stripe):**
- Base: €25/mo + €5/employee
- 30-day free trial on signup

**v2 mechanic tier — locked in 2026-05-16:**
- Base: **€59/mo + €10/mechanic**
- 30-day free trial on signup (unchanged)
- No founding-customer discount — single clean list price
- Existing legacy customers grandfathered at their current rate
- **Price-review checkpoint:** customer #25 OR 2026-11-16 (whichever first) — decide whether to raise list to €79 / €89

> **Rationale:** blended ARPU ~€80 (2-mechanic shop = €79; 3-mechanic = €89). 1 recovered brake job (€300) covers 4–5 months; 1 recovered clutch (€800) covers a year. To hit €5K MRR: ~63 customers (~5 closes/month over 12 months).
>
> **Pitch frame:** never defend the price — flip to recovered revenue. *"It's €59 plus €10 per mechanic. How many calls did you miss last week? At €200 per brake job, you tell me."*

## Key URLs
- Production: https://www.queueup.me
- Superadmin: https://www.queueup.me/fran/login
- Demo shop (barber, legacy): https://www.queueup.me/booking/demo-barber
- Demo shop (mechanic, **TODO** — create before mechanic outreach launch): https://www.queueup.me/booking/demo-mechanic

## Links
- [[Architecture]]
- [[API Routes]]
- [[Database Schema]]
- [[Security]]
- [[Reliability]]
- [[Outreach Agent]]
- [[AI Receptionist]]
- [[Environment Variables]]
- [[Roadmap]]
