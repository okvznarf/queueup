const SESSION_KEY_PREFIX = 'queueup_session_';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function safeGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // sessionStorage may throw in private mode, when disabled, or when quota is exceeded.
    // Persistence is best-effort — the widget still works in-memory without it.
  }
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'sess-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getSessionId(shopId: string): string {
  const key = SESSION_KEY_PREFIX + shopId;
  const existing = safeGet(key);
  if (existing) return existing;
  const fresh = generateId();
  safeSet(key, fresh);
  return fresh;
}

export function getMessages(shopId: string): ChatMessage[] {
  const raw = safeGet(SESSION_KEY_PREFIX + shopId + '_messages');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is ChatMessage =>
        m != null &&
        typeof m === 'object' &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string',
    );
  } catch {
    return [];
  }
}

export function saveMessages(shopId: string, messages: ChatMessage[]): void {
  safeSet(SESSION_KEY_PREFIX + shopId + '_messages', JSON.stringify(messages));
}

export function getConsent(shopId: string): boolean {
  return safeGet(SESSION_KEY_PREFIX + shopId + '_consent') === 'true';
}

export function setConsent(shopId: string): void {
  safeSet(SESSION_KEY_PREFIX + shopId + '_consent', 'true');
}
