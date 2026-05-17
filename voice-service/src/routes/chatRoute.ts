import { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma.js';
import {
  getOrCreateChatSession,
  processChatMessage,
  cleanupExpiredSessions,
} from '../handlers/chatSession.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_BODY_BYTES = 8_000;
const MAX_MESSAGE_CHARS = 2_000;
const SHOP_ID_RE = /^[a-zA-Z0-9_-]{1,100}$/;
const SESSION_ID_RE = /^[a-zA-Z0-9_-]{16,128}$/;

// Per-IP rate limit (in-memory — single-instance voice-service)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimit(ip: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitMap) if (now > v.resetAt) rateLimitMap.delete(k);
}, 60_000).unref();

// Validate shopId against DB (cached 5 min) — stops attackers burning LLM budget on fake shops
const shopExistsCache = new Map<string, { valid: boolean; expiresAt: number }>();
async function isKnownShop(shopId: string): Promise<boolean> {
  const cached = shopExistsCache.get(shopId);
  if (cached && Date.now() < cached.expiresAt) return cached.valid;
  const shop = await prisma.shop.findFirst({
    where: { OR: [{ id: shopId }, { slug: shopId }], subscriptionActive: true },
    select: { id: true },
  });
  const valid = !!shop;
  shopExistsCache.set(shopId, { valid, expiresAt: Date.now() + 5 * 60_000 });
  return valid;
}

export async function chatRoutes(app: FastifyInstance) {
  app.options('/chat', async (_request, reply) => {
    reply.headers(CORS_HEADERS).code(204).send();
  });

  app.post('/chat', async (request, reply) => {
    const ip =
      (request.headers['x-real-ip'] as string) ||
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.ip ||
      'unknown';

    if (!rateLimit(`chat:${ip}`, 20, 60_000)) {
      return reply.headers(CORS_HEADERS).code(429).send({ error: 'Too many requests' });
    }

    const contentLength = parseInt((request.headers['content-length'] as string) || '0', 10);
    if (contentLength > MAX_BODY_BYTES) {
      return reply.headers(CORS_HEADERS).code(413).send({ error: 'Payload too large' });
    }

    const body = request.body as {
      shopId?: unknown;
      sessionId?: unknown;
      message?: unknown;
      consentGranted?: unknown;
    };

    if (body.consentGranted !== true) {
      return reply.headers(CORS_HEADERS).code(403).send({ error: 'Consent required' });
    }

    if (
      typeof body.shopId !== 'string' ||
      typeof body.sessionId !== 'string' ||
      typeof body.message !== 'string'
    ) {
      return reply.headers(CORS_HEADERS).code(400).send({ error: 'Missing or invalid fields' });
    }

    if (!SHOP_ID_RE.test(body.shopId) || !SESSION_ID_RE.test(body.sessionId)) {
      return reply.headers(CORS_HEADERS).code(400).send({ error: 'Invalid shopId or sessionId' });
    }

    const message = body.message.trim();
    if (!message || message.length > MAX_MESSAGE_CHARS) {
      return reply.headers(CORS_HEADERS).code(400).send({ error: 'Invalid message length' });
    }

    if (!(await isKnownShop(body.shopId))) {
      return reply.headers(CORS_HEADERS).code(404).send({ error: 'Shop not found' });
    }

    const session = getOrCreateChatSession(body.sessionId, body.shopId);

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...CORS_HEADERS,
    });

    try {
      await processChatMessage(session, message, async (chunk) => {
        reply.raw.write(`data: ${JSON.stringify({ type: 'text', delta: chunk })}\n\n`);
      });
      reply.raw.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    } catch (err) {
      console.error('[chat] Error processing message:', err);
      reply.raw.write(
        `data: ${JSON.stringify({ type: 'error', message: 'Something went wrong' })}\n\n`,
      );
    }

    reply.raw.end();
    cleanupExpiredSessions();
  });
}
