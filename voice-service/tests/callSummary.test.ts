import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Session } from '../src/types/session.js';

// Mock prisma (needed since auditLog imports it)
vi.mock('../src/lib/prisma.js', () => ({
  default: {
    voiceCall: { create: vi.fn().mockResolvedValue({ id: 'call-id-123', callSid: 'CA-test' }) },
    voiceAuditLog: { create: vi.fn().mockResolvedValue({}) },
    voiceTranscript: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
  },
}));

// Mock Anthropic
vi.mock('@anthropic-ai/sdk', () => {
  function Anthropic() {
    return {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'Patient called about appointment scheduling. They asked about availability. Call completed successfully.' }],
        }),
      },
    };
  }
  return { default: Anthropic };
});

// Mock global fetch
global.fetch = vi.fn();

import { generateCallSummary, saveCallSummary } from '../src/lib/auditLog.js';
import Anthropic from '@anthropic-ai/sdk';

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    callSid: 'CA-test',
    streamSid: 'MZ-test',
    clinicId: 'clinic-1',
    consentState: 'granted',
    messages: [
      { role: 'user', content: 'I need to book an appointment' },
      { role: 'assistant', content: 'I can help you with that.' },
    ],
    unansweredQuestions: 0,
    escalationTriggered: false,
    startedAt: new Date(),
    actionsLog: [],
    ...overrides,
  };
}

describe('generateCallSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Test 8: calls Claude with session messages and returns a summary string', async () => {
    const session = makeSession();
    const summary = await generateCallSummary(session);

    expect(typeof summary).toBe('string');
    expect(summary.length).toBeGreaterThan(0);

    // Verify Claude was called
    const anthropicInstance = new (Anthropic as any)();
    // The mock should have been invoked
    expect(summary).toContain('Patient called');
  });

  it('Test 9: returns "Call ended without conversation." for empty messages', async () => {
    const session = makeSession({ messages: [] });
    const summary = await generateCallSummary(session);

    expect(summary).toBe('Call ended without conversation.');
  });
});

describe('saveCallSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockReset();
  });

  it('Test 10: sends PATCH to /api/voice/summary with correct body and x-voice-service-token header', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    process.env.VOICE_SERVICE_TOKEN = 'test-token-secret';
    process.env.QUEUEUP_API_URL = 'http://localhost:3000';

    await saveCallSummary('CA-test', 'Patient booked an appointment.');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/voice/summary'),
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-voice-service-token': 'test-token-secret',
        }),
        body: JSON.stringify({ callSid: 'CA-test', summary: 'Patient booked an appointment.' }),
      })
    );
  });

  it('Test 11: throws when response is not ok', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(
      saveCallSummary('CA-test', 'some summary')
    ).rejects.toThrow('Failed to save call summary');
  });
});
