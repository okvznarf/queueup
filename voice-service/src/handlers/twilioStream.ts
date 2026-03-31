import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import type { Session, TwilioMediaEvent } from '../types/session.js';
import { createDeepgramConnection } from './deepgramClient.js';
import { logger } from '../lib/logger.js';

export const sessions = new Map<string, Session>();

const deepgramConnections = new Map<string, ReturnType<typeof createDeepgramConnection>>();

export function handleTwilioMessage(
  event: TwilioMediaEvent,
  ws: WebSocket,
): void {
  switch (event.event) {
    case 'connected': {
      logger.info('Twilio WebSocket connected');
      break;
    }

    case 'start': {
      const { callSid, streamSid, customParameters } = event.start!;
      const session: Session = {
        callSid,
        streamSid,
        clinicId: customParameters?.clinicId ?? '',
        consentState: 'pending',
        messages: [],
        unansweredQuestions: 0,
        escalationTriggered: false,
        startedAt: new Date(),
        actionsLog: [],
        staffPhoneNumber: process.env.DEFAULT_STAFF_PHONE,
      };
      sessions.set(callSid, session);

      // Create Deepgram connection for this call
      const dgConnection = createDeepgramConnection((transcript) => {
        logger.info('Transcript received', { callSid });
        // Transcript routing handled by Plan 04 wiring
      });
      deepgramConnections.set(callSid, dgConnection);

      // TODO: wire ElevenLabs TTS — consent greeting playback
      logger.info('TODO: play consent greeting via ElevenLabs TTS', { callSid });
      break;
    }

    case 'media': {
      const callSid = findCallSidForMedia(event);
      if (!callSid) break;

      const dgConnection = deepgramConnections.get(callSid);
      if (dgConnection && event.media?.payload) {
        const audioBuffer = Buffer.from(event.media.payload, 'base64');
        dgConnection.send(audioBuffer);
      }
      break;
    }

    case 'stop': {
      const stopCallSid = event.stop?.callSid;
      if (stopCallSid) {
        logger.info('Call ended', { callSid: stopCallSid });

        // Close Deepgram connection
        const dgConnection = deepgramConnections.get(stopCallSid);
        if (dgConnection) {
          dgConnection.finish();
          deepgramConnections.delete(stopCallSid);
        }

        sessions.delete(stopCallSid);
      }
      break;
    }

    case 'mark': {
      logger.debug('Mark event received', { callSid: event.mark?.name });
      break;
    }
  }
}

function findCallSidForMedia(event: TwilioMediaEvent): string | undefined {
  // Find the session that matches this stream's media
  for (const [callSid, session] of sessions) {
    return callSid;
  }
  return undefined;
}

export async function registerVoiceStreamRoute(app: FastifyInstance): Promise<void> {
  app.get('/voice-stream', { websocket: true }, (socket) => {
    const ws = socket as unknown as WebSocket;

    ws.on('message', (data: Buffer | string) => {
      try {
        const event: TwilioMediaEvent = JSON.parse(
          typeof data === 'string' ? data : data.toString(),
        );
        handleTwilioMessage(event, ws);
      } catch (err) {
        logger.error('Failed to parse WebSocket message', {}, err);
      }
    });

    ws.on('close', () => {
      logger.info('WebSocket connection closed');
    });
  });
}
