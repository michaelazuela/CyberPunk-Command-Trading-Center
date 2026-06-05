import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSupervisorConfig } from './config';
import { buildDeliveryVisibilityReport } from './deliveryVisibility';
import { buildHealthReport } from './health';
import { createSupervisorLogger } from './logger';
import {
  findExternalServiceProcesses,
  isProcessRunning,
  launchEnabledServices,
  restartFailedOwnedServices,
  stopOwnedServices,
} from './processManager';
import { buildSupervisorStatus } from './status';

const defaultConfig = loadSupervisorConfig({}, 'C:\\quant-desk');
assert.equal(defaultConfig.status, 'valid');
assert.equal(defaultConfig.config.host, '127.0.0.1');
assert.equal(defaultConfig.config.port, 8797);
assert.equal(defaultConfig.config.statusPath, '/status');
assert.equal(defaultConfig.config.childServices.length, 4);
assert.equal(defaultConfig.config.childServices.find((service) => service.id === 'candle-recorder')?.enabled, true);
assert.equal(defaultConfig.config.childServices.find((service) => service.id === 'scanner')?.enabled, true);
assert.equal(defaultConfig.config.childServices.find((service) => service.id === 'companion-proxy')?.enabled, false);
assert.equal(defaultConfig.config.childServices.find((service) => service.id === 'discord-alerts')?.enabled, false);

const fixedNow = new Date('2026-06-05T12:00:00.000Z');
const status = buildSupervisorStatus(defaultConfig, null, null, null, fixedNow);
assert.equal(status.supervisor.name, 'quant-desk-local-supervisor');
assert.equal(status.supervisor.phase, 'phase_4_event_delivery_visibility');
assert.equal(status.supervisor.status, 'ready');
assert.equal(status.supervisor.timestamp, '2026-06-05T12:00:00.000Z');
assert.equal(status.config.status, 'valid');
assert.equal(status.boundaries.startsChildProcesses, true);
assert.equal(status.boundaries.autoRestartsChildProcesses, true);
assert.equal(status.boundaries.restartPolicy, 'owned_failed_child_process_only');
assert.equal(status.boundaries.marketConditionRestarts, false);
assert.equal(status.boundaries.changesTradingLogic, false);
assert.equal(status.boundaries.changesScannerBehavior, false);
assert.equal(status.boundaries.changesBridgeBehavior, false);
assert.equal(status.boundaries.changesDiscordBehavior, false);
assert.equal(status.boundaries.changesCanExecuteBehavior, false);
assert.equal(JSON.stringify(status).includes('"canExecute":true'), false);
assert.equal(status.boundaries.changesDiscordBehavior, false);

const invalidConfig = loadSupervisorConfig(
  {
    SUPERVISOR_HOST: '0.0.0.0',
    SUPERVISOR_PORT: '99999',
    SUPERVISOR_STATUS_PATH: 'status',
  },
  'C:\\quant-desk',
);
assert.equal(invalidConfig.status, 'invalid');
assert.equal(invalidConfig.config.host, '0.0.0.0');
assert.equal(invalidConfig.config.port, 8797);
assert.equal(invalidConfig.config.statusPath, '/status');
assert.equal(invalidConfig.errors.length, 3);

const serviceFilteredConfig = loadSupervisorConfig(
  {
    SUPERVISOR_SERVICES: 'candle-recorder',
    SUPERVISOR_INSTRUMENT: 'MNQ',
    SUPERVISOR_BRIDGE_INSTRUMENT: 'MNQ 06-26',
    SUPERVISOR_BRIDGE_URL: 'http://127.0.0.1:8765',
  },
  'C:\\quant-desk',
);
assert.equal(serviceFilteredConfig.config.childServices.find((service) => service.id === 'candle-recorder')?.enabled, true);
assert.equal(serviceFilteredConfig.config.childServices.find((service) => service.id === 'scanner')?.enabled, false);
assert.ok(serviceFilteredConfig.config.childServices.find((service) => service.id === 'candle-recorder')?.args.includes('MNQ'));
assert.equal(serviceFilteredConfig.config.health.restartEnabled, true);
assert.equal(serviceFilteredConfig.config.health.maxRestartAttempts, 3);

const statusSource = await import('./status');
assert.equal('runTradeDecisionPipeline' in statusSource, false);
assert.equal('scanSetupCandidates' in statusSource, false);

const supervisorDir = path.dirname(fileURLToPath(import.meta.url));
const protectedImportPatterns = [
  'setupScanner',
  'tradeDecisionPipeline',
  'tradePlan',
  'localScannerEngine',
  'ninjaTraderBridge',
  'discord-alert-format',
  'effectiveExecution',
];

for (const entry of fs.readdirSync(supervisorDir)) {
  if (!entry.endsWith('.ts') || entry.endsWith('.test.ts')) continue;
  const source = fs.readFileSync(path.join(supervisorDir, entry), 'utf8');
  for (const protectedPattern of protectedImportPatterns) {
    assert.equal(
      source.includes(protectedPattern),
      false,
      `Supervisor Phase 1 must not import or reference protected module ${protectedPattern} in ${entry}.`,
    );
  }
}

const tempLogsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quant-supervisor-test-'));
const processConfig = {
  host: '127.0.0.1',
  port: 8797,
  statusPath: '/status',
  logsDir: tempLogsDir,
  health: {
    bridgeUrl: 'http://127.0.0.1:1',
    monitorIntervalMs: 1000,
    logStaleAfterMs: 60_000,
    restartEnabled: true,
    restartCooldownMs: 1,
    maxRestartAttempts: 2,
  },
  childServices: [
    {
      id: 'test-child',
      label: 'Supervisor test child',
      npmScript: 'supervisor:test-child',
      args: [],
      enabled: true,
    },
  ],
};
const logger = createSupervisorLogger(tempLogsDir);
const launchedState = launchEnabledServices(processConfig, logger);
const launchedChild = launchedState.services[0];
assert.equal(launchedChild.status, 'running');
assert.ok(launchedChild.pid);
assert.equal(isProcessRunning(launchedChild.pid), true);
assert.ok(fs.existsSync(launchedChild.stdoutLog));
assert.ok(fs.existsSync(launchedChild.stderrLog));
fs.appendFileSync(launchedChild.stdoutLog, `test heartbeat ${new Date().toISOString()}\n`, 'utf8');

const health = await buildHealthReport(processConfig, launchedState, new Date(), {});
assert.ok(health.checks.some((check) => check.id === 'test-child_process' && check.status === 'ok'));
assert.ok(health.checks.some((check) => check.id === 'discord_config' && check.status === 'warn'));

const external = findExternalServiceProcesses(processConfig, [
  { pid: 111, commandLine: 'cmd.exe /c npm.cmd run supervisor:test-child' },
  { pid: launchedChild.pid, commandLine: 'cmd.exe /c npm.cmd run supervisor:test-child' },
]);
assert.deepEqual(external.get('test-child'), [111]);

const deliveryFixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quant-supervisor-delivery-'));
const auditDir = path.join(deliveryFixtureDir, 'discord-audit');
fs.mkdirSync(auditDir, { recursive: true });
const statePath = path.join(deliveryFixtureDir, '.nt-scanner-state.json');
const sentAuditPath = path.join(auditDir, 'scanner-morning-2026-06-04-MES-MORNING-1.json');
const decisionTapePath = path.join(auditDir, 'scanner-decision-tape-2026-06-04-MES-morning.json');
fs.writeFileSync(sentAuditPath, JSON.stringify({ ok: true }), 'utf8');
fs.writeFileSync(decisionTapePath, JSON.stringify([{ state: 'Watching' }]), 'utf8');
fs.writeFileSync(statePath, JSON.stringify({
  sent: {
    '2026-06-04|MES|morning|LONG|TurtleSoup|7556.5|Approved': {
      state: 'Approved',
      confidence: 96,
      sentAt: '2026-06-04T14:05:05.019Z',
    },
  },
  alertDeliveries: {
    '2026-06-04|MES|morning|LONG|TurtleSoup|7556.5|Approved': {
      alertKey: '2026-06-04|MES|morning|LONG|TurtleSoup|7556.5|Approved',
      planVersionId: 'MORNING-1',
      instrument: 'MES',
      tradeDate: '2026-06-04',
      session: 'morning',
      state: 'Approved',
      confidence: 96,
      deliveryStatus: 'sent',
      webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
      httpStatus: 200,
      discordMessageId: 'discord-1',
      attemptedAt: '2026-06-04T14:05:03.840Z',
      sentAt: '2026-06-04T14:05:05.019Z',
      auditLogPath: sentAuditPath,
      stale: false,
      retryEligible: false,
    },
    'failed-key': {
      alertKey: 'failed-key',
      deliveryStatus: 'failed',
      error: 'Discord webhook failed (redacted)',
      attemptedAt: '2026-06-04T14:10:00.000Z',
      retryEligible: true,
    },
  },
  watchlistSent: {
    '2026-06-04:MES:morning:LONG:morning_continuation_watchlist': {
      direction: 'LONG',
      sentAt: '2026-06-04T15:01:36.183Z',
    },
  },
  lastCompleted5mBySession: {
    '2026-06-04:morning': '2026-06-04T11:55:00.000Z',
  },
  lastMarketMapRefreshBySession: {
    '2026-06-04:morning': '2026-06-04T13:55:00.000Z',
  },
  lastHealthStatus: 'READY',
}, null, 2), 'utf8');
const deliveryReport = buildDeliveryVisibilityReport({
  scannerStatePath: statePath,
  auditDir,
  now: new Date('2026-06-04T15:10:00.000Z'),
  staleAfterMs: 60 * 60 * 1000,
});
assert.equal(deliveryReport.stateReadable, true);
assert.equal(deliveryReport.lastAlert?.state, 'Approved');
assert.equal(deliveryReport.lastDiscordSend?.discordMessageId, 'discord-1');
assert.equal(deliveryReport.failedDeliveries.length, 1);
assert.equal(deliveryReport.lastWatchlist?.direction, 'LONG');
assert.equal(deliveryReport.recentDecisionTapes.length, 1);
assert.equal(deliveryReport.boundaries.readOnly, true);
assert.equal(deliveryReport.boundaries.postsDiscord, false);
assert.equal(deliveryReport.boundaries.changesScannerState, false);
assert.equal(JSON.stringify(deliveryReport).includes('"canExecute":true'), false);

const stoppedState = stopOwnedServices(processConfig, logger);
const stoppedChild = stoppedState.services[0];
assert.equal(stoppedChild.status, 'stopped');
assert.equal(isProcessRunning(stoppedChild.pid), false);

const restartConfig = {
  ...processConfig,
};
const restartedState = restartFailedOwnedServices(restartConfig, logger, new Date(Date.now() + 10));
const restartedChild = restartedState.services[0];
assert.equal(restartedChild.status, 'running');
assert.ok(restartedChild.pid);
assert.notEqual(restartedChild.pid, stoppedChild.pid);
assert.equal(restartedChild.restartCount, 1);
assert.equal(restartedChild.lastRestartReason, 'owned child process is stopped');
stopOwnedServices(restartConfig, logger);

console.log('Supervisor skeleton test verified.');
