const SESSION_KEY_PREFIX = 'queueup_session_';

export function getSessionId(shopId: string): string {
  const key = SESSION_KEY_PREFIX + shopId;
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

export interface ChatMessage {
  role: string;
  content: string;
}

export function getMessages(shopId: string): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY_PREFIX + shopId + '_messages');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveMessages(shopId: string, messages: ChatMessage[]): void {
  sessionStorage.setItem(SESSION_KEY_PREFIX + shopId + '_messages', JSON.stringify(messages));
}

export function getConsent(shopId: string): boolean {
  return sessionStorage.getItem(SESSION_KEY_PREFIX + shopId + '_consent') === 'true';
}

export function setConsent(shopId: string): void {
  sessionStorage.setItem(SESSION_KEY_PREFIX + shopId + '_consent', 'true');
}
