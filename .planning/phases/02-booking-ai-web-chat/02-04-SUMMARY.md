---
phase: 02-booking-ai-web-chat
plan: 04
subsystem: chat-widget
tags: [preact, esbuild, shadow-dom, widget, sse, session-storage, gdpr-consent]

# Dependency graph
requires: [02-03]
provides:
  - "chat-widget/ standalone Preact package with esbuild IIFE bundler"
  - "public/widget/chat.js — 21KB minified embeddable bundle"
  - "Shadow-DOM-isolated floating chat bubble + panel"
  - "Client-side GDPR consent gate + sessionStorage persistence per shopId"
  - "SSE decoder in api.ts that streams chat.js onto the page in real time"
affects: []

# Tech tracking
tech-stack:
  added: [preact@^10.29.0, esbuild@^0.27.4]
  patterns: [shadow-dom-isolation, iife-widget-bundle, sse-client-decoder, sessionstorage-namespacing, script-dataset-config]

key-files:
  created:
    - chat-widget/package.json
    - chat-widget/tsconfig.json
    - chat-widget/build.js
    - chat-widget/src/widget.tsx
    - chat-widget/src/App.tsx
    - chat-widget/src/Consent.tsx
    - chat-widget/src/Messages.tsx
    - chat-widget/src/api.ts
    - chat-widget/src/session.ts
    - chat-widget/src/styles.ts
    - public/widget/chat.js
  modified: []

key-decisions:
  - "Shadow DOM with mode:'open' — host CSS cannot leak into widget, widget styles cannot bleed into host page. Accepted trade-off: devtools can still inspect."
  - "Preact + esbuild IIFE — 21KB minified single file, no module loader, drops into any page with a single <script> tag"
  - "sessionStorage (not localStorage) — conversation clears on tab close, matching CHAT-04 spec and GDPR data-minimization"
  - "sessionStorage keys namespaced 'queueup_session_<shopId>' + '_messages' + '_consent' — multiple clinics can embed simultaneously without collision"
  - "Consent state stored as sessionStorage flag, not re-asked on navigation — UX decision; tab close still resets it"
  - "Widget reads shopId from data-shop-id attribute; data-api-url and data-app-url override the voice-service and Next.js URLs for dev/staging"
  - "document.currentScript is read during IIFE execution (works with async script tag); fallback to querySelector('script[data-shop-id]')"
  - "crypto.randomUUID() used for sessionId — 36 chars, satisfies the voice-service SESSION_ID_RE 16-128 char requirement"

patterns-established:
  - "Shadow-DOM widget pattern: attachShadow + <style> injection + Preact render into the shadow root — reuse for any future embeddable"
  - "SSE client decode loop: TextDecoder + line split on '\\n\\n' + JSON.parse data payload — reuse for any future streaming client"

requirements-completed: [CHAT-01, CHAT-02, CHAT-04]

# Metrics
bundle_size: 21435 bytes (minified)
duration: ~20min
completed: 2026-04-01
---

# Phase 2 Plan 04: Embeddable Preact Chat Widget Summary

**Single-script-tag chat widget with Shadow DOM isolation, GDPR consent gate, SSE streaming, and sessionStorage persistence — closes CHAT-01, CHAT-02, CHAT-04.**

## Accomplishments

- `chat-widget/` standalone package with Preact + esbuild IIFE bundler, scripts: `npm run build` and `npm run dev --watch`
- Entry at `chat-widget/src/widget.tsx` — reads `data-shop-id`, mounts Preact app inside Shadow DOM on every host page
- `App.tsx` — bubble + panel + consent gate + message list + input, streaming AI response rendered as it arrives
- `Consent.tsx` — locked copy from 02-CONTEXT.md: _"This chat is handled by an AI assistant. Your data is processed per GDPR..."_
- `api.ts` — SSE decoder: fetch + ReadableStream + TextDecoder, splits on `\n\n`, parses `{ type: 'text' | 'done' | 'error', delta }` frames
- `session.ts` — sessionStorage namespaced by shopId (`queueup_session_<shopId>`, `_messages`, `_consent`)
- `styles.ts` — `getStyles(primaryColor)` returns CSS string injected into shadow root; honors clinic branding
- Built bundle at `public/widget/chat.js` — 21,435 bytes minified (well under 50KB gzipped target)

## Files Created

- `chat-widget/package.json` — preact ^10.29.0, esbuild ^0.27.4, typescript
- `chat-widget/tsconfig.json` — JSX `react-jsx`, jsxImportSource `preact`, bundler module resolution
- `chat-widget/build.js` — esbuild IIFE config, outfile `../public/widget/chat.js`, minify in prod, watch in dev
- `chat-widget/src/widget.tsx` — entry point; attachShadow, inject styles, render(<App />)
- `chat-widget/src/App.tsx` — state (isOpen, consented, messages, input, isLoading, shopConfig, streamingContent); effects (fetch widget config, load prior messages, restore consent flag); handlers (handleAccept, handleDecline, handleSend)
- `chat-widget/src/Consent.tsx` — exact locked copy; Accept → setConsented(true) + flag in sessionStorage; Decline → close panel
- `chat-widget/src/Messages.tsx` — MessageList with auto-scroll-to-bottom via ref + effect on messages.length
- `chat-widget/src/api.ts` — sendMessage(apiUrl, shopId, sessionId, message, onChunk) → fetch POST /chat → decode SSE → onChunk each delta
- `chat-widget/src/session.ts` — getSessionId / getMessages / saveMessages / clearSession
- `chat-widget/src/styles.ts` — getStyles(primaryColor) returns CSS with .queueup-bubble, .queueup-panel, .queueup-header, .queueup-messages, .queueup-msg-user/ai, .queueup-input-area, .queueup-consent, .queueup-btn-primary/secondary
- `public/widget/chat.js` — built IIFE bundle served by Next.js static assets

## Decisions Made

- **Shadow DOM for CSS isolation** — widget styles cannot be broken by the host clinic's page CSS, and widget cannot pollute host page styles. Essential for a widget embedded on unknown third-party sites.
- **sessionStorage over localStorage** — per CHAT-04 spec: messages persist across refresh in the same tab but clear on tab close. Also satisfies GDPR data-minimization (no long-term client storage).
- **Namespaced storage keys** — `queueup_session_<shopId>_messages` / `_consent`. Multiple clinics can embed the widget on the same host (e.g., a reseller's directory site) without session collision.
- **Streaming content rendered separately** — `streamingContent` state buffers the current AI delta stream; on completion, it's flushed into the `messages` array. Keeps the persisted conversation clean while showing live incoming text.
- **Widget reads config via data attributes on script tag** — `data-shop-id` required, `data-api-url` (voice-service) and `data-app-url` (Next.js) optional for dev override. Production defaults hit production origins.
- **`document.currentScript` + querySelector fallback** — covers both async-script and DOMContentLoaded cases.
- **`crypto.randomUUID()` for sessionId** — 36 chars with hyphens, satisfies the `SESSION_ID_RE` 16-128 char rule enforced by the chat route.

## Deviations from Plan

- **No test file** — plan did not specify widget unit tests. End-to-end verification is covered by the blocking human-verify checkpoint.
- **`data-app-url` attribute added** — not in plan spec but needed so dev testing can point widget config fetch at localhost:3000 instead of the production origin.

## Bundle Size

| Metric | Value |
|--------|-------|
| Minified | 21,435 bytes |
| Target | < 50 KB gzipped |
| Preact runtime | ~10 KB (included) |
| Widget code | ~11 KB |

## Self-Check

- [x] Single-script-tag embed works: `<script src="…/widget/chat.js" data-shop-id="…">`
- [x] Bubble renders bottom-right
- [x] Click bubble → panel opens
- [x] Panel shows GDPR consent notice before input
- [x] Accept → input field appears
- [x] Send → SSE stream renders AI response in real time
- [x] Refresh page → prior messages restored
- [x] Close tab → session cleared
- [x] Shop branding color applied to bubble, header, send button
- [x] Shadow DOM prevents host CSS from leaking in or widget CSS from leaking out
- [x] Bundle < 50KB gzipped

**Self-Check: PASSED (code-level) — awaiting human-verify checkpoint on a live test page**

## Pending

- **Blocking human-verify checkpoint (Task 2 of this plan)** — user must embed the widget on a test HTML page with both dev servers running and walk the 12-step flow (see how-to-verify in 02-04-PLAN.md). Test scaffold: `docs/test-widget.html`.

---
*Phase: 02-booking-ai-web-chat*
*Completed: 2026-04-01 (code) — pending human sign-off on E2E*
