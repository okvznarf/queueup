import { Redis } from "@upstash/redis";

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
function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

// In-memory fallback (used when Redis is not configured)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function rateLimitMemory(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
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
