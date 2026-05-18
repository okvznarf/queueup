import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Session, ShopContext } from '../src/types/session.js';

// ---------------------------------------------------------------------------
// Mock @anthropic-ai/sdk
// ---------------------------------------------------------------------------

// We use a factory so tests can override the mock implementation per test
let mockMessagesCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  function Anthropic() {
    return {
      messages: {
        // stream is used by older code path; create is the agentic loop
        stream: vi.fn().mockImplementation(() => {
          throw new Error('stream() should not be called in tool_use loop');
        }),
        create: (...args: unknown[]) => mockMessagesCreate(...args),
      },
    };
  }
  return { default: Anthropic, Anthropic };
});

import {
  buildSystemPrompt,
  fetchShopContext,
  extractFirstSentence,
  processPatientUtterance,
} from '../src/handlers/claudeSession.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeShopContext(overrides: Partial<ShopContext> = {}): ShopContext {
  return {
    shopId: 'shop-1',
    shopName: 'Sunrise Dental',
    businessType: 'dental',
    address: '10 Clinic Road, London',
    phone: '020-1234-5678',
    email: 'hello@sunrise.com',
    timezone: 'Europe/London',
    currency: 'GBP',
    primaryColor: '#0070f3',
    staffLabel: 'dentist',
    serviceLabel: 'appointment',
    bookingLabel: 'booking',
    staffCount: 2,
    services: [
      { id: 'svc-1', name: 'Check-up', duration: 30, price: 60 },
      { id: 'svc-2', name: 'Cleaning', duration: 45, price: 80 },
    ],
    staff: [
      { id: 'staff-1', name: 'Dr. Adams', role: 'dentist' },
      { id: 'staff-2', name: 'Dr. Bell', role: 'dentist' },
    ],
    workingHours: [
      { day: 'Monday', openTime: '09:00', closeTime: '17:00', isClosed: false },
      { day: 'Tuesday', openTime: '09:00', closeTime: '17:00', isClosed: false },
      { day: 'Sunday', openTime: '', closeTime: '', isClosed: true },
    ],
    ...overrides,
  };
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    callSid: 'CA123',
    streamSid: 'MZ123',
    clinicId: 'shop-1',
    consentState: 'granted',
    messages: [],
    unansweredQuestions: 0,
    escalationTriggered: false,
    startedAt: new Date(),
    actionsLog: [],
    channel: 'voice',
    shopContext: makeShopContext(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// buildSystemPrompt tests
// ---------------------------------------------------------------------------

describe('buildSystemPrompt', () => {
  it('includes shop name in the prompt', () => {
    const ctx = makeShopContext();
    const prompt = buildSystemPrompt(ctx, 'voice');
    expect(prompt).toContain('Sunrise Dental');
  });

  it('includes address, phone, email', () => {
    const ctx = makeShopContext();
    const prompt = buildSystemPrompt(ctx, 'voice');
    expect(prompt).toContain('10 Clinic Road, London');
    expect(prompt).toContain('020-1234-5678');
    expect(prompt).toContain('hello@sunrise.com');
  });

  it('includes working hours for open days', () => {
    const ctx = makeShopContext();
    const prompt = buildSystemPrompt(ctx, 'voice');
    expect(prompt).toContain('Monday');
    expect(prompt).toContain('09:00');
    expect(prompt).toContain('17:00');
  });

  it('does not include closed days in hours', () => {
    const ctx = makeShopContext();
    const prompt = buildSystemPrompt(ctx, 'voice');
    // Sunday is closed — should not appear in WORKING HOURS section
    // It may appear in other contexts, so check it's not in the formatted hours
    expect(prompt).not.toMatch(/Sunday.*09:00/);
  });

  it('includes services with name, duration, and price', () => {
    const ctx = makeShopContext();
    const prompt = buildSystemPrompt(ctx, 'voice');
    expect(prompt).toContain('Check-up');
    expect(prompt).toContain('30');
    expect(prompt).toContain('60');
  });

  it('uses staffLabel dynamically (dentist not doctor)', () => {
    const ctx = makeShopContext({ staffLabel: 'dentist' });
    const prompt = buildSystemPrompt(ctx, 'voice');
    expect(prompt).toMatch(/dentist/i);
    expect(prompt).toContain('2 active dentist');
  });

  it('uses "doctor" staffLabel when set', () => {
    const ctx = makeShopContext({ staffLabel: 'doctor', staffCount: 3 });
    const prompt = buildSystemPrompt(ctx, 'voice');
    expect(prompt).toMatch(/doctor/i);
  });

  it('includes voice-appropriate language for voice channel', () => {
    const ctx = makeShopContext();
    const prompt = buildSystemPrompt(ctx, 'voice');
    expect(prompt).toMatch(/phone call/i);
  });

  it('includes chat-appropriate language for chat channel', () => {
    const ctx = makeShopContext();
    const prompt = buildSystemPrompt(ctx, 'chat');
    expect(prompt).toMatch(/chat/i);
    expect(prompt).not.toMatch(/phone call/i);
  });

  it('includes the unanswered question tracking phrase', () => {
    const ctx = makeShopContext();
    const prompt = buildSystemPrompt(ctx, 'voice');
    expect(prompt).toContain("I'm not sure about that");
  });

  it('includes intake instruction (reason for visit)', () => {
    const ctx = makeShopContext();
    const prompt = buildSystemPrompt(ctx, 'voice');
    expect(prompt).toMatch(/reason for (your )?visit/i);
  });

  it('includes staff preference question when staffCount >= 2', () => {
    const ctx = makeShopContext({ staffCount: 2, staffLabel: 'dentist' });
    const prompt = buildSystemPrompt(ctx, 'voice');
    expect(prompt).toMatch(/preferred dentist/i);
  });

  it('omits staff preference when staffCount === 1', () => {
    const ctx = makeShopContext({ staffCount: 1 });
    const prompt = buildSystemPrompt(ctx, 'voice');
    expect(prompt).toMatch(/single provider|no staff preference/i);
  });
});

// ---------------------------------------------------------------------------
// fetchShopContext tests
// ---------------------------------------------------------------------------

describe('fetchShopContext', () => {
  beforeEach(() => mockFetch.mockReset());

  it('calls the shop-context endpoint with correct shopId', async () => {
    const ctx = makeShopContext();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(ctx),
    });

    await fetchShopContext('shop-abc');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('shop-context');
    expect(url).toContain('shopId=shop-abc');
  });

  it('sends Authorization header with service token', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(makeShopContext()) });
    await fetchShopContext('shop-1');
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)['Authorization']).toMatch(/^Bearer /);
  });

  it('returns the shop context on success', async () => {
    const ctx = makeShopContext({ shopName: 'Returned Clinic' });
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(ctx) });

    const result = await fetchShopContext('shop-1');
    expect(result.shopName).toBe('Returned Clinic');
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404, json: () => Promise.resolve({}) });
    await expect(fetchShopContext('nonexistent')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// extractFirstSentence tests (preserved)
// ---------------------------------------------------------------------------

describe('extractFirstSentence', () => {
  it('splits on period followed by more text', () => {
    const result = extractFirstSentence('Hello there. How are you?');
    expect(result).not.toBeNull();
    expect(result!.sentence).toBe('Hello there.');
    expect(result!.remainder).toBe('How are you?');
  });

  it('returns null when no sentence boundary', () => {
    const result = extractFirstSentence('Hello there');
    expect(result).toBeNull();
  });

  it('splits on exclamation mark', () => {
    const result = extractFirstSentence('Sure! I can help.');
    expect(result).not.toBeNull();
    expect(result!.sentence).toBe('Sure!');
    expect(result!.remainder).toBe('I can help.');
  });
});

// ---------------------------------------------------------------------------
// processPatientUtterance — text-only (end_turn, no tools)
// ---------------------------------------------------------------------------

describe('processPatientUtterance — text-only response', () => {
  beforeEach(() => {
    mockMessagesCreate = vi.fn().mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Hello there. How can I help you today?' }],
    });
  });

  it('pushes user message to session.messages', async () => {
    const session = makeSession();
    await processPatientUtterance(session, 'I need an appointment', async () => {});
    const userMsg = session.messages.find((m) => m.role === 'user');
    expect(userMsg).toBeDefined();
    // Content can be string or array in MessageParam
    const content = userMsg!.content;
    expect(typeof content === 'string' ? content : JSON.stringify(content)).toContain('I need an appointment');
  });

  it('pushes assistant response to session.messages', async () => {
    const session = makeSession();
    await processPatientUtterance(session, 'Hello', async () => {});
    const assistantMsg = session.messages.find((m) => m.role === 'assistant');
    expect(assistantMsg).toBeDefined();
  });

  it('calls onSentence for each sentence in text response', async () => {
    const session = makeSession();
    const sentences: string[] = [];
    await processPatientUtterance(session, 'Hello', async (s) => { sentences.push(s); });
    expect(sentences.length).toBeGreaterThan(0);
  });

  it('tracks unanswered questions when response contains "I\'m not sure about that"', async () => {
    mockMessagesCreate = vi.fn().mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: "I'm not sure about that. Let me check." }],
    });
    const session = makeSession();
    await processPatientUtterance(session, 'What are your prices?', async () => {});
    expect(session.unansweredQuestions).toBe(1);
  });

  it('triggers escalation when unansweredQuestions reaches 2', async () => {
    mockMessagesCreate = vi.fn().mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: "I'm not sure about that." }],
    });
    const session = makeSession({ unansweredQuestions: 1 });
    await processPatientUtterance(session, 'Another hard question', async () => {});
    expect(session.escalationTriggered).toBe(true);
  });

  it('calls messages.create with BOOKING_TOOLS and system prompt from shopContext', async () => {
    const session = makeSession();
    await processPatientUtterance(session, 'Hello', async () => {});
    const callArgs = mockMessagesCreate.mock.calls[0][0] as {
      tools: unknown[];
      system: string | Array<{ type: string; text: string; cache_control?: unknown }>;
    };
    expect(callArgs.tools).toBeDefined();
    expect(Array.isArray(callArgs.tools)).toBe(true);
    // System prompt is sent as cached content blocks (prompt caching).
    const systemText = Array.isArray(callArgs.system)
      ? callArgs.system.map((b) => b.text).join('\n')
      : callArgs.system;
    expect(systemText).toContain('Sunrise Dental');
  });
});

// ---------------------------------------------------------------------------
// processPatientUtterance — tool_use loop
// ---------------------------------------------------------------------------

describe('processPatientUtterance — tool_use loop', () => {
  it('handles tool_use then end_turn in two iterations', async () => {
    const toolUseResponse = {
      stop_reason: 'tool_use',
      content: [
        {
          type: 'tool_use',
          id: 'tool-1',
          name: 'check_availability',
          input: { date: '2026-04-15' },
        },
      ],
    };

    const endTurnResponse = {
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'I found some slots for you.' }],
    };

    mockMessagesCreate = vi.fn()
      .mockResolvedValueOnce(toolUseResponse)
      .mockResolvedValueOnce(endTurnResponse);

    // Mock fetch for the tool call
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ hour: 9, minute: 0, label: '09:00', available: true, startTime: '09:00' }]),
    });

    const session = makeSession();
    const sentences: string[] = [];
    await processPatientUtterance(session, 'What slots are available on April 15?', async (s) => {
      sentences.push(s);
    });

    // Claude was called twice (once for tool, once for final response)
    expect(mockMessagesCreate).toHaveBeenCalledTimes(2);
    expect(sentences).toContain('I found some slots for you.');
    // Tool call logged to actionsLog
    expect(session.actionsLog).toContain('tool:check_availability');
  });

  it('feeds tool_result back as user message for next Claude call', async () => {
    const toolUseResponse = {
      stop_reason: 'tool_use',
      content: [
        {
          type: 'tool_use',
          id: 'tool-abc',
          name: 'check_services',
          input: {},
        },
      ],
    };

    const endTurnResponse = {
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'We offer check-ups and cleaning.' }],
    };

    mockMessagesCreate = vi.fn()
      .mockResolvedValueOnce(toolUseResponse)
      .mockResolvedValueOnce(endTurnResponse);

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ services: [{ id: 'svc-1', name: 'Check-up' }] }),
    });

    const session = makeSession();
    await processPatientUtterance(session, 'What services do you offer?', async () => {});

    // Second Claude call should have a user message with tool_result
    const secondCallMessages = (mockMessagesCreate.mock.calls[1][0] as { messages: unknown[] }).messages;
    const lastUserMsg = [...secondCallMessages].reverse().find(
      (m: unknown) => (m as { role: string }).role === 'user',
    ) as { role: string; content: unknown[] } | undefined;
    expect(lastUserMsg).toBeDefined();
    const content = lastUserMsg!.content;
    expect(Array.isArray(content)).toBe(true);
    const toolResult = (content as Array<{ type: string }>).find((b) => b.type === 'tool_result');
    expect(toolResult).toBeDefined();
  });

  it('triggers escalation when loop exceeds MAX_TOOL_ITERATIONS', async () => {
    // Always return tool_use to force loop overflow
    mockMessagesCreate = vi.fn().mockResolvedValue({
      stop_reason: 'tool_use',
      content: [
        {
          type: 'tool_use',
          id: 'tool-loop',
          name: 'check_availability',
          input: { date: '2026-04-15' },
        },
      ],
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const session = makeSession();
    const sentences: string[] = [];
    await processPatientUtterance(session, 'Keep checking availability', async (s) => {
      sentences.push(s);
    });

    expect(session.escalationTriggered).toBe(true);
    // A graceful message should have been emitted
    expect(sentences.length).toBeGreaterThan(0);
  });
});
