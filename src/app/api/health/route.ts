import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";
import { getRecentErrors } from "@/lib/logger";
import { circuits } from "@/lib/resilience";
import { rateLimit, getClientIp } from "@/lib/security";

// Health check endpoint — use for deployment verification + monitoring
// GET /api/health → { status, db, circuits, recentErrors, timestamp }
// Add ?errors=true to include recent error log (protected by CRON_SECRET)
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit("health:" + ip, 60, 60000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const checks: Record<string, unknown> = { status: "ok" };

  // Database connectivity
  let dbError: string | null = null;
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    checks.db = "connected";
  } catch (e) {
    checks.db = "disconnected";
    checks.status = "degraded";
    dbError = e instanceof Error ? `${e.name}: ${e.message}`.slice(0, 400) : String(e).slice(0, 400);
  }

  // Circuit breaker states
  checks.circuits = {
    sendgrid: circuits.sendgrid.getState(),
    serper: circuits.serper.getState(),
    anthropic: circuits.anthropic.getState(),
  };

  // If any circuit is open, status is degraded
  if (Object.values(checks.circuits as Record<string, string>).some((s) => s === "open")) {
    checks.status = "degraded";
  }

  // Include recent errors + count only if authorized (prevents leaking error details publicly)
  const secret = request.headers.get("authorization")?.replace("Bearer ", "") || "";
  const expected = process.env.CRON_SECRET || "";
  const authorized =
    !!secret &&
    !!expected &&
    secret.length === expected.length &&
    timingSafeEqual(Buffer.from(secret), Buffer.from(expected));

  if (authorized) {
    checks.errorCount = getRecentErrors().length;
    if (dbError) checks.dbError = dbError;
    checks.dbUrlHost = (process.env.DATABASE_URL || "").replace(/^postgres(ql)?:\/\/[^@]*@/, "").split("?")[0] || "(unset)";
    if (request.nextUrl.searchParams.get("errors") === "true") {
      checks.recentErrors = getRecentErrors();
    }
  }

  checks.timestamp = new Date().toISOString();

  const status = checks.status === "ok" ? 200 : 503;
  return NextResponse.json(checks, { status });
}
