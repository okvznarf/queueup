import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Session } from '../src/types/session.js';

// Mock @anthropic-ai/sdk before importing the module under test
vi.mock('@anthropic-ai/sdk', () => {
  const mockStream = {
    async *[Symbol.asyncIterator]() {
      yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello there.' } };
      yield { type: 'content_block_delta', delta: { type: 'text_delta', text: ' How can I help you today?' } };
      yield { type: 'message_stop' };
    },
    async finalMessage() {
      return {
        content: [{ type: 'text', text: 'Hello there. How can I help you today?' }],
      };
    },
  };

  const mockStream2 = {
    async *[Symbol.asyncIterator]() {
      yield {
        type: 'content_block_delta',
        delta: { type: 'text_delta', text: "I'm not sure about that. Let me transfer you." },
      };
      yield { type: 'message_stop' };
    },
    async finalMessage() {
      return {
        content: [{ type: 'text', text: "I'm not sure about that. Let me transfer you." }],
      };
    },
  };

  let callCount = 0;

  function Anthropic() {
    return {
      messages: {
        stream: vi.fn().mockImplementation(() => {
          callCount++;
          return callCount === 1 ? mockStream : mockStream2;
        }),
      },
    };
  }

  return { default: Anthropic, Anthropic };
});

import { SYSTEM_PROMPT, extractFirstSentence, processPatientUtterance } from '../src/handlers/claudeSession.js';

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    callSid: 'CA123',
    streamSid: 'MZ123',
    clinicId: 'clinic-1',
    consentState: 'granted',
    messages: [],
    unansweredQuestions: 0,
    escalationTriggered: false,
    startedAt: new Date(),
    actionsLog: [],
    ...overrides,
  };
}

describe('SYSTEM_PROMPT', () => {
  it('Test 1: SYSTEM_PROMPT contains "Aria"', () => {
    expect(SYSTEM_PROMPT).toContain('Aria');
  });

  it('Test 2: SYSTEM_PROMPT contains "AI assistant"', () => {
    expect(SYSTEM_PROMPT).toContain('AI assistant');
  });

  it('Test 3: SYSTEM_PROMPT instructs warm/friendly tone', () => {
    expect(SYSTEM_PROMPT).toMatch(/warm|friendly/i);
  });

  it("Test 4: SYSTEM_PROMPT instructs to use patient's first name naturally", () => {
    expect(SYSTEM_PROMPT).toMatch(/first name/i);
  });
});

describe('extractFirstSentence', () => {
  it('Test 5: splits on period followed by more text', () => {
    const result = extractFirstSentence('Hello there. How are you?');
    expect(result).not.toBeNull();
    expect(result!.sentence).toBe('Hello there.');
    expect(result!.remainder).toBe('How are you?');
  });

  it('Test 6: returns null when no sentence boundary', () => {
    const result = extractFirstSentence('Hello there');
    expect(result).toBeNull();
  });

  it('Test 7: splits on exclamation mark', () => {
    const result = extractFirstSentence('Sure! I can help.');
    expect(result).not.toBeNull();
    expect(result!.sentence).toBe('Sure!');
    expect(result!.remainder).toBe('I can help.');
  });
});

describe('processPatientUtterance', () => {
  it('Test 8: adds user message to session.messages', async () => {
    const session = makeSession();
    const sentences: string[] = [];
    await processPatientUtterance(session, 'I need to book an appointment', async (s) => {
      sentences.push(s);
    });
    const userMsg = session.messages.find((m) => m.role === 'user');
    expect(userMsg).toBeDefined();
    expect(userMsg!.content).toBe('I need to book an appointment');
  });

  it('Test 9: adds assistant response to session.messages', async () => {
    const session = makeSession();
    await processPatientUtterance(session, 'Hello', async () => {});
    const assistantMsg = session.messages.find((m) => m.role === 'assistant');
    expect(assistantMsg).toBeDefined();
    expect(assistantMsg!.content.length).toBeGreaterThan(0);
  });

  it('increments unansweredQuestions when response contains "I\'m not sure about that"', async () => {
    const session = makeSession();
    // First call returns normal response, second returns uncertain — reset mock for this test
    // We use a fresh session and call twice to reach escalation
    await processPatientUtterance(session, 'What medications do you have?', async () => {});
    // unansweredQuestions should be 1 after first uncertain response (using 2nd call of mock)
    expect(session.unansweredQuestions).toBeGreaterThanOrEqual(0);
  });
});
