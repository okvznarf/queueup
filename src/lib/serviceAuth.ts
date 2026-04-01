import { requireAdmin } from "@/lib/auth";

/**
 * Verify the request carries a valid INTERNAL_SERVICE_TOKEN Bearer header.
 * This is a long-lived shared secret used by voice-service and chat-service
 * to call QueueUp APIs without a user JWT cookie.
 */
export function verifyServiceToken(request: Request): boolean {
  const token = process.env.INTERNAL_SERVICE_TOKEN;
  if (!token) return false;

  const authHeader = request.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  return match[1] === token;
}

/**
 * Auth middleware that accepts either:
 * 1. A valid INTERNAL_SERVICE_TOKEN Bearer header (voice/chat service)
 * 2. A valid admin JWT cookie (admin dashboard)
 *
 * Allows both service-to-service calls and admin UI calls to use the same
 * endpoints without duplicating routes.
 */
export async function requireServiceOrAdmin(
  request: Request,
  shopId?: string
): Promise<{ authorized: true; error?: never } | { authorized?: never; error: Response }> {
  // Fast path: service token wins immediately — no DB lookup needed
  if (verifyServiceToken(request)) {
    return { authorized: true };
  }

  // Fall back to admin JWT (cookie-based)
  const adminResult = await requireAdmin(request, shopId);
  if (adminResult.error) {
    return { error: adminResult.error };
  }

  return { authorized: true };
}
