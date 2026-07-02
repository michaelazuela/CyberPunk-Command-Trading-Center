import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSupervisorConfig } from './config';
import { preResolveSupervisorBridgeInstrument } from './contractPreResolve';
import { buildDeliveryVisibilityReport } from './deliveryVisibility';
import { buildHealthReport } from './health';
import { buildHtfPreloadCommand, parseHtfPreloadAssurance, runHtfPreloadStartup } from './htfPreload';
import { createSupervisorLogger } from './logger';
import {
  buildSupervisorDiscordPayload,
  buildSupervisorNotifications,
  resolveSystemAlertsDiscordWebhookUrl,
  resolveSupervisorDiscordWebhookUrl,
  sendSupervisorNotifications,
  sendSupervisorSelfHealNotification,
  supervisorDiscordWebhookDeleteUrl,
  supervisorDiscordWebhookPostUrl,
  type SupervisorNotificationState,
} from './notifications';
import { buildPreWindowBackfillCommand, buildWindowsSafeSpawnCommand, runPreWindowBackfillIfDue } from './preWindowBackfill';
import { buildSupervisorPhase6SignoffStatus } from './phase6Signoff';
import {
  findExternalServiceProcesses,
  getSupervisorState,
  isProcessRunning,
  isTrackedServiceProcessRunning,
  launchEnabledServices,
  restartFailedOwnedServices,
  stopOwnedServices,
  writeSupervisorState,
} from './processManager';
import type { SupervisorState } from './processManager';
import { buildSupervisorStatus } from './status';
import { isAddressInUseError } from './index';
import { clearQuantDeskMaintenanceLock, createQuantDeskMaintenanceLock } from '../automation/quant-desk-maintenance';

async function waitForProcessExit(pid: number | null, timeoutMs = 5000): Promise<boolean> {
  const startedAt = Date.now();
  while (Date.now() - startedAt <= timeoutMs) {
    if (!isProcessRunning(pid)) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return !isProcessRunning(pid);
}

async function waitForLaunchedService(
  config: Parameters<typeof getSupervisorState>[0],
  timeoutMs = 5000,
): Promise<SupervisorState> {
  const startedAt = Date.now();
  let current = getSupervisorState(config);
  while (Date.now() - startedAt <= timeoutMs) {
    if (current.services.some((service) => service.status === 'running' || service.status === 'external_running')) {
      return current;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    current = getSupervisorState(config);
  }
  return current;
}

const defaultConfig = loadSupervisorConfig({}, 'C:\\quant-desk');
assert.equal(defaultConfig.status, 'valid');
assert.equal(defaultConfig.config.host, '127.0.0.1');
assert.equal(defaultConfig.config.port, 8797);
assert.equal(defaultConfig.config.statusPath, '/status');
assert.equal(defaultConfig.config.childServices.length, 4);
assert.equal(defaultConfig.config.childServices.find((service) => service.id === 'candle-recorder')?.enabled, true);
assert.equal(defaultConfig.config.childServices.find((service) => service.id === 'scanner')?.enabled, true);
assert.equal(defaultConfig.config.childServices.find((service) => service.id === 'scanner')?.args.includes('--live-discord-policy-confirmed'), true);
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
assert.equal(defaultConfig.config.preWindowBackfill.eveningStartEt, '18:30');
const preloadCommand = buildHtfPreloadCommand(defaultConfig.config);
assert.deepEqual(preloadCommand.args.slice(0, 4), ['run', 'nt:backfill', '--', '--instrument']);
assert.ok(preloadCommand.args.includes('--days'));
assert.ok(preloadCommand.args.includes('30'));
assert.ok(preloadCommand.args.includes('--delay-ms'));
const preWindowCommand = buildPreWindowBackfillCommand(defaultConfig.config);
assert.deepEqual(preWindowCommand.args.slice(0, 4), ['run', 'nt:backfill', '--', '--instrument']);
assert.ok(preWindowCommand.args.includes('--days'));
assert.ok(preWindowCommand.args.includes('2'));
function commandArg(args: string[], name: string): string | null {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || null : null;
}

function serviceBridgeInstrument(config: typeof defaultConfig.config, serviceId: string): string | null {
  const service = config.childServices.find((item) => item.id === serviceId);
  return service ? commandArg(service.args, '--bridge-instrument') : null;
}

const currentContractConfig = loadSupervisorConfig(
  {
    SUPERVISOR_INSTRUMENT: 'MES',
    SUPERVISOR_BRIDGE_INSTRUMENT: 'MES',
    SUPERVISOR_BRIDGE_URL: 'http://127.0.0.1:8765',
  },
  'C:\\quant-desk',
);
const currentContractPreResolve = await preResolveSupervisorBridgeInstrument(
  currentContractConfig.config,
  { asOf: new Date('2026-07-01T12:00:00.000Z') },
  { getHealth: async () => ({ ok: true, defaultInstrument: 'MES 09-26' }) },
);
assert.equal(currentContractPreResolve.report.resolvedBridgeInstrument, 'MES 09-26');
assert.equal(serviceBridgeInstrument(currentContractPreResolve.config, 'scanner'), 'MES 09-26');
assert.equal(serviceBridgeInstrument(currentContractPreResolve.config, 'candle-recorder'), 'MES 09-26');

const decemberContractPreResolve = await preResolveSupervisorBridgeInstrument(
  currentContractConfig.config,
  { asOf: new Date('2026-09-15T12:00:00.000Z') },
  { getHealth: async () => ({ ok: true, defaultInstrument: 'MES DEC26' }) },
);
assert.equal(decemberContractPreResolve.report.resolvedBridgeInstrument, 'MES 12-26');
assert.equal(serviceBridgeInstrument(decemberContractPreResolve.config, 'scanner'), 'MES 12-26');
assert.equal(serviceBridgeInstrument(decemberContractPreResolve.config, 'candle-recorder'), 'MES 12-26');

const staleSeptemberConfig = loadSupervisorConfig(
  {
    SUPERVISOR_INSTRUMENT: 'MES',
    SUPERVISOR_BRIDGE_INSTRUMENT: 'MES 09-26',
    SUPERVISOR_BRIDGE_URL: 'http://127.0.0.1:8765',
  },
  'C:\\quant-desk',
);
const staleSeptemberPreResolve = await preResolveSupervisorBridgeInstrument(
  staleSeptemberConfig.config,
  { asOf: new Date('2026-09-15T12:00:00.000Z') },
  { getHealth: async () => ({ ok: true, defaultInstrument: 'MES DEC26' }) },
);
assert.equal(staleSeptemberPreResolve.report.resolvedBridgeInstrument, 'MES 12-26');
assert.equal(serviceBridgeInstrument(staleSeptemberPreResolve.config, 'scanner'), 'MES 12-26');
assert.equal(serviceBridgeInstrument(staleSeptemberPreResolve.config, 'candle-recorder'), 'MES 12-26');

const bridgeUnavailablePreResolve = await preResolveSupervisorBridgeInstrument(
  currentContractConfig.config,
  { asOf: new Date('2026-07-01T12:00:00.000Z') },
  { getHealth: async () => { throw new Error('bridge unavailable'); } },
);
assert.equal(bridgeUnavailablePreResolve.report.resolvedBridgeInstrument, 'MES 09-26');
assert.equal(bridgeUnavailablePreResolve.report.source, 'configured-root-fallback');
assert.equal(serviceBridgeInstrument(bridgeUnavailablePreResolve.config, 'scanner'), 'MES 09-26');
assert.equal(serviceBridgeInstrument(bridgeUnavailablePreResolve.config, 'candle-recorder'), 'MES 09-26');

const alignedBackfillCommand = buildPreWindowBackfillCommand(currentContractPreResolve.config);
const alignedHtfPreloadCommand = buildHtfPreloadCommand(currentContractPreResolve.config);
assert.equal(commandArg(alignedBackfillCommand.args, '--bridge-instrument'), 'MES 09-26');
assert.equal(commandArg(alignedHtfPreloadCommand.args, '--bridge-instrument'), 'MES 09-26');
const safeSpawnCommand = buildWindowsSafeSpawnCommand('npm.cmd', ['run', 'nt:backfill', '--', '--bridge-instrument', 'MES 06-26']);
assert.equal(safeSpawnCommand.command, process.execPath);
assert.equal(safeSpawnCommand.args.at(1), path.join('tools', 'automation', 'backfill-market-bars.ts'));
assert.deepEqual(safeSpawnCommand.args.slice(-2), ['--bridge-instrument', 'MES 06-26']);

const recorderService = defaultConfig.config.childServices.find((service) => service.id === 'candle-recorder');
assert.ok(recorderService);
assert.equal(isTrackedServiceProcessRunning(recorderService, null, []), false);
assert.equal(
  isTrackedServiceProcessRunning(recorderService, process.pid, [
    { pid: process.pid, commandLine: 'cmd.exe /c npm.cmd run unrelated-script' },
  ]),
  process.platform === 'win32' ? false : isProcessRunning(process.pid),
);
assert.equal(
  isTrackedServiceProcessRunning(recorderService, process.pid, [
    { pid: process.pid, commandLine: `cmd.exe /c npm.cmd run ${recorderService.npmScript} -- ${recorderService.args.join(' ')}` },
  ]),
  process.platform === 'win32' ? true : isProcessRunning(process.pid),
);
assert.equal(
  isTrackedServiceProcessRunning(recorderService, process.pid, [
    { pid: process.pid, commandLine: `node.exe node_modules\\tsx\\dist\\cli.mjs tools\\automation\\candle-recorder.ts ${recorderService.args.join(' ')}` },
  ]),
  process.platform === 'win32' ? true : isProcessRunning(process.pid),
);

const fixedNow = new Date('2026-06-05T12:00:00.000Z');
const status = buildSupervisorStatus(defaultConfig, null, null, null, fixedNow);
assert.equal(status.supervisor.name, 'quant-desk-local-supervisor');
assert.equal(status.supervisor.phase, 'phase_4_event_delivery_visibility');
assert.equal(status.supervisor.status, 'ready');
assert.equal(status.supervisor.timestamp, '2026-06-05T12:00:00.000Z');
assert.equal(status.config.status, 'valid');
assert.equal(status.endOfDayEvidenceSummary, null);
assert.equal(status.maintenance.active, false);
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
const maintenanceCwd = fs.mkdtempSync(path.join(os.tmpdir(), 'quant-desk-supervisor-maintenance-'));
createQuantDeskMaintenanceLock({ cwd: maintenanceCwd, reason: 'supervisor test', owner: 'test', action: 'test' });
const previousCwd = process.cwd();
process.chdir(maintenanceCwd);
try {
  const maintenanceStatus = buildSupervisorStatus(defaultConfig);
  assert.equal(maintenanceStatus.maintenance.active, true);
  const notificationResult = buildSupervisorNotifications(maintenanceStatus, {
    lastStatuses: { 'service:scanner': 'stopped', recorder_heartbeat: 'warn' },
    lastSentAtByKey: {},
  });
  assert.equal(notificationResult.notifications.length, 0);
  assert.equal(notificationResult.nextState.lastStatuses.recorder_heartbeat, 'maintenance');
} finally {
  process.chdir(previousCwd);
  clearQuantDeskMaintenanceLock({ cwd: maintenanceCwd });
  fs.rmSync(maintenanceCwd, { recursive: true, force: true });
}
const phase6SignoffSource = await import('./phase6Signoff');
assert.equal('runTradeDecisionPipeline' in phase6SignoffSource, false);
assert.equal('scanSetupCandidates' in phase6SignoffSource, false);
assert.equal(typeof buildSupervisorPhase6SignoffStatus, 'function');

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

const scannerDiscordDisabledConfig = loadSupervisorConfig(
  {
    SUPERVISOR_SCANNER_DISCORD_ENABLED: 'false',
  },
  'C:\\quant-desk',
);
const scannerDiscordDisabledService = scannerDiscordDisabledConfig.config.childServices.find((service) => service.id === 'scanner');
assert.ok(scannerDiscordDisabledService);
assert.deepEqual(scannerDiscordDisabledService.args.slice(-2), ['--discord', 'false']);
assert.equal(scannerDiscordDisabledService.args.includes('--instrument'), true);
assert.equal(scannerDiscordDisabledService.args.includes('--live-discord-policy-confirmed'), false);

const statusSource = await import('./status');
assert.equal('runTradeDecisionPipeline' in statusSource, false);
assert.equal('scanSetupCandidates' in statusSource, false);
assert.equal('endOfDayEvidenceSummary' in buildSupervisorStatus(defaultConfig), true);

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const trayScriptPath = path.join(repoRoot, 'QuantDeskSupervisorTray.ps1');
const trayScript = fs.readFileSync(trayScriptPath, 'utf8');
const trayStartScriptPath = path.join(repoRoot, 'Start-QuantDeskSupervisorTray.ps1');
const trayStartScript = fs.readFileSync(trayStartScriptPath, 'utf8');
const supervisorStartScriptPath = path.join(repoRoot, 'Start-QuantDesk-Supervisor.ps1');
const supervisorStartScript = fs.readFileSync(supervisorStartScriptPath, 'utf8');
const supervisorStopScriptPath = path.join(repoRoot, 'Stop-QuantDesk-Supervisor.ps1');
const supervisorStopScript = fs.readFileSync(supervisorStopScriptPath, 'utf8');
const liveSignoffScriptPath = path.join(repoRoot, 'Open-QuantDesk-LiveSignoff.ps1');
const liveSignoffScript = fs.readFileSync(liveSignoffScriptPath, 'utf8');
const evidenceSummaryScriptPath = path.join(repoRoot, 'Open-QuantDesk-EvidenceSummary.ps1');
const evidenceSummaryScript = fs.readFileSync(evidenceSummaryScriptPath, 'utf8');
const trayLauncherPath = path.join(repoRoot, 'Launch-QuantDeskSupervisorTray.vbs');
const trayLauncher = fs.readFileSync(trayLauncherPath, 'utf8');
assert.ok(trayScript.includes('System.Windows.Forms.NotifyIcon'));
assert.ok(trayScript.includes('Open Logs'));
assert.ok(trayScript.includes('Open Live Signoff'));
assert.ok(trayScript.includes('Open-QuantDesk-LiveSignoff.ps1'));
assert.ok(trayScript.includes('open-live-signoff'));
assert.ok(trayScript.includes('Open Evidence Summary'));
assert.ok(trayScript.includes('Open-QuantDesk-EvidenceSummary.ps1'));
assert.ok(trayScript.includes('open-evidence-summary'));
assert.ok(trayScript.includes('Open Research Status'));
assert.ok(trayScript.includes('Open-QuantDesk-ResearchReview.ps1'));
assert.ok(trayScript.includes('open-research-status'));
assert.ok(trayScript.includes('Stop All'));
assert.ok(supervisorStopScript.includes('quant-desk:stop-all'));
assert.ok(trayScript.includes('Repair Market Cache Now'));
assert.ok(trayScript.includes('manual-market-cache-repair'));
assert.ok(trayScript.includes('Restart Supervisor Services'));
assert.ok(trayScript.includes('Self-Heal Enabled'));
assert.ok(trayScript.includes('Invoke-SelfHealIfNeeded'));
assert.ok(trayScript.includes('SelfHealPausedByStop'));
assert.ok(trayScript.includes('SupervisorStartupGraceSeconds'));
assert.ok(trayScript.includes('Set-SupervisorStarting'));
assert.ok(trayScript.includes('Get-SupervisorProcessFallbackStatus'));
assert.ok(trayScript.includes('Confirm-SupervisorEndpointUnavailable'));
assert.ok(trayScript.includes('$StatusCommandTimeoutMilliseconds = 20000'));
assert.ok(trayScript.includes('const controller = new AbortController();'));
assert.ok(trayScript.includes('& node -e $NodeStatusScript $StatusUri $StatusCommandTimeoutMilliseconds'));
assert.equal(trayScript.includes('Invoke-RestMethod -Uri $StatusUri'), false);
assert.ok(trayScript.includes('Supervisor self-heal suppressed; endpoint recovered during confirmation.'));
assert.ok(trayScript.includes('[bool]$ProcessRunning = $false'));
assert.ok(trayScript.includes('Invoke-SelfHealIfNeeded -Payload $state.Payload -ProcessRunning $state.ProcessRunning'));
assert.ok(trayScript.includes('Supervisor initial start suppressed; process is running while endpoint reconnects.'));
assert.ok(trayScript.includes('Supervisor startup grace expired; self-heal may retry.'));
assert.ok(trayScript.includes('Supervisor start requested; waiting for status endpoint.'));
assert.ok(trayScript.includes('Reconnecting'));
assert.ok(trayScript.includes('supervisor:notify-self-heal'));
assert.ok(trayScript.includes('Start-Sleep -Milliseconds 1200'));
assert.equal(trayScript.includes('Add_Opening'), false);
assert.equal(trayScript.includes('runTradeDecisionPipeline'), false);
assert.equal(trayScript.includes('scanSetupCandidates'), false);
assert.equal(trayScript.includes('canExecute'), false);
const researchReviewScriptPath = path.join(repoRoot, 'Open-QuantDesk-ResearchReview.ps1');
const researchReviewScript = fs.readFileSync(researchReviewScriptPath, 'utf8');
assert.ok(researchReviewScript.includes('npm run research:desk-case-review -- --json'));
assert.ok(researchReviewScript.includes('research-reports'));
assert.ok(researchReviewScript.includes("desk-research-case-review-*.html"));
assert.equal(researchReviewScript.includes("desk-research-inventory-*.md"), false);
assert.ok(researchReviewScript.includes('postsDiscord = $false'));
assert.ok(researchReviewScript.includes('writesSupabase = $false'));
assert.ok(researchReviewScript.includes('changesTradingLogic = $false'));
assert.ok(researchReviewScript.includes('changesCanExecute = $false'));
assert.equal(researchReviewScript.includes('nt:scanner'), false);
assert.equal(researchReviewScript.includes('nt:candle-recorder'), false);
assert.equal(researchReviewScript.includes('supervisor:start'), false);
assert.equal(researchReviewScript.includes('supervisor:stop'), false);
assert.equal(researchReviewScript.includes('DISCORD_WEBHOOK_URL'), false);
assert.ok(trayLauncher.includes('shell.Run command, 0, False'));
assert.ok(trayLauncher.includes('-WindowStyle Hidden'));
assert.ok(trayLauncher.includes('Start-QuantDeskSupervisorTray.ps1'));
assert.equal(trayLauncher.includes('runTradeDecisionPipeline'), false);
assert.equal(trayLauncher.includes('scanSetupCandidates'), false);
assert.equal(trayLauncher.includes('canExecute'), false);
assert.ok(trayStartScript.includes('Existing supervisor tray process replaced before launch.'));
assert.ok(trayStartScript.includes('Supervisor tray launch requested.'));
assert.ok(trayStartScript.includes('Import-UserDiscordEnvironment'));
assert.ok(trayStartScript.includes('QUANT_DESK_SCANNER_WEBHOOK_URL'));
assert.ok(trayStartScript.includes('SCANNER_DISCORD_WEBHOOK_URL'));
assert.ok(trayStartScript.includes('SUPERVISOR_DISCORD_WEBHOOK_URL'));
assert.ok(trayStartScript.includes('SYSTEM_ALERTS_DISCORD_WEBHOOK_URL'));
assert.ok(trayStartScript.includes("Name -ieq 'powershell.exe'"));
assert.ok(trayStartScript.includes('QuantDeskSupervisorTray.ps1'));
assert.ok(trayStartScript.includes('Stop-Process -Id $process.ProcessId -Force'));
assert.ok(trayStartScript.includes('Start-Process -FilePath'));
assert.equal(trayStartScript.includes('runTradeDecisionPipeline'), false);
assert.equal(trayStartScript.includes('scanSetupCandidates'), false);
assert.equal(trayStartScript.includes('canExecute'), false);
assert.ok(supervisorStartScript.includes('Import-UserDiscordEnvironment'));
assert.ok(supervisorStartScript.includes('QUANT_DESK_SCANNER_WEBHOOK_URL'));
assert.ok(supervisorStartScript.includes('SCANNER_DISCORD_WEBHOOK_URL'));
assert.ok(supervisorStartScript.includes('SUPERVISOR_DISCORD_WEBHOOK_URL'));
assert.ok(supervisorStartScript.includes('SYSTEM_ALERTS_DISCORD_WEBHOOK_URL'));
assert.equal(supervisorStartScript.includes('runTradeDecisionPipeline'), false);
assert.equal(supervisorStartScript.includes('scanSetupCandidates'), false);
assert.equal(supervisorStartScript.includes('canExecute'), false);
assert.ok(liveSignoffScript.includes('npm run supervisor:signoff-manifest -- --json'));
assert.ok(liveSignoffScript.includes('live-signoff'));
assert.ok(liveSignoffScript.includes('postsDiscord = $false'));
assert.ok(liveSignoffScript.includes('writesSupabase = $false'));
assert.ok(liveSignoffScript.includes('changesScannerState = $false'));
assert.ok(liveSignoffScript.includes('changesTradingLogic = $false'));
assert.ok(liveSignoffScript.includes('changesCanExecute = $false'));
assert.ok(liveSignoffScript.includes('startsChildProcesses = $false'));
assert.equal(liveSignoffScript.includes('nt:scanner'), false);
assert.equal(liveSignoffScript.includes('nt:candle-recorder'), false);
assert.equal(liveSignoffScript.includes('DISCORD_WEBHOOK_URL'), false);
assert.equal(liveSignoffScript.includes('runTradeDecisionPipeline'), false);
assert.equal(liveSignoffScript.includes('scanSetupCandidates'), false);
assert.equal(liveSignoffScript.includes('canExecute = $true'), false);
assert.ok(evidenceSummaryScript.includes('npm run supervisor:eod-summary -- --json'));
assert.ok(evidenceSummaryScript.includes('evidence-summary'));
assert.ok(evidenceSummaryScript.includes('[switch]$NoOpen'));
assert.ok(evidenceSummaryScript.includes('if (-not $NoOpen)'));
assert.ok(evidenceSummaryScript.includes('postsDiscord = $false'));
assert.ok(evidenceSummaryScript.includes('writesSupabase = $false'));
assert.ok(evidenceSummaryScript.includes('changesScannerState = $false'));
assert.ok(evidenceSummaryScript.includes('changesTradingLogic = $false'));
assert.ok(evidenceSummaryScript.includes('changesCanExecute = $false'));
assert.ok(evidenceSummaryScript.includes('startsChildProcesses = $false'));
assert.equal(evidenceSummaryScript.includes('nt:scanner'), false);
assert.equal(evidenceSummaryScript.includes('nt:candle-recorder'), false);
assert.equal(evidenceSummaryScript.includes('DISCORD_WEBHOOK_URL'), false);
assert.equal(evidenceSummaryScript.includes('runTradeDecisionPipeline'), false);
assert.equal(evidenceSummaryScript.includes('scanSetupCandidates'), false);
assert.equal(evidenceSummaryScript.includes('canExecute = $true'), false);

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

const liveSignoffManifestSource = fs.readFileSync(path.join(supervisorDir, 'liveSignoffManifest.ts'), 'utf8');
assert.ok(liveSignoffManifestSource.includes("reportType: 'supervisor_live_signoff_manifest'"));
assert.ok(liveSignoffManifestSource.includes('phase_9_signoff_manifest_archive'));
assert.ok(liveSignoffManifestSource.includes('postsDiscord: false'));
assert.ok(liveSignoffManifestSource.includes('writesSupabase: false'));
assert.ok(liveSignoffManifestSource.includes('changesScannerState: false'));
assert.ok(liveSignoffManifestSource.includes('changesTradingLogic: false'));
assert.ok(liveSignoffManifestSource.includes('changesCanExecute: false'));
assert.ok(liveSignoffManifestSource.includes('startsChildProcesses: false'));
assert.equal(liveSignoffManifestSource.includes('DISCORD_WEBHOOK_URL'), false);
const endOfDayBundleSource = fs.readFileSync(path.join(supervisorDir, 'endOfDayEvidenceBundle.ts'), 'utf8');
assert.ok(endOfDayBundleSource.includes("reportType: 'supervisor_end_of_day_evidence_bundle'"));
assert.ok(endOfDayBundleSource.includes('phase_10_end_of_day_evidence_bundle'));
assert.ok(endOfDayBundleSource.includes('postsDiscord: false'));
assert.ok(endOfDayBundleSource.includes('writesSupabase: false'));
assert.ok(endOfDayBundleSource.includes('changesScannerState: false'));
assert.ok(endOfDayBundleSource.includes('changesTradingLogic: false'));
assert.ok(endOfDayBundleSource.includes('changesCanExecute: false'));
assert.ok(endOfDayBundleSource.includes('startsChildProcesses: false'));
assert.equal(endOfDayBundleSource.includes('DISCORD_WEBHOOK_URL'), false);
const endOfDaySummarySource = fs.readFileSync(path.join(supervisorDir, 'endOfDayEvidenceSummary.ts'), 'utf8');
assert.ok(endOfDaySummarySource.includes("reportType: 'supervisor_end_of_day_evidence_summary'"));
assert.ok(endOfDaySummarySource.includes('phase_11_operator_evidence_summary'));
assert.ok(endOfDaySummarySource.includes('postsDiscord: false'));
assert.ok(endOfDaySummarySource.includes('writesSupabase: false'));
assert.ok(endOfDaySummarySource.includes('changesScannerState: false'));
assert.ok(endOfDaySummarySource.includes('changesTradingLogic: false'));
assert.ok(endOfDaySummarySource.includes('changesCanExecute: false'));
assert.ok(endOfDaySummarySource.includes('startsChildProcesses: false'));
assert.equal(endOfDaySummarySource.includes('DISCORD_WEBHOOK_URL'), false);

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
    eveningStartEt: '18:30',
    eveningEndEt: '18:45',
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
const afterCloseRecorderHeartbeatPath = path.join(tempLogsDir, 'after-close-recorder-heartbeat.json');
fs.writeFileSync(afterCloseRecorderHeartbeatPath, JSON.stringify({
  status: 'warn',
  updatedAt: '2026-06-13T02:25:50.000Z',
  latestCompleted5m: '2026-06-12T17:00:00.0000000',
  warning: 'NinjaTrader bridge is reachable, but latest completed 5M candle is stale.',
}, null, 2), 'utf8');
const afterCloseHealthState = {
  statePath: path.join(tempLogsDir, 'after-close-health-state.json'),
  supervisorPid: process.pid,
  services: [{
    id: 'candle-recorder',
    status: 'running',
    pid: process.pid,
    startedAt: '2026-06-13T01:20:00.000Z',
    stdoutLog: afterCloseRecorderHeartbeatPath,
    stderrLog: path.join(tempLogsDir, 'after-close-recorder-stderr.log'),
    error: null,
    restartCount: 0,
    lastRestartAt: null,
    lastRestartReason: null,
    externalPids: [],
  }],
  startedAt: '2026-06-13T01:20:00.000Z',
} satisfies SupervisorState;
const afterCloseHealth = await buildHealthReport(
  {
    ...processConfig,
    childServices: [
      ...processConfig.childServices,
      {
        id: 'candle-recorder',
        label: 'Candle Recorder',
        npmScript: 'nt:candle-recorder',
        args: ['--heartbeat-path', afterCloseRecorderHeartbeatPath],
        enabled: true,
      },
    ],
  },
  afterCloseHealthState,
  new Date('2026-06-13T02:25:51.464Z'),
  {},
);
const afterCloseHeartbeat = afterCloseHealth.checks.find((check) => check.id === 'recorder_heartbeat');
assert.equal(afterCloseHeartbeat?.status, 'ok');
assert.ok(afterCloseHeartbeat?.message.includes('paused after the 10:15 PM ET scanner close'));
const sundayEveningRecorderHeartbeatPath = path.join(tempLogsDir, 'sunday-evening-recorder-heartbeat.json');
fs.writeFileSync(sundayEveningRecorderHeartbeatPath, JSON.stringify({
  status: 'warn',
  updatedAt: '2026-06-15T00:25:50.000Z',
  latestCompleted5m: '2026-06-14T20:25:00.0000000',
  warning: 'NinjaTrader bridge is reachable, but latest completed 5M candle is stale.',
}, null, 2), 'utf8');
const sundayEveningHealth = await buildHealthReport(
  {
    ...processConfig,
    childServices: [
      ...processConfig.childServices,
      {
        id: 'candle-recorder',
        label: 'Candle Recorder',
        npmScript: 'nt:candle-recorder',
        args: ['--heartbeat-path', sundayEveningRecorderHeartbeatPath],
        enabled: true,
      },
    ],
  },
  {
    ...afterCloseHealthState,
    services: [{
      ...afterCloseHealthState.services[0],
      stdoutLog: sundayEveningRecorderHeartbeatPath,
    }],
  },
  new Date('2026-06-15T00:25:51.464Z'),
  {},
);
const sundayEveningHeartbeat = sundayEveningHealth.checks.find((check) => check.id === 'recorder_heartbeat');
assert.equal(sundayEveningHeartbeat?.status, 'warn');
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
const eveningBackfill = runPreWindowBackfillIfDue(processConfig, logger, new Date('2026-06-05T22:35:00.000Z'));
assert.equal(eveningBackfill.enabled, true);
assert.equal(eveningBackfill.due, true);
assert.equal(eveningBackfill.attempted, true);
assert.equal(eveningBackfill.run?.session, 'evening');
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
const sufficientCacheWithWeekendNoBarsAssurance = parseHtfPreloadAssurance([
  '[backfill] 2026-07-02 5m: skipped; cache coverage already sufficient (272 bars).',
  '[backfill] 2026-07-02 15m: skipped; cache coverage already sufficient (91 bars).',
  '[backfill] 2026-07-02 60m: skipped; cache coverage already sufficient (23 bars).',
  '[backfill] 2026-07-02 120m: skipped; cache coverage already sufficient (12 bars).',
  '[backfill] 2026-07-02 240m: skipped; cache coverage already sufficient (6 bars).',
].join('\n'), [
  '[backfill] 2026-06-27 5m: no bars returned.',
  '[backfill] 2026-06-27 15m: no bars returned.',
  '[backfill] 2026-06-27 60m: no bars returned.',
  '[backfill] 2026-06-27 120m: no bars returned.',
  '[backfill] 2026-06-27 240m: no bars returned.',
].join('\n'));
assert.equal(sufficientCacheWithWeekendNoBarsAssurance.ok, true);
assert.deepEqual(sufficientCacheWithWeekendNoBarsAssurance.noBarsTimeframes, []);
assert.equal(sufficientCacheWithWeekendNoBarsAssurance.stderrWarning, false);
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
launchEnabledServices(processConfig, logger);
const launchedState = await waitForLaunchedService(processConfig);
const launchedChild = launchedState.services[0];
assert.ok(launchedChild.status === 'running' || launchedChild.status === 'external_running');
if (launchedChild.status === 'running') {
  assert.ok(launchedChild.pid);
  assert.equal(isProcessRunning(launchedChild.pid), true);
  assert.equal(isTrackedServiceProcessRunning(processConfig.childServices[0], launchedChild.pid, []), true);
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
const healthDiscordConfig = await buildHealthReport(processConfig, launchedState, new Date(), {
  SUPERVISOR_DISCORD_WEBHOOK_URL: 'https://discord.example/scanner-health',
} as NodeJS.ProcessEnv);
const healthDiscordConfigCheck = healthDiscordConfig.checks.find((check) => check.id === 'discord_config');
assert.equal(healthDiscordConfigCheck?.status, 'ok');
assert.deepEqual(healthDiscordConfigCheck?.details?.configuredKeys, ['SUPERVISOR_DISCORD_WEBHOOK_URL']);

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
assert.equal(dryRunDeliveryReport.lastHistoricalDelivery?.deliveryStatus, 'sent');
assert.equal(dryRunDeliveryReport.skippedDeliveries.length, 0);

const staleHistoricalDeliveryStatePath = path.join(deliveryFixtureDir, '.nt-scanner-stale-historical-delivery-state.json');
fs.writeFileSync(staleHistoricalDeliveryStatePath, JSON.stringify({
  sent: {
    '2026-06-23:MES:morning:DESK_PLAN_REFRESH:2026-06-23T10:05:00.0000000:LONG': {
      state: 'Conditional',
      confidence: 80,
      sentAt: '2026-06-23T14:13:15.655Z',
    },
  },
  alertDeliveries: {
    '2026-06-18|MES|evening|SHORT|TurtleSoup|7575|Missed': {
      alertKey: '2026-06-18|MES|evening|SHORT|TurtleSoup|7575|Missed',
      planVersionId: 'EVENING-20260618-000759',
      instrument: 'MES',
      tradeDate: '2026-06-18',
      session: 'evening',
      state: 'Missed',
      confidence: 77,
      deliveryStatus: 'sent',
      webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
      httpStatus: 200,
      discordMessageId: 'discord-old',
      attemptedAt: '2026-06-19T00:08:00.751Z',
      sentAt: '2026-06-19T00:08:01.899Z',
      stale: true,
      retryEligible: false,
    },
  },
  lastCompleted5mBySession: {
    '2026-06-23:evening': '2026-06-23T19:05:00.0000000',
  },
  lastMarketMapRefreshBySession: {
    '2026-06-23:evening': '2026-06-23T19:05:00.0000000',
  },
  lastHealthStatus: 'READY',
}, null, 2), 'utf8');
const staleHistoricalDeliveryReport = buildDeliveryVisibilityReport({
  scannerStatePath: staleHistoricalDeliveryStatePath,
  auditDir,
  now: new Date('2026-06-23T23:15:00.000Z'),
  staleAfterMs: 180_000,
});
assert.equal(staleHistoricalDeliveryReport.activeTradeDate, '2026-06-23');
assert.equal(staleHistoricalDeliveryReport.lastDelivery, null);
assert.equal(staleHistoricalDeliveryReport.lastDiscordSend, null);
assert.equal(staleHistoricalDeliveryReport.lastHistoricalDelivery?.alertKey, '2026-06-18|MES|evening|SHORT|TurtleSoup|7575|Missed');
assert.equal(staleHistoricalDeliveryReport.lastHistoricalDiscordSend?.discordMessageId, 'discord-old');

const preFixHistoricalStatePath = path.join(deliveryFixtureDir, '.nt-scanner-prefix-historical-state.json');
fs.writeFileSync(preFixHistoricalStatePath, JSON.stringify({
  alertDeliveries: {
    '2026-06-30:LONG:HTF-FAILED-AUCTION': {
      alertKey: '2026-06-30:LONG:HTF-FAILED-AUCTION',
      planVersionId: 'EVENING-20260630-210500',
      instrument: 'MES',
      tradeDate: '2026-06-30',
      session: 'evening',
      state: 'Skipped',
      confidence: 90,
      deliveryStatus: 'skipped',
      webhookSource: 'phase11_boundary',
      error: 'Discord delivery skipped by phase11_boundary.',
      attemptedAt: '2026-07-01T01:34:38.000Z',
      stale: true,
      retryEligible: false,
    },
    '2026-06-30:LONG:RECOVERED-PENDING': {
      alertKey: '2026-06-30:LONG:RECOVERED-PENDING',
      planVersionId: 'EVENING-20260630-211000',
      instrument: 'MES',
      tradeDate: '2026-06-30',
      session: 'evening',
      state: 'Failed',
      confidence: 90,
      deliveryStatus: 'failed',
      webhookSource: 'scanner_audit_recovery',
      error: 'Recovered stale pending final delivery outcome.',
      attemptedAt: '2026-07-01T01:35:01.000Z',
      stale: true,
      retryEligible: false,
    },
    '2026-06-30:LONG:CURRENT-FAILED': {
      alertKey: '2026-06-30:LONG:CURRENT-FAILED',
      planVersionId: 'EVENING-20260630-213500',
      instrument: 'MES',
      tradeDate: '2026-06-30',
      session: 'evening',
      state: 'Failed',
      confidence: 90,
      deliveryStatus: 'failed',
      webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
      error: 'Discord webhook failed.',
      attemptedAt: '2026-07-01T01:40:01.000Z',
      stale: false,
      retryEligible: true,
    },
  },
  lastCompleted5mBySession: {
    '2026-06-30:evening': '2026-06-30T21:35:00.0000000',
  },
  lastMarketMapRefreshBySession: {
    '2026-06-30:evening': '2026-07-01T01:39:00.000Z',
  },
  lastHealthStatus: 'READY',
}, null, 2), 'utf8');
const preFixHistoricalReport = buildDeliveryVisibilityReport({
  scannerStatePath: preFixHistoricalStatePath,
  auditDir,
  now: new Date('2026-07-01T01:41:00.000Z'),
  staleAfterMs: 4 * 60 * 60 * 1000,
});
assert.equal(preFixHistoricalReport.preFixHistoricalDeliveries?.length, 2);
assert.ok(preFixHistoricalReport.preFixHistoricalDeliveries?.every((delivery) => delivery.historicalClassification === 'pre_fix_historical'));
assert.equal(preFixHistoricalReport.skippedDeliveries.length, 0);
assert.equal(preFixHistoricalReport.failedDeliveries.length, 1);
assert.equal(preFixHistoricalReport.failedDeliveries[0]?.alertKey, '2026-06-30:LONG:CURRENT-FAILED');
assert.equal(preFixHistoricalReport.historicalAuditCutoff?.commit, 'bb30bc4');

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

const staleMarkerFreshHeartbeatPath = path.join(deliveryFixtureDir, 'stale-marker-fresh-heartbeat.json');
const staleMarkerFreshHeartbeatStatePath = path.join(deliveryFixtureDir, '.nt-scanner-stale-marker-fresh-heartbeat-state.json');
fs.writeFileSync(staleMarkerFreshHeartbeatPath, JSON.stringify({
  status: 'ok',
  updatedAt: '2026-06-15T14:00:59.194Z',
  latestCompleted5m: '2026-06-15T09:55:00.0000000',
  barsProcessed: 600,
  warning: null,
  error: null,
}, null, 2), 'utf8');
fs.writeFileSync(staleMarkerFreshHeartbeatStatePath, JSON.stringify({
  lastCompleted5mBySession: {
    '2026-06-14:evening': '2026-06-14T22:05:00.0000000',
  },
  lastMarketMapRefreshBySession: {
    '2026-06-14:evening': '2026-06-15T02:14:37.802Z',
  },
  lastHealthStatus: 'READY',
}, null, 2), 'utf8');
const staleMarkerFreshHeartbeatReport = buildDeliveryVisibilityReport({
  scannerStatePath: staleMarkerFreshHeartbeatStatePath,
  auditDir,
  recorderHeartbeatPath: staleMarkerFreshHeartbeatPath,
  now: new Date('2026-06-15T14:01:57.724Z'),
  staleAfterMs: 180_000,
});
assert.deepEqual(staleMarkerFreshHeartbeatReport.staleDataBlockers, []);
assert.equal(staleMarkerFreshHeartbeatReport.status, 'ok');

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

const afterClosePausedStatePath = path.join(deliveryFixtureDir, '.nt-scanner-after-close-paused-state.json');
fs.writeFileSync(afterClosePausedStatePath, JSON.stringify({
  lastCompleted5mBySession: {
    '2026-06-12:lunch': '2026-06-12T17:00:00.0000000',
  },
  lastMarketMapRefreshBySession: {
    '2026-06-12:lunch': '2026-06-12T17:00:00.0000000',
  },
  lastHealthStatus: 'BLOCKED',
}, null, 2), 'utf8');
const afterClosePausedDeliveryReport = buildDeliveryVisibilityReport({
  scannerStatePath: afterClosePausedStatePath,
  auditDir,
  now: new Date('2026-06-13T01:25:51.464Z'),
  staleAfterMs: 180_000,
});
assert.deepEqual(afterClosePausedDeliveryReport.staleDataBlockers, []);
assert.equal(afterClosePausedDeliveryReport.status, 'ok');

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

const supervisorFloodStatePath = path.join(tempLogsDir, 'supervisor-flood-control-state.json');
fs.writeFileSync(supervisorFloodStatePath, JSON.stringify({
  lastStatuses: {},
  lastSentAtByKey: {
    market_data_gap_sync_pending: '2026-06-05T01:00:00.000Z',
  },
  postedMessages: {
    market_data_gap_sync_pending: {
      dedupeKey: 'market_data_gap_sync_pending',
      kind: 'market_data_gap_sync_pending',
      messageId: 'gap-sync-old-message',
      postedAt: '2026-06-05T01:00:00.000Z',
      deletedAt: null,
      deleteStatus: 'pending',
      lastError: null,
    },
  },
}, null, 2));
const supervisorFloodCalls: string[] = [];
const supervisorFloodSend = await sendSupervisorNotifications(pendingGapStatus, {
  statePath: supervisorFloodStatePath,
  webhookUrl: 'https://discord.com/api/webhooks/supervisor/token',
  now: new Date('2026-06-05T02:51:09.681Z'),
  staleCooldownMs: 180_000,
  fetchImpl: async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    supervisorFloodCalls.push(`${init?.method || 'GET'} ${String(input)}`);
    if ((init?.method || 'GET') === 'DELETE') return new Response(null, { status: 204 });
    return new Response(JSON.stringify({ id: 'gap-sync-new-message' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  },
});
assert.equal(supervisorFloodSend.notifications.some((item) => item.kind === 'market_data_gap_sync_pending'), true);
assert.ok(supervisorFloodCalls.includes('DELETE https://discord.com/api/webhooks/supervisor/token/messages/gap-sync-old-message'));
const supervisorFloodState = JSON.parse(fs.readFileSync(supervisorFloodStatePath, 'utf8'));
assert.equal(supervisorFloodState.postedMessages.market_data_gap_sync_pending.messageId, 'gap-sync-new-message');
assert.equal(supervisorFloodState.postedMessages.market_data_gap_sync_pending.deleteStatus, 'pending');

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

const supervisorReadyCleanupStatePath = path.join(tempLogsDir, 'supervisor-ready-cleanup-state.json');
fs.writeFileSync(supervisorReadyCleanupStatePath, JSON.stringify({
  lastStatuses: {},
  lastSentAtByKey: {},
  postedMessages: {
    stale_5m_bars: {
      dedupeKey: 'stale_5m_bars',
      kind: 'stale_5m_bars',
      messageId: 'stale-5m-message-1',
      postedAt: '2026-06-04T13:00:00.000Z',
      deletedAt: null,
      deleteStatus: 'pending',
      lastError: null,
    },
    market_data_gap_sync_pending: {
      dedupeKey: 'market_data_gap_sync_pending',
      kind: 'market_data_gap_sync_pending',
      messageId: 'gap-sync-message-1',
      postedAt: '2026-06-04T13:05:00.000Z',
      deletedAt: null,
      deleteStatus: 'pending',
      lastError: null,
    },
    contract_mismatch: {
      dedupeKey: 'contract_mismatch',
      kind: 'contract_mismatch',
      messageId: 'contract-mismatch-message-1',
      postedAt: '2026-06-04T13:10:00.000Z',
      deletedAt: null,
      deleteStatus: 'pending',
      lastError: null,
    },
    supervisor_self_heal: {
      dedupeKey: 'supervisor_self_heal',
      kind: 'supervisor_self_heal',
      messageId: 'self-heal-message-1',
      postedAt: '2026-06-04T13:15:00.000Z',
      deletedAt: null,
      deleteStatus: 'pending',
      lastError: null,
    },
    'child_restarted:scanner:1': {
      dedupeKey: 'child_restarted:scanner:1',
      kind: 'child_restarted',
      messageId: 'child-restart-message-1',
      postedAt: '2026-06-04T13:20:00.000Z',
      deletedAt: null,
      deleteStatus: 'pending',
      lastError: null,
    },
  },
}, null, 2));
const supervisorReadyCleanupCalls: string[] = [];
const supervisorReadySend = await sendSupervisorNotifications(readyStatus, {
  statePath: supervisorReadyCleanupStatePath,
  webhookUrl: 'https://discord.com/api/webhooks/supervisor/token',
  now: fixedNow,
  fetchImpl: async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    supervisorReadyCleanupCalls.push(`${init?.method || 'GET'} ${String(input)}`);
    if ((init?.method || 'GET') === 'DELETE') return new Response(null, { status: 204 });
    return new Response(JSON.stringify({ id: 'supervisor-ready-message-1' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  },
});
assert.equal(supervisorReadySend.notifications.some((item) => item.kind === 'supervisor_ready'), true);
assert.ok(supervisorReadyCleanupCalls.includes('DELETE https://discord.com/api/webhooks/supervisor/token/messages/stale-5m-message-1'));
assert.ok(supervisorReadyCleanupCalls.includes('DELETE https://discord.com/api/webhooks/supervisor/token/messages/gap-sync-message-1'));
assert.ok(supervisorReadyCleanupCalls.includes('DELETE https://discord.com/api/webhooks/supervisor/token/messages/contract-mismatch-message-1'));
assert.ok(supervisorReadyCleanupCalls.includes('DELETE https://discord.com/api/webhooks/supervisor/token/messages/self-heal-message-1'));
assert.ok(supervisorReadyCleanupCalls.includes('DELETE https://discord.com/api/webhooks/supervisor/token/messages/child-restart-message-1'));
const supervisorReadyCleanupState = JSON.parse(fs.readFileSync(supervisorReadyCleanupStatePath, 'utf8'));
assert.equal(supervisorReadyCleanupState.postedMessages.stale_5m_bars.deleteStatus, 'deleted');
assert.equal(supervisorReadyCleanupState.postedMessages.market_data_gap_sync_pending.deleteStatus, 'deleted');
assert.equal(supervisorReadyCleanupState.postedMessages.contract_mismatch.deleteStatus, 'deleted');
assert.equal(supervisorReadyCleanupState.postedMessages.supervisor_self_heal.deleteStatus, 'deleted');
assert.equal(supervisorReadyCleanupState.postedMessages['child_restarted:scanner:1'].deleteStatus, 'deleted');
assert.equal(supervisorReadyCleanupState.postedMessages['supervisor_ready:12345'].deleteStatus, 'pending');

const heartbeatWarnStatus = buildSupervisorStatus(defaultConfig, readyStatus.childServices.length ? {
  supervisorPid: 12345,
  startedAt: fixedNow.toISOString(),
  statePath: path.join(tempLogsDir, 'heartbeat-warn-state.json'),
  services: readyStatus.childServices.filter((service) => service.id === 'scanner' || service.id === 'candle-recorder').map((service) => ({
    id: service.id,
    pid: service.pid,
    startedAt: service.startedAt,
    stdoutLog: service.stdoutLog || '',
    stderrLog: service.stderrLog || '',
    status: service.status,
    error: service.error,
    restartCount: service.restartCount,
    lastRestartAt: service.lastRestartAt,
    lastRestartReason: service.lastRestartReason,
    externalPids: service.externalPids,
  })),
} : null, {
  status: 'warn',
  generatedAt: fixedNow.toISOString(),
  checks: [
    { id: 'bridge', label: 'NinjaTrader bridge', status: 'ok', message: 'Bridge health endpoint is reachable.' },
    {
      id: 'recorder_heartbeat',
      label: 'Recorder heartbeat',
      status: 'warn',
      message: 'Recorder heartbeat is stale.',
      details: {
        latestCompleted5m: '2026-06-04T22:35:00.0000000',
        updatedAt: '2026-06-05T02:35:00.000Z',
        barsProcessed: 600,
      },
    },
  ],
}, null, fixedNow);
const heartbeatWarnNotifications = buildSupervisorNotifications(
  heartbeatWarnStatus,
  { lastStatuses: {}, lastSentAtByKey: {} },
  fixedNow,
);
const heartbeatWarning = heartbeatWarnNotifications.notifications.find((item) => item.kind === 'recorder_heartbeat_stale');
assert.ok(heartbeatWarning);
assert.equal(heartbeatWarnNotifications.nextState.lastStatuses.recorder_heartbeat, 'warn');

const heartbeatRecoveredStatus = buildSupervisorStatus(defaultConfig, {
  supervisorPid: 12345,
  startedAt: fixedNow.toISOString(),
  statePath: path.join(tempLogsDir, 'heartbeat-recovered-state.json'),
  services: heartbeatWarnStatus.childServices.filter((service) => service.id === 'scanner' || service.id === 'candle-recorder').map((service) => ({
    id: service.id,
    pid: service.pid,
    startedAt: service.startedAt,
    stdoutLog: service.stdoutLog || '',
    stderrLog: service.stderrLog || '',
    status: service.status,
    error: service.error,
    restartCount: service.restartCount,
    lastRestartAt: service.lastRestartAt,
    lastRestartReason: service.lastRestartReason,
    externalPids: service.externalPids,
  })),
}, {
  status: 'ok',
  generatedAt: fixedNow.toISOString(),
  checks: [
    { id: 'bridge', label: 'NinjaTrader bridge', status: 'ok', message: 'Bridge health endpoint is reachable.' },
    {
      id: 'recorder_heartbeat',
      label: 'Recorder heartbeat',
      status: 'ok',
      message: 'Recorder heartbeat is fresh.',
      details: {
        latestCompleted5m: '2026-06-04T22:40:00.0000000',
        updatedAt: '2026-06-05T02:42:09.783Z',
        barsProcessed: 600,
      },
    },
  ],
}, null, fixedNow);
const heartbeatRecoveredNotifications = buildSupervisorNotifications(
  heartbeatRecoveredStatus,
  heartbeatWarnNotifications.nextState,
  fixedNow,
);
const heartbeatRecovered = heartbeatRecoveredNotifications.notifications.find((item) => item.kind === 'recorder_heartbeat_recovered');
assert.ok(heartbeatRecovered);
const heartbeatRecoveredPayloadText = JSON.stringify(buildSupervisorDiscordPayload(heartbeatRecovered, heartbeatRecoveredStatus));
assert.ok(heartbeatRecoveredPayloadText.includes('Recorder Heartbeat Recovered'));
assert.ok(heartbeatRecoveredPayloadText.includes('Latest completed 5M: 2026-06-04T22:40:00.0000000'));
assert.ok(heartbeatRecoveredPayloadText.includes('Heartbeat updated: 2026-06-05T02:42:09.783Z'));
assert.equal(heartbeatRecoveredNotifications.nextState.lastStatuses.recorder_heartbeat, 'ok');
assert.equal(/Trade now|Enter now|Buy now|Sell now|Entry confirmed|Take the trade/i.test(heartbeatRecoveredPayloadText), false);

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

const bridgeFailureState: SupervisorState = {
  supervisorPid: 1,
  startedAt: fixedNow.toISOString(),
  statePath: path.join(tempLogsDir, 'bridge-failure-state.json'),
  services: [],
};
const transientBridgeFailureStatus = buildSupervisorStatus(defaultConfig, bridgeFailureState, {
  status: 'fail',
  generatedAt: fixedNow.toISOString(),
  checks: [
    { id: 'bridge', label: 'NinjaTrader bridge', status: 'fail', message: 'Bridge health endpoint is not reachable: timeout' },
  ],
}, null, fixedNow);
const transientBridgeNotifications = buildSupervisorNotifications(
  transientBridgeFailureStatus,
  { lastStatuses: { bridge: 'ok' }, lastSentAtByKey: {} },
  fixedNow,
);
assert.equal(transientBridgeNotifications.notifications.some((item) => item.kind === 'bridge_unreachable'), false);
assert.equal(transientBridgeNotifications.nextState.lastStatuses.bridge, 'transient_fail');
assert.equal(transientBridgeNotifications.nextState.lastStatuses.bridge_fail_count, '1');

const secondTransientBridgeNotifications = buildSupervisorNotifications(
  transientBridgeFailureStatus,
  transientBridgeNotifications.nextState,
  new Date(fixedNow.getTime() + 15_000),
);
assert.equal(secondTransientBridgeNotifications.notifications.some((item) => item.kind === 'bridge_unreachable'), false);
assert.equal(secondTransientBridgeNotifications.nextState.lastStatuses.bridge, 'transient_fail');
assert.equal(secondTransientBridgeNotifications.nextState.lastStatuses.bridge_fail_count, '2');
assert.equal(secondTransientBridgeNotifications.nextState.lastStatuses.bridge_first_failed_at, fixedNow.toISOString());

const confirmedBridgeFailureNotifications = buildSupervisorNotifications(
  transientBridgeFailureStatus,
  secondTransientBridgeNotifications.nextState,
  new Date(fixedNow.getTime() + 65_000),
);
assert.equal(confirmedBridgeFailureNotifications.notifications.some((item) => item.kind === 'bridge_unreachable'), true);
assert.equal(confirmedBridgeFailureNotifications.nextState.lastStatuses.bridge, 'fail');
assert.equal(confirmedBridgeFailureNotifications.nextState.lastStatuses.bridge_fail_count, '3');
assert.equal(confirmedBridgeFailureNotifications.nextState.lastStatuses.bridge_first_failed_at, fixedNow.toISOString());

const bridgeRecoveredStatus = buildSupervisorStatus(defaultConfig, bridgeFailureState, {
  status: 'ok',
  generatedAt: fixedNow.toISOString(),
  checks: [
    { id: 'bridge', label: 'NinjaTrader bridge', status: 'ok', message: 'Bridge health endpoint is reachable.' },
  ],
}, null, fixedNow);
const bridgeRecoveredNotifications = buildSupervisorNotifications(
  bridgeRecoveredStatus,
  confirmedBridgeFailureNotifications.nextState,
  new Date(fixedNow.getTime() + 30_000),
);
assert.equal(bridgeRecoveredNotifications.notifications.some((item) => item.kind === 'bridge_recovered'), true);
assert.equal(bridgeRecoveredNotifications.nextState.lastStatuses.bridge, 'ok');
assert.equal(bridgeRecoveredNotifications.nextState.lastStatuses.bridge_fail_count, '0');
assert.equal(bridgeRecoveredNotifications.nextState.lastStatuses.bridge_first_failed_at, '');
assert.equal(
  supervisorDiscordWebhookPostUrl('https://discord.com/api/webhooks/supervisor/token'),
  'https://discord.com/api/webhooks/supervisor/token?wait=true',
);
assert.equal(
  supervisorDiscordWebhookDeleteUrl('https://discord.com/api/webhooks/supervisor/token?wait=true', 'bridge-message-1'),
  'https://discord.com/api/webhooks/supervisor/token/messages/bridge-message-1',
);
assert.deepEqual(resolveSupervisorDiscordWebhookUrl({
  QUANT_DESK_SCANNER_WEBHOOK_URL: 'https://discord.example/scanner',
  SCANNER_DISCORD_WEBHOOK_URL: 'https://discord.example/legacy-scanner',
} as NodeJS.ProcessEnv), { url: null, source: null });
assert.deepEqual(resolveSupervisorDiscordWebhookUrl({
  QUANT_DESK_SCANNER_WEBHOOK_URL: 'https://discord.example/scanner',
  QUANT_DESK_HEALTH_WEBHOOK_URL: 'https://discord.example/health',
} as NodeJS.ProcessEnv), { url: 'https://discord.example/health', source: 'QUANT_DESK_HEALTH_WEBHOOK_URL' });
assert.deepEqual(resolveSupervisorDiscordWebhookUrl({
  SUPERVISOR_DISCORD_WEBHOOK_URL: 'https://discord.example/supervisor',
  QUANT_DESK_HEALTH_WEBHOOK_URL: 'https://discord.example/health',
} as NodeJS.ProcessEnv), { url: 'https://discord.example/supervisor', source: 'SUPERVISOR_DISCORD_WEBHOOK_URL' });
assert.deepEqual(resolveSystemAlertsDiscordWebhookUrl({
  SYSTEM_ALERTS_DISCORD_WEBHOOK_URL: 'https://discord.example/system-alerts',
  QUANT_DESK_SYSTEM_ALERTS_WEBHOOK_URL: 'https://discord.example/system-alerts-alias',
} as NodeJS.ProcessEnv), { url: 'https://discord.example/system-alerts', source: 'SYSTEM_ALERTS_DISCORD_WEBHOOK_URL' });
assert.deepEqual(resolveSystemAlertsDiscordWebhookUrl({
  QUANT_DESK_SYSTEM_ALERTS_WEBHOOK_URL: 'https://discord.example/system-alerts-alias',
} as NodeJS.ProcessEnv), { url: 'https://discord.example/system-alerts-alias', source: 'QUANT_DESK_SYSTEM_ALERTS_WEBHOOK_URL' });
assert.deepEqual(resolveSystemAlertsDiscordWebhookUrl({
  SUPERVISOR_DISCORD_WEBHOOK_URL: 'https://discord.example/supervisor',
} as NodeJS.ProcessEnv), { url: null, source: null });
const supervisorCleanupStatePath = path.join(tempLogsDir, 'supervisor-discord-cleanup-state.json');
fs.writeFileSync(supervisorCleanupStatePath, JSON.stringify({
  lastStatuses: {
    bridge: 'transient_fail',
    bridge_fail_count: '2',
    bridge_first_failed_at: fixedNow.toISOString(),
  },
  lastSentAtByKey: {},
  postedMessages: {},
}, null, 2));
const supervisorDiscordCalls: string[] = [];
const bridgeFailureSend = await sendSupervisorNotifications(transientBridgeFailureStatus, {
  statePath: supervisorCleanupStatePath,
  webhookUrl: 'https://discord.com/api/webhooks/supervisor/token',
  systemAlertWebhookUrl: null,
  now: new Date(fixedNow.getTime() + 65_000),
  fetchImpl: async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    supervisorDiscordCalls.push(`${init?.method || 'GET'} ${String(input)}`);
    return new Response(JSON.stringify({ id: 'bridge-message-1' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  },
});
assert.equal(bridgeFailureSend.notifications.some((item) => item.kind === 'bridge_unreachable'), true);
const bridgeRecoveredSend = await sendSupervisorNotifications(bridgeRecoveredStatus, {
  statePath: supervisorCleanupStatePath,
  webhookUrl: 'https://discord.com/api/webhooks/supervisor/token',
  systemAlertWebhookUrl: null,
  now: new Date(fixedNow.getTime() + 95_000),
  fetchImpl: async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    supervisorDiscordCalls.push(`${init?.method || 'GET'} ${String(input)}`);
    if ((init?.method || 'GET') === 'DELETE') return new Response(null, { status: 204 });
    return new Response(JSON.stringify({ id: 'bridge-message-2' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  },
});
assert.equal(bridgeRecoveredSend.notifications.some((item) => item.kind === 'bridge_recovered'), true);
assert.ok(supervisorDiscordCalls.includes('POST https://discord.com/api/webhooks/supervisor/token?wait=true'));
assert.ok(supervisorDiscordCalls.includes('DELETE https://discord.com/api/webhooks/supervisor/token/messages/bridge-message-1'));
const supervisorCleanupState = JSON.parse(fs.readFileSync(supervisorCleanupStatePath, 'utf8'));
assert.equal(supervisorCleanupState.postedMessages.bridge_unreachable.deleteStatus, 'deleted');
assert.equal(supervisorCleanupState.postedMessages.bridge_recovered.deleteStatus, 'pending');

const supervisorSystemAlertStatePath = path.join(tempLogsDir, 'supervisor-system-alert-routing-state.json');
fs.writeFileSync(supervisorSystemAlertStatePath, JSON.stringify({
  lastStatuses: {
    bridge: 'transient_fail',
    bridge_fail_count: '2',
    bridge_first_failed_at: fixedNow.toISOString(),
  },
  lastSentAtByKey: {},
  postedMessages: {},
}, null, 2));
const supervisorSystemAlertCalls: string[] = [];
const systemAlertBridgeFailureSend = await sendSupervisorNotifications(transientBridgeFailureStatus, {
  statePath: supervisorSystemAlertStatePath,
  webhookUrl: 'https://discord.com/api/webhooks/supervisor/token',
  systemAlertWebhookUrl: 'https://discord.com/api/webhooks/system-alerts/token',
  now: new Date(fixedNow.getTime() + 65_000),
  fetchImpl: async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    supervisorSystemAlertCalls.push(`${init?.method || 'GET'} ${String(input)}`);
    return new Response(JSON.stringify({ id: 'system-alert-bridge-message-1' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  },
});
assert.equal(systemAlertBridgeFailureSend.notifications.some((item) => item.kind === 'bridge_unreachable'), true);
assert.ok(supervisorSystemAlertCalls.includes('POST https://discord.com/api/webhooks/system-alerts/token?wait=true'));
assert.equal(supervisorSystemAlertCalls.includes('POST https://discord.com/api/webhooks/supervisor/token?wait=true'), false);
const systemAlertBridgeRecoveredSend = await sendSupervisorNotifications(bridgeRecoveredStatus, {
  statePath: supervisorSystemAlertStatePath,
  webhookUrl: 'https://discord.com/api/webhooks/supervisor/token',
  systemAlertWebhookUrl: 'https://discord.com/api/webhooks/system-alerts/token',
  now: new Date(fixedNow.getTime() + 95_000),
  fetchImpl: async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    supervisorSystemAlertCalls.push(`${init?.method || 'GET'} ${String(input)}`);
    if ((init?.method || 'GET') === 'DELETE') return new Response(null, { status: 204 });
    return new Response(JSON.stringify({ id: 'supervisor-recovered-message-1' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  },
});
assert.equal(systemAlertBridgeRecoveredSend.notifications.some((item) => item.kind === 'bridge_recovered'), true);
assert.ok(supervisorSystemAlertCalls.includes('POST https://discord.com/api/webhooks/supervisor/token?wait=true'));
assert.ok(supervisorSystemAlertCalls.includes('DELETE https://discord.com/api/webhooks/system-alerts/token/messages/system-alert-bridge-message-1'));
const supervisorSystemAlertState = JSON.parse(fs.readFileSync(supervisorSystemAlertStatePath, 'utf8'));
assert.equal(supervisorSystemAlertState.postedMessages.bridge_unreachable.deleteStatus, 'deleted');
assert.equal(supervisorSystemAlertState.postedMessages.bridge_recovered.deleteStatus, 'pending');

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
const selfHealCooldownDryRun = await sendSupervisorSelfHealNotification(tempLogsDir, {
  dryRun: true,
  webhookUrl: 'https://discord.example/webhook',
  now: new Date(fixedNow.getTime() + 60_000),
});
assert.equal(selfHealCooldownDryRun.sent, 0);
assert.equal(selfHealCooldownDryRun.skipped, 1);
assert.equal(selfHealCooldownDryRun.notification.kind, 'supervisor_self_heal');

const stoppedState = stopOwnedServices(processConfig, logger);
const stoppedChild = stoppedState.services[0];
const stoppedChildExited = await waitForProcessExit(stoppedChild.pid);
if (stoppedChildExited) {
  assert.equal(stoppedChild.status, 'stopped');
} else {
  assert.equal(stoppedChild.status, 'running');
  assert.match(stoppedChild.error || '', /still running|stop failed|Command failed/i);
  const duplicateRestartState = restartFailedOwnedServices(processConfig, logger, new Date(Date.now() + 10));
  assert.equal(duplicateRestartState.services[0].pid, stoppedChild.pid);
  assert.equal(duplicateRestartState.services[0].restartCount, stoppedChild.restartCount);
}

const restartConfig = {
  ...processConfig,
};
writeSupervisorState(restartConfig, {
  ...stoppedState,
  services: stoppedState.services.map((service, index) => index === 0
    ? {
        ...service,
        pid: 2147483647,
        status: 'stopped',
        error: null,
      }
    : service),
});
const restartedState = restartFailedOwnedServices(restartConfig, logger, new Date(Date.now() + 10));
const restartedChild = restartedState.services[0];
assert.equal(restartedChild.status, 'running');
assert.ok(restartedChild.pid);
assert.notEqual(restartedChild.pid, 2147483647);
assert.equal(restartedChild.restartCount, 1);
assert.equal(restartedChild.lastRestartReason, 'owned child process is stopped');
stopOwnedServices(restartConfig, logger);

console.log('Supervisor skeleton test verified.');
