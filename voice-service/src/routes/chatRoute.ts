import { FastifyInstance } from 'fastify';
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

export async function chatRoutes(app: FastifyInstance) {
  // CORS preflight
  app.options('/chat', async (_request, reply) => {
    reply.headers(CORS_HEADERS).code(204).send();
  });

  app.post('/chat', async (request, reply) => {
    const body = request.body as {
      shopId?: string;
      sessionId?: string;
      message?: string;
      consentGranted?: boolean;
    };

    if (!body.consentGranted) {
      return reply
        .headers(CORS_HEADERS)
        .code(403)
        .send({ error: 'Consent required' });
    }

    if (!body.shopId || !body.sessionId || !body.message) {
      return reply
        .headers(CORS_HEADERS)
        .code(400)
        .send({ error: 'Missing required fields' });
    }

    const session = getOrCreateChatSession(body.sessionId, body.shopId);

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...CORS_HEADERS,
    });

    try {
      await processChatMessage(session, body.message, async (chunk) => {
        reply.raw.write(`data: ${JSON.stringify({ type: 'text', delta: chunk })}\n\n`);
      });
      reply.raw.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    } catch (err) {
      reply.raw.write(
        `data: ${JSON.stringify({ type: 'error', message: 'Something went wrong' })}\n\n`,
      );
    }

    reply.raw.end();
    cleanupExpiredSessions();
  });
}
