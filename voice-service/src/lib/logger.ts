type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext extends Record<string, unknown> {
  callSid?: string;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: string;
  stack?: string;
}

function formatError(err: unknown): { error: string; stack?: string } {
  if (err instanceof Error) {
    return { error: err.message, stack: err.stack };
  }
  if (typeof err === 'string') return { error: err };
  return { error: String(err) };
}

function log(level: LogLevel, message: string, context?: LogContext, err?: unknown) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context ? { context } : {}),
    ...(err ? formatError(err) : {}),
  };

  const line = JSON.stringify(entry);

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext, err?: unknown) => log('error', message, context, err),
  debug: (message: string, context?: LogContext) => log('debug', message, context),
};
