import { useEffect, useRef } from 'preact/hooks';
import type { ChatMessage } from './session';

export function MessageList({ messages, streamingContent }: {
  messages: ChatMessage[];
  streamingContent: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages.length, streamingContent]);

  return (
    <div class="queueup-messages" ref={containerRef}>
      {messages.map((msg, i) => (
        <div key={i} class={msg.role === 'user' ? 'queueup-msg-user' : 'queueup-msg-ai'}>
          {msg.content}
        </div>
      ))}
      {streamingContent && (
        <div class="queueup-msg-ai">{streamingContent}</div>
      )}
    </div>
  );
}
