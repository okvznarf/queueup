# Platform Strategy: Multi-Vertical v1 Launch

**Status:** Decision locked — 2026-05-16 afternoon. Supersedes the 2026-05-16 morning mechanic-only pivot and the earlier healthcare-clinic positioning.
**Decision context:** QueueUp v1 ships as a **multi-vertical AI receptionist platform** launching with three vertical packs: **mechanic, barber, dentist.** Pricing is reopened — each vertical gets its own subscription tier. Sign-up flow lets businesses choose their type and gets defaults applied automatically.

---

## Core Insight

The QueueUp codebase is **already multi-vertical-ready**:
- `Shop.businessType` exists (barber, spa, restaurant, …)
- `Appointment` model has `vehicleInfo`, `licensePlate`, `partySize` as multi-industry fields
- `serviceLabel`/`staffLabel` are per-shop customizable UI labels
- Booking page and admin dashboard already render generically

The earlier "mechanic-only" framing was a go-to-market choice on top of a platform that was already generic. The afternoon pivot recognizes this and commits to shipping the multi-vertical surface as the v1 product, not just the v1 codebase.

What this changes vs single-vertical:
- **Three AI personas to build well, not one** — this is the hardest constraint. Mediocre AI in any pack kills word-of-mouth in a 4M-person market.
- **Sign-up flow becomes a real feature** — business type dropdown → pack defaults → live booking page + AI receptionist in 5 minutes.
- **Pricing per vertical** — Stripe products per tier, billing logic aware of which pack.
- **Marketing is vertical-by-vertical even with one product** — cold outreach always pitches by trade ("we built this for mechanics / barbers / dentists"), never "any business."

---

## Vertical Pack: What It Defines

A vertical pack is a config bundle that turns the generic platform into a specific trade's product. Each pack lives at `verticals/<slug>/` and is loaded by `Shop.businessType` at shop creation.

| Component | What it specifies | Mechanic | Barber | Dentist |
|---|---|---|---|---|
| **System prompt** | AI persona, terminology, tone | Croatian male, mechanic vocab, plate/VIN | Croatian female, stylist prefs, service type | Croatian female, formal register, insurance/recall aware |
| **Intake schema** | Booking fields collected | plate, make/model, symptom | service, preferred stylist, hair length | reason for visit, last cleaning date, insurance |
| **Service templates** | Default catalog with pricing hints | Oil+filter 70€, brake pads 90€, alignment 50€ | Cut 15€, color from 40€, beard trim 10€ | Cleaning 60€, filling from 80€, consult 30€ |
| **Booking model** | How appointments are structured | drop-off window (multi-day) | fixed slot (30-60min) | fixed slot (30-90min) + recall |
| **Tool surface** | AI tools exposed | `book_dropoff`, `check_repair_status`, `request_quote` | `book_slot`, `check_availability`, `cancel` | `book_slot`, `check_availability`, `request_recall_slot` |
| **Pricing tier** | Subscription | €59 base + €10/mechanic *(draft)* | €25 base + €5/chair *(draft)* | TBD — higher (per-room?) |
| **Sales pitch** | Marketing + outreach copy | "Telefon javlja umjesto vas dok ste pod autom" | "Više rezervacija, manje propuštenih poziva" | "Profesionalna recepcionerka 24/7, popuni rupe u rasporedu" |
| **Voice persona** | ElevenLabs voice + style | Croatian male, warm, casual | Croatian female, friendly, contemporary | Croatian female, professional, calm |

All pricing numbers above are drafts — each tier needs blended ARPU calc + customer-volume-to-MRR-target math before lock.

---

## Booking Model Variants

Three patterns cover the v1 verticals plus future expansion:

### 1. Fixed Slot
Customer books a specific time window. AI offers slots. **Used by:** barber, dentist, plus most future verticals (spa, restaurant, GP).

### 2. Drop-Off Window (*mechanic-shaped, still unvalidated*)
Customer reserves a *day*, not a time. Multi-day work is normal. Status calls dominate inbound, not booking calls.

**Validation still open:** Call 5–10 Zagreb mechanic shops, count call types (booking vs status vs quote). If status calls dominate (>50%), the mechanic pack's killer feature isn't the calendar — it's "AI knows your plate, tells you the car's waiting on parts, calls you back when done." That rewrites the mechanic tool surface (the `check_repair_status` and proactive callback tools become primary).

This validation should happen **before** the mechanic pack ships, because it affects the pack's tool design — not after.

### 3. Queue / Walk-In Hybrid
Customer joins a virtual queue, AI gives expected wait. Not in v1 scope. Reserved for future verticals (oil-change specialists, urgent-care clinics, barber drop-ins).

Schema impact: `Appointment` already supports flexible `startTime`/`endTime`. Drop-off model relaxes those into ranges and adds status fields. Queue model would add queue-position tracking. Migration-friendly.

---

## What Stays Shared (Platform)

These do not vary per vertical and represent ~85% of the codebase:
- Multi-tenant Shop infrastructure, auth, billing engine (per-tier pricing is config)
- Voice stack: Twilio Media Streams → Deepgram → Claude → ElevenLabs (see [[AI Receptionist]])
- Embeddable chat widget
- Customer accounts, generic booking page renderer
- GDPR consent flow, retention cron
- Reliability layer (circuit breakers, retries — see [[Reliability]])
- Outreach agent infrastructure (vertical swaps message templates, not the agent)
- Sign-up flow (one funnel, branches on business-type selection)
- Admin dashboard (uses `serviceLabel`/`staffLabel` for vertical-appropriate UI text)

The ~15% that varies per vertical *is* the vertical pack.

---

## Sequencing

### Phase A — Ship 3 Packs (current)
End-to-end multi-vertical launch with mechanic + barber + dentist packs live, sign-up flow choosing between them, billing wired per tier.

Estimated effort: **6-10 weeks** before launch-ready. Breakdown:
1. **Vertical pack format** — `verticals/<slug>/` directory layout + loader + override mechanism. ~1 week.
2. **Per-vertical pricing tiers + Stripe products** — billing logic, trial-to-paid per tier. ~3-5 days.
3. **AI prompts × 3 verticals** — system prompt + intake schema + tool definitions per pack. **Biggest unknown** — ~5-10 weeks total because each pack needs real iteration, not a templated prompt.
4. **Sign-up flow with business-type chooser** — UX, defaults application, onboarding. ~1-2 weeks.
5. **Marketing site reset** — vertical landing pages + generic homepage funnel + cold-outreach copy per vertical. ~1 week.
6. **Outreach agent retargeted** — per-vertical scripts and lead lists.
7. **Demo shops × 3** — `/booking/demo-mechanic`, `/booking/demo-barber`, `/booking/demo-dentist` for sales.
8. **Mechanic booking-model validation** (parallel) — 5-10 phone calls to Zagreb shops; outcome rewrites mechanic pack tool surface before it ships.

Sequencing within Phase A: items 1-2 (pack format + billing) unblock everything else. AI prompts (item 3) is the long pole — start early, iterate continuously. Sign-up flow + marketing wait until at least one vertical pack feels good. Mechanic validation (item 8) happens during weeks 1-2 so its outcome lands before mechanic prompts solidify.

### Phase B — Scale (post-launch)
After Phase A ships:
- Add verticals based on demand signal, not speculation (someone with a working pack template + 1-week prompt iteration ≈ new vertical live)
- Tighten the worst-performing pack (whichever vertical converts lowest)
- Decide on Phase D-style fully self-serve sign-up vs human-assisted onboarding based on conversion data

---

## Acknowledged Tradeoffs

The afternoon pivot accepted these costs to gain multi-vertical TAM:
- **Time to first customer: ~6-10 weeks vs ~1-2 weeks** for mechanic-only path
- **AI quality risk multiplied 3×** — three personas to nail, one mediocre persona is enough to hurt reputation
- **Sales pitch flattens horizontally** — mitigated by always pitching vertical-by-vertical in outreach, never "any business"
- **Pricing complexity** — three tiers, three Stripe products, vertical-aware billing logic
- **Strategic pivot frequency concern** — three positionings in 30 days (healthcare → mechanic → multi-vertical). If a fourth pivot surfaces before any of these are validated in market, that's a signal to slow down and ship rather than re-strategize.

---

## Open Questions

- [ ] **Mechanic booking model validation** — call 5–10 Zagreb shops, count call types. Outcome rewrites the mechanic pack's tool surface. Should happen weeks 1-2 of Phase A. Owner: ?
- [ ] **Pricing tiers locked per vertical** — mechanic draft €59+€10/mechanic, barber draft €25+€5, dentist TBD. Need blended ARPU + MRR-target math per tier. Decide before billing implementation.
- [ ] **Croatian competitor scan** — one-hour task. Confirm "uncongested Croatian market" claim against Bookio (SK), Reservio (CZ), Booksy (PL/CEE), Booked (local).
- [ ] **Pack format** — JSON config vs TypeScript module vs hybrid. Decide first; affects every pack written after.
- [ ] **Dentist regulatory check** — does Croatian healthcare law restrict AI handling of medical bookings? GDPR special-category data implications.
- [ ] **Outreach pacing** — start cold outreach in any vertical before all three packs are done, or wait until full launch? Earlier outreach = earlier feedback but rougher demos.

---

## Links
- [[QueueUp Overview]] — needs rewrite for multi-vertical positioning (still mechanic-positioned)
- [[Roadmap]] — needs rewrite for multi-vertical phasing
- [[Architecture]] — current code structure (already multi-vertical-capable)
- [[Database Schema]] — already-multi-vertical models
- [[AI Receptionist]] — voice/chat stack (shared)
- [[Outreach Agent]] — needs per-vertical script support
