---
phase: 01-voice-pipeline-gdpr-foundation
plan: "03"
subsystem: ai-engine
tags: [claude, anthropic, elevenlabs, tts, streaming, aria]

requires:
  - "01-01: voice-service scaffold, Session types"
  - "01-02: consent flow (interface known, not runtime dependency)"

provides:
  - "voice-service/src/handlers/claudeSession.ts — Claude conversation engine with Aria persona, sentence-boundary streaming, unanswered question tracking"
  - "voice-service/src/handlers/elevenLabsTts.ts — ElevenLabs TTS streaming to Twilio WebSocket (mulaw 8kHz, eleven_flash_v2_5)"
  - "SYSTEM_PROMPT export for Aria warm/friendly persona"
  - "extractFirstSentence() for sentence-boundary detection in streaming"
  - "processPatientUtterance() for full conversation turn with escalation tracking"
  - "streamTtsToTwilio() and playConsentGreeting() for speech output"

decisions:
  - "Used claude-sonnet-4-6 model for voice conversations (fast enough for real-time)"
  - "Sentence boundary regex /^(.+?[.!?])\\s+(.*)/s — simple but effective for conversational speech"
  - "Escalation triggered at 2 unanswered questions — marked by 'I'm not sure about that' phrase in Claude response"
  - "ElevenLabs uses eleven_flash_v2_5 (not deprecated turbo) with ulaw_8000 output format for direct Twilio compatibility"
  - "Default voice ID EXAVITQu4vr4xnSDxMaL (Bella/Aria voice) with env override support"
  - "playConsentGreeting sends mark event 'consent-greeting-complete' for timing coordination"
---

## What shipped

### Task 1: Claude Conversation Engine
- `claudeSession.ts`: Aria persona system prompt (warm, friendly, uses first name, never gives medical advice, tracks unanswered questions)
- Sentence-boundary streaming via `extractFirstSentence()` for overlapped TTS
- `processPatientUtterance()` manages conversation turns, buffers streaming sentences, tracks escalation
- Escalation auto-triggered at 2 unanswered questions
- 10 tests passing (prompt content, sentence extraction, message tracking)

### Task 2: ElevenLabs TTS Streaming
- `elevenLabsTts.ts`: Converts text to mulaw 8kHz audio via ElevenLabs streaming API, sends base64-encoded media events to Twilio WebSocket
- `playConsentGreeting()` wraps TTS with mark event for consent flow coordination
- 4 tests passing (media events, streamSid, mark event, env config)

## Test results
- 6 test files, 35 tests, all passing
