import prisma from './prisma.js';
import type { Session } from '../types/session.js';
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';

const anthropic = new Anthropic();
const RETENTION_DAYS = parseInt(process.env.TRANSCRIPT_RETENTION_DAYS || '90', 10);

export function hashPhoneLastFour(phone: string): string {
  const lastFour = phone.replace(/\D/g, '').slice(-4);
  return crypto.createHash('sha256').update(lastFour).digest('hex').substring(0, 16);
}

export async function writeAuditLog(session: Session): Promise<string> {
  const durationSeconds = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
  const phoneHash = session.patientPhoneHash || null;

  // Create VoiceCall record
  const voiceCall = await prisma.voiceCall.create({
    data: {
      callSid: session.callSid,
      clinicId: session.clinicId,
      startedAt: session.startedAt,
      endedAt: new Date(),
      durationSec: durationSeconds,
      status: session.escalationTriggered ? 'transferred' : 'completed',
    },
  });

  // Create VoiceAuditLog record (GDPR-03)
  await prisma.voiceAuditLog.create({
    data: {
      callId: voiceCall.id,
      callSid: session.callSid,
      clinicId: session.clinicId,
      consentTimestamp: session.consentTimestamp || null,
      consentType: session.consentState === 'granted' ? 'explicit_verbal' : null,
      phoneHash,
      durationSeconds,
      actionsJson: JSON.stringify(session.actionsLog),
      wasEscalated: session.escalationTriggered,
    },
  });

  // Save transcripts with GDPR retention period (GDPR-01)
  const deleteAfter = new Date();
  deleteAfter.setDate(deleteAfter.getDate() + RETENTION_DAYS);

  if (session.messages.length > 0) {
    await prisma.voiceTranscript.createMany({
      data: session.messages.map((msg) => ({
        callId: voiceCall.id,
        role: msg.role,
        content: msg.content,
        deleteAfter,
      })),
    });
  }

  return voiceCall.id;
}

export async function generateCallSummary(session: Session): Promise<string> {
  if (session.messages.length === 0) return 'Call ended without conversation.';

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 200,
    system:
      'Summarize this phone call in 2-3 sentences. Include: what the patient asked about, any actions taken, and the call outcome. Be concise.',
    messages: [
      {
        role: 'user',
        content: `Call transcript:\n${session.messages.map((m) => `${m.role}: ${m.content}`).join('\n')}`,
      },
    ],
  });

  const summary =
    response.content[0].type === 'text' ? response.content[0].text : '';
  return summary;
}

export async function saveCallSummary(
  callSid: string,
  summary: string
): Promise<void> {
  const baseUrl = process.env.QUEUEUP_API_URL || 'http://localhost:3000';
  const url = new URL('/api/voice/summary', baseUrl).toString();

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-voice-service-token': process.env.VOICE_SERVICE_TOKEN!,
    },
    body: JSON.stringify({ callSid, summary }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to save call summary: ${response.status} ${response.statusText}`
    );
  }
}
