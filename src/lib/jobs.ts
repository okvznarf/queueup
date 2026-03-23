// ─── Lightweight Job Queue for Vercel Serverless ─────────────────────────────
//
// Architecture:
//   Jobs stored in PostgreSQL → Cron endpoint polls for pending jobs → Workers execute
//   This works on Vercel because the cron triggers a serverless function that processes jobs.
//
// For higher scale: swap PostgreSQL storage for BullMQ + Redis (same interface).
//
// Job lifecycle: PENDING → PROCESSING → COMPLETED | FAILED → (retry) → PENDING
//
// Usage:
//   await enqueueJob("email:reminder", { appointmentId: "abc" });
//   await enqueueJob("email:confirmation", { ... }, { runAt: new Date("2026-04-01") });

import prisma from "./prisma";

export interface JobPayload {
  [key: string]: unknown;
}

interface EnqueueOptions {
  runAt?: Date;       // Schedule for later (default: now)
  maxRetries?: number; // Max retry attempts (default: 3)
}

// ─── Enqueue a job ──────────────────────────────────────────────────────────

export async function enqueueJob(
  type: string,
  payload: JobPayload,
  opts: EnqueueOptions = {},
) {
  // Using a generic JSON store approach — no schema migration needed.
  // Jobs table created via raw SQL on first use (see ensureJobsTable below).
  await ensureJobsTable();

  const runAt = opts.runAt ?? new Date();
  const maxRetries = opts.maxRetries ?? 3;

  await prisma.$queryRawUnsafe(
    `INSERT INTO _jobs (type, payload, status, run_at, max_retries, attempts, created_at, updated_at)
     VALUES ($1, $2, 'pending', $3, $4, 0, NOW(), NOW())`,
    type,
    JSON.stringify(payload),
    runAt,
    maxRetries,
  );
}

// ─── Process pending jobs ───────────────────────────────────────────────────

type JobHandler = (payload: JobPayload) => Promise<void>;

const handlers = new Map<string, JobHandler>();

export function registerJobHandler(type: string, handler: JobHandler) {
  handlers.set(type, handler);
}

export async function processJobs(batchSize = 10): Promise<{ processed: number; failed: number }> {
  await ensureJobsTable();

  // Claim a batch of pending jobs (atomic — prevents double processing)
  const jobs = await prisma.$queryRawUnsafe<Array<{
    id: string; type: string; payload: string; attempts: number; max_retries: number;
  }>>(
    `UPDATE _jobs
     SET status = 'processing', updated_at = NOW()
     WHERE id IN (
       SELECT id FROM _jobs
       WHERE status = 'pending' AND run_at <= NOW()
       ORDER BY created_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING id, type, payload, attempts, max_retries`,
    batchSize,
  );

  let processed = 0;
  let failed = 0;

  for (const job of jobs) {
    const handler = handlers.get(job.type);
    if (!handler) {
      console.error(`[jobs] No handler registered for type: ${job.type}`);
      await markFailed(job.id, `No handler for type: ${job.type}`);
      failed++;
      continue;
    }

    try {
      const payload = JSON.parse(job.payload);
      await handler(payload);
      await markCompleted(job.id);
      processed++;
    } catch (err) {
      const attempts = job.attempts + 1;
      if (attempts >= job.max_retries) {
        await markFailed(job.id, String(err));
        failed++;
      } else {
        // Exponential backoff: retry in 2^attempts minutes
        const retryAt = new Date(Date.now() + Math.pow(2, attempts) * 60_000);
        await markRetry(job.id, attempts, retryAt);
        failed++;
      }
    }
  }

  return { processed, failed };
}

// ─── Job status helpers ─────────────────────────────────────────────────────

async function markCompleted(id: string) {
  await prisma.$queryRawUnsafe(
    `UPDATE _jobs SET status = 'completed', updated_at = NOW() WHERE id = $1`, id,
  );
}

async function markFailed(id: string, error: string) {
  await prisma.$queryRawUnsafe(
    `UPDATE _jobs SET status = 'failed', last_error = $2, updated_at = NOW() WHERE id = $1`,
    id, error.slice(0, 1000),
  );
}

async function markRetry(id: string, attempts: number, runAt: Date) {
  await prisma.$queryRawUnsafe(
    `UPDATE _jobs SET status = 'pending', attempts = $2, run_at = $3, updated_at = NOW() WHERE id = $1`,
    id, attempts, runAt,
  );
}

// ─── Auto-create jobs table if missing ──────────────────────────────────────

let tableChecked = false;

async function ensureJobsTable() {
  if (tableChecked) return;
  await prisma.$queryRawUnsafe(`
    CREATE TABLE IF NOT EXISTS _jobs (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type        TEXT NOT NULL,
      payload     JSONB NOT NULL DEFAULT '{}',
      status      TEXT NOT NULL DEFAULT 'pending',
      run_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      max_retries INT NOT NULL DEFAULT 3,
      attempts    INT NOT NULL DEFAULT 0,
      last_error  TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$queryRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_jobs_pending ON _jobs (status, run_at) WHERE status = 'pending'
  `);
  tableChecked = true;
}
