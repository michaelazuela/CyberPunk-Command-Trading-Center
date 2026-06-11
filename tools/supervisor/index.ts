import http from 'node:http';
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
  launchEnabledServices,
  restartFailedOwnedServices,
  stopOwnedServices,
  stopSupervisorProcess,
} from './processManager';
import { buildSupervisorStatus } from './status';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

function withCurrentSupervisorPid<T extends { supervisorPid: number }>(state: T): T {
  return { ...state, supervisorPid: process.pid };
}

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export async function runSupervisorCheck(): Promise<void> {
  const configResult = loadSupervisorConfig();
  const state = getSupervisorState(configResult.config);
  const health = await buildHealthReport(configResult.config, state);
  const delivery = buildDeliveryVisibilityReport({ staleAfterMs: configResult.config.health.logStaleAfterMs });
  printJson(buildSupervisorStatus(configResult, state, health, delivery));
  if (configResult.status !== 'valid') process.exitCode = 1;
}

export async function runSupervisorStop(): Promise<void> {
  const configResult = loadSupervisorConfig();
  const logger = createSupervisorLogger(configResult.config.logsDir);
  const state = stopOwnedServices(configResult.config, logger);
  const health = await buildHealthReport(configResult.config, state);
  const delivery = buildDeliveryVisibilityReport({ staleAfterMs: configResult.config.health.logStaleAfterMs });
  printJson(buildSupervisorStatus(configResult, state, health, delivery));
  stopSupervisorProcess(configResult.config, logger);
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
  const preloadResult = runHtfPreloadStartup(configResult.config, logger);
  logger.log(preloadResult.ok ? 'info' : 'warn', 'HTF preload startup result.', {
    enabled: preloadResult.enabled,
    attempted: preloadResult.attempted,
    ok: preloadResult.ok,
    reason: preloadResult.reason,
    stdoutLog: preloadResult.stdoutLog,
    stderrLog: preloadResult.stderrLog,
  });
  let supervisorState = launchEnabledServices(configResult.config, logger);
  let lastHealthReport = null as Awaited<ReturnType<typeof buildHealthReport>> | null;

  const monitor = async () => {
    supervisorState = withCurrentSupervisorPid(restartFailedOwnedServices(configResult.config, logger));
    const preWindowBackfill = runPreWindowBackfillIfDue(configResult.config, logger);
    lastHealthReport = await buildHealthReport(configResult.config, supervisorState);
    const delivery = buildDeliveryVisibilityReport({ staleAfterMs: configResult.config.health.logStaleAfterMs });
    const status = buildSupervisorStatus(configResult, supervisorState, lastHealthReport, delivery, new Date(), preWindowBackfill);
    const notificationResult = await sendSupervisorNotifications(status);
    logger.log(lastHealthReport.status === 'fail' ? 'warn' : 'info', 'Supervisor health checked.', {
      status: lastHealthReport.status,
      preWindowBackfill: preWindowBackfill.reason,
      notificationsSent: notificationResult.sent,
      notificationsSkipped: notificationResult.skipped,
      notificationKinds: notificationResult.notifications.map((item) => item.kind),
    });
  };
  const monitorTimer = setInterval(() => {
    monitor().catch((error) => logger.log('warn', 'Supervisor monitor failed safely.', { error: String(error) }));
  }, configResult.config.health.monitorIntervalMs);
  monitor().catch((error) => logger.log('warn', 'Initial supervisor monitor failed safely.', { error: String(error) }));

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url || '/', `http://${configResult.config.host}:${configResult.config.port}`);
    if (request.method === 'GET' && url.pathname === configResult.config.statusPath) {
      supervisorState = withCurrentSupervisorPid(getSupervisorState(configResult.config));
      lastHealthReport = await buildHealthReport(configResult.config, supervisorState);
      const delivery = buildDeliveryVisibilityReport({ staleAfterMs: configResult.config.health.logStaleAfterMs });
      const status = buildSupervisorStatus(configResult, supervisorState, lastHealthReport, delivery);
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
    clearInterval(monitorTimer);
    stopOwnedServices(configResult.config, logger);
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  server.listen(configResult.config.port, configResult.config.host, () => {
    logger.log('info', 'Supervisor listening.', {
      host: configResult.config.host,
      port: configResult.config.port,
      statusPath: configResult.config.statusPath,
    });
    process.stdout.write(
      `Quant Desk Local Supervisor listening on http://${configResult.config.host}:${configResult.config.port}${configResult.config.statusPath}\n`,
    );
  });

  return server;
}

const command = process.argv[2] || 'start';

if (command === 'check') {
  await runSupervisorCheck();
} else if (command === 'start') {
  startSupervisor();
} else if (command === 'status') {
  await runSupervisorCheck();
} else if (command === 'stop') {
  await runSupervisorStop();
} else if (command === 'notify-self-heal') {
  const configResult = loadSupervisorConfig();
  const result = await sendSupervisorSelfHealNotification(configResult.config.logsDir);
  printJson(result);
} else {
  process.stderr.write('Usage: tsx tools/supervisor/index.ts [start|check|status|stop|notify-self-heal]\n');
  process.exitCode = 1;
}
