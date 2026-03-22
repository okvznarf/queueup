import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

function getJwtSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET environment variable is required");
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createToken(payload: { userId: string; email: string; role: string }): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}

export async function getAuthUser(): Promise<any> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

// Verify admin is authenticated and owns the given shop
export async function requireAdmin(request: Request, shopId?: string): Promise<{ user: any; error?: never } | { user?: never; error: Response }> {
  const cookieHeader = request.headers.get("cookie") || "";
  const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;
  if (!token) return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } }) };

  const user = verifyToken(token);
  if (!user) return { error: new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { "Content-Type": "application/json" } }) };

  // Superadmins can access any shop
  if (shopId && user.role !== "superadmin") {
    const { default: prisma } = await import("@/lib/prisma");
    const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { ownerId: true } });
    if (!shop || shop.ownerId !== user.userId) {
      return { error: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } }) };
    }
  }

  return { user };
}

// Verify customer or admin is authenticated
export function requireAuth(request: Request): { user: any; error?: never } | { user?: never; error: Response } {
  const cookieHeader = request.headers.get("cookie") || "";
  // Check admin token first, then customer token
  const adminMatch = cookieHeader.match(/auth_token=([^;]+)/);
  const customerMatch = cookieHeader.match(/customer_token=([^;]+)/);
  const token = adminMatch ? adminMatch[1] : customerMatch ? customerMatch[1] : null;
  if (!token) return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } }) };

  const user = verifyToken(token);
  if (!user) return { error: new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { "Content-Type": "application/json" } }) };

  return { user };
}