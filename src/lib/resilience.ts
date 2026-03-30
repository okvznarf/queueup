// ─── Retry with Exponential Backoff ─────────────────────────────────────────

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryOn?: (error: unknown) => boolean;
}

const DEFAULT_RETRY: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 10_000,
  retryOn: () => true,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const { maxRetries, baseDelayMs, maxDelayMs, retryOn } = { ...DEFAULT_RETRY, ...opts };

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries || !retryOn(err)) throw err;

      // Exponential backoff with jitter: delay = min(base * 2^attempt + jitter, max)
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt) + Math.random() * 200, maxDelayMs);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// Helper: only retry on transient errors (network, 5xx, rate limits)
export function isTransientError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("econnreset") || msg.includes("etimedout") || msg.includes("enotfound") || msg.includes("fetch failed")) return true;
  }
  // SendGrid / HTTP errors with status codes
  const status = (err as any)?.code ?? (err as any)?.response?.status ?? (err as any)?.status;
  if (typeof status === "number") {
    return status === 429 || status >= 500;
  }
  return false;
}

// ─── Circuit Breaker ────────────────────────────────────────────────────────

type CircuitState = "closed" | "open" | "half-open";

interface CircuitBreakerOptions {
  failureThreshold?: number;  // failures before opening
  resetTimeoutMs?: number;    // how long to stay open before half-open
  name?: string;
}

class CircuitBreaker {
  private state: CircuitState = "closed";
  private failures = 0;
  private lastFailureTime = 0;
  private readonly threshold: number;
  private readonly resetTimeout: number;
  readonly name: string;

  constructor(opts: CircuitBreakerOptions = {}) {
    this.threshold = opts.failureThreshold ?? 5;
    this.resetTimeout = opts.resetTimeoutMs ?? 30_000;
    this.name = opts.name ?? "default";
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = "half-open";
      } else {
        throw new CircuitOpenError(this.name);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = "closed";
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.threshold) {
      this.state = "open";
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

export class CircuitOpenError extends Error {
  constructor(name: string) {
    super(`Circuit breaker "${name}" is open — service unavailable`);
    this.name = "CircuitOpenError";
  }
}

// Shared circuit breakers for external services
export const circuits = {
  sendgrid: new CircuitBreaker({ name: "sendgrid", failureThreshold: 3, resetTimeoutMs: 60_000 }),
  serper: new CircuitBreaker({ name: "serper", failureThreshold: 5, resetTimeoutMs: 30_000 }),
  anthropic: new CircuitBreaker({ name: "anthropic", failureThreshold: 3, resetTimeoutMs: 60_000 }),
};

// ─── Idempotency ────────────────────────────────────────────────────────────

import { Redis } from "@upstash/redis";

// Redis-backed idempotency store — survives across serverless invocations
// Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const IDEMPOTENCY_TTL = 300; // 5 minutes in seconds

export async function checkIdempotency(key: string): Promise<unknown | null> {
  const raw = await redis.get<string>(key);
  if (!raw) return null;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return raw;
  }
}

export async function setIdempotency(key: string, result: unknown): Promise<void> {
  await redis.set(key, JSON.stringify(result), { ex: IDEMPOTENCY_TTL });
}

// Generate idempotency key from booking params (same customer + shop + date + time = same booking)
export function bookingIdempotencyKey(shopId: string, date: string, startTime: string, phone: string): string {
  return `booking:${shopId}:${date}:${startTime}:${phone}`;
}
