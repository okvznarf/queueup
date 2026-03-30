import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @upstash/redis before importing the module under test
// vi.mock is hoisted to the top of the file by vitest
const mockGet = vi.fn();
const mockSet = vi.fn();

vi.mock('@upstash/redis', () => {
  function Redis() {
    return { get: mockGet, set: mockSet };
  }
  return { Redis };
});

// Set required env vars before module import
process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';

// Import voice-service's own idempotency module (uses @upstash/redis from voice-service/node_modules)
const { checkIdempotency, setIdempotency } = await import('../src/lib/idempotency.js');

describe('Redis-backed idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Test 1: checkIdempotency returns null for unknown key', async () => {
    mockGet.mockResolvedValue(null);

    const result = await checkIdempotency('unknown-key');

    expect(result).toBeNull();
    expect(mockGet).toHaveBeenCalledWith('unknown-key');
  });

  it('Test 2: setIdempotency stores value, checkIdempotency retrieves it', async () => {
    const value = { appointmentId: 'abc123', status: 'CONFIRMED' };
    mockSet.mockResolvedValue('OK');
    mockGet.mockResolvedValue(JSON.stringify(value));

    await setIdempotency('booking:shop1:2026-04-01:09:00:+441234567890', value);
    const result = await checkIdempotency('booking:shop1:2026-04-01:09:00:+441234567890');

    expect(result).toEqual(value);
    expect(mockSet).toHaveBeenCalledWith(
      'booking:shop1:2026-04-01:09:00:+441234567890',
      JSON.stringify(value),
      { ex: 300 }
    );
  });

  it('Test 3: setIdempotency passes ex: 300 to redis.set', async () => {
    mockSet.mockResolvedValue('OK');

    await setIdempotency('some-key', { foo: 'bar' });

    expect(mockSet).toHaveBeenCalledWith(
      'some-key',
      JSON.stringify({ foo: 'bar' }),
      expect.objectContaining({ ex: 300 })
    );
  });
});
