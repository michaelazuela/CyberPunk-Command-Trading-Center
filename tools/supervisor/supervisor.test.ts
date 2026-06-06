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
assert.equal(defaultConfig.config.htfPreload.enabled, true);
assert.equal(defaultConfig.config.htfPreload.days, 30);
const preloadCommand = buildHtfPreloadCommand(defaultConfig.config);
assert.deepEqual(preloadCommand.args.slice(0, 4), ['run', 'nt:backfill', '--', '--instrument']);
assert.ok(preloadCommand.args.includes('--days'));
assert.ok(preloadCommand.args.includes('30'));
assert.ok(preloadCommand.args.includes('--delay-ms'));

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

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const trayScriptPath = path.join(repoRoot, 'QuantDeskSupervisorTray.ps1');
const trayScript = fs.readFileSync(trayScriptPath, 'utf8');
const trayLauncherPath = path.join(repoRoot, 'Launch-QuantDeskSupervisorTray.vbs');
const trayLauncher = fs.readFileSync(trayLauncherPath, 'utf8');
assert.ok(trayScript.includes('System.Windows.Forms.NotifyIcon'));
assert.ok(trayScript.includes('Open Logs'));
assert.ok(trayScript.includes('Stop All'));
assert.ok(trayScript.includes('Restart Supervisor Services'));
assert.ok(trayScript.includes('Self-Heal Enabled'));
assert.ok(trayScript.includes('Invoke-SelfHealIfNeeded'));
assert.ok(trayScript.includes('SelfHealPausedByStop'));
assert.ok(trayScript.includes('supervisor:notify-self-heal'));
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
const preloadCalls: Array<{ command: string; args: string[]; timeout: number }> = [];
const preloadResult = runHtfPreloadStartup(processConfig, logger, (command, args, options) => {
  preloadCalls.push({ command, args, timeout: options.timeout });
  fs.mkdirSync(path.dirname(options.stdoutLog), { recursive: true });
  fs.writeFileSync(options.stdoutLog, [
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
assert.equal(preloadResult.assurance.ok, true);
assert.deepEqual(preloadResult.assurance.missingTimeframes, []);
assert.deepEqual(preloadResult.assurance.noBarsTimeframes, []);
assert.equal(preloadCalls.length, 1);
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
const noBarsPreloadAssurance = parseHtfPreloadAssurance([
  '[backfill] 2026-06-05 5m: upserted 300.',
  '[backfill] 2026-06-05 15m: upserted 100.',
  '[backfill] 2026-06-05 60m: upserted 25.',
  '[backfill] 2026-06-05 120m: upserted 13.',
  '[backfill] 2026-06-05 240m: upserted 7.',
].join('\n'), '[backfill] 2026-06-05 120m: no bars returned.\n');
assert.equal(noBarsPreloadAssurance.ok, false);
assert.deepEqual(noBarsPreloadAssurance.noBarsTimeframes, ['120m']);
assert.equal(noBarsPreloadAssurance.stderrWarning, true);
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
  { pid: 222, parentPid: launchedChild.pid, commandLine: 'node tsx tools/supervisor/test-child.ts' },
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
