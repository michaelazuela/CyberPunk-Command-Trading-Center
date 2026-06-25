import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { loadSupervisorConfig } from './config';
import { buildDeliveryVisibilityReport } from './deliveryVisibility';
import { buildHealthReport } from './health';
import { runHtfPreloadStartup } from './htfPreload';
import { createSupervisorLogger } from './logger';
import { sendSupervisorNotifications, sendSupervisorSelfHealNotification } from './notifications';
import { runPreWindowBackfillIfDue } from './preWindowBackfill';
import {
  getSupervisorState,
  isProcessRunning,
  launchEnabledServices,
  restartFailedOwnedServices,
  stopOwnedServices,
  stopProcessTree,
  stopSupervisorProcess,
} from './processManager';
import { buildEndOfDayEvidenceSummary, parseEndOfDayEvidenceSummaryArgs } from './endOfDayEvidenceSummary';
import { buildSupervisorPhase6SignoffStatus, parseSupervisorPhase6SignoffArgs } from './phase6Signoff';
import { buildSupervisorStatus } from './status';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

function withCurrentSupervisorPid<T extends { supervisorPid: number }>(state: T): T {
  return { ...state, supervisorPid: process.pid };
}

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function isDirectCliEntrypoint(): boolean {
  return Boolean(process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url)));
}

async function readLiveSupervisorStatus(configResult = loadSupervisorConfig()): Promise<unknown | null> {
  try {
    const response = await fetch(
      `http://${configResult.config.host}:${configResult.config.port}${configResult.config.statusPath}`,
      { signal: AbortSignal.timeout(3_000) },
    );
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function buildLatestEndOfDayEvidenceSummary() {
  return buildEndOfDayEvidenceSummary(parseEndOfDayEvidenceSummaryArgs([]));
}

function withEndOfDayEvidenceSummary<T>(status: T, endOfDayEvidenceSummary: Awaited<ReturnType<typeof buildLatestEndOfDayEvidenceSummary>>): T {
  if (!status || typeof status !== 'object') return status;
  return { ...status, endOfDayEvidenceSummary };
}

export function isAddressInUseError(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: unknown }).code === 'EADDRINUSE'
  );
}

export async function runSupervisorCheck(): Promise<void> {
  const configResult = loadSupervisorConfig();
  const state = getSupervisorState(configResult.config);
  const health = await buildHealthReport(configResult.config, state);
  const delivery = buildDeliveryVisibilityReport({ staleAfterMs: configResult.config.health.logStaleAfterMs });
  const endOfDayEvidenceSummary = await buildLatestEndOfDayEvidenceSummary();
  printJson(buildSupervisorStatus(configResult, state, health, delivery, new Date(), null, endOfDayEvidenceSummary));
  if (configResult.status !== 'valid') process.exitCode = 1;
}

export async function runSupervisorStatus(): Promise<void> {
  const configResult = loadSupervisorConfig();
  const liveStatus = await readLiveSupervisorStatus(configResult);
  const endOfDayEvidenceSummary = await buildLatestEndOfDayEvidenceSummary();
  if (liveStatus) {
    printJson(withEndOfDayEvidenceSummary(liveStatus, endOfDayEvidenceSummary));
    return;
  }
  const state = getSupervisorState(configResult.config);
  const health = await buildHealthReport(configResult.config, state);
  const delivery = buildDeliveryVisibilityReport({ staleAfterMs: configResult.config.health.logStaleAfterMs });
  printJson(buildSupervisorStatus(configResult, state, health, delivery, new Date(), null, endOfDayEvidenceSummary));
  if (configResult.status !== 'valid') process.exitCode = 1;
}

export async function runSupervisorStop(): Promise<void> {
  const configResult = loadSupervisorConfig();
  const logger = createSupervisorLogger(configResult.config.logsDir);
  const liveStatus = await readLiveSupervisorStatus(configResult) as { supervisor?: { pid?: unknown } } | null;
  const livePid = typeof liveStatus?.supervisor?.pid === 'number' ? liveStatus.supervisor.pid : null;
  const state = stopOwnedServices(configResult.config, logger);
  const health = await buildHealthReport(configResult.config, state);
  const delivery = buildDeliveryVisibilityReport({ staleAfterMs: configResult.config.health.logStaleAfterMs });
  printJson(buildSupervisorStatus(configResult, state, health, delivery));
  if (livePid && livePid !== process.pid && isProcessRunning(livePid)) {
    logger.log('info', 'Supervisor process stop requested.', { pid: livePid, source: 'live_status' });
    stopProcessTree(livePid);
    return;
  }
  stopSupervisorProcess(configResult.config, logger);
}

export async function runSupervisorPhase6Signoff(args = process.argv.slice(3)): Promise<void> {
  const options = parseSupervisorPhase6SignoffArgs(args);
  const status = await buildSupervisorPhase6SignoffStatus(options);
  if (options.json) printJson(status);
  else process.stdout.write(`${status.bottomLine}\n`);
  if (status.status !== 'ready') process.exitCode = 1;
}

export function startSupervisor(): http.Server {
  const configResult = loadSupervisorConfig();
  const logger = createSupervisorLogger(configResult.config.logsDir);
  logger.log('info', 'Supervisor starting.', {
    phase: 'phase_3_health_restart',
    startsChildProcesses: true,
    autoRestartsChildProcesses: configResult.config.health.restartEnabled,
    restartPolicy: 'owned_failed_child_process_only',
  });
  let supervisorState = withCurrentSupervisorPid(getSupervisorState(configResult.config));
  let lastHealthReport = null as Awaited<ReturnType<typeof buildHealthReport>> | null;
  let lastDeliveryReport = null as ReturnType<typeof buildDeliveryVisibilityReport> | null;
  let lastPreWindowBackfill = null as ReturnType<typeof runPreWindowBackfillIfDue> | null;
  let monitorTimer: NodeJS.Timeout | null = null;
  let monitorInFlight = false;

  const monitor = async () => {
    if (monitorInFlight) {
      logger.log('warn', 'Supervisor monitor skipped; previous monitor check is still running.');
      return;
    }
    monitorInFlight = true;
    try {
      supervisorState = withCurrentSupervisorPid(restartFailedOwnedServices(configResult.config, logger));
      lastPreWindowBackfill = runPreWindowBackfillIfDue(configResult.config, logger);
      lastHealthReport = await buildHealthReport(configResult.config, supervisorState);
      lastDeliveryReport = buildDeliveryVisibilityReport({ staleAfterMs: configResult.config.health.logStaleAfterMs });
      const status = buildSupervisorStatus(
        configResult,
        supervisorState,
        lastHealthReport,
        lastDeliveryReport,
        new Date(),
        lastPreWindowBackfill,
      );
      const notificationResult = await sendSupervisorNotifications(status);
      logger.log(lastHealthReport.status === 'fail' ? 'warn' : 'info', 'Supervisor health checked.', {
        status: lastHealthReport.status,
        preWindowBackfill: lastPreWindowBackfill.reason,
        notificationsSent: notificationResult.sent,
        notificationsSkipped: notificationResult.skipped,
        notificationKinds: notificationResult.notifications.map((item) => item.kind),
      });
    } finally {
      monitorInFlight = false;
    }
  };
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url || '/', `http://${configResult.config.host}:${configResult.config.port}`);
    if (request.method === 'GET' && url.pathname === configResult.config.statusPath) {
      supervisorState = withCurrentSupervisorPid(getSupervisorState(configResult.config));
      if (!lastDeliveryReport) {
        lastDeliveryReport = buildDeliveryVisibilityReport({ staleAfterMs: configResult.config.health.logStaleAfterMs });
      }
      const endOfDayEvidenceSummary = await buildLatestEndOfDayEvidenceSummary();
      const status = buildSupervisorStatus(
        configResult,
        supervisorState,
        lastHealthReport,
        lastDeliveryReport,
        new Date(),
        lastPreWindowBackfill,
        endOfDayEvidenceSummary,
      );
      logger.log('info', 'Status requested.', { path: url.pathname, configStatus: status.config.status });
      response.writeHead(configResult.status === 'valid' ? 200 : 500, {
        'Content-Type': 'application/json',
      });
      response.end(JSON.stringify(status, null, 2));
      return;
    }

    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'not_found' }));
  });

  const shutdown = () => {
    logger.log('info', 'Supervisor shutting down.');
    if (monitorTimer) clearInterval(monitorTimer);
    stopOwnedServices(configResult.config, logger);
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  server.on('error', (error) => {
    if (isAddressInUseError(error)) {
      logger.log('info', 'Supervisor already running; status endpoint port is in use.', {
        host: configResult.config.host,
        port: configResult.config.port,
        statusPath: configResult.config.statusPath,
      });
      process.stdout.write(
        `Quant Desk Local Supervisor already running on http://${configResult.config.host}:${configResult.config.port}${configResult.config.statusPath}\n`,
      );
      process.exit(0);
    }

    logger.log('error', 'Supervisor failed to listen.', { error: String(error) });
    process.stderr.write(`Quant Desk Local Supervisor failed to start: ${String(error)}\n`);
    process.exit(1);
  });

  server.listen(configResult.config.port, configResult.config.host, () => {
    logger.log('info', 'Supervisor listening.', {
      host: configResult.config.host,
      port: configResult.config.port,
      statusPath: configResult.config.statusPath,
    });
    process.stdout.write(
      `Quant Desk Local Supervisor listening on http://${configResult.config.host}:${configResult.config.port}${configResult.config.statusPath}\n`,
    );

    const preloadResult = runHtfPreloadStartup(configResult.config, logger);
    logger.log(preloadResult.ok ? 'info' : 'warn', 'HTF preload startup result.', {
      enabled: preloadResult.enabled,
      attempted: preloadResult.attempted,
      ok: preloadResult.ok,
      reason: preloadResult.reason,
      stdoutLog: preloadResult.stdoutLog,
      stderrLog: preloadResult.stderrLog,
    });
    supervisorState = launchEnabledServices(configResult.config, logger);
    monitorTimer = setInterval(() => {
      monitor().catch((error) => logger.log('warn', 'Supervisor monitor failed safely.', { error: String(error) }));
    }, configResult.config.health.monitorIntervalMs);
    monitor().catch((error) => logger.log('warn', 'Initial supervisor monitor failed safely.', { error: String(error) }));
  });

  return server;
}

if (isDirectCliEntrypoint()) {
  const command = process.argv[2] || 'start';

  if (command === 'check') {
    await runSupervisorCheck();
  } else if (command === 'start') {
    startSupervisor();
  } else if (command === 'status') {
    await runSupervisorStatus();
  } else if (command === 'stop') {
    await runSupervisorStop();
  } else if (command === 'phase6-signoff') {
    await runSupervisorPhase6Signoff();
  } else if (command === 'notify-self-heal') {
    const configResult = loadSupervisorConfig();
    const result = await sendSupervisorSelfHealNotification(configResult.config.logsDir);
    printJson(result);
  } else {
    process.stderr.write('Usage: tsx tools/supervisor/index.ts [start|check|status|stop|phase6-signoff|notify-self-heal]\n');
    process.exitCode = 1;
  }
}
