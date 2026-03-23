"use client";

import { useEffect, useRef } from "react";

type EventHandler = (data: unknown) => void;

// Hook: subscribe to real-time shop events via SSE
// Usage: useShopEvents(shopId, { "appointment:created": (data) => refetch() })
export function useShopEvents(shopId: string | null, handlers: Record<string, EventHandler>) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!shopId) return;

    const es = new EventSource(`/api/events?shopId=${shopId}`);

    // Register all event handlers
    const eventNames = Object.keys(handlersRef.current);
    const boundHandlers = eventNames.map((event) => {
      const handler = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          handlersRef.current[event]?.(data);
        } catch {
          // Ignore malformed events
        }
      };
      es.addEventListener(event, handler);
      return { event, handler };
    });

    // Auto-reconnect is built into EventSource — just log errors
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        console.warn("[SSE] Connection closed, browser will auto-reconnect");
      }
    };

    return () => {
      boundHandlers.forEach(({ event, handler }) => es.removeEventListener(event, handler));
      es.close();
    };
  }, [shopId]);
}
