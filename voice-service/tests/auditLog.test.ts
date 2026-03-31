import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Session } from '../src/types/session.js';

// Mock prisma before importing auditLog
vi.mock('../src/lib/prisma.js', () => {
  const mockVoiceCall = {
    id: 'call-id-123',
    callSid: 'CA-test',
    clinicId: 'clinic-1',
  };

  return {
    default: {
      voiceCall: {
        create: vi.fn().mockResolvedValue(mockVoiceCall),
      },
      voiceAuditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
      voiceTranscript: {
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
    },
  };
});

// Mock Anthropic
vi.mock('@anthropic-ai/sdk', () => {
  function Anthropic() {
    return {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'Patient called to ask about appointment scheduling.' }],
        }),
      },
    };
  }
  return { default: Anthropic };
});

import { writeAuditLog, generateCallSummary, saveCallSummary } from '../src/lib/auditLog.js';
import prisma from '../src/lib/prisma.js';

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    callSid: 'CA-test',
    streamSid: 'MZ-test',
    clinicId: 'clinic-1',
    consentState: 'granted',
    consentTimestamp: new Date('2026-01-01T10:00:00Z'),
    messages: [
      { role: 'user', content: 'Hello, I need to book an appointment' },
      { role: 'assistant', content: 'Of course! I can help with that.' },
    ],
    unansweredQuestions: 0,
    escalationTriggered: false,
    startedAt: new Date(Date.now() - 60000), // 60 seconds ago
    actionsLog: ['consent_granted', 'greeted'],
    patientPhoneHash: 'abc123hash',
    staffPhoneNumber: '+15551234567',
    ...overrides,
  };
}

describe('writeAuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Test 1: creates a VoiceCall record with correct callSid and status', async () => {
    const session = makeSession();
    await writeAuditLog(session);

    expect(prisma.voiceCall.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          callSid: 'CA-test',
          status: 'completed',
        }),
      })
    );
  });

  it('Test 2: creates a VoiceAuditLog record with consentTimestamp, callSid, clinicId', async () => {
    const session = makeSession();
    await writeAuditLog(session);

    expect(prisma.voiceAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          callSid: 'CA-test',
          clinicId: 'clinic-1',
          consentTimestamp: session.consentTimestamp,
        }),
      })
    );
  });

  it('Test 3: sets wasEscalated from session.escalationTriggered', async () => {
    const session = makeSession({ escalationTriggered: true });
    await writeAuditLog(session);

    expect(prisma.voiceAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          wasEscalated: true,
        }),
      })
    );

    // Also test VoiceCall status when escalated
    expect(prisma.voiceCall.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'transferred',
        }),
      })
    );
  });

  it('Test 4: stores actionsJson as JSON string of session.actionsLog', async () => {
    const session = makeSession();
    await writeAuditLog(session);

    expect(prisma.voiceAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionsJson: JSON.stringify(['consent_granted', 'greeted']),
        }),
      })
    );
  });

  it('Test 5: computes durationSeconds from session.startedAt to now', async () => {
    const session = makeSession();
    await writeAuditLog(session);

    const auditLogCall = (prisma.voiceAuditLog.create as any).mock.calls[0][0];
    const durationSeconds = auditLogCall.data.durationSeconds;

    // Should be approximately 60 seconds (we set startedAt 60s ago)
    expect(durationSeconds).toBeGreaterThanOrEqual(55);
    expect(durationSeconds).toBeLessThan(120);
  });

  it('Test 6: stores phoneHash (not raw phone number)', async () => {
    const session = makeSession({ patientPhoneHash: 'abc123hash' });
    await writeAuditLog(session);

    expect(prisma.voiceAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          phoneHash: 'abc123hash',
        }),
      })
    );

    // Ensure raw phone number is NOT stored
    const auditLogCall = (prisma.voiceAuditLog.create as any).mock.calls[0][0];
    expect(JSON.stringify(auditLogCall.data)).not.toContain('+15551234567');
  });

  it('Test 7: creates VoiceTranscript rows with deleteAfter set to createdAt + 90 days', async () => {
    const session = makeSession();
    await writeAuditLog(session);

    expect(prisma.voiceTranscript.createMany).toHaveBeenCalled();

    const transcriptCall = (prisma.voiceTranscript.createMany as any).mock.calls[0][0];
    const firstTranscript = transcriptCall.data[0];
    expect(firstTranscript.deleteAfter).toBeDefined();

    const now = new Date();
    const deleteAfter = new Date(firstTranscript.deleteAfter);
    const daysDiff = (deleteAfter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeGreaterThanOrEqual(88); // ~90 days
    expect(daysDiff).toBeLessThan(92);
  });
});
