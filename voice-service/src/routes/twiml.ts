import { FastifyInstance } from 'fastify';
import twilio from 'twilio';

export async function twimlRoutes(app: FastifyInstance) {
  app.post('/twiml', {
    config: { rawBody: true },
  }, async (request, reply) => {
    const authToken = process.env.TWILIO_AUTH_TOKEN ?? '';
    const voiceServiceHost = process.env.VOICE_SERVICE_HOST ?? '';

    // Validate Twilio signature
    const signature = (request.headers['x-twilio-signature'] as string) ?? '';
    const url = `https://${voiceServiceHost}/twiml`;
    const body = request.body as Record<string, string>;

    const isValid = twilio.validateRequest(authToken, signature, url, body);
    if (!isValid) {
      reply.status(403).send('Forbidden');
      return;
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${voiceServiceHost}/voice-stream"></Stream>
  </Connect>
  <Pause length="120"/>
</Response>`;

    reply.header('Content-Type', 'text/xml').send(twiml);
  });
}
