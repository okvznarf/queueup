import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/security";

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/;
const RESERVED_SLUGS = new Set([
  "admin", "api", "booking", "customer", "fran", "onboarding",
  "privacy", "cookies", "impressum", "login", "register",
  "forgot-password", "reset-password", "auth", "dashboard",
  "settings", "billing", "support", "help", "about", "contact",
  "www", "app", "static", "public", "assets",
]);

/**
 * GET /api/shops/check-slug?slug=auto-servis-petrovic
 *
 * Returns { available: boolean, reason?: string, suggestions?: string[] }
 *
 * Used by the onboarding wizard to validate slug availability live.
 * Rate-limited to prevent enumeration. Public (no auth) — used pre-signup.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit(`check-slug:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const slug = (searchParams.get("slug") ?? "").trim().toLowerCase();

  if (!slug) {
    return NextResponse.json({ available: false, reason: "Slug is required" }, { status: 400 });
  }

  if (slug.length < 3) {
    return NextResponse.json({ available: false, reason: "Slug must be at least 3 characters" });
  }

  if (slug.length > 60) {
    return NextResponse.json({ available: false, reason: "Slug must be at most 60 characters" });
  }

  if (!SLUG_REGEX.test(slug)) {
    return NextResponse.json({
      available: false,
      reason: "Slug can only contain lowercase letters, numbers, and hyphens (must start/end with letter or number)",
    });
  }

  if (RESERVED_SLUGS.has(slug)) {
    return NextResponse.json({ available: false, reason: "This slug is reserved" });
  }

  const existing = await prisma.shop.findUnique({ where: { slug }, select: { id: true } });

  if (existing) {
    const suggestions = await generateSuggestions(slug);
    return NextResponse.json({ available: false, reason: "Slug already taken", suggestions });
  }

  return NextResponse.json({ available: true });
}

async function generateSuggestions(base: string): Promise<string[]> {
  const candidates = [
    `${base}-hr`,
    `${base}-zagreb`,
    `${base}-${Math.floor(Math.random() * 90) + 10}`,
    `${base}-shop`,
  ].filter((c) => SLUG_REGEX.test(c) && !RESERVED_SLUGS.has(c) && c.length <= 60);

  const existing = await prisma.shop.findMany({
    where: { slug: { in: candidates } },
    select: { slug: true },
  });
  const taken = new Set(existing.map((s) => s.slug));
  return candidates.filter((c) => !taken.has(c)).slice(0, 3);
}
