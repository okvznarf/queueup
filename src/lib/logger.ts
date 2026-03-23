// Structured logger — replaces raw console.error across the app
// In production: sends errors to /api/health/log for monitoring
// Locally: pretty-prints to console

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;       // e.g. "api:appointments", "email:sendgrid"
  error?: string;         // error message
  stack?: string;         // stack trace
  meta?: Record<string, unknown>;
  timestamp: string;
}

// In-memory buffer for recent errors (last 100) — queryable via /api/health
const errorBuffer: LogEntry[] = [];
const MAX_BUFFER = 100;

function addToBuffer(entry: LogEntry) {
  errorBuffer.push(entry);
  if (errorBuffer.length > MAX_BUFFER) errorBuffer.shift();
}

export function getRecentErrors(): LogEntry[] {
  return [...errorBuffer];
}

function formatError(err: unknown): { error: string; stack?: string } {
  if (err instanceof Error) {
    return { error: err.message, stack: err.stack };
  }
  if (typeof err === "string") return { error: err };
  return { error: String(err) };
}

function log(level: LogLevel, message: string, context?: string, err?: unknown, meta?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    context,
    ...(err ? formatError(err) : {}),
    meta,
    timestamp: new Date().toISOString(),
  };

  // Always buffer errors
  if (level === "error") addToBuffer(entry);

  // Console output
  const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]${context ? ` [${context}]` : ""}`;
  if (level === "error") {
    console.error(prefix, message, err || "");
  } else if (level === "warn") {
    console.warn(prefix, message);
  } else {
    console.log(prefix, message);
  }
}

// Public API — use these everywhere instead of console.error/log
export const logger = {
  info: (message: string, context?: string, meta?: Record<string, unknown>) =>
    log("info", message, context, undefined, meta),

  warn: (message: string, context?: string, meta?: Record<string, unknown>) =>
    log("warn", message, context, undefined, meta),

  error: (message: string, context: string, err?: unknown, meta?: Record<string, unknown>) =>
    log("error", message, context, err, meta),
};
