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

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(key: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
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

// Validate required fields exist and are non-empty strings
export function validateRequired(obj: Record<string, any>, fields: string[]): string | null {
  for (const field of fields) {
    if (!obj[field] || (typeof obj[field] === "string" && obj[field].trim() === "")) {
      return field + " is required";
    }
  }
  return null;
}