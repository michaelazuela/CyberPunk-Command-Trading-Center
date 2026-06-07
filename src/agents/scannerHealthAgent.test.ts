import assert from 'node:assert/strict';
import type { NinjaBridgeBar } from '../lib/ninjaTraderBridge';
import { canSendAlertsFromHealth, evaluateScannerHealth, healthBlocksAlerts, type ScannerHealthInput } from './scannerHealthAgent';

function bar(overrides: Partial<NinjaBridgeBar> = {}): NinjaBridgeBar {
  return {
    time: '2026-05-28T10:00:00-04:00',
    open: 7500,
    high: 7510,
    low: 7498,
    close: 7508,
    volume: 1000,
    ...overrides,
  };
}

function baseInput(overrides: Partial<ScannerHealthInput> = {}): ScannerHealthInput {
  return {
    config: {
      appInstrument: 'MES',
      bridgeInstrument: 'MES 06-26',
      bridgeUrl: 'http://127.0.0.1:8765',
      timestampMode: 'close',
      barTimeZone: 'eastern',
      discordEnabled: true,
      dryRun: false,
      macroCalendarEnabled: true,
      maxStaleBarMinutes: 10,
    },
    bridgeHealth: { ok: true, defaultInstrument: 'MES 06-26' },
    bridgeReachable: true,
    latestCompleted5mBar: bar(),
    barStaleness: {
      stale: false,
      latestTime: '2026-05-28T10:00:00-04:00',
      ageMinutes: 2,
      maxAllowedMinutes: 10,
      reason: null,
    },
    discordWebhookConfigured: true,
    marketMapStatus: { loaded: true, usableBars: 400, fallbackBridgeDataAvailable: true },
    completedFiveMinuteBarAssurance: {
      status: 'ready',
      message: 'Completed 5M Bar Assurance Gate ready: latest completed 5M bar is usable.',
      latestCompletedTime: '2026-05-28T10:00:00-04:00',
      expectedCompletedTime: '2026-05-28T10:00:00-04:00',
      sourceSummary: 'live 5M bars=30; history 5M=6000 from market_bars_bridge_repair',
      recoverySteps: [],
    },
    scannerStateFileStatus: { status: 'ok' },
    macroCalendarStatus: { enabled: true, loaded: true },
    scannerWindow: {
      session: 'morning',
      label: 'Morning Execution Window',
      allowsTradePlan: true,
      allowsDiscordAlert: true,
    },
    ...overrides,
  };
}

function checkStatus(input: ScannerHealthInput, key: string) {
  const report = evaluateScannerHealth(input);
  const found = report.checks.find((item) => item.key === key);
  assert.ok(found, `Expected check ${key}`);
  return { report, found };
}

const ready = evaluateScannerHealth(baseInput());
assert.equal(ready.status, 'READY');
assert.equal(ready.ready, true);
assert.equal(ready.canTrustAlerts, true);
assert.equal(canSendAlertsFromHealth(ready), true);
assert.equal(healthBlocksAlerts(ready), false);
assert.equal(ready.blockingReasons.length, 0);

const bridgeBlocked = evaluateScannerHealth(baseInput({
  bridgeReachable: false,
  bridgeHealth: { ok: false, error: 'connection refused' },
}));
assert.equal(bridgeBlocked.status, 'BLOCKED');
assert.equal(bridgeBlocked.ready, false);
assert.equal(bridgeBlocked.canTrustAlerts, false);
assert.equal(canSendAlertsFromHealth(bridgeBlocked), false);
assert.equal(healthBlocksAlerts(bridgeBlocked), true);
assert.ok(bridgeBlocked.blockingReasons.some((reason) => reason.includes('connection refused') || reason.includes('unreachable')));
assert.equal(bridgeBlocked.checks.find((item) => item.key === 'bridge_reachable')?.severity, 'blocking');

const missingBar = evaluateScannerHealth(baseInput({
  latestCompleted5mBar: null,
  barStaleness: {
    stale: true,
    latestTime: null,
    ageMinutes: null,
    maxAllowedMinutes: 10,
    reason: 'Latest completed 5M bar is missing.',
  },
}));
assert.equal(missingBar.status, 'BLOCKED');
assert.equal(canSendAlertsFromHealth(missingBar), false);
assert.ok(missingBar.blockingReasons.some((reason) => reason.includes('5M bar')));

const staleBar = evaluateScannerHealth(baseInput({
  barStaleness: {
    stale: true,
    latestTime: '2026-05-28T09:30:00-04:00',
    ageMinutes: 30,
    maxAllowedMinutes: 10,
    reason: 'Latest completed 5M bar is stale beyond the configured max.',
  },
}));
assert.equal(staleBar.status, 'BLOCKED');
assert.equal(canSendAlertsFromHealth(staleBar), false);
assert.ok(staleBar.blockingReasons.some((reason) => reason.includes('stale')));

const assuranceBlocked = evaluateScannerHealth(baseInput({
  completedFiveMinuteBarAssurance: {
    status: 'blocked',
    message: 'Completed 5M Bar Assurance Gate blocked: no completed 5M bar was available.',
    latestCompletedTime: null,
    expectedCompletedTime: '2026-05-28T10:05:00.000Z',
    sourceSummary: 'live 5M bars=0; history 5M=not evaluated',
    recoverySteps: ['Confirm NinjaTrader chart is updating.', 'Restart the bridge.'],
  },
}));
assert.equal(assuranceBlocked.status, 'BLOCKED');
assert.equal(canSendAlertsFromHealth(assuranceBlocked), false);
assert.ok(assuranceBlocked.blockingReasons.some((reason) => reason.includes('Completed 5M Bar Assurance Gate blocked')));
assert.ok(assuranceBlocked.blockingReasons.some((reason) => reason.includes('Restart the bridge')));

const severeMismatch = evaluateScannerHealth(baseInput({
  config: {
    ...baseInput().config,
    appInstrument: 'MES',
    bridgeInstrument: 'MNQ 06-26',
  },
}));
assert.equal(severeMismatch.status, 'BLOCKED');
assert.equal(canSendAlertsFromHealth(severeMismatch), false);
assert.ok(severeMismatch.blockingReasons.some((reason) => reason.includes('mismatched')));

const dryRunDiscord = evaluateScannerHealth(baseInput({
  config: {
    ...baseInput().config,
    discordEnabled: true,
    dryRun: true,
  },
  discordWebhookConfigured: false,
}));
assert.equal(dryRunDiscord.status, 'DEGRADED');
assert.equal(dryRunDiscord.blockingReasons.length, 0);
assert.equal(dryRunDiscord.canTrustAlerts, true);
assert.equal(canSendAlertsFromHealth(dryRunDiscord), true);
assert.ok(dryRunDiscord.warnings.some((warning) => warning.includes('dry-run')));
assert.equal(dryRunDiscord.checks.find((item) => item.key === 'discord_webhook')?.severity, 'degraded');

const disabledDiscord = evaluateScannerHealth(baseInput({
  config: {
    ...baseInput().config,
    discordEnabled: false,
  },
  discordWebhookConfigured: false,
}));
assert.equal(disabledDiscord.status, 'READY');
assert.equal(canSendAlertsFromHealth(disabledDiscord), true);

const macroUnavailable = evaluateScannerHealth(baseInput({
  macroCalendarStatus: { enabled: true, unavailable: true, message: 'Macro calendar fetch failed.' },
}));
assert.equal(macroUnavailable.status, 'DEGRADED');
assert.equal(canSendAlertsFromHealth(macroUnavailable), true);
assert.ok(macroUnavailable.warnings.some((warning) => warning.includes('Macro calendar fetch failed')));

const partialMarketMap = evaluateScannerHealth(baseInput({
  marketMapStatus: {
    loaded: false,
    partial: true,
    usableBars: 120,
    fallbackBridgeDataAvailable: true,
    message: 'Partial market map with live bridge fallback.',
  },
}));
assert.equal(partialMarketMap.status, 'DEGRADED');
assert.equal(canSendAlertsFromHealth(partialMarketMap), true);
assert.equal(partialMarketMap.checks.find((item) => item.key === 'market_map_cache')?.severity, 'degraded');

const missingMarketMap = evaluateScannerHealth(baseInput({
  marketMapStatus: {
    loaded: false,
    partial: false,
    usableBars: 0,
    fallbackBridgeDataAvailable: false,
    message: 'No market context available.',
  },
}));
assert.equal(missingMarketMap.status, 'BLOCKED');
assert.equal(canSendAlertsFromHealth(missingMarketMap), false);

const localTimezone = checkStatus(baseInput({
  config: {
    ...baseInput().config,
    barTimeZone: 'local',
  },
}), 'bar_timezone_mode');
assert.equal(localTimezone.report.status, 'DEGRADED');
assert.equal(localTimezone.found.status, 'warn');
assert.equal(localTimezone.found.severity, 'degraded');
assert.equal(canSendAlertsFromHealth(localTimezone.report), true);

const initializedState = checkStatus(baseInput({
  scannerStateFileStatus: { status: 'missing_initialized', message: 'State file was missing and initialized safely.' },
}), 'scanner_state_file');
assert.equal(initializedState.report.status, 'DEGRADED');
assert.equal(initializedState.found.status, 'warn');
assert.equal(initializedState.found.severity, 'degraded');
assert.equal(canSendAlertsFromHealth(initializedState.report), true);

const immutableInput = baseInput();
const immutableBefore = JSON.stringify(immutableInput);
const immutableReport = evaluateScannerHealth(immutableInput);
assert.equal(JSON.stringify(immutableInput), immutableBefore);
assert.equal(JSON.stringify(immutableReport).includes('"entry"'), false);
assert.equal(JSON.stringify(immutableReport).includes('"stop"'), false);
assert.equal(JSON.stringify(immutableReport).includes('"t1"'), false);
assert.equal(JSON.stringify(immutableReport).includes('"t2"'), false);
assert.deepEqual(immutableReport.approvalBoundary, {
  healthApprovesTrade: false,
  healthChangesRules: false,
  healthCreatesEntry: false,
  healthCreatesTargets: false,
  healthOverridesScanner: false,
  healthOverridesRisk: false,
});

console.log('Scanner health readiness agent verified.');
