---
phase: 01-voice-pipeline-gdpr-foundation
plan: "02"
subsystem: audio-pipeline
tags: [twilio, deepgram, gdpr, consent, websocket, stt]

requires:
  - "01-01: voice-service scaffold, Session types, Fastify with @fastify/websocket"

provides:
  - "voice-service/src/handlers/consentFlow.ts — GDPR consent state machine with detectConsentResponse(), CONSENT_SCRIPT, CONSENT_TIMEOUT_SCRIPT"
  - "voice-service/src/handlers/deepgramClient.ts — Per-call Deepgram Nova-2 live transcription (mulaw 8kHz, 300ms endpointing)"
  - "voice-service/src/handlers/twilioStream.ts — Twilio Media Streams WebSocket handler with session lifecycle management"
  - "WebSocket route /voice-stream registered in server.ts"
  - "Session Map for in-memory call state tracking"

decisions:
  - "Check refusals before affirmatives in consent detection — 'I don't agree' contains 'agree' but is a refusal"
  - "Deepgram speech_final used instead of is_final for utterance-level finality"
  - "Consent greeting TTS playback stubbed (logged) — actual ElevenLabs wiring deferred to Plan 04"
  - "findCallSidForMedia uses first session in Map — adequate for single-call dev; multi-call routing deferred"
---

## What shipped

### Task 1: GDPR Consent State Machine + Deepgram Client
- `consentFlow.ts`: Consent detection classifies affirmative/refusal/ambiguous responses with GDPR-compliant consent script identifying AI, health data, and requesting explicit agreement
- `deepgramClient.ts`: Per-call Deepgram Nova-2 connection configured for Twilio mulaw 8kHz audio with 300ms endpointing and 1s utterance end
- 11 consent tests passing

### Task 2: Twilio Media Streams WebSocket Handler
- `twilioStream.ts`: Handles connected/start/media/stop/mark events, creates Session on start (consent=pending, unanswered=0), forwards base64-decoded audio to Deepgram, cleans up on stop
- `server.ts` updated to register `/voice-stream` WebSocket route
- 6 WebSocket handler tests passing

## Test results
- 6 test files, 35 tests, all passing
- Test suites: health, idempotency, consentFlow, twilioStream, claudeSession, elevenLabsTts
