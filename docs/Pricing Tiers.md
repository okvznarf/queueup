# Pricing Tiers — v3 Multi-Vertical Launch

**Status:** **LOCKED — 2026-05-16 (mechanic, barber, dentist tiers + usage-based protection model).** Estimates marked *⚠️ estimate* should still be validated post-lock if traction signal is off.
**Goal:** lock pricing per vertical before pack format work begins, so the `pricing` field in each pack and the Stripe products billing logic depends on are stable.

## Billing Model: Single Product + Usage-Based AI Protection

**Locked 2026-05-16 (Option B).** Each subscription includes a monthly quota of AI-handled calls. Calls over the quota are billed as overage at a per-call rate. Single product, single sales pitch, one Stripe relationship per customer. The meter protects margin from variable AI API costs (Twilio + Deepgram STT + Claude + ElevenLabs TTS).

**Why this model, not split tiers (Option A) or AI add-on (Option C):**
- One product to sell, build, and support
- "Insurance against missed calls" pitch stays intact
- Heavy users automatically pay more (expansion revenue baked in)
- Industry-standard pattern (Twilio, SendGrid, Vercel, Cloudflare all do this)
- Splitting tiers later is easy if data justifies it; reversing a tier split is hard

**Billable AI call definition (platform-wide, may move into pack later):**
- AI-handled call >30 seconds with >1 AI turn (filters out hangups + immediate escalations)
- Counted per shop per billing month
- Resets at Stripe billing-period boundary
- Visible in admin dashboard usage widget

**Customer experience:**
- Sign up → flat subscription price → AI receptionist included up to quota → overage billed at per-call rate if exceeded
- Dashboard usage widget: "247 of 300 calls used this month"
- Email alerts at 80% and 100% usage so customers are never surprised
- (Future) "Upgrade plan" button for shops consistently in overage — flat bump to higher quota

**Implementation scope:** ~1-2 weeks. `VoiceCall` table already counts calls; needs a billing-period query, Stripe metered component per base product, dashboard widget, alert cron. Tucks into the Phase A billing work.

---

## Cross-Vertical Defaults (apply to all 3 tiers)

| Setting | Value | Reasoning |
|---|---|---|
| **Trial** | 30 days, no card required | Existing legacy default. SMB SaaS norm. Don't change in v3. |
| **Currency** | EUR (single currency v1) | Croatia is in eurozone since 2023. Multi-currency = Phase B work. |
| **Billing cadence** | Monthly + annual (annual = 2 months free) | Annual lifts retention and cash. 2-months-free is the standard SaaS framing. |
| **Founding discount** | None | Decided 2026-05-16 (morning) for mechanic; carry forward. Single clean list price is easier to sell than "we'll cut you a deal." |
| **Existing legacy customers** | Grandfathered at current €25 + €5 | Don't migrate retroactively. |
| **Per-unit definition** | "Active staff seats" — counted from Staff table where `isActive = true` | Already in code, no migration. |

---

## Mechanic Tier

**Recommended:** €59 base + €10/mechanic, **300 AI calls/mo included, €0.50/call overage** — *unchanged from this morning's now-reopened decision; quota + overage added 2026-05-16.*

| Shop size | Monthly | Annual (2mo free) |
|---|---|---|
| 1 mechanic | €69 | €690 |
| 2 mechanics | €79 | €790 |
| 3 mechanics | €89 | €890 |
| 5 mechanics | €109 | €1,090 |

**Typical Croatian mechanic shop size:** *⚠️ estimate* — 2-3 mechanics. Family-run shops dominate; chains and dealer service centers are larger but a different ICP.

**Blended ARPU (assuming 50% 2-mech, 35% 3-mech, 15% 1-mech):** **€80**

**Customers for €5K MRR:** **63** (~5 closes/month over 12 months)

**Recovered-revenue pitch:**
- 1 oil change recovered (€70) = ~1 month of subscription
- 1 brake job recovered (€300) = ~4 months
- 1 clutch job recovered (€800) = ~10 months
- Cold-pitch script: *"It's €59 plus €10 per mechanic. How many calls did you miss last week? At €200 per brake job, you tell me if it's worth it."*

**Competitive context:** *⚠️ estimate* — No Croatian competitor doing AI voice + booking for mechanics. International (Shopmonkey, Tekmetric) are >€200/mo and English-only, not relevant.

**Risks:**
- Mechanic booking-model still unvalidated (multi-day workflow may shift product from booking to status concierge — see [[Platform Strategy]] Phase A item 8). If status calls dominate, the *value* doesn't change but the *pitch* shifts from "book more cars" to "stop interrupting your day to answer 'is my car ready?'"
- 3-mechanic shop pays €89 — not yet pressure-tested against actual willingness to pay

**LOCKED 2026-05-16:** €59 + €10/mechanic. **300 AI calls/mo included. €0.50/call overage.**

**Margin math:**
- Typical 2-mech shop, 200 calls/mo: €79 revenue − ~€24 API cost = **€55 gross margin (~70%)**
- Heavy 2-mech shop, 600 calls/mo: €79 base + €150 overage = €229 revenue − ~€72 API cost = **€157 margin (~69%)**

---

## Barber Tier

**LOCKED 2026-05-16:** €29 base + €7/chair — *minor uplift from your €25 + €5 example.* **200 AI calls/mo included. €0.30/call overage** (lower than mechanic/dentist; barber market is price-sensitive).

**Margin math:**
- Solo barber, 150 calls/mo: €36 revenue − ~€18 API cost = **€18 gross margin (~50%)** — *thinnest of the three; structurally tight on this vertical regardless of model*
- Heavy solo barber, 400 calls/mo: €36 base + €60 overage = €96 revenue − ~€48 API cost = **€48 margin (~50%)**

| Shop size | Monthly | Annual |
|---|---|---|
| 1 barber (solo) | €36 | €360 |
| 2 chairs | €43 | €430 |
| 3 chairs | €50 | €500 |
| 5 chairs | €64 | €640 |

**Why uplift from €25 + €5:** at €25 + €5, a solo barber pays €30 — below the "psychological premium" line where buyers stop caring about the price difference. €36 is still impulse-affordable for a barber but signals "this is a real tool, not a side project."

**Typical Croatian barber shop size:** *⚠️ estimate* — 1-3 chairs. Solo "frizerski salon" is common in smaller cities; 2-3 chair shops dominate Zagreb.

**Blended ARPU (assuming 40% solo, 40% 2-chair, 20% 3-chair):** **€41**

**Customers for €5K MRR:** **122** — *roughly 2× the mechanic customer count.* This is the hardest vertical to hit MRR with.

**Recovered-revenue pitch (much weaker than mechanic):**
- 1 cut recovered (€15-25) = ~2-3 weeks of subscription
- 1 color recovered (€40-80) = 1-2 months
- Pitch frame shifts from "recovered revenue" to "saved time": *"Stop answering the phone during cuts. Stop losing walk-ins because the line is busy."*

**Competitive context:**
- **Booksy** is the dominant player in CEE for barber/beauty. *⚠️ estimate* — pricing around €30-50/mo for HR, dominant brand recognition. We are NOT going to outprice Booksy.
- Our wedge: AI voice receptionist in Croatian. Booksy does scheduling only, not call handling. That's the entire pitch.

**Risks:**
- Booksy lock-in is real. Most Zagreb barbers already on Booksy will not switch *just* for AI voice. v3 barber strategy may need to be "additive to Booksy" (we handle calls, push bookings into Booksy via integration) vs "replace Booksy." That's a product decision, not a pricing one — flagged for Phase A planning.
- Lower ARPU means barber pack must be the most polished AI prompt to justify the price/quality match — bad AI here is fatal because customers can easily switch back to "just answer the phone myself."

---

## Dentist Tier

**LOCKED 2026-05-16:** €99 base + €25/operatory. **400 AI calls/mo included. €0.50/call overage.**

**Margin math:**
- 1-op practice, 250 calls/mo: €124 revenue − ~€30 API cost = **€94 gross margin (~76%)** — healthiest tier
- Heavy 1-op practice, 600 calls/mo: €124 base + €100 overage = €224 revenue − ~€72 API cost = **€152 margin (~68%)**

| Practice size | Monthly | Annual |
|---|---|---|
| 1 operatory (solo dentist) | €124 | €1,240 |
| 2 operatories | €149 | €1,490 |
| 3 operatories | €174 | €1,740 |
| 5 operatories | €224 | €2,240 |

**Why per-operatory not per-dentist:** practices with hygienists, assistants, multiple dentists rotating across rooms — the operatory (treatment chair) is the actual booking constraint. Per-operatory matches their existing mental model from dental practice management software.

**Typical Croatian dental practice size:** *⚠️ estimate* — 1-2 operatories for private practices, 3-5 for established clinics.

**Blended ARPU (assuming 40% 1-op, 40% 2-op, 20% 3-op):** **€144**

**Customers for €5K MRR:** **35** — *easiest vertical to hit MRR with.* Half the customers of mechanic, third of barber.

**Recovered-revenue pitch (strongest of the three):**
- 1 cleaning recovered (€60) = ~½ month
- 1 filling recovered (€100-150) = ~1 month
- 1 root canal recovered (€300-600) = 2-5 months
- 1 implant recovered (€1,200+) = ~10 months
- Pitch frame: *"€124/mo. One recovered filling pays for the month. One recovered root canal pays for the quarter."*

**Competitive context:** *⚠️ estimate* — Croatian dental practices typically use general practice management software (some local, some adapted international). AI voice receptionist specifically is novel. Premium pricing aligns with what dental practices already pay for software (€80-200/mo for PM tools).

**Risks:**
- **GDPR special-category data** — health data has stricter requirements. AI transcripts of dental consultations may need additional consent flow, possibly separate retention rules. Legal check required before launching dentist pack. *Flagged as Phase A blocker.*
- **Sales cycle is slower** — dentists are more deliberate buyers. 30-day trial may need to be 60-day for this segment, or sales touchpoints during trial.
- **AI prompt risk is highest** — dentist receptionist needs formal register, awareness of clinical terminology without giving medical advice, careful handling of pain/urgency triage. "AI says wrong thing about a tooth" is bigger downside than "AI says wrong thing about an oil change."

**Rationale for not going higher (e.g., €119 + €30):** easier to raise prices than lower them, and we want first dental customers signed at a price point that doesn't trigger procurement-style evaluations.

**Price-review trigger:** if 5+ dental practices sign within first 30 days at €124-174/mo without price pushback, test €119 + €30 for new sign-ups.

---

## Cross-Vertical Summary

| Vertical | Base | Per-unit | Unit | Included AI calls/mo | Overage | Blended ARPU | Customers for €5K MRR | Sales difficulty |
|---|---|---|---|---|---|---|---|---|
| Mechanic | €59 | €10 | mechanic | 300 | €0.50 | €80 | 63 | Medium |
| Barber | €29 | €7 | chair | 200 | €0.30 | €41 | 122 | Hardest (Booksy) |
| Dentist | €99 | €25 | operatory | 400 | €0.50 | €144 | 35 | Slowest cycle, easiest MRR |

**Mixed-vertical path to €5K MRR (illustrative):**
- 20 mechanics × €80 = €1,600
- 40 barbers × €41 = €1,640
- 13 dentists × €144 = €1,872
- **Total: €5,112 MRR across 73 customers.**

Vs single-vertical:
- Mechanic-only: 63 customers
- Barber-only: 122 customers
- Dentist-only: 35 customers

**Takeaway:** dentist gives fastest MRR-per-customer; mechanic is the workhorse; barber is the slowest but highest-volume. Cold outreach effort should weight accordingly — going hardest into dentists per sales hour is the highest-EV play *if* the GDPR check passes.

---

## Decisions Status

| # | Decision | Status |
|---|---|---|
| 1 | Mechanic €59 + €10/mechanic | **LOCKED 2026-05-16** |
| 2 | Barber €29 + €7/chair | **LOCKED 2026-05-16** |
| 3 | Dentist €99 + €25/operatory | **LOCKED 2026-05-16** |
| 4 | Annual = "2 months free" | Implicit yes, confirm before Stripe products created |
| 5 | Dentist GDPR check (special-category data) | **Phase A blocker** — owner: founder (no one else can decide) |
| 6 | Cold outreach weighting (equal vs dentist-heavy EV) | Deferred until packs ship; revisit during marketing-site work |

---

## What Happens Once These Are Locked

- Stripe: create 6 products (3 verticals × monthly+annual), 3 metered components for per-unit pricing
- Billing logic: `Shop.businessType` → lookup pack → read `pricing` field → match Stripe product
- Pack format design (next session): `pricing` field shape in each pack file
- Cold outreach copy: per-vertical price callout in pitch scripts
- Marketing site: per-vertical pricing page

---

## Links
- [[Platform Strategy]] — multi-vertical Phase A plan
- [[QueueUp Overview]] — stale, pending rewrite
- [[Roadmap]] — stale, pending rewrite
