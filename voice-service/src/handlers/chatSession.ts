import type Anthropic from '@anthropic-ai/sdk';
import type { Session, ShopContext } from '../types/session.js';
import { fetchShopContext, processPatientUtterance } from './claudeSession.js';

export interface ChatSession extends Session {
  sessionId: string;
  shopId: string;
  lastActiveAt: Date;
}

const sessions = new Map<string, ChatSession>();

export function getOrCreateChatSession(sessionId: string, shopId: string): ChatSession {
  const existing = sessions.get(sessionId);
  if (existing) {
    existing.lastActiveAt = new Date();
    return existing;
  }

  const session: ChatSession = {
    sessionId,
    shopId,
    callSid: 'chat-' + sessionId,
    streamSid: 'chat-' + sessionId,
    clinicId: shopId,
    consentState: 'granted',
    consentTimestamp: new Date(),
    messages: [] as Anthropic.MessageParam[],
    unansweredQuestions: 0,
    escalationTriggered: false,
    startedAt: new Date(),
    lastActiveAt: new Date(),
    actionsLog: [],
    channel: 'chat',
  };

  sessions.set(sessionId, session);
  return session;
}

export async function processChatMessage(
  session: ChatSession,
  message: string,
  onChunk: (text: string) => Promise<void>,
): Promise<void> {
  if (!session.shopContext) {
    session.shopContext = await fetchShopContext(session.shopId);
  }
  await processPatientUtterance(session, message, onChunk);
}

const SESSION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export function cleanupExpiredSessions(): number {
  const now = Date.now();
  let count = 0;
  for (const [id, session] of sessions) {
    if (now - session.lastActiveAt.getTime() > SESSION_EXPIRY_MS) {
      sessions.delete(id);
      count++;
    }
  }
  return count;
}
