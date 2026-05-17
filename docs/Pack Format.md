# Vertical Pack Format

**Status:** v1 shape locked — 2026-05-16. Implemented at `src/lib/verticals/`.
**Purpose:** Define how a "vertical pack" is structured, loaded, and consumed by the rest of the app. Each `Shop.businessType` resolves to one pack; the pack drives pricing, UI labels, booking model, intake fields, default service catalog, and AI receptionist behavior.

---

## Why TypeScript Module (Not JSON)

Considered: JSON config, YAML, TypeScript module, hybrid.

**Chosen: TypeScript module.** Reasoning:
- **Type safety end-to-end.** A typo in `bookingModel` is a build error, not a runtime crash on a customer call.
- **IDE autocomplete when authoring.** Writing a new pack feels like writing strongly-typed code.
- **AI tool schemas stay typed.** `AiToolName` is a discriminated union — Claude tool definitions get checked against the registry.
- **No JSON parse step at request time.** Packs are static modules; the loader is a registry map lookup.
- **Can import Anthropic SDK / Stripe types directly** if we want richer tool schemas or product references later.

Tradeoff accepted: **only engineers can author packs.** When/if a non-engineer pack editor becomes valuable (Phase B+ feature), we extract a JSON form *generated from* the TS modules — TS stays the source of truth, JSON becomes a view layer.

---

## File Layout

```
src/lib/verticals/
├── index.ts              # Loader: getPack(), requirePack(), registry, supportedBusinessTypes()
├── types.ts              # VerticalPack interface and all sub-types
├── mechanic/
│   └── index.ts          # mechanicPack: VerticalPack (skeleton — content placeholders)
├── barber/
│   └── index.ts          # barberPack: VerticalPack
└── dentist/
    └── index.ts          # dentistPack: VerticalPack
```

Each vertical is a directory (not a single file) so future pack expansion (separate `prompt.ts`, `tools.ts`, `services.ts` files per pack) doesn't require a rename. For now everything is in `index.ts` per pack — split when a file passes ~400 lines or when a sub-concern (e.g., AI prompt) is being iterated heavily and benefits from isolation.

---

## What a Pack Defines

See [src/lib/verticals/types.ts](../src/lib/verticals/types.ts) for the canonical shape. Summary:

| Field | Type | Purpose |
|---|---|---|
| `slug` | `BusinessType` | Enum value matching Prisma `Shop.businessType` |
| `displayName` / `displayNamePlural` | `string` | UI strings ("Auto repair shop", "Auto repair shops") |
| `pricing` | `PricingTier` | base + perUnit + unit label + ARPU + customers-for-target-MRR + Stripe product IDs |
| `labels` | `UiLabels` | Override Shop default `serviceLabel`/`staffLabel`/`bookingLabel` |
| `bookingModel` | `"FIXED_SLOT"` \| `"DROP_OFF_WINDOW"` \| `"QUEUE"` | Drives booking page UI + AI tool selection |
| `intake` | `IntakeSchema` | Which booking-form fields to show + custom fields list |
| `defaultServices` | `DefaultService[]` | Seeded into `Service` table on shop creation |
| `ai` | `AiConfig` | System prompt template, voice persona, allowed tools, escalation triggers, greeting, language |
| `pitch` | `MarketingCopy` | Headline, value props, cold-outreach line, recovered-revenue framing |
| `blockers` | `string[]?` | Known issues that must close before pack ships (not runtime — for tracking) |

### Pricing

Stored at `pricing.base` (EUR/month) + `pricing.perUnit` (EUR per `unitLabel`). The `unitLabel` is what gets counted in billing: `mechanic` for mechanic pack (= `Staff` count), `chair` for barber, `operatory` for dentist. **Per-operatory** for dentist matches dental practice management software convention (operatory = treatment chair, the actual booking constraint).

**Usage-based AI protection (Option B, locked 2026-05-16):** each pack defines `includedAiCallsPerMonth` (300 / 200 / 400 for mechanic / barber / dentist) and `overageRateEur` (€0.50 / €0.30 / €0.50). Calls beyond the included quota are billed via Stripe metered component. Single product, single sales pitch — the meter just protects margin from variable Twilio + STT + Claude + TTS costs.

`stripeProductIds` has three fields (`monthly`, `annual`, `overage`) all `null` in current skeletons — get filled in once Stripe products are created.

`blendedArpuEur` and `customersForTargetMrr.count` are derived numbers (documented for reference, not used at runtime). Single source of truth: [Pricing Tiers.md](./Pricing%20Tiers.md).

### AI System Prompt Template

`ai.systemPromptTemplate` is a string with `{{handlebarish}}` placeholders that get filled in by voice-service when building the per-call system prompt:
- `{{shopName}}` — from Shop.name
- `{{serviceCatalogJson}}` — current active services
- `{{workingHoursJson}}` — current working hours
- `{{staffJson}}` — current active staff

Skeleton prompts are **placeholders** — real AI prompt work is the long pole of Phase A and happens vertical-by-vertical with real test calls.

### AI Tools

`ai.tools` is a list of `AiToolName` strings. The set of available names is the discriminated union in `types.ts`:
- `book_appointment` (slot-based)
- `book_dropoff` (multi-day)
- `check_availability`
- `check_repair_status` (mechanic-specific)
- `request_quote` (mechanic-specific)
- `cancel_appointment`
- `lookup_customer`
- `request_callback`

The implementation of each tool lives in `voice-service/src/handlers/bookingTools.ts` (and equivalent for chat). The pack declares *which* tools are exposed to Claude per session, not the implementation.

Adding a new tool: update `AiToolName` in `types.ts`, add the case to `bookingTools.ts`, add the name to whichever packs need it.

### Booking Model

Drives two things downstream:
1. **Booking page UI** — `FIXED_SLOT` shows a calendar grid; `DROP_OFF_WINDOW` shows day-only with no time picker; `QUEUE` (future) shows current queue length + ETA.
2. **AI tool exposure** — `DROP_OFF_WINDOW` uses `book_dropoff`; `FIXED_SLOT` uses `book_appointment`.

Schema impact is minimal: `Appointment.startTime`/`endTime` already support time-of-day strings; drop-off model treats those as "anytime that day."

---

## Loader

```typescript
// src/lib/verticals/index.ts

export function getPack(businessType: BusinessType): VerticalPack | null
export function requirePack(businessType: BusinessType): VerticalPack  // throws
export function supportedBusinessTypes(): BusinessType[]
```

- `getPack` returns `null` for `BusinessType` values without a v3 pack (RESTAURANT, SALON, SPA, FITNESS, VETERINARY, OTHER). Callers MUST handle the null case — usually by treating the shop as "legacy" and using the existing generic flow.
- `requirePack` throws if no pack — use in code paths where pack availability is guaranteed (post-onboarding flows).
- `supportedBusinessTypes` returns the list of launchable verticals — drives the sign-up flow's business-type chooser dropdown.

Registry lives in `index.ts` as a `Partial<Record<BusinessType, VerticalPack>>` — adding a new vertical is a 2-line change.

---

## Override Semantics (Per-Shop Customization)

Packs are **defaults**, not absolute. Individual shops may customize at the edges:
- **UI labels** — `Shop.serviceLabel`/`staffLabel`/`bookingLabel` exist on the model already. Pack provides defaults; shop overrides win.
- **Service catalog** — `pack.defaultServices` is seeded into the `Service` table once at shop creation. After that, the shop's services are the source of truth (admin dashboard CRUDs them).
- **AI greeting** — for v1, pack `ai.greeting` is the source of truth. If shop-level greeting customization becomes a requested feature, add `Shop.aiGreetingOverride` later.
- **System prompt** — for v1, pack prompt is the source of truth. Shop-level prompt overrides are deferred to Phase B (would require a `Shop.aiPromptOverride` field and a merge strategy).
- **Pricing** — packs define list pricing; `Shop.monthlyPrice` is the actual billed amount (grandfathered legacy customers stay at their old price even when their `businessType` resolves to a v3 pack).

Rule: shop fields beat pack defaults when both exist.

---

## Integration Points

### `/api/internal/shop-context` (voice-service consumer)
Updated 2026-05-16: response now includes `pack` field with `slug`, `bookingModel`, `intake`, and `ai.{systemPromptTemplate, voicePersona, tools, escalationTriggers, greeting, language}`. `null` if shop has no v3 pack. Voice-service uses this to build the per-call system prompt and to register the right tool set with Claude.

### Sign-up flow (future)
`supportedBusinessTypes()` drives the dropdown. On submit:
1. Create `Shop` with selected `businessType`
2. Look up pack
3. Apply pack labels to Shop (`staffLabel`, `serviceLabel`, `bookingLabel`)
4. Seed `pack.defaultServices` into `Service` table
5. Set `Shop.monthlyPrice = pack.pricing.base + pack.pricing.perUnit * employeeCount`
6. Set intake field flags (`showVehicleInfo`, `showPartySize`, etc.)

### Billing engine (partial, 2026-05-16)
- **Library**: `src/lib/stripe.ts` wraps the SDK with `createStripeCustomer`, `setupProductsForPack`, `findProductByPackKind`, `createSubscription`, `pushOverageUsage`.
- **Setup script**: `npm run setup-stripe` creates Products + Prices for every pack idempotently. Products are tagged with `qu_pack` + `qu_kind` metadata so code finds them by metadata (no hardcoded IDs required in the pack files).
- **Onboarding integration**: `/api/onboarding/setup` now creates a Stripe Customer per shop (non-blocking — if Stripe is misconfigured, onboarding still succeeds).
- **Webhook endpoint**: `/api/webhooks/stripe` validates signatures and handles `customer.subscription.{created,updated,deleted}`, `invoice.payment_{succeeded,failed}`, `customer.deleted`. Syncs subscription state to `Shop.subscriptionActive` + `paidUntil`.
- **Schema**: `Shop.stripeCustomerId` + `Shop.stripeSubscriptionId` added; both unique.

**Still missing for end-to-end billing:**
- Card collection UI (Stripe Elements checkout component) — required before any subscription can be created.
- Trial-end flow: 7-day pre-trial-end email, "add card to continue" page, auto-cancel if no card.
- `createSubscription` is wired in the library but not yet called from anywhere — needs a route that consumes a `payment_method` after card capture.
- Overage usage cron — should run at billing period end and call `pushOverageUsage` per shop. Trivial once subscription IDs are populated.
- `stripeProductIds` field in pack files: still `null`. Setup script output prints the resolved IDs if you want to paste them in for documentation; runtime lookup uses metadata so it's optional.

### Booking page renderer
On page load, fetch shop, look up pack, switch booking model (slot picker vs day picker), render intake form using `pack.intake.customFields`.

### Admin dashboard
Use pack labels for headings ("Mechanics" not "Staff" for a mechanic shop).

---

## Decision Log

| Date | Decision |
|---|---|
| 2026-05-16 | TypeScript module format chosen over JSON |
| 2026-05-16 | Directory-per-pack (not single-file) so future split is rename-free |
| 2026-05-16 | `getPack` returns `null` for unsupported types; `requirePack` throws — explicit handling at call sites |
| 2026-05-16 | Per-shop overrides win over pack defaults; pack is "starter config" |
| 2026-05-16 | System prompt + tool registry live in pack; tool *implementations* live in voice-service |
| 2026-05-16 | Operatory (not dentist) is the dentist billing unit — matches dental PM software convention |
| 2026-05-16 | Usage-based AI protection (Option B) added to PricingTier: included call quota + overage rate per vertical |
| 2026-05-16 | Stripe integration foundation: lib wrapper, setup script, Customer creation in onboarding, webhook skeleton. Subscription creation + card collection UI pending. |

---

## What's Next After This

The format is done. Remaining Phase A work in priority order:

1. **Mechanic booking-model validation** — call 5-10 Zagreb shops, decide if `DROP_OFF_WINDOW` is right or if status-call concierge becomes primary. Blocks finalization of mechanic pack content.
2. **Stripe products** — create 6 products (3 verticals × monthly+annual), fill in `stripeProductIds` per pack.
3. **Sign-up flow with business-type chooser** — `supportedBusinessTypes()` is ready to consume.
4. **AI prompt content** per vertical — replace placeholder prompts with iterated, tested prompts. ~5-10 weeks total (long pole). Start with whichever vertical has the demo shop ready first.
5. **Booking page renderer: drop-off variant** — current renderer is fixed-slot only; needs day-picker variant for mechanic.
6. **Voice-service consumes pack from `/api/internal/shop-context`** — currently the endpoint returns the pack, but voice-service doesn't read the new fields yet. Wire-up needed in `claudeSession.ts` and `bookingTools.ts`.
7. **Demo shops × 3** — `/booking/demo-mechanic`, `/booking/demo-barber`, `/booking/demo-dentist`. Use the seeded `defaultServices` as starting content.

---

## Links
- [[Platform Strategy]] — multi-vertical Phase A plan
- [[Pricing Tiers]] — locked pricing per vertical, single source of truth
- [[Architecture]] — codebase layout
- [[Database Schema]] — Shop / Appointment models the pack drives
- [[AI Receptionist]] — voice-service architecture (pack consumer)
