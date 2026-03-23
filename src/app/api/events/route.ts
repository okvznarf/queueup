import { NextRequest } from "next/server";

// In-memory event bus — broadcasts to all connected SSE clients for a shop
// On Vercel, each serverless instance has its own set of listeners.
// For multi-instance sync at scale, replace with Redis Pub/Sub.

type Listener = (event: string, data: string) => void;

const shopListeners = new Map<string, Set<Listener>>();

export function broadcastToShop(shopId: string, event: string, data: unknown) {
  const listeners = shopListeners.get(shopId);
  if (!listeners) return;
  const json = JSON.stringify(data);
  for (const fn of listeners) {
    fn(event, json);
  }
}

// GET /api/events?shopId=xxx → Server-Sent Events stream
export async function GET(request: NextRequest) {
  const shopId = request.nextUrl.searchParams.get("shopId");
  if (!shopId) {
    return new Response("shopId required", { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (event: string, data: string) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
        } catch {
          // Client disconnected
          cleanup();
        }
      };

      // Send heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        send("ping", `"${new Date().toISOString()}"`);
      }, 30_000);

      // Register listener for this shop
      if (!shopListeners.has(shopId)) {
        shopListeners.set(shopId, new Set());
      }
      shopListeners.get(shopId)!.add(send);

      // Send initial connection confirmation
      send("connected", JSON.stringify({ shopId }));

      function cleanup() {
        clearInterval(heartbeat);
        shopListeners.get(shopId!)?.delete(send);
        if (shopListeners.get(shopId!)?.size === 0) {
          shopListeners.delete(shopId!);
        }
      }

      // Clean up when client disconnects
      request.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
