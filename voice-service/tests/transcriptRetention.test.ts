import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock prisma before importing retentionCron
vi.mock('../src/lib/prisma.js', () => {
  return {
    default: {
      voiceTranscript: {
        deleteMany: vi.fn().mockResolvedValue({ count: 3 }),
      },
    },
  };
});

// Mock logger to suppress output during tests
vi.mock('../src/lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { deleteExpiredTranscripts, startRetentionCron } from '../src/lib/retentionCron.js';
import prisma from '../src/lib/prisma.js';

describe('deleteExpiredTranscripts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Test 1: calls prisma.voiceTranscript.deleteMany with where deleteAfter lt now', async () => {
    const beforeCall = new Date();
    await deleteExpiredTranscripts();
    const afterCall = new Date();

    expect(prisma.voiceTranscript.deleteMany).toHaveBeenCalledOnce();

    const callArgs = (prisma.voiceTranscript.deleteMany as any).mock.calls[0][0];
    expect(callArgs).toMatchObject({
      where: {
        deleteAfter: {
          lt: expect.any(Date),
        },
      },
    });

    // The date passed as lt should be between beforeCall and afterCall
    const ltDate = callArgs.where.deleteAfter.lt as Date;
    expect(ltDate.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime() - 10);
    expect(ltDate.getTime()).toBeLessThanOrEqual(afterCall.getTime() + 10);
  });

  it('Test 2: returns count of deleted records from deleteMany result', async () => {
    (prisma.voiceTranscript.deleteMany as any).mockResolvedValue({ count: 7 });

    const result = await deleteExpiredTranscripts();

    expect(result).toBe(7);
  });

  it('Test 3: returns 0 when no transcripts are deleted', async () => {
    (prisma.voiceTranscript.deleteMany as any).mockResolvedValue({ count: 0 });

    const result = await deleteExpiredTranscripts();

    expect(result).toBe(0);
  });
});

describe('startRetentionCron', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Test 4: startRetentionCron does not throw', () => {
    expect(() => startRetentionCron()).not.toThrow();
  });

  it('Test 5: startRetentionCron schedules a 24-hour interval', () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

    startRetentionCron();

    // Should have set an interval of 24 hours (86400000ms)
    const calls = setIntervalSpy.mock.calls;
    const has24hInterval = calls.some(([_fn, delay]) => delay === 24 * 60 * 60 * 1000);
    expect(has24hInterval).toBe(true);
  });
});
