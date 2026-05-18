import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import type { Session, TwilioMediaEvent } from '../types/session.js';
import { createDeepgramConnection } from './deepgramClient.js';
import { logger } from '../lib/logger.js';
import { detectConsentResponse, CONSENT_SCRIPT } from './consentFlow.js';
import { playConsentGreeting, streamTtsToTwilio } from './elevenLabsTts.js';
import { processPatientUtterance, fetchShopContext } from './claudeSession.js';
import { shouldEscalate, executeWarmTransfer, TRANSFER_BRIDGE_MESSAGE } from './escalation.js';
import { writeAuditLog, generateCallSummary, saveCallSummary } from '../lib/auditLog.js';

export const sessions = new Map<string, Session>();

// Deepgram v5 connect() is async; store the Promise so consumers chain off it.
// Pre-open media chunks are buffered behind the promise chain (negligible window).
type DeepgramConnectionPromise = ReturnType<typeof createDeepgramConnection>;
const deepgramConnections = new Map<string, DeepgramConnectionPromise>();

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
        channel: 'voice',
      };
      sessions.set(callSid, session);

      // Fetch shop context for FAQ and booking tools (fire and continue on failure)
      if (session.clinicId) {
        fetchShopContext(session.clinicId)
          .then((ctx) => {
            session.shopContext = ctx;
            logger.info('Shop context loaded', { callSid, shopId: ctx.shopId });
          })
          .catch((err) => {
            logger.error('Failed to load shop context — AI will work without FAQ context', { callSid }, err);
          });
      }

      // Create Deepgram connection for this call (async — store Promise).
      const dgConnectionPromise = createDeepgramConnection(async (transcript) => {
        logger.info('Transcript received', { callSid });
        await handleTranscript(callSid, transcript, ws);
      });
      dgConnectionPromise.catch((err) => {
        logger.error('Failed to open Deepgram connection', { callSid }, err);
      });
      deepgramConnections.set(callSid, dgConnectionPromise);

      // Play GDPR consent greeting via ElevenLabs TTS
      playConsentGreeting(CONSENT_SCRIPT, streamSid, ws).catch((err) => {
        logger.error('Failed to play consent greeting', { callSid }, err);
      });
      break;
    }

    case 'media': {
      const callSid = findCallSidForMedia(event);
      if (!callSid) break;

      const dgConnectionPromise = deepgramConnections.get(callSid);
      if (dgConnectionPromise && event.media?.payload) {
        const audioBuffer = Buffer.from(event.media.payload, 'base64');
        dgConnectionPromise
          .then((conn) => conn.sendMedia(audioBuffer))
          .catch(() => {/* connection error already logged at open time */});
      }
      break;
    }

    case 'stop': {
      const stopCallSid = event.stop?.callSid;
      if (stopCallSid) {
        logger.info('Call ended', { callSid: stopCallSid });

        const session = sessions.get(stopCallSid);

        // Close Deepgram connection
        const dgConnectionPromise = deepgramConnections.get(stopCallSid);
        if (dgConnectionPromise) {
          dgConnectionPromise.then((conn) => conn.close()).catch(() => {/* already logged */});
          deepgramConnections.delete(stopCallSid);
        }

        // Write GDPR audit log and save call summary (fire-and-forget with error logging)
        if (session) {
          session.actionsLog.push('call_ended');

          writeAuditLog(session)
            .then(async () => {
              logger.info('Audit log written', { callSid: stopCallSid });
              try {
                const summary = await generateCallSummary(session);
                const summaryShopId = session.shopContext?.shopId ?? session.clinicId;
                await saveCallSummary(stopCallSid, summary, summaryShopId);
                logger.info('Call summary saved', { callSid: stopCallSid });
              } catch (err) {
                logger.error('Failed to save call summary', { callSid: stopCallSid }, err);
              }
            })
            .catch((err) => {
              logger.error('Failed to write audit log', { callSid: stopCallSid }, err);
            });
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

async function handleTranscript(
  callSid: string,
  transcript: string,
  ws: WebSocket,
): Promise<void> {
  const session = sessions.get(callSid);
  if (!session) return;

  // GDPR consent gate — all patients must consent before conversation
  if (session.consentState === 'pending') {
    const consentResult = detectConsentResponse(transcript);

    if (consentResult === 'granted') {
      session.consentState = 'granted';
      session.consentTimestamp = new Date();
      session.actionsLog.push('consent_granted');
      logger.info('Consent granted', { callSid });

      await streamTtsToTwilio(
        "Thank you! I'll be happy to help you today. What can I assist you with?",
        session.streamSid,
        ws,
      ).catch((err) => logger.error('TTS error', { callSid }, err));
    } else if (consentResult === 'declined') {
      session.consentState = 'declined';
      session.actionsLog.push('consent_declined');
      logger.info('Consent declined', { callSid });

      await streamTtsToTwilio(
        "I understand. Let me connect you with a team member who can assist you.",
        session.streamSid,
        ws,
      ).catch((err) => logger.error('TTS error', { callSid }, err));

      // Transfer to staff since patient declined AI assistance
      if (session.staffPhoneNumber) {
        await executeWarmTransfer(callSid, session.staffPhoneNumber).catch((err) =>
          logger.error('Warm transfer failed', { callSid }, err),
        );
      }
    }
    // If null, patient said something unrecognised — wait for next utterance
    return;
  }

  // Consent granted — check if patient wants to escalate to a human
  if (session.consentState === 'granted') {
    if (shouldEscalate(transcript, session)) {
      if (!session.escalationTriggered) {
        session.escalationTriggered = true;
        session.actionsLog.push('escalated');
      }
      session.actionsLog.push('transferred');
      logger.info('Escalation triggered — executing warm transfer', { callSid });

      await streamTtsToTwilio(TRANSFER_BRIDGE_MESSAGE, session.streamSid, ws).catch(
        (err) => logger.error('TTS error during escalation', { callSid }, err),
      );

      if (session.staffPhoneNumber) {
        await executeWarmTransfer(callSid, session.staffPhoneNumber).catch((err) =>
          logger.error('Warm transfer failed', { callSid }, err),
        );
      }
      return;
    }

    // Normal conversation flow — process via Claude
    await processPatientUtterance(session, transcript, async (sentence) => {
      await streamTtsToTwilio(sentence, session.streamSid, ws).catch((err) =>
        logger.error('TTS streaming error', { callSid }, err),
      );
    }).catch((err) => {
      logger.error('Failed to process patient utterance', { callSid }, err);
    });
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
