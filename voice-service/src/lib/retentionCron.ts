import prisma from './prisma.js';
import { logger } from './logger.js';

export async function deleteExpiredTranscripts(): Promise<number> {
  const result = await prisma.voiceTranscript.deleteMany({
    where: {
      deleteAfter: { lt: new Date() }
    }
  });
  logger.info('GDPR retention cleanup completed', { deletedCount: result.count });
  return result.count;
}

export function startRetentionCron(): void {
  // Run every 24 hours (86400000ms)
  const INTERVAL_MS = 24 * 60 * 60 * 1000;

  // Run once on startup (after 60s delay to let server fully start)
  setTimeout(() => {
    deleteExpiredTranscripts().catch(err =>
      logger.error('Retention cron failed', { error: String(err) })
    );
  }, 60_000);

  // Then every 24 hours
  setInterval(() => {
    deleteExpiredTranscripts().catch(err =>
      logger.error('Retention cron failed', { error: String(err) })
    );
  }, INTERVAL_MS);

  logger.info('GDPR retention cron started', { intervalHours: 24 });
}
