import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

// Get the real client IP — prefer Vercel's trusted header over spoofable x-forwarded-for
export function getClientIp(request: NextRequest | Request): string {
  const headers = request.headers;
  return headers.get("x-real-ip") || headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

// Input sanitization - strips HTML tags and limits length
export function sanitize(input: string, maxLength: number = 500): string {
  if (!input) return "";
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/[<>"'&]/g, (char) => {
      const map: Record<string, string> = { "<": "", ">": "", '"': "", "'": "", "&": "" };
      return map[char] || char;
    })
    .trim()
    .slice(0, maxLength);
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Validate phone format (basic)
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, "");
  return cleaned.length >= 7 && cleaned.length <= 20 && /^[+]?[0-9]+$/.test(cleaned);
}

// --- Rate Limiting ---

// Upstash Redis client (lazy-initialized)
let redis: Redis | null = null;
let redisWarned = false;
function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (process.env.NODE_ENV === "production" && !redisWarned) {
      console.warn("[security] UPSTASH_REDIS_REST_URL/TOKEN not set — rate limiting is in-memory only and ineffective on serverless");
      redisWarned = true;
    }
    return null;
  }
  redis = new Redis({ url, token });
  return redis;
}

// In-memory fallback (used when Redis is not configured)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60_000; // Purge stale entries every 60s

function rateLimitMemory(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();

  // Periodically purge expired entries to prevent memory leaks
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    for (const [k, v] of rateLimitMap) {
      if (now > v.resetTime) rateLimitMap.delete(k);
    }
    lastCleanup = now;
  }

  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

export async function rateLimitRedis(key: string, maxRequests: number, windowMs: number): Promise<boolean> {
  const r = getRedis();
  if (!r) return rateLimitMemory(key, maxRequests, windowMs);

  try {
    const rlKey = `rl:${key}`;
    const count = await r.incr(rlKey);
    if (count === 1) {
      await r.pexpire(rlKey, windowMs);
    }
    return count <= maxRequests;
  } catch {
    // Fall back to in-memory if Redis fails
    return rateLimitMemory(key, maxRequests, windowMs);
  }
}

// Synchronous rate limiter (backward-compatible, uses in-memory only)
export function rateLimit(key: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  return rateLimitMemory(key, maxRequests, windowMs);
}

// Validate required fields exist and are non-empty strings
export function validateRequired(obj: Record<string, any>, fields: string[]): string | null {
  for (const field of fields) {
    if (!obj[field] || (typeof obj[field] === "string" && obj[field].trim() === "")) {
      return field + " is required";
    }
  }
  return null;
}

// Validate a positive number (integer or float)
export function isPositiveNumber(val: unknown): val is number {
  return typeof val === "number" && isFinite(val) && val >= 0;
}

// Validate integer in range
export function isIntInRange(val: unknown, min: number, max: number): val is number {
  return typeof val === "number" && Number.isInteger(val) && val >= min && val <= max;
}

// Validate time format HH:MM
export function isValidTime(val: unknown): val is string {
  return typeof val === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(val);
}

// Validate ISO date string (YYYY-MM-DD or full ISO)
export function isValidDate(val: unknown): boolean {
  if (typeof val !== "string") return false;
  const d = new Date(val);
  return !isNaN(d.getTime());
}

// Validate UUID format
export function isValidUUID(val: unknown): val is string {
  return typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

// Validate hex token (e.g., password reset tokens)
export function isValidHexToken(val: unknown): val is string {
  return typeof val === "string" && /^[0-9a-f]{16,128}$/i.test(val);
}

// Parse JSON body with size limit (returns null if oversized/malformed)
export async function parseBody(request: NextRequest, maxBytes: number = 100_000): Promise<any | null> {
  try {
    const text = await request.text();
    if (text.length > maxBytes) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

