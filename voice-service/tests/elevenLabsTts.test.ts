import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock ElevenLabs SDK
vi.mock('@elevenlabs/elevenlabs-js', () => {
  const mockChunks = [
    Buffer.from('audio-chunk-1'),
    Buffer.from('audio-chunk-2'),
    Buffer.from('audio-chunk-3'),
  ];

  const mockStream = {
    async *[Symbol.asyncIterator]() {
      for (const chunk of mockChunks) {
        yield chunk;
      }
    },
  };

  function ElevenLabsClient() {
    return {
      textToSpeech: {
        stream: vi.fn().mockResolvedValue(mockStream),
      },
    };
  }

  return { ElevenLabsClient };
});

import { streamTtsToTwilio, playConsentGreeting } from '../src/handlers/elevenLabsTts.js';

function makeMockWs() {
  return { send: vi.fn() } as any;
}

describe('streamTtsToTwilio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Test 1: sends media events to twilioWs with base64-encoded payload', async () => {
    const ws = makeMockWs();
    await streamTtsToTwilio('Hello there', 'MZ-stream-1', ws);

    expect(ws.send).toHaveBeenCalledTimes(3);
    const firstCall = JSON.parse(ws.send.mock.calls[0][0]);
    expect(firstCall.event).toBe('media');
    expect(firstCall.media.payload).toBe(Buffer.from('audio-chunk-1').toString('base64'));
  });

  it('Test 2: media events include correct streamSid', async () => {
    const ws = makeMockWs();
    await streamTtsToTwilio('Test', 'MZ-my-stream', ws);

    for (const call of ws.send.mock.calls) {
      const parsed = JSON.parse(call[0]);
      expect(parsed.streamSid).toBe('MZ-my-stream');
    }
  });

  it('Test 4: successfully streams when ELEVENLABS_VOICE_ID env is set', async () => {
    const ws = makeMockWs();
    process.env.ELEVENLABS_VOICE_ID = 'custom-voice-id';

    await streamTtsToTwilio('Test', 'MZ-1', ws);

    // Verify TTS still produces media events with custom voice
    expect(ws.send).toHaveBeenCalled();
    const firstCall = JSON.parse(ws.send.mock.calls[0][0]);
    expect(firstCall.event).toBe('media');

    delete process.env.ELEVENLABS_VOICE_ID;
  });
});

describe('playConsentGreeting', () => {
  it('Test 3: sends a mark event with name "consent-greeting-complete" after TTS', async () => {
    const ws = makeMockWs();
    await playConsentGreeting('Please agree to proceed', 'MZ-consent-stream', ws);

    // Last call should be the mark event
    const lastCall = JSON.parse(ws.send.mock.calls[ws.send.mock.calls.length - 1][0]);
    expect(lastCall.event).toBe('mark');
    expect(lastCall.mark.name).toBe('consent-greeting-complete');
    expect(lastCall.streamSid).toBe('MZ-consent-stream');
  });
});
