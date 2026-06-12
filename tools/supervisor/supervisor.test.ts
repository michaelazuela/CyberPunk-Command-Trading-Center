import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSupervisorConfig } from './config';
import { buildDeliveryVisibilityReport } from './deliveryVisibility';
import { buildHealthReport } from './health';
import { buildHtfPreloadCommand, parseHtfPreloadAssurance, runHtfPreloadStartup } from './htfPreload';
import { createSupervisorLogger } from './logger';
import {
  buildSupervisorDiscordPayload,
  buildSupervisorNotifications,
  sendSupervisorSelfHealNotification,
  type SupervisorNotificationState,
} from './notifications';
import { buildPreWindowBackfillCommand, buildWindowsSafeSpawnCommand, runPreWindowBackfillIfDue } from './preWindowBackfill';
import {
  findExternalServiceProcesses,
  isProcessRunning,
  launchEnabledServices,
  restartFailedOwnedServices,
  stopOwnedServices,
} from './processManager';
import { buildSupervisorStatus } from './status';
import { isAddressInUseError } from './index';

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
assert.equal(defaultConfig.config.htfPreload.enabled, true);
assert.equal(defaultConfig.config.htfPreload.days, 30);
assert.equal(defaultConfig.config.htfPreload.maxAttempts, 3);
assert.equal(defaultConfig.config.htfPreload.retryDelayMs, 15_000);
assert.equal(defaultConfig.config.preWindowBackfill.enabled, true);
assert.equal(defaultConfig.config.preWindowBackfill.days, 2);
assert.equal(defaultConfig.config.preWindowBackfill.morningStartEt, '09:00');
assert.equal(defaultConfig.config.preWindowBackfill.lunchStartEt, '11:45');
const preloadCommand = buildHtfPreloadCommand(defaultConfig.config);
assert.deepEqual(preloadCommand.args.slice(0, 4), ['run', 'nt:backfill', '--', '--instrument']);
assert.ok(preloadCommand.args.includes('--days'));
assert.ok(preloadCommand.args.includes('30'));
assert.ok(preloadCommand.args.includes('--delay-ms'));
const preWindowCommand = buildPreWindowBackfillCommand(defaultConfig.config);
assert.deepEqual(preWindowCommand.args.slice(0, 4), ['run', 'nt:backfill', '--', '--instrument']);
assert.ok(preWindowCommand.args.includes('--days'));
assert.ok(preWindowCommand.args.includes('2'));
const safeSpawnCommand = buildWindowsSafeSpawnCommand('npm.cmd', ['run', 'nt:backfill', '--', '--bridge-instrument', 'MES 06-26']);
if (process.platform === 'win32') {
  assert.equal(safeSpawnCommand.command, 'cmd.exe');
  assert.deepEqual(safeSpawnCommand.args.slice(0, 3), ['/d', '/c', 'npm.cmd run nt:backfill -- --bridge-instrument "MES 06-26"']);
} else {
  assert.equal(safeSpawnCommand.command, 'npm.cmd');
  assert.deepEqual(safeSpawnCommand.args, ['run', 'nt:backfill', '--', '--bridge-instrument', 'MES 06-26']);
}

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
assert.equal(isAddressInUseError({ code: 'EADDRINUSE' }), true);
assert.equal(isAddressInUseError({ code: 'ECONNREFUSED' }), false);
assert.equal(isAddressInUseError(new Error('listen EADDRINUSE')), false);
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

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const trayScriptPath = path.join(repoRoot, 'QuantDeskSupervisorTray.ps1');
const trayScript = fs.readFileSync(trayScriptPath, 'utf8');
const trayLauncherPath = path.join(repoRoot, 'Launch-QuantDeskSupervisorTray.vbs');
const trayLauncher = fs.readFileSync(trayLauncherPath, 'utf8');
assert.ok(trayScript.includes('System.Windows.Forms.NotifyIcon'));
assert.ok(trayScript.includes('Open Logs'));
assert.ok(trayScript.includes('Stop All'));
assert.ok(trayScript.includes('Repair Market Cache Now'));
assert.ok(trayScript.includes('manual-market-cache-repair'));
assert.ok(trayScript.includes('Restart Supervisor Services'));
assert.ok(trayScript.includes('Self-Heal Enabled'));
assert.ok(trayScript.includes('Invoke-SelfHealIfNeeded'));
assert.ok(trayScript.includes('SelfHealPausedByStop'));
assert.ok(trayScript.includes('supervisor:notify-self-heal'));
assert.ok(trayScript.includes('Start-Sleep -Milliseconds 1200'));
assert.equal(trayScript.includes('Add_Opening'), false);
assert.equal(trayScript.includes('runTradeDecisionPipeline'), false);
assert.equal(trayScript.includes('scanSetupCandidates'), false);
assert.equal(trayScript.includes('canExecute'), false);
assert.ok(trayLauncher.includes('shell.Run command, 0, False'));
assert.ok(trayLauncher.includes('-WindowStyle Hidden'));
assert.ok(trayLauncher.includes('QuantDeskSupervisorTray.ps1'));
assert.equal(trayLauncher.includes('runTradeDecisionPipeline'), false);
assert.equal(trayLauncher.includes('scanSetupCandidates'), false);
assert.equal(trayLauncher.includes('canExecute'), false);

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
const testChildRunArg = `--test-run=${process.pid}-${Date.now()}`;
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
  htfPreload: {
    enabled: true,
    days: 30,
    delayMs: 50,
    timeoutMs: 180_000,
    maxAttempts: 3,
    retryDelayMs: 1,
  },
  preWindowBackfill: {
    enabled: true,
    days: 2,
    delayMs: 50,
    timeoutMs: 1,
    morningStartEt: '09:00',
    morningEndEt: '09:15',
    lunchStartEt: '11:45',
    lunchEndEt: '12:00',
  },
  childServices: [
    {
      id: 'test-child',
      label: 'Supervisor test child',
      npmScript: 'supervisor:test-child',
      args: [testChildRunArg],
      enabled: true,
    },
  ],
};
const logger = createSupervisorLogger(tempLogsDir);
const outsideWindowBackfill = runPreWindowBackfillIfDue(processConfig, logger, new Date('2026-06-05T12:59:00.000Z'));
assert.equal(outsideWindowBackfill.attempted, false);
assert.equal(outsideWindowBackfill.due, false);
const dueBackfill = runPreWindowBackfillIfDue(processConfig, logger, new Date('2026-06-05T13:10:00.000Z'));
assert.equal(dueBackfill.enabled, true);
assert.equal(dueBackfill.due, true);
assert.equal(dueBackfill.attempted, true);
assert.equal(dueBackfill.run?.session, 'morning');
assert.equal(dueBackfill.run?.tradeDate, '2026-06-05');
assert.equal(dueBackfill.run?.ok, false);
assert.ok(fs.existsSync(dueBackfill.run?.stdoutLog || ''));
const preloadCalls: Array<{ command: string; args: string[]; timeout: number }> = [];
const preloadResult = runHtfPreloadStartup(processConfig, logger, (command, args, options) => {
  preloadCalls.push({ command, args, timeout: options.timeout });
  fs.mkdirSync(path.dirname(options.stdoutLog), { recursive: true });
  const attempt = preloadCalls.length;
  fs.writeFileSync(options.stdoutLog, attempt === 1
    ? [
      '[backfill] 2026-06-05 5m: upserted 300.',
      '[backfill] 2026-06-05 15m: upserted 100.',
      '[backfill] 2026-06-05 60m: upserted 25.',
      '[backfill] 2026-06-05 240m: upserted 7.',
      '[backfill] complete: 432 bars processed.',
    ].join('\n')
    : [
      '[backfill] 2026-06-05 5m: upserted 300.',
      '[backfill] 2026-06-05 15m: upserted 100.',
      '[backfill] 2026-06-05 60m: upserted 25.',
      '[backfill] 2026-06-05 120m: upserted 13.',
      '[backfill] 2026-06-05 240m: upserted 7.',
      '[backfill] complete: 445 bars processed.',
    ].join('\n'), 'utf8');
  fs.writeFileSync(options.stderrLog, '', 'utf8');
  return { status: 0 };
});
assert.equal(preloadResult.ok, true);
assert.equal(preloadResult.attempted, true);
assert.equal(preloadResult.attempts, 2);
assert.equal(preloadResult.assurance.ok, true);
assert.deepEqual(preloadResult.assurance.missingTimeframes, []);
assert.deepEqual(preloadResult.assurance.noBarsTimeframes, []);
assert.deepEqual(preloadResult.assurance.operatorActions, []);
assert.equal(preloadCalls.length, 2);
assert.ok(preloadCalls[0].args.includes('nt:backfill'));
assert.ok(preloadCalls[0].args.includes('--days'));
assert.ok(preloadCalls[0].args.includes('30'));
const missingPreloadAssurance = parseHtfPreloadAssurance([
  '[backfill] 2026-06-05 5m: upserted 300.',
  '[backfill] 2026-06-05 15m: upserted 100.',
  '[backfill] 2026-06-05 60m: upserted 25.',
  '[backfill] 2026-06-05 240m: upserted 7.',
].join('\n'));
assert.equal(missingPreloadAssurance.ok, false);
assert.deepEqual(missingPreloadAssurance.missingTimeframes, ['120m']);
assert.match(missingPreloadAssurance.reason, /Operator action:/);
assert.ok(missingPreloadAssurance.operatorActions.some((action) => action.includes('NinjaTrader')));
assert.ok(missingPreloadAssurance.operatorActions.some((action) => action.includes('30 calendar days of 120m history')));
const sessionGapPreloadAssurance = parseHtfPreloadAssurance([
  '[backfill] 2026-06-05 5m: upserted 300.',
  '[backfill] 2026-06-05 15m: upserted 100.',
  '[backfill] 2026-06-05 60m: upserted 25.',
  '[backfill] 2026-06-05 120m: upserted 13.',
  '[backfill] 2026-06-05 240m: upserted 7.',
].join('\n'), '[backfill] 2026-06-06 120m: no bars returned.\n');
assert.equal(sessionGapPreloadAssurance.ok, true);
assert.deepEqual(sessionGapPreloadAssurance.noBarsTimeframes, []);
assert.equal(sessionGapPreloadAssurance.stderrWarning, false);
const noBarsPreloadAssurance = parseHtfPreloadAssurance([
  '[backfill] 2026-06-05 5m: upserted 300.',
  '[backfill] 2026-06-05 15m: upserted 100.',
  '[backfill] 2026-06-05 60m: upserted 25.',
  '[backfill] 2026-06-05 240m: upserted 7.',
].join('\n'), '[backfill] 2026-06-05 120m: no bars returned.\n');
assert.equal(noBarsPreloadAssurance.ok, false);
assert.deepEqual(noBarsPreloadAssurance.noBarsTimeframes, ['120m']);
assert.equal(noBarsPreloadAssurance.stderrWarning, true);
assert.ok(noBarsPreloadAssurance.operatorActions.some((action) => action.includes('data-limited')));
const launchedState = launchEnabledServices(processConfig, logger);
const launchedChild = launchedState.services[0];
assert.ok(launchedChild.status === 'running' || launchedChild.status === 'external_running');
if (launchedChild.status === 'running') {
  assert.ok(launchedChild.pid);
  assert.equal(isProcessRunning(launchedChild.pid), true);
  assert.ok(fs.existsSync(launchedChild.stdoutLog));
  assert.ok(fs.existsSync(launchedChild.stderrLog));
  fs.appendFileSync(launchedChild.stdoutLog, `test heartbeat ${new Date().toISOString()}\n`, 'utf8');
} else {
  assert.ok(launchedChild.externalPids.length > 0);
}

const health = await buildHealthReport(processConfig, launchedState, new Date(), {});
assert.ok(health.checks.some((check) => (
  check.id === 'test-child_process'
  && (launchedChild.status === 'running' ? check.status === 'ok' : check.status === 'warn')
)));
assert.ok(health.checks.some((check) => check.id === 'discord_config' && check.status === 'warn'));

if (launchedChild.pid) {
  const external = findExternalServiceProcesses(processConfig, [
    { pid: 111, commandLine: `cmd.exe /c npm.cmd run supervisor:test-child -- ${testChildRunArg}` },
    { pid: launchedChild.pid, commandLine: `cmd.exe /c npm.cmd run supervisor:test-child -- ${testChildRunArg}` },
    { pid: 222, parentPid: launchedChild.pid, commandLine: `node tsx tools/supervisor/test-child.ts ${testChildRunArg}` },
  ]);
  assert.deepEqual(external.get('test-child'), [111]);
} else {
  const external = findExternalServiceProcesses(processConfig, [
    { pid: 111, commandLine: `cmd.exe /c npm.cmd run supervisor:test-child -- ${testChildRunArg}` },
  ]);
  assert.deepEqual(external.get('test-child'), [111]);
}

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

const dryRunStatePath = path.join(deliveryFixtureDir, '.nt-scanner-dry-run-state.json');
fs.writeFileSync(dryRunStatePath, JSON.stringify({
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
    '2026-06-04|MES|morning|LONG|TurtleSoup|dry-run|Missed': {
      alertKey: '2026-06-04|MES|morning|LONG|TurtleSoup|dry-run|Missed',
      planVersionId: 'MORNING-DRY-RUN',
      instrument: 'MES',
      tradeDate: '2026-06-04',
      session: 'morning',
      state: 'Missed',
      confidence: 78,
      deliveryStatus: 'skipped',
      webhookSource: 'dry_run',
      error: 'Discord delivery skipped: dry_run.',
      attemptedAt: '2026-06-04T14:12:00.000Z',
      stale: true,
      retryEligible: false,
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
const dryRunDeliveryReport = buildDeliveryVisibilityReport({
  scannerStatePath: dryRunStatePath,
  auditDir,
  now: new Date('2026-06-04T14:13:00.000Z'),
  staleAfterMs: 4 * 60 * 60 * 1000,
});
assert.equal(dryRunDeliveryReport.status, 'ok');
assert.equal(dryRunDeliveryReport.lastDelivery?.webhookSource, 'QUANT_DESK_SCANNER_WEBHOOK_URL');
assert.equal(dryRunDeliveryReport.lastDelivery?.deliveryStatus, 'sent');
assert.equal(dryRunDeliveryReport.skippedDeliveries.length, 0);

const activeScannerFreshStatePath = path.join(deliveryFixtureDir, '.nt-scanner-active-fresh-state.json');
fs.writeFileSync(activeScannerFreshStatePath, JSON.stringify({
  lastCompleted5mBySession: {
    '2026-06-11:morning': '2026-06-11T10:05:00.0000000',
  },
  lastMarketMapRefreshBySession: {
    '2026-06-11:morning': '2026-06-11T09:55:00.0000000',
  },
  lastHealthStatus: 'READY',
}, null, 2), 'utf8');
const activeScannerFreshDeliveryReport = buildDeliveryVisibilityReport({
  scannerStatePath: activeScannerFreshStatePath,
  auditDir,
  now: new Date('2026-06-11T14:06:00.000Z'),
  staleAfterMs: 180_000,
});
assert.deepEqual(activeScannerFreshDeliveryReport.staleDataBlockers, []);
assert.equal(activeScannerFreshDeliveryReport.status, 'ok');

const stalePreviousSessionStatePath = path.join(deliveryFixtureDir, '.nt-scanner-previous-session-state.json');
fs.writeFileSync(stalePreviousSessionStatePath, JSON.stringify({
  lastCompleted5mBySession: {
    '2026-06-04:lunch': '2026-06-04T15:25:00.0000000',
  },
  lastMarketMapRefreshBySession: {
    '2026-06-04:morning': '2026-06-05T02:50:37.016Z',
  },
  lastHealthStatus: 'READY',
}, null, 2), 'utf8');
const previousSessionDeliveryReport = buildDeliveryVisibilityReport({
  scannerStatePath: stalePreviousSessionStatePath,
  auditDir,
  now: new Date('2026-06-05T02:51:09.681Z'),
  staleAfterMs: 180_000,
});
assert.deepEqual(previousSessionDeliveryReport.staleDataBlockers, []);
assert.equal(previousSessionDeliveryReport.status, 'ok');

const overnightSameDateStatePath = path.join(deliveryFixtureDir, '.nt-scanner-overnight-same-date-state.json');
fs.writeFileSync(overnightSameDateStatePath, JSON.stringify({
  lastCompleted5mBySession: {
    '2026-06-11:morning': '2026-06-11T00:05:00',
  },
  lastMarketMapRefreshBySession: {
    '2026-06-11:morning': '2026-06-11T00:05:00',
  },
  lastHealthStatus: 'READY',
}, null, 2), 'utf8');
const overnightSameDateDeliveryReport = buildDeliveryVisibilityReport({
  scannerStatePath: overnightSameDateStatePath,
  auditDir,
  now: new Date('2026-06-11T04:08:58.000Z'),
  staleAfterMs: 180_000,
});
assert.deepEqual(overnightSameDateDeliveryReport.staleDataBlockers, []);
assert.equal(overnightSameDateDeliveryReport.status, 'ok');

const pendingGapLedgerPath = path.join(deliveryFixtureDir, '.market-data-gap-events.json');
fs.writeFileSync(pendingGapLedgerPath, JSON.stringify([
  {
    user_id: '00000000-0000-0000-0000-000000000001',
    instrument: 'MES',
    bridge_instrument: 'MES 06-26',
    timeframe: '5m',
    requested_from_et: '2026-06-05T10:00:00',
    requested_to_et: '2026-06-05T10:30:00',
    range_start_et: null,
    range_end_et: null,
    bars_loaded: 0,
    cache_bars: 0,
    bridge_repair_bars: 0,
    source: 'missing',
    status: 'open',
    data_limitation_message: 'Completed 5M unavailable.',
    operator_action: 'Run npm run market-data:gaps:sync.',
    metadata: { canInventMissingBars: false },
    localRecordedAt: '2026-06-05T02:40:00.000Z',
    syncStatus: 'pending_supabase_sync',
    syncReason: 'test pending sync',
  },
], null, 2), 'utf8');
const pendingGapDeliveryReport = buildDeliveryVisibilityReport({
  scannerStatePath: statePath,
  auditDir,
  marketDataGapLedgerPath: pendingGapLedgerPath,
  now: new Date('2026-06-05T02:51:09.681Z'),
  staleAfterMs: 180_000,
});
assert.equal(pendingGapDeliveryReport.status, 'warn');
assert.equal(pendingGapDeliveryReport.pendingMarketDataGapSync.count, 1);
assert.equal(pendingGapDeliveryReport.pendingMarketDataGapSync.staleCount, 1);
assert.ok(pendingGapDeliveryReport.staleDataBlockers.some((blocker) => blocker.includes('Market data gap repair ledger')));

const pendingGapStatus = buildSupervisorStatus(defaultConfig, null, null, pendingGapDeliveryReport, fixedNow);
const pendingGapNotifications = buildSupervisorNotifications(
  pendingGapStatus,
  { lastStatuses: {}, lastSentAtByKey: {} },
  new Date('2026-06-05T02:51:09.681Z'),
  180_000,
);
const pendingGapNotification = pendingGapNotifications.notifications.find((item) => item.kind === 'market_data_gap_sync_pending');
assert.ok(pendingGapNotification);
const pendingGapPayloadText = JSON.stringify(buildSupervisorDiscordPayload(pendingGapNotification, pendingGapStatus));
assert.ok(pendingGapPayloadText.includes('Market Data Gap Sync Pending'));
assert.ok(pendingGapPayloadText.includes('Run npm run market-data:gaps:sync'));
assert.ok(pendingGapPayloadText.includes('Pending gap sync: 1 (1 stale)'));
assert.equal(/Trade now|Enter now|Buy now|Sell now|Entry confirmed|Take the trade/i.test(pendingGapPayloadText), false);

const notificationState: SupervisorNotificationState = {
  lastStatuses: {
    'service:scanner': 'running',
    'service:candle-recorder': 'running',
    bridge: 'ok',
  },
  lastSentAtByKey: {},
};
const scannerReportLog = path.join(tempLogsDir, 'scanner-report.log');
const recorderReportLog = path.join(tempLogsDir, 'recorder-report.log');
fs.writeFileSync(scannerReportLog, [
  '[scanner-health] READY: 10 passed, 0 warning(s), 0 failure(s). Scanner dependencies are ready. Alerts can be trusted for this cycle.',
  '[scanner-history] 5m: sufficient, 6000 bars, 2026-05-05T00:00:00 to 2026-06-04T12:00:00.0000000, source=market_bars_bridge_repair, self-healed from bridge',
  '[scanner-history] 15m: sufficient, 3057 bars, 2026-05-05T00:00:00 to 2026-06-04T12:00:00.0000000, source=market_bars_bridge_repair, self-healed from bridge',
  '[scanner-history] 60m: sufficient, 1515 bars, 2026-05-05T00:00:00 to 2026-06-04T12:00:00.0000000, source=market_bars_bridge_repair, self-healed from bridge',
  '[scanner-history] 120m: sufficient, 758 bars, 2026-05-05T00:00:00 to 2026-06-04T12:00:00.0000000, source=market_bars_bridge_repair, self-healed from bridge',
  '[scanner-history] 120m: insufficient, 20 bars, 2026-06-04T00:00:00 to 2026-06-05T12:00:00.0000000, source=bridge_repair, self-healed from bridge, data-limit=Requested 120m bars remain incomplete after cache preload, single bridge repair, and segmented bridge repair. The scanner cannot invent missing NinjaTrader bars; HTF promotion is blocked for this timeframe.',
  '[scanner-history] 240m: sufficient, 1134 bars, 2026-05-05T00:00:00 to 2026-06-04T10:00:00.0000000, source=market_bars_bridge_repair, self-healed from bridge',
  '[scanner] Market Mapping Mode: MarketMapping, context updated only | current 7563.75 | completed 5M 2026-06-04T22:40:00.0000000 | positions flat / none returned | market map refreshed (morning; history sufficient).',
].join('\n'), 'utf8');
fs.writeFileSync(recorderReportLog, [
  '[market-cache] 5m: upserted 120 bars.',
  '[market-cache] 15m: upserted 120 bars.',
  '[market-cache] 60m: upserted 120 bars.',
  '[market-cache] 120m: upserted 120 bars.',
  '[market-cache] 240m: upserted 120 bars.',
  '[market-cache] cycle complete: 600 bars processed at 2026-06-05T02:42:09.783Z.',
].join('\n'), 'utf8');
const readyStatus = buildSupervisorStatus(defaultConfig, {
  supervisorPid: 12345,
  startedAt: fixedNow.toISOString(),
  statePath: path.join(tempLogsDir, 'ready-state.json'),
  services: [
    {
      id: 'scanner',
      pid: 1111,
      startedAt: fixedNow.toISOString(),
      stdoutLog: scannerReportLog,
      stderrLog: '',
      status: 'running',
      error: null,
      restartCount: 0,
      lastRestartAt: null,
      lastRestartReason: null,
      externalPids: [],
    },
    {
      id: 'candle-recorder',
      pid: 2222,
      startedAt: fixedNow.toISOString(),
      stdoutLog: recorderReportLog,
      stderrLog: '',
      status: 'running',
      error: null,
      restartCount: 0,
      lastRestartAt: null,
      lastRestartReason: null,
      externalPids: [],
    },
  ],
}, {
  status: 'ok',
  generatedAt: fixedNow.toISOString(),
  checks: [
    { id: 'bridge', label: 'NinjaTrader bridge', status: 'ok', message: 'Bridge health endpoint is reachable.' },
  ],
}, null, fixedNow);
const readyNotifications = buildSupervisorNotifications(readyStatus, { lastStatuses: {}, lastSentAtByKey: {} }, fixedNow);
const readyNotification = readyNotifications.notifications.find((item) => item.kind === 'supervisor_ready');
assert.ok(readyNotification);
const readyPayload = buildSupervisorDiscordPayload(readyNotification, readyStatus);
const readyPayloadText = JSON.stringify(readyPayload);
assert.ok(readyPayloadText.includes('Loaded History Reports'));
assert.ok(readyPayloadText.includes('Pre-Market Data Readiness Gate'));
assert.ok(readyPayloadText.includes('Status: BLOCKED'));
assert.ok(readyPayloadText.includes('HTF Promotion: Blocked/data-limited until real 5M/15M/1H/2H/4H bars are available.'));
assert.ok(readyPayloadText.includes('Coverage: 5m: sufficient (6000 bars) | 15m: sufficient (3057 bars) | 60m: sufficient (1515 bars) | 120m: insufficient (20 bars) | 240m: sufficient (1134 bars)'));
assert.ok(readyPayloadText.includes('Data-limited blockers: 120m.'));
assert.ok(readyPayloadText.includes('Boundary: Operational data-quality gate only. Does not approve trades, entries, or execution.'));
assert.ok(readyPayloadText.includes('5m: sufficient, 6000 bars'));
assert.ok(readyPayloadText.includes('120m: insufficient, 20 bars'));
assert.ok(readyPayloadText.includes('cannot invent missing NinjaTrader bars'));
assert.ok(readyPayloadText.includes('HTF promotion is blocked'));
assert.ok(readyPayloadText.includes('240m: sufficient, 1134 bars'));
assert.ok(readyPayloadText.includes('Market Cache Recorder'));
assert.ok(readyPayloadText.includes('cycle complete: 600 bars processed'));
assert.ok(readyPayloadText.includes('Latest completed 5M: 2026-06-04T22:40:00.0000000'));
assert.equal(/Trade now|Enter now|Buy now|Sell now|Entry confirmed|Take the trade/i.test(readyPayloadText), false);
const readyWithoutReports = buildSupervisorStatus(defaultConfig, {
  supervisorPid: 12346,
  startedAt: fixedNow.toISOString(),
  statePath: path.join(tempLogsDir, 'ready-state-without-reports.json'),
  services: [
    {
      id: 'scanner',
      pid: 1111,
      startedAt: fixedNow.toISOString(),
      stdoutLog: path.join(tempLogsDir, 'missing-scanner-report.log'),
      stderrLog: '',
      status: 'running',
      error: null,
      restartCount: 0,
      lastRestartAt: null,
      lastRestartReason: null,
      externalPids: [],
    },
    {
      id: 'candle-recorder',
      pid: 2222,
      startedAt: fixedNow.toISOString(),
      stdoutLog: path.join(tempLogsDir, 'missing-recorder-report.log'),
      stderrLog: '',
      status: 'running',
      error: null,
      restartCount: 0,
      lastRestartAt: null,
      lastRestartReason: null,
      externalPids: [],
    },
  ],
}, readyStatus.health, null, fixedNow);
const readyWithoutReportNotifications = buildSupervisorNotifications(
  readyWithoutReports,
  { lastStatuses: {}, lastSentAtByKey: {} },
  fixedNow,
);
const readyWithoutReportNotification = readyWithoutReportNotifications.notifications.find((item) => item.kind === 'supervisor_ready');
assert.ok(readyWithoutReportNotification);
const readyWithoutReportPayloadText = JSON.stringify(buildSupervisorDiscordPayload(readyWithoutReportNotification, readyWithoutReports));
assert.ok(readyWithoutReportPayloadText.includes('Pre-Market Data Readiness Gate'));
assert.ok(readyWithoutReportPayloadText.includes('Status: PENDING'));
assert.ok(readyWithoutReportPayloadText.includes('Coverage: 5m: pending | 15m: pending | 60m: pending | 120m: pending | 240m: pending'));
assert.ok(readyWithoutReportPayloadText.includes('Pending report lines: 5m, 15m, 60m, 120m, 240m.'));
assert.ok(readyWithoutReportPayloadText.includes('Scanner history report has not appeared in the supervisor log yet.'));
assert.ok(readyWithoutReportPayloadText.includes('Recorder cache cycle has not completed in the supervisor log yet.'));
assert.ok(readyWithoutReportPayloadText.includes('Scanner health and market-map report lines have not appeared in the supervisor log yet.'));
assert.equal(/Trade now|Enter now|Buy now|Sell now|Entry confirmed|Take the trade/i.test(readyWithoutReportPayloadText), false);

const downStatus = buildSupervisorStatus(defaultConfig, {
  supervisorPid: 1,
  startedAt: fixedNow.toISOString(),
  statePath: path.join(tempLogsDir, 'state.json'),
  services: [
    {
      id: 'scanner',
      pid: null,
      startedAt: null,
      stdoutLog: '',
      stderrLog: '',
      status: 'stopped',
      error: null,
      restartCount: 0,
      lastRestartAt: null,
      lastRestartReason: null,
      externalPids: [],
    },
  ],
}, null, null, fixedNow);
const downNotifications = buildSupervisorNotifications(downStatus, notificationState, fixedNow);
assert.ok(downNotifications.notifications.some((item) => item.kind === 'scanner_down'));
assert.equal(JSON.stringify(downNotifications.notifications).includes('entry'), false);
assert.equal(JSON.stringify(downNotifications.notifications).includes('target'), false);
const selfHealDryRun = await sendSupervisorSelfHealNotification(tempLogsDir, {
  dryRun: true,
  webhookUrl: 'https://discord.example/webhook',
  now: fixedNow,
});
assert.equal(selfHealDryRun.sent, 0);
assert.equal(selfHealDryRun.skipped, 1);
assert.equal(selfHealDryRun.notification.kind, 'supervisor_self_heal');

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
