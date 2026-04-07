import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock claudeSession module
const mockFetchShopContext = vi.fn().mockResolvedValue({
  shopId: 'shop-1',
  shopName: 'Test Clinic',
  businessType: 'clinic',
  timezone: 'Europe/Zagreb',
  currency: 'EUR',
  staffLabel: 'doctor',
  serviceLabel: 'service',
  bookingLabel: 'appointment',
  staffCount: 2,
  services: [],
  staff: [],
  workingHours: [],
});

const mockProcessPatientUtterance = vi.fn().mockImplementation(
  async (_session: unknown, _msg: string, onSentence: (s: string) => Promise<void>) => {
    await onSentence('Hello! I can help you book an appointment.');
  },
);

vi.mock('../src/handlers/claudeSession.js', () => ({
  fetchShopContext: (...args: unknown[]) => mockFetchShopContext(...args),
  processPatientUtterance: (...args: unknown[]) => mockProcessPatientUtterance(...args),
  buildSystemPrompt: vi.fn().mockReturnValue('system prompt'),
}));

import {
  getOrCreateChatSession,
  processChatMessage,
  cleanupExpiredSessions,
} from '../src/handlers/chatSession.js';

describe('chatSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Test 1: getOrCreateChatSession creates a new session with channel=chat', () => {
    const session = getOrCreateChatSession('sess-1', 'shop-1');
    expect(session.channel).toBe('chat');
    expect(session.sessionId).toBe('sess-1');
    expect(session.shopId).toBe('shop-1');
    expect(session.clinicId).toBe('shop-1');
    expect(session.consentState).toBe('granted');
    expect(session.messages).toEqual([]);
    expect(session.callSid).toBe('chat-sess-1');
    expect(session.streamSid).toBe('chat-sess-1');
  });

  it('Test 2: getOrCreateChatSession returns same session for same sessionId', () => {
    const s1 = getOrCreateChatSession('sess-reuse', 'shop-1');
    s1.messages.push({ role: 'user', content: 'hi' });
    const s2 = getOrCreateChatSession('sess-reuse', 'shop-1');
    expect(s2).toBe(s1);
    expect(s2.messages).toHaveLength(1);
  });

  it('Test 3: getOrCreateChatSession returns different sessions for different ids', () => {
    const s1 = getOrCreateChatSession('sess-a', 'shop-1');
    const s2 = getOrCreateChatSession('sess-b', 'shop-1');
    expect(s1).not.toBe(s2);
    expect(s1.sessionId).toBe('sess-a');
    expect(s2.sessionId).toBe('sess-b');
  });

  it('Test 4: processChatMessage fetches shop context on first call', async () => {
    const session = getOrCreateChatSession('sess-ctx', 'shop-1');
    const chunks: string[] = [];
    await processChatMessage(session, 'hello', async (chunk) => {
      chunks.push(chunk);
    });
    expect(mockFetchShopContext).toHaveBeenCalledWith('shop-1');
    expect(session.shopContext).toBeDefined();
  });

  it('Test 5: processChatMessage does not re-fetch if context already loaded', async () => {
    const session = getOrCreateChatSession('sess-nofetch', 'shop-1');
    session.shopContext = {
      shopId: 'shop-1',
      shopName: 'Existing',
      businessType: 'clinic',
      timezone: 'UTC',
      currency: 'EUR',
      staffLabel: 'doctor',
      serviceLabel: 'service',
      bookingLabel: 'appointment',
      staffCount: 1,
      services: [],
      staff: [],
      workingHours: [],
    };
    await processChatMessage(session, 'hi', async () => {});
    expect(mockFetchShopContext).not.toHaveBeenCalled();
  });

  it('Test 6: processChatMessage delegates to processPatientUtterance', async () => {
    const session = getOrCreateChatSession('sess-delegate', 'shop-1');
    const chunks: string[] = [];
    await processChatMessage(session, 'book appointment', async (c) => {
      chunks.push(c);
    });
    expect(mockProcessPatientUtterance).toHaveBeenCalledWith(
      session,
      'book appointment',
      expect.any(Function),
    );
    expect(chunks).toContain('Hello! I can help you book an appointment.');
  });

  it('Test 7: cleanupExpiredSessions removes old sessions', () => {
    const session = getOrCreateChatSession('sess-old', 'shop-1');
    // Artificially set lastActiveAt to 31 minutes ago
    session.lastActiveAt = new Date(Date.now() - 31 * 60 * 1000);

    const fresh = getOrCreateChatSession('sess-fresh', 'shop-1');

    const removed = cleanupExpiredSessions();
    expect(removed).toBe(1);

    // Fresh session should still be accessible
    const stillThere = getOrCreateChatSession('sess-fresh', 'shop-1');
    expect(stillThere).toBe(fresh);
  });

  it('Test 8: cleanupExpiredSessions returns 0 when nothing expired', () => {
    getOrCreateChatSession('sess-active', 'shop-1');
    const removed = cleanupExpiredSessions();
    expect(removed).toBe(0);
  });
});

describe('chatRoute integration', () => {
  it('Test 9: POST /chat with consentGranted=false returns 403', async () => {
    // Import chatRoutes and test via Fastify inject
    const fastify = (await import('fastify')).default;
    const app = fastify();
    const { chatRoutes } = await import('../src/routes/chatRoute.js');
    await app.register(chatRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: '/chat',
      payload: {
        shopId: 'shop-1',
        sessionId: 'sess-1',
        message: 'hi',
        consentGranted: false,
      },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.payload)).toEqual({ error: 'Consent required' });
    expect(res.headers['access-control-allow-origin']).toBe('*');
    await app.close();
  });

  it('Test 10: POST /chat with missing shopId returns 400', async () => {
    const fastify = (await import('fastify')).default;
    const app = fastify();
    const { chatRoutes } = await import('../src/routes/chatRoute.js');
    await app.register(chatRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: '/chat',
      payload: {
        sessionId: 'sess-1',
        message: 'hi',
        consentGranted: true,
      },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload)).toEqual({ error: 'Missing required fields' });
    await app.close();
  });

  it('Test 11: POST /chat with valid request returns SSE stream', async () => {
    const fastify = (await import('fastify')).default;
    const app = fastify();
    const { chatRoutes } = await import('../src/routes/chatRoute.js');
    await app.register(chatRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: '/chat',
      payload: {
        shopId: 'shop-1',
        sessionId: 'sess-sse',
        message: 'What are your hours?',
        consentGranted: true,
      },
    });

    // When using reply.raw.writeHead, Fastify inject captures the raw output
    const body = res.payload;
    expect(body).toContain('"type":"text"');
    expect(body).toContain('"type":"done"');
    await app.close();
  });

  it('Test 12: OPTIONS /chat returns 204 with CORS headers', async () => {
    const fastify = (await import('fastify')).default;
    const app = fastify();
    const { chatRoutes } = await import('../src/routes/chatRoute.js');
    await app.register(chatRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'OPTIONS',
      url: '/chat',
    });
    expect(res.statusCode).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('*');
    expect(res.headers['access-control-allow-methods']).toContain('POST');
    await app.close();
  });
});
