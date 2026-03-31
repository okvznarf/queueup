import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Session } from '../src/types/session.js';

// Mock twilio before importing escalation
vi.mock('twilio', () => {
  const mockUpdate = vi.fn().mockResolvedValue({});
  const mockCalls = vi.fn().mockReturnValue({ update: mockUpdate });
  function TwilioClient() {
    return { calls: mockCalls };
  }
  return { default: TwilioClient };
});

import {
  shouldEscalate,
  executeWarmTransfer,
  ESCALATION_PHRASES,
  TRANSFER_BRIDGE_MESSAGE,
} from '../src/handlers/escalation.js';

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    callSid: 'CA-test',
    streamSid: 'MZ-test',
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

describe('shouldEscalate', () => {
  it('Test 1: returns true for "talk to a human"', () => {
    expect(shouldEscalate('talk to a human', makeSession())).toBe(true);
  });

  it('Test 2: returns true for "speak to a receptionist"', () => {
    expect(shouldEscalate('speak to a receptionist', makeSession())).toBe(true);
  });

  it('Test 3: returns true for "real person"', () => {
    expect(shouldEscalate('I want a real person', makeSession())).toBe(true);
  });

  it('Test 4: returns true for "transfer me"', () => {
    expect(shouldEscalate('transfer me please', makeSession())).toBe(true);
  });

  it('Test 5: returns false for "what time is my appointment"', () => {
    expect(shouldEscalate('what time is my appointment', makeSession())).toBe(false);
  });

  it('Test 6: returns false for "hello"', () => {
    expect(shouldEscalate('hello', makeSession())).toBe(false);
  });

  it('Test 7: returns true when session.unansweredQuestions >= 2', () => {
    const session = makeSession({ unansweredQuestions: 2 });
    expect(shouldEscalate('I have a question', session)).toBe(true);
  });

  it('Test 8: returns true when session.escalationTriggered is true', () => {
    const session = makeSession({ escalationTriggered: true });
    expect(shouldEscalate('hello', session)).toBe(true);
  });
});

describe('TRANSFER_BRIDGE_MESSAGE', () => {
  it('Test 9: TRANSFER_BRIDGE_MESSAGE contains "connecting"', () => {
    expect(TRANSFER_BRIDGE_MESSAGE.toLowerCase()).toContain('connecting');
  });
});

describe('ESCALATION_PHRASES', () => {
  it('contains expected phrases', () => {
    expect(ESCALATION_PHRASES).toContain('talk to a human');
    expect(ESCALATION_PHRASES).toContain('speak to a receptionist');
    expect(ESCALATION_PHRASES).toContain('real person');
    expect(ESCALATION_PHRASES).toContain('transfer me');
  });
});
