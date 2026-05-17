# Roadmap

> ⚠️ **STALE — 2026-05-16 afternoon pivot supersedes mechanic-only phasing below.** v3 ships as a multi-vertical platform with mechanic + barber + dentist packs. See [[Platform Strategy]] for current Phase A breakdown (6-10 weeks: pack format → AI prompts × 3 → signup flow → marketing). Full roadmap rewrite pending.

## Done
- [x] Booking flow (customer-facing)
- [x] Customer auth + dashboard
- [x] Admin dashboard with CRUD (services, staff, hours, shop settings)
- [x] Superadmin panel with shop management
- [x] Subscription/billing system (25 + 5/employee)
- [x] Email reminders (24h before, timezone-aware)
- [x] Booking confirmation emails
- [x] Password reset (admin + customer)
- [x] Google Calendar "Add to Calendar"
- [x] Security hardening (auth, rate limiting, CORS, CSP, 2FA)
- [x] Scalability (Redis rate limiting, DB indexes, batch email processing)
- [x] Privacy Policy + Cookie Policy (EN/HR/SL)
- [x] Superadmin email 2FA

## Next Up
- [ ] Staff profile pictures
- [x] Customer welcome/registration email
- [x] Analytics dashboard for shop owners

## AI Receptionist
AI receptionist for auto repair shops (mechanics, body shops, tire shops) — voice calls + web chat. See [[AI Receptionist]] for full details.

- [x] Phase 1: Voice Pipeline + GDPR Foundation (Twilio → Deepgram → Claude → ElevenLabs, consent, escalation, audit, retention cron, Railway eu-west)
- [x] Phase 2: Booking AI + Web Chat (5 booking tools, agentic tool_use loop, FAQ, POST /chat SSE, embeddable Preact widget, GDPR consent gate)
- [ ] Phase 3: Shop Admin Portal (AI config, service catalog + price list, vehicle intake fields, Twilio provisioning, GDPR erasure)
- [ ] Phase 4: Multi-Tenant White-Label Portal (subdomain routing, shop management, impersonation — for parts distributors / multi-location groups / chains)
- [ ] Phase 5: Analytics Dashboard (call/chat volume, AI booking rate, **recovered-revenue estimate**, top unanswered, missed-call reduction)

### v2 mechanic pivot — open items
- [x] **Pricing decided 2026-05-16** — €59 + €10/mechanic; no founding discount; 30-day trial unchanged (see [[QueueUp Overview#Pricing]])
- [ ] **Billing migration** — update Stripe products + DB price config from legacy €25+€5 to v2 €59+€10; grandfather existing customers
- [ ] **Price-review checkpoint** — calendar 2026-11-16 OR customer #25, whichever first; review whether to raise to €79/€89
- [ ] Create `/booking/demo-mechanic` demo shop (current demo is barber) — public booking page + seeded shop record + voice number provisioned
- [ ] Service catalog seed data for demo-mechanic: oil change, brake pads (front/rear), brake disc, alignment, diagnostic fee, AC service, timing belt, tires (mount + balance), MOT prep
- [ ] Vehicle intake field collection — AI must ask year / make / model / complaint at minimum; license plate, VIN, mileage as optional configurable fields
- [ ] Croatian male ElevenLabs voice ID — neutral mechanic-shop demeanor; test 3 candidates against a sample script
- [ ] AI persona guardrail audit — confirm system prompt + tool list prevent quoting parts/labor outside the service catalog and prevent any repair diagnosis
- [ ] First-call script test: walk into 5 shops near Zagreb with phone demo, measure objections (depends on demo-mechanic + Croatian voice)

## Ideas
- Multi-language booking page
- Recurring appointments
- Waitlist feature
- Customer reviews/ratings
- Mobile app (React Native)
