import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @upstash/redis before importing the module under test
vi.mock('@upstash/redis', () => {
  const mockGet = vi.fn();
  const mockSet = vi.fn();
  return {
    Redis: vi.fn().mockImplementation(() => ({
      get: mockGet,
      set: mockSet,
    })),
    __mockGet: mockGet,
    __mockSet: mockSet,
  };
});

// Set required env vars before module import
process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';

const { __mockGet, __mockSet } = await import('@upstash/redis') as any;

// Dynamically import after mocking
const { checkIdempotency, setIdempotency } = await import('../../src/lib/resilience.js');

describe('Redis-backed idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Test 1: checkIdempotency returns null for unknown key', async () => {
    __mockGet.mockResolvedValue(null);
    const result = await checkIdempotency('unknown-key');
    expect(result).toBeNull();
    expect(__mockGet).toHaveBeenCalledWith('unknown-key');
  });

  it('Test 2: setIdempotency stores value, checkIdempotency retrieves it', async () => {
    const value = { appointmentId: 'abc123', status: 'CONFIRMED' };
    __mockSet.mockResolvedValue('OK');
    __mockGet.mockResolvedValue(JSON.stringify(value));

    await setIdempotency('booking:shop1:2026-04-01:09:00:+441234567890', value);
    const result = await checkIdempotency('booking:shop1:2026-04-01:09:00:+441234567890');

    expect(result).toEqual(value);
    expect(__mockSet).toHaveBeenCalledWith(
      'booking:shop1:2026-04-01:09:00:+441234567890',
      JSON.stringify(value),
      { ex: 300 }
    );
  });

  it('Test 3: setIdempotency passes ex: 300 to redis.set', async () => {
    __mockSet.mockResolvedValue('OK');
    await setIdempotency('some-key', { foo: 'bar' });

    expect(__mockSet).toHaveBeenCalledWith(
      'some-key',
      JSON.stringify({ foo: 'bar' }),
      expect.objectContaining({ ex: 300 })
    );
  });
});
