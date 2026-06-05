import fs from 'node:fs';
import path from 'node:path';

export type SupervisorLogLevel = 'info' | 'warn' | 'error';

export interface SupervisorLogger {
  log(level: SupervisorLogLevel, message: string, details?: Record<string, unknown>): void;
}

function dateStamp(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function createSupervisorLogger(logsDir: string): SupervisorLogger {
  fs.mkdirSync(logsDir, { recursive: true });

  return {
    log(level, message, details) {
      const now = new Date();
      const line = JSON.stringify({
        timestamp: now.toISOString(),
        level,
        message,
        details: details || {},
      });
      fs.appendFileSync(path.join(logsDir, `${dateStamp(now)}.log`), `${line}\n`, 'utf8');
    },
  };
}
