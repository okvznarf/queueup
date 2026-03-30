import { describe, it, expect, afterAll } from 'vitest';
import fastify from 'fastify';
import { healthRoutes } from '../src/routes/health.js';

describe('GET /health', () => {
  const app = fastify({ logger: false });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with status ok and service name', async () => {
    await app.register(healthRoutes);
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('voice-service');
  });
});
