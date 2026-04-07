import { useState, useEffect, useRef } from 'preact/hooks';
import { Consent } from './Consent';
import { MessageList } from './Messages';
import { sendMessage } from './api';
import { getSessionId, getMessages, saveMessages, getConsent, setConsent } from './session';
import type { ChatMessage } from './session';

interface ShopConfig {
  shopName: string;
  primaryColor: string;
  slug: string;
}

export function App({ shopId }: { shopId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [consented, setConsented] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shopConfig, setShopConfig] = useState<ShopConfig | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const appUrl = (window as any).QUEUEUP_API_URL || window.location.origin;
    fetch(`${appUrl}/api/widget/config?shopId=${encodeURIComponent(shopId)}`)
      .then((r) => r.json())
      .then((data) => setShopConfig(data))
      .catch(() => setShopConfig({ shopName: 'Chat', primaryColor: '#6366f1', slug: shopId }));

    setMessages(getMessages(shopId));
    setConsented(getConsent(shopId));
  }, [shopId]);

  useEffect(() => {
    if (isOpen && consented && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, consented]);

  const handleAccept = () => {
    setConsented(true);
    setConsent(shopId);
  };

  const handleDecline = () => {
    setIsOpen(false);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setStreamingContent('');

    const sessionId = getSessionId(shopId);
    const apiUrl = (window as any).QUEUEUP_CHAT_API_URL || 'https://voice.queueup.com';

    let accumulated = '';
    try {
      await sendMessage(apiUrl, shopId, sessionId, text, (chunk) => {
        accumulated += chunk;
        setStreamingContent(accumulated);
      });
      const aiMsg: ChatMessage = { role: 'assistant', content: accumulated };
      const final = [...newMessages, aiMsg];
      setMessages(final);
      saveMessages(shopId, final);
    } catch {
      const errMsg: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
      };
      const final = [...newMessages, errMsg];
      setMessages(final);
      saveMessages(shopId, final);
    }

    setIsLoading(false);
    setStreamingContent('');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!shopConfig) return null;

  return (
    <>
      <button class="queueup-bubble" onClick={() => setIsOpen(!isOpen)} aria-label="Open chat">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {isOpen && (
        <div class="queueup-panel">
          <div class="queueup-header">
            <span>{shopConfig.shopName}</span>
            <button onClick={() => setIsOpen(false)} aria-label="Close chat">&times;</button>
          </div>

          {!consented ? (
            <Consent onAccept={handleAccept} onDecline={handleDecline} />
          ) : (
            <>
              <MessageList messages={messages} streamingContent={isLoading ? streamingContent : ''} />
              <div class="queueup-input-area">
                <input
                  ref={inputRef}
                  class="queueup-input"
                  type="text"
                  placeholder="Type a message..."
                  value={input}
                  onInput={(e) => setInput((e.target as HTMLInputElement).value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                />
                <button class="queueup-send" onClick={handleSend} disabled={isLoading}>
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
