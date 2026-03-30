import { Redis } from '@upstash/redis';

// Redis-backed idempotency store for voice-service operations
// This mirrors the same Redis client as the main app's resilience.ts
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const IDEMPOTENCY_TTL = 300; // 5 minutes in seconds

export async function checkIdempotency(key: string): Promise<unknown | null> {
  const raw = await redis.get<string>(key);
  if (!raw) return null;
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return raw;
  }
}

export async function setIdempotency(key: string, result: unknown): Promise<void> {
  await redis.set(key, JSON.stringify(result), { ex: IDEMPOTENCY_TTL });
}
