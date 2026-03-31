import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

import fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { healthRoutes } from './routes/health.js';
import { twimlRoutes } from './routes/twiml.js';
import { registerVoiceStreamRoute } from './handlers/twilioStream.js';
import { logger } from './lib/logger.js';
import { startRetentionCron } from './lib/retentionCron.js';

const app = fastify({ logger: false });

await app.register(fastifyWebsocket);
await app.register(healthRoutes);
await app.register(twimlRoutes);
await registerVoiceStreamRoute(app);

const port = parseInt(process.env.PORT ?? '3001', 10);

try {
  await app.listen({ port, host: '0.0.0.0' });
  logger.info('Voice service started', { port: port as unknown as string });
  startRetentionCron();
} catch (err) {
  logger.error('Failed to start voice service', {}, err);
  process.exit(1);
}
