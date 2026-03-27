import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";
import { getRecentErrors } from "@/lib/logger";
import { circuits } from "@/lib/resilience";

// Health check endpoint — use for deployment verification + monitoring
// GET /api/health → { status, db, circuits, recentErrors, timestamp }
// Add ?errors=true to include recent error log (protected by CRON_SECRET)
export async function GET(request: NextRequest) {
  const checks: Record<string, unknown> = { status: "ok" };

  // Database connectivity
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    checks.db = "connected";
  } catch {
    checks.db = "disconnected";
    checks.status = "degraded";
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

  // Include recent errors if authorized (prevents leaking error details publicly)
  const wantsErrors = request.nextUrl.searchParams.get("errors") === "true";
  if (wantsErrors) {
    const secret = request.headers.get("authorization")?.replace("Bearer ", "") || "";
    const expected = process.env.CRON_SECRET || "";
    if (secret && expected && secret.length === expected.length && timingSafeEqual(Buffer.from(secret), Buffer.from(expected))) {
      checks.recentErrors = getRecentErrors();
    }
  }

  checks.errorCount = getRecentErrors().length;
  checks.timestamp = new Date().toISOString();

  const status = checks.status === "ok" ? 200 : 503;
  return NextResponse.json(checks, { status });
}
