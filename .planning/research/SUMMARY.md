# Project Research Summary

**Project:** QueueUp AI Receptionist
**Domain:** AI voice + web chat receptionist SaaS for EU healthcare clinics (dental, GP, physio), with white-label reseller distribution
**Researched:** 2026-03-28
**Confidence:** MEDIUM-HIGH

## Executive Summary

QueueUp AI Receptionist is a real-time voice and chat AI layer that sits in front of the existing QueueUp booking engine. The product answers inbound clinic phone calls 24/7, collects patient intake, books/reschedules/cancels appointments by calling the existing QueueUp API, and handles FAQs — all without human staff. A parallel web chat widget provides the same capability embedded on clinic websites. The product is distributed through resellers who white-label a multi-tenant portal to manage multiple clinic accounts. The technology stack combines Twilio Media Streams (inbound telephony), Deepgram Nova-2 (streaming STT), ElevenLabs turbo TTS (streaming), and Claude claude-sonnet-4-6 with tool use — a well-established pattern used by voice AI companies such as Vapi and Retell, built in-house to avoid their per-minute markup and to enable true white-labeling.

The single most important architectural decision is that the real-time audio pipeline cannot run on Vercel serverless. Twilio Media Streams requires a persistent WebSocket for the full call duration (2–10 minutes). The portal (Next.js) stays on Vercel; a separate long-lived Node.js process (Fastify + ws on Railway) handles all voice and chat WebSocket sessions. The two services communicate over HTTP: the orchestrator calls the existing QueueUp booking API as a tool-call consumer. This split must be established in Phase 1 — retrofitting it later causes a full rewrite of the voice layer.

The highest-risk dimension of this product is EU GDPR compliance. Voice recordings of patients discussing health conditions are special category data under Article 9, requiring explicit opt-in consent (not just a disclosure), per-clinic configurable retention TTLs, patient erasure workflows, and an immutable consent audit log. These are legal obligations for any EU clinic going live — not optional polish. GDPR infrastructure must be built in parallel with the core voice pipeline, not bolted on afterward. The second critical risk is latency: the STT → Claude → TTS pipeline can easily stack to 4–8 seconds without deliberate streaming optimization. The 2-second turn latency target requires streaming at every stage (Deepgram WebSocket, Claude SSE, ElevenLabs WebSocket) and sentence-boundary TTS firing before Claude finishes its full response.

---

## Key Findings

### Recommended Stack

The stack is a two-service architecture layered on top of the existing Next.js/Prisma/PostgreSQL portal. A new `voice-service` (Node.js, Fastify, ws) runs as a persistent process on Railway and handles all real-time audio. The existing portal on Vercel handles configuration, analytics, and reseller management. The two services communicate over HTTP; the voice-service calls QueueUp's existing booking REST endpoints as a tool-call executor.

**Core technologies:**

- **Twilio Media Streams** — real-time bidirectional audio over WebSocket; the only Twilio pattern that supports sub-2s AI response latency (TwiML `<Say>`/`<Gather>` is 2–5s per turn, insufficient for natural conversation)
- **Deepgram Nova-2 (streaming WebSocket)** — ~200–300ms STT latency for telephony audio; configured with `encoding=mulaw&sample_rate=8000` to accept Twilio audio directly; best-in-class for real-time telephony
- **ElevenLabs `eleven_turbo_v2_5` (streaming WebSocket)** — ~300–500ms time-to-first-audio; configured with `output_format=ulaw_8000` to produce Twilio-native audio without transcoding; most natural voice quality for healthcare
- **Claude claude-sonnet-4-6 with tool use** — already in project; drives conversation reasoning and calls booking tools; streaming SSE enables sentence-boundary TTS firing
- **Fastify + ws on Railway** — persistent Node.js WebSocket server; Railway selected over Vercel for long-lived connection support; Fastify preferred over Express for 2–3x higher throughput
- **Vanilla JS Shadow DOM widget** — embeddable web chat; framework-free to avoid conflicts with clinics' existing sites; under 10KB gzipped
- **Next.js App Router (existing)** — white-label portal with wildcard subdomain routing via middleware; reseller branding injected from database per hostname
- **PostgreSQL (existing)** — extended with new tables: Reseller, ClinicAccount, IntakeField, FAQ, ConversationSession, ConversationTurn

**Version notes:** `@deepgram/sdk ^3.x`, `elevenlabs ^1.x`, `@fastify/websocket ^9.x`, and `ws ^8.x` are from training data — verify current versions on npm before adding to package.json.

### Expected Features

**Must have (table stakes) — missing any of these causes immediate clinic churn:**
- Inbound call answering 24/7 — core AI loop (Twilio + ElevenLabs + Claude)
- Appointment booking via voice — availability check + write through existing QueueUp API
- Web chat widget with booking — embeddable JS snippet, WebSocket to orchestrator
- Human handoff / escalation — verbal or DTMF trigger; Twilio warm transfer
- Clinic FAQ answering — per-clinic knowledge base; structured Q&A
- GDPR verbal consent disclosure at call start — legally required before any EU patient interaction
- GDPR consent gate on web chat — banner before first message
- Patient identity verification for appointment changes — DOB + last name match
- Appointment booking confirmation email — via existing SendGrid integration
- Clinic admin portal — AI configuration (greeting, voice, FAQs, escalation)
- Twilio phone number provisioning — per-clinic dedicated inbound number
- Data retention auto-delete — configurable TTL cron, minimum 90-day default
- Patient data deletion (right to erasure, GDPR Article 17) — admin-triggered cascade delete
- AI self-identification as AI at call start — required by EU AI Act Article 52

**Should have (differentiators over Vapi/Retell/generic voice platforms):**
- Structured GDPR compliance out-of-the-box — EU clinics cannot risk DIY compliance; this is the strongest sales argument
- Per-clinic knowledge base editor — no-code FAQ CRUD for clinic admins
- Healthcare-specific intake forms — configurable field sets per specialty (dental, GP, physio)
- Confidence-based escalation rules — configurable uncertainty threshold and keyword triggers
- Call recording + transcript viewer — encrypted at rest, auto-deleted per retention policy
- White-label reseller portal — fully unbranded multi-tenant portal with subdomain, logo, colors
- Specialty templates — pre-configured AI personas for dental/GP/physio, reducing onboarding time
- Audit log for GDPR compliance — immutable append-only log of consent events and data access
- Analytics dashboard — call volume, booking rate, escalation rate, top FAQs

**Defer to v2+:**
- Patient identity verification for reschedule/cancel (requires careful identity design)
- Reschedule/cancel flow (blocked by identity verification)
- Reseller billing display (manual invoicing is acceptable at v1)
- Specialty templates (useful but not blocking)
- Dual-channel continuity (voice + chat session linking)
- EMR/PMS integrations (Dentrix, Eaglesoft) — each is a 2–4 week integration project
- Multi-language support — design schema to support it; implement in v2
- Outbound proactive calling — different compliance regime; defer entirely
- HIPAA compliance — US expansion problem; GDPR first

### Architecture Approach

The system has five runtime concerns that must be separated due to incompatible hosting requirements. The voice/chat orchestrator is a persistent Node.js WebSocket server (Railway) that manages audio pipelines, session state, and Claude tool execution. The white-label portal is a Next.js App Router app (Vercel) that provides multi-tenant configuration, analytics, and reseller management. The existing QueueUp booking API (Vercel) is consumed over HTTP by the orchestrator as a tool-call target. A CDN-delivered vanilla JS widget serves as the web chat client. PostgreSQL (shared or separate schema) stores transcripts, sessions, and GDPR audit logs.

**Major components:**
1. **Voice/Chat Orchestrator** (Railway, Node.js/Fastify/ws) — accepts Twilio Media Stream WebSockets and web chat WebSockets; runs the audio pipeline (Twilio mulaw → Deepgram STT → Claude tool use → ElevenLabs TTS → Twilio mulaw); manages per-session conversation state; executes tool calls against QueueUp API
2. **Audio Pipeline** (inside orchestrator) — sentence-streaming pattern: stream Claude tokens, fire ElevenLabs TTS on each sentence boundary without waiting for full Claude response; configure ElevenLabs `output_format=ulaw_8000` to eliminate transcoding latency
3. **Session Manager** (in-memory Map keyed by Twilio callSid / chat connectionId; Redis when scaling past one node) — holds conversation history, patient context, GDPR consent flag, booking state machine per session
4. **Tool Executor** (inside orchestrator) — maps Claude tool_use blocks to QueueUp REST API calls; loops until Claude returns text-only response; enforces 3-retry max per tool per turn
5. **White-Label Portal** (Vercel, Next.js) — wildcard subdomain routing via middleware; reseller and clinic CRUD; AI configuration UI; transcript viewer; analytics; Twilio number provisioning

**Key data model additions to existing QueueUp schema:** Reseller, ClinicAccount, IntakeField, FAQ, ConversationSession, ConversationTurn

### Critical Pitfalls

1. **Orchestrator on Vercel serverless** — Twilio Media Streams WebSocket lasts the full call (2–10min); Vercel serverless has 10-30s execution limits; calls drop mid-conversation silently; fix: architect the split (Railway for orchestrator, Vercel for portal) before writing any voice code.

2. **Latency stacking over 2s budget** — STT + Claude + TTS compounds to 4–8s without streaming; fix: use Deepgram WebSocket streaming, Claude SSE streaming, ElevenLabs WebSocket streaming, and fire TTS on first sentence boundary before Claude finishes; deploy orchestrator co-located with Twilio's media infrastructure.

3. **ElevenLabs audio format mismatch with Twilio** — ElevenLabs defaults to MP3/PCM at 22–44kHz; Twilio requires mulaw 8kHz; callers hear garbled noise; fix: configure `output_format=ulaw_8000` on ElevenLabs from day 1; always test via an actual phone call, never just browser audio.

4. **GDPR Article 9 — voice recordings are special category health data** — generic "calls may be recorded" disclosure is insufficient; requires explicit Article 9(2)(a) consent, withdrawal mechanism, consent timestamp logging, and per-clinic configurable retention; EU DPAs actively enforce this (€4.2B in fines 2018–2024); fix: build GDPR consent infrastructure before any EU patient touches the system.

5. **Booking race condition — simultaneous callers, same slot** — two callers pass availability check simultaneously; both book same slot; existing QueueUp SELECT FOR UPDATE pattern covers single-server but voice multi-process calls the HTTP API without shared idempotency store; fix: Redis idempotency store + database UNIQUE constraint on (shopId, staffId, startTime) + idempotency key per tool call derived from callSid + slot time.

6. **Multi-tenant context isolation** — phone number → clinic mapping cached incorrectly allows Clinic A patient to receive Clinic B's AI context and health data; fix: DB lookup per callSid at every WebSocket connect; clinicId validated server-side in every tool call; never accept clinicId from AI-generated content.

---

## Implications for Roadmap

Based on architectural dependencies and pitfall analysis, the research strongly implies a 6-phase build order. The hard constraint driving this order is: the orchestrator must exist before any feature that uses voice or chat can be built; GDPR infrastructure must exist before any EU patient touches a live system; the portal must exist before resellers can onboard.

### Phase 0: Existing Codebase Hardening
**Rationale:** Two pre-existing bugs will be amplified by voice launch and should be fixed before voice work begins. These are low-effort fixes that prevent costly debugging once audio pipelines are in play.
**Delivers:** Stable foundation for voice-layer development
**Addresses:** Timezone normalization bug (availability calculations use server local time, not shop timezone — booking errors via voice are worse than via web because patients are told wrong times verbally); Redis idempotency store migration (in-memory store does not survive multi-instance deployment)
**Avoids:** Pitfall 18 (timezone errors amplified by voice), Pitfall 7 (booking race condition)

### Phase 1: Orchestrator Core — Voice Pipeline
**Rationale:** This is the foundational runtime component. Nothing else in the product works without a functioning WebSocket orchestrator. Must be a long-lived Node.js process (not serverless) from the first line of code. Streaming must be wired in from day 1 — retrofitting non-streaming to streaming requires re-architecting the audio pipeline.
**Delivers:** A working end-to-end voice call that can book an appointment: patient calls → AI greets → patient states intent → AI books appointment → patient hears confirmation
**Addresses features:** Inbound call answering, appointment booking via voice, FAQ answering, human handoff, GDPR verbal consent disclosure, appointment confirmation email
**Avoids:** Pitfall 1 (serverless incompatibility), Pitfall 2 (latency stacking), Pitfall 3 (audio format mismatch), Pitfall 4 (stale availability), Pitfall 5 (GDPR consent), Pitfall 6 (tenant isolation), Pitfall 7 (race condition), Pitfall 8 (infinite tool loops), Pitfall 9 (barge-in), Pitfall 13 (state corruption)
**Stack:** Fastify + ws on Railway, Deepgram Nova-2, ElevenLabs turbo_v2_5, Claude claude-sonnet-4-6, Twilio Media Streams
**Research flag:** Needs Phase research — ElevenLabs SDK version and conversational WebSocket API shape need verification against current docs; Deepgram `endpointing` parameter values need measurement with real telephony audio

### Phase 2: Web Chat Widget
**Rationale:** The orchestrator already supports text sessions after Phase 1 (same WebSocket server, different channel type — no STT/TTS needed). Adding the chat widget is relatively cheap at this point and unlocks the second channel while voice is still being tested.
**Delivers:** Embeddable one-line script snippet that opens a WebSocket chat window; same Claude + tool call loop as voice; GDPR consent gate before first message
**Addresses features:** Web chat widget embed, appointment booking via chat, GDPR consent gate on chat
**Avoids:** Pitfall 12 (branding leakage — chat widget must use clinic branding, not QueueUp branding)
**Stack:** Vanilla JS, Shadow DOM, WebSocket (native browser API)
**Can parallelize with:** Phase 2 work on portal if teams are available

### Phase 3: Clinic Admin Portal — Configuration and Compliance
**Rationale:** Clinic admins need a portal to configure their AI before any real patients use it (greeting, voice, FAQs, escalation rules). GDPR deletion and retention TTL must be in the portal before any EU clinic can go live. This phase is also where Twilio phone number provisioning lives — required for any real deployment.
**Delivers:** Clinic admin portal with full AI configuration; GDPR Article 17 patient deletion; retention TTL config with auto-delete cron; call recording viewer; Twilio phone number provisioning
**Addresses features:** Clinic admin portal, AI greeting/persona config, knowledge base editor, voice selection, escalation rules, intake field builder, call recording + transcript viewer, GDPR retention, patient data deletion, Twilio number provisioning
**Avoids:** Pitfall 10 (EU phone regulatory bundles — start Twilio Regulatory Bundle approval here), Pitfall 15 (long greeting — enforce 40-word limit in UI)
**Stack:** Next.js App Router (existing), Prisma 7 (existing), Tailwind (existing)
**Research flag:** Standard patterns — Next.js admin panel is well-documented; no research phase needed

### Phase 4: White-Label Reseller Portal
**Rationale:** Reseller portal depends on the clinic portal (Phase 3) being complete. Resellers manage clinic accounts which must already exist. Subdomain routing depends on the portal app being deployed and tested.
**Delivers:** Fully white-labeled multi-tenant reseller portal; subdomain routing per reseller; clinic account CRUD by reseller; per-reseller branding (logo, color, subdomain); reseller-level analytics rollup; "view as clinic admin" impersonation; specialty templates (dental/GP/physio)
**Addresses features:** White-label reseller portal, reseller tiered billing display, subdomain routing, clinic account management, platform superadmin panel
**Avoids:** Pitfall 12 (QueueUp branding leakage — conduct branding audit before first reseller demo; check favicons, email footers, error pages, og:title tags)
**Stack:** Next.js middleware wildcard subdomain routing (existing), Prisma Reseller/ClinicAccount model additions
**Research flag:** Standard patterns — Next.js subdomain middleware is well-documented; no research phase needed

### Phase 5: Analytics Dashboard
**Rationale:** Analytics depend on clean transcript and session data (requires Phases 1–4 generating real data). Should not be built before the data pipeline is stable.
**Delivers:** Per-clinic analytics (call volume, booking rate, escalation rate, top FAQs, average call duration); reseller-level rollup; time-series trends
**Addresses features:** Analytics dashboard, reseller-level analytics rollup
**Stack:** PostgreSQL aggregation queries, existing admin dashboard patterns
**Research flag:** Standard patterns — no research phase needed

### Phase 6: Patient Identity Verification + Reschedule/Cancel
**Rationale:** Identity verification requires careful design that touches GDPR (DOB is personal data), patient trust, and edge cases (patient doesn't remember DOB, different caller than named patient). Deferring to a dedicated phase after the core loop is validated reduces risk. Reschedule and cancel are blocked by identity verification.
**Delivers:** Patient identity verification (DOB + last name match against existing patient record); reschedule existing appointment via voice/chat; cancel existing appointment via voice/chat
**Addresses features:** Patient identity verification, reschedule/cancel (deferred from v1 per FEATURES.md recommendation)
**Avoids:** Pitfall 4 (stale availability — re-check before confirming reschedule)
**Research flag:** May need research — identity verification UX patterns for voice are not well-standardized; edge cases need design exploration

### Phase Ordering Rationale

- Phases 0 and 1 are non-negotiable prerequisites. Phase 0 fixes latent bugs before they become voice bugs. Phase 1 establishes the only runtime that cannot change without a rewrite.
- Phase 2 (chat widget) can technically begin as soon as the orchestrator's text-channel session type is working, which is mid-Phase 1. If resources allow, overlap Phase 2 with the back half of Phase 1.
- Phase 3 (portal) is gated on Phase 1 being stable enough to configure. Clinic configuration must exist before Phase 4 (reseller portal) — resellers manage clinics, which must already exist.
- GDPR infrastructure (consent recording, retention TTL, patient deletion) is spread across Phases 1–3 because each component has a natural home: consent lives in the audio pipeline, retention config lives in the clinic portal. Do not defer all GDPR to a "compliance phase" — each piece must be built alongside the feature it governs.
- Phase 5 (analytics) and Phase 6 (identity verification) are the only phases that can be moved without breaking dependencies.

### Research Flags

Phases needing deeper research during planning:
- **Phase 1 (Orchestrator Core):** ElevenLabs Conversational AI WebSocket SDK shape and current model names need verification; Deepgram `endpointing` and `speechEndThreshold` parameter values should be tuned with real telephony audio before hardcoding; ElevenLabs `ulaw_8000` output format name should be confirmed against current docs
- **Phase 6 (Identity Verification):** Voice-based identity verification UX is not well-standardized; needs design research on failure modes (caller is not the patient, patient forgets DOB)

Phases with standard patterns (skip research-phase):
- **Phase 2 (Chat Widget):** Vanilla JS Shadow DOM widget is a well-documented web platform pattern
- **Phase 3 (Clinic Portal):** Next.js App Router admin panel with Prisma is the existing project pattern
- **Phase 4 (Reseller Portal):** Next.js middleware subdomain routing is well-documented; existing project already uses the framework
- **Phase 5 (Analytics):** Standard PostgreSQL aggregation on existing schema

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Core architecture (Twilio Media Streams, Deepgram, Claude tool use) is HIGH — well-established patterns. Specific library versions (ElevenLabs SDK, Deepgram SDK) are MEDIUM — training data cutoff August 2025; verify current npm versions before implementation |
| Features | MEDIUM | Table stakes and GDPR requirements are HIGH confidence (legal text is authoritative; competitor analysis is training data). Competitor feature parity is MEDIUM — Vapi/Bland.ai may have shipped features post-August 2025 |
| Architecture | HIGH | Twilio Media Streams WebSocket constraint is a hard documented fact. Claude tool use loop is stable since 2023. Next.js subdomain middleware is standard. Specific latency numbers are MEDIUM — must be validated with real calls |
| Pitfalls | HIGH | Twilio/GDPR/race condition pitfalls are grounded in hard constraints (serverless timeouts, GDPR Article 9 text, database concurrency). ElevenLabs-specific pitfalls are MEDIUM — verify against current API |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **ElevenLabs model names and SDK shape:** Training data has `eleven_turbo_v2_5` and `ulaw_8000` output format. Verify at elevenlabs.io/docs before Phase 1 begins. Model names change with new ElevenLabs releases.
- **Twilio EU Regulatory Bundles:** Verify per-country documentation requirements and approval lead times at Twilio's regulatory portal before committing to EU clinic go-live dates. Germany, France, Italy, Spain, Netherlands all have requirements.
- **Railway pricing and WebSocket support:** Training data has Railway at ~$5/month for always-on services. Verify current pricing and confirm WebSocket connection handling before committing to Railway as the voice-service host.
- **Vapi.ai and Bland.ai current feature sets:** Research was unable to verify what these competitors have shipped post-August 2025. If they have added white-labeling, the competitive differentiation argument for building in-house changes.
- **EU AI Act implementation status for healthcare AI:** Article 52 transparency obligations confirmed; verify if additional implementing regulations for healthcare specifically have been issued post-August 2025.
- **Existing timezone bug scope:** CONCERNS.md documents the timezone normalization issue. Scope the fix before Phase 0 estimate — may be a 1-hour fix or a multi-day data migration depending on how appointments were stored.

---

## Sources

### Primary (HIGH confidence)
- Twilio Media Streams documentation (training data, Aug 2025) — WebSocket persistence requirement, TwiML Stream verb, audio format, call lifecycle events
- Anthropic Claude tool use documentation (training data) — tool definition schema, tool_use/tool_result message format, streaming SSE
- GDPR Articles 5, 6, 7, 8, 9, 13, 14, 17, 22, 28, 30, 33 (legal text, authoritative) — all GDPR feature requirements
- EU AI Act Article 52 (legal text, authoritative) — AI transparency / self-identification requirement
- QueueUp codebase — CONCERNS.md (live codebase analysis; confirmed existing bugs and partial mitigations)

### Secondary (MEDIUM confidence)
- Deepgram Nova-2 streaming latency benchmarks (training data) — ~200–300ms STT latency; verify at deepgram.com
- ElevenLabs `eleven_turbo_v2_5` TTFA estimates (training data) — ~300–500ms; verify current model names at elevenlabs.io/docs
- Railway hosting capabilities and pricing (training data) — verify current pricing and WebSocket support
- Vapi.ai / Bland.ai / Synthflow feature sets (training data) — competitor feature landscape; may be outdated
- Next.js wildcard subdomain routing pattern (training data) — standard App Router middleware pattern; well-documented

### Tertiary (LOW confidence)
- Twilio EU Regulatory Bundle per-country requirements (training data) — Germany, France, Italy, Spain, Netherlands specifics; verify at Twilio regulatory portal before implementation
- ElevenLabs Conversational AI WebSocket SDK specifics (training data) — verify current SDK version and method signatures at elevenlabs.io/docs

---

*Research completed: 2026-03-28*
*Ready for roadmap: yes*
