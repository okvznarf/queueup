import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TwilioMediaEvent } from '../src/types/session.js';

// Mock deepgramClient before importing handler
vi.mock('../src/handlers/deepgramClient.js', () => ({
  createDeepgramConnection: vi.fn(() => ({
    send: vi.fn(),
    finish: vi.fn(),
  })),
}));

import { handleTwilioMessage, sessions } from '../src/handlers/twilioStream.js';
import { createDeepgramConnection } from '../src/handlers/deepgramClient.js';

function makeMockWs() {
  return {
    send: vi.fn(),
    on: vi.fn(),
    close: vi.fn(),
  } as any;
}

function makeStartEvent(overrides?: Partial<TwilioMediaEvent['start']>): TwilioMediaEvent {
  return {
    event: 'start',
    start: {
      streamSid: 'MZ-test-stream',
      accountSid: 'AC-test',
      callSid: 'CA-test-call',
      tracks: ['inbound'],
      customParameters: {},
      mediaFormat: { encoding: 'audio/x-mulaw', sampleRate: 8000, channels: 1 },
      ...overrides,
    },
  };
}

describe('handleTwilioMessage', () => {
  beforeEach(() => {
    sessions.clear();
    vi.clearAllMocks();
  });

  it('Test 1: handles "connected" event without errors', () => {
    const ws = makeMockWs();
    const event: TwilioMediaEvent = { event: 'connected' };
    expect(() => handleTwilioMessage(event, ws)).not.toThrow();
  });

  it('Test 2: "start" event creates a Session with correct callSid, streamSid, consentState="pending"', () => {
    const ws = makeMockWs();
    handleTwilioMessage(makeStartEvent(), ws);

    const session = sessions.get('CA-test-call');
    expect(session).toBeDefined();
    expect(session!.callSid).toBe('CA-test-call');
    expect(session!.streamSid).toBe('MZ-test-stream');
    expect(session!.consentState).toBe('pending');
  });

  it('Test 3: "media" event decodes base64 payload and forwards to Deepgram', () => {
    const ws = makeMockWs();
    handleTwilioMessage(makeStartEvent(), ws);

    const mockDg = (createDeepgramConnection as any).mock.results[0].value;

    const audioPayload = Buffer.from('test-audio').toString('base64');
    const mediaEvent: TwilioMediaEvent = {
      event: 'media',
      media: { track: 'inbound', chunk: '1', timestamp: '0', payload: audioPayload },
    };
    handleTwilioMessage(mediaEvent, ws);

    expect(mockDg.send).toHaveBeenCalledWith(Buffer.from('test-audio'));
  });

  it('Test 4: "stop" event cleans up session from sessions Map', () => {
    const ws = makeMockWs();
    handleTwilioMessage(makeStartEvent(), ws);
    expect(sessions.has('CA-test-call')).toBe(true);

    const stopEvent: TwilioMediaEvent = {
      event: 'stop',
      stop: { accountSid: 'AC-test', callSid: 'CA-test-call' },
    };
    handleTwilioMessage(stopEvent, ws);

    expect(sessions.has('CA-test-call')).toBe(false);
  });

  it('Test 5: Session is created with unansweredQuestions=0 and escalationTriggered=false', () => {
    const ws = makeMockWs();
    handleTwilioMessage(makeStartEvent(), ws);
    const session = sessions.get('CA-test-call');
    expect(session!.unansweredQuestions).toBe(0);
    expect(session!.escalationTriggered).toBe(false);
  });

  it('Test 6: On "start", session.actionsLog is empty array', () => {
    const ws = makeMockWs();
    handleTwilioMessage(makeStartEvent(), ws);
    const session = sessions.get('CA-test-call');
    expect(session!.actionsLog).toEqual([]);
  });
});
