# QueueUp AI Receptionist

## What This Is

A white-label AI receptionist product for dental, GP, physio, and similar healthcare clinics. It handles inbound phone calls and web chat 24/7 — booking appointments, answering FAQs, and collecting patient intake info — using Claude as the AI brain, ElevenLabs for voice, and Twilio for telephony. Sold wholesale to SaaS resellers who white-label and resell it to their clinic customers.

## Core Value

A clinic patient can call or chat at any hour and get their appointment booked without waiting for a human — as naturally as talking to a real receptionist.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Patient can book an appointment via voice call (inbound Twilio → Claude → ElevenLabs TTS)
- [ ] Patient can book an appointment via web chat widget (embeddable JS snippet)
- [ ] AI checks real availability from QueueUp booking system before confirming
- [ ] Patient can reschedule or cancel an existing appointment via voice or chat
- [ ] AI answers clinic-specific FAQs (hours, location, pricing, services, insurance)
- [ ] AI collects patient intake info (name, DOB, phone, email, reason for visit, insurance)
- [ ] Intake data is saved against the appointment in QueueUp
- [ ] AI hands off to human staff when patient requests it or AI is uncertain
- [ ] Reseller admin can create, configure, and manage clinic accounts in a white-label portal
- [ ] Reseller can set portal branding (logo, colors, subdomain)
- [ ] Clinic admin can configure AI (greeting, FAQs, voice, escalation rules) via portal
- [ ] Clinic admin can provision a Twilio phone number per clinic
- [ ] Clinic admin can embed the chat widget on their website (one-line snippet)
- [ ] Clinic admin can configure intake form fields
- [ ] Clinic admin can view analytics (call/chat volume, AI booking rate, top questions)
- [ ] GDPR consent shown before first chat message and disclosed on voice calls
- [ ] Patient conversation transcripts auto-deleted after configurable period (default 90 days)
- [ ] Clinic admin can delete a patient's data on request

### Out of Scope

- SMS / WhatsApp / Email channels — v2 after MVP validates voice + chat
- Multi-language support — English only for v1
- EMR/PMS integrations (Dentrix, Eaglesoft) — QueueUp-native only for v1
- HIPAA compliance — GDPR first; HIPAA needed for US market expansion (v2)
- AI clinical advice or treatment explanations — out of scope permanently for liability reasons
- Outbound calling or proactive outreach — v2

## Context

- **Existing platform:** QueueUp is a live Next.js + Prisma + PostgreSQL booking SaaS with admin dashboard, customer auth, booking flow, and email reminders via SendGrid. The AI Receptionist is a new product that integrates with QueueUp's booking APIs.
- **Tech stack:** Next.js App Router, TypeScript, Tailwind, PostgreSQL, Prisma 7, custom JWT auth. The reseller portal will be a separate Next.js app (or a new section in the monorepo).
- **AI stack chosen:** Claude (claude-sonnet-4-6) as brain, ElevenLabs for STT/TTS, Twilio for telephony and phone number provisioning.
- **Distribution model:** Resellers white-label and sell to clinics at markup. We charge resellers $49/$99/$199/clinic/month wholesale.
- **Primary market:** EU clinics (GDPR-compliant from day 1). US expansion with HIPAA in v2.
- **Codebase map:** `.planning/codebase/` documents current QueueUp architecture.

## Constraints

- **Tech stack:** Must integrate with existing QueueUp booking APIs (availability, appointments, intake) — no separate booking engine
- **Compliance:** GDPR-compliant before any EU clinic goes live — consent flows, retention policies, data deletion
- **Voice latency:** Patient-facing voice responses must feel natural — target < 2 second turn latency
- **Reseller portal:** Must be white-labelable — no QueueUp branding visible to end clinics
- **Budget:** Twilio + ElevenLabs + Anthropic API costs must fit within per-clinic pricing margins

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Claude as AI brain | Already in use in QueueUp (outreach agent), team familiar with API | — Pending |
| ElevenLabs for voice | High-quality TTS/STT, natural conversation feel | — Pending |
| Twilio for telephony | Industry standard, supports phone provisioning + Media Streams | — Pending |
| QueueUp-native integration only (v1) | Avoid PMS integration complexity; validate core AI value first | — Pending |
| Separate white-label portal | Resellers need unbranded portal — can't expose QueueUp admin UI | — Pending |
| GDPR first, HIPAA v2 | EU market first; HIPAA adds significant compliance overhead | — Pending |
| Per-clinic monthly SaaS | Predictable recurring revenue; resellers understand per-seat pricing | — Pending |

---
*Last updated: 2026-03-28 after initialization*
