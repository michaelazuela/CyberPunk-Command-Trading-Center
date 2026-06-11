import assert from 'node:assert/strict';
import { loadSupervisorConfig } from './config';
import { buildSupervisorReadinessDrill } from './readinessDrill';
import { buildSupervisorStatus } from './status';
import type { DeliveryVisibilityReport } from './deliveryVisibility';
import type { SupervisorHealthReport } from './health';
import type { SupervisorState } from './processManager';

const config = loadSupervisorConfig({
  SUPERVISOR_SERVICES: 'candle-recorder,scanner',
}, 'C:\\quant-desk');
assert.equal(config.status, 'valid');

const state: SupervisorState = {
  supervisorPid: process.pid,
  startedAt: '2026-06-10T12:00:00.000Z',
  statePath: 'C:\\quant-desk\\logs\\supervisor\\state.json',
  services: config.config.childServices.map((service, index) => ({
    ...service,
    status: service.enabled ? 'running' : 'disabled',
    pid: service.enabled ? process.pid + index : null,
    startedAt: service.enabled ? '2026-06-10T12:00:00.000Z' : null,
    stdoutLog: service.enabled ? `C:\\quant-desk\\logs\\supervisor\\${service.id}.out.log` : null,
    stderrLog: service.enabled ? `C:\\quant-desk\\logs\\supervisor\\${service.id}.err.log` : null,
    error: null,
    restartCount: 0,
    lastRestartAt: null,
    lastRestartReason: null,
    externalPids: [],
  })),
};

const health: SupervisorHealthReport = {
  status: 'ok',
  generatedAt: '2026-06-10T12:00:00.000Z',
  checks: [],
};

const delivery: DeliveryVisibilityReport = {
  status: 'ok',
  generatedAt: '2026-06-10T12:00:00.000Z',
  scannerStatePath: 'C:\\quant-desk\\tools\\automation\\.nt-scanner-state.json',
  auditDir: 'C:\\quant-desk\\tools\\automation\\discord-audit',
  marketDataGapLedgerPath: 'C:\\quant-desk\\tools\\automation\\.market-data-gap-events.json',
  stateReadable: true,
  stateError: null,
  lastAlert: null,
  lastDelivery: null,
  lastDiscordSend: null,
  failedDeliveries: [],
  pendingDeliveries: [],
  skippedDeliveries: [],
  lastWatchlist: null,
  recentAuditFiles: [],
  recentDecisionTapes: [],
  staleDataBlockers: [],
  pendingMarketDataGapSync: {
    count: 0,
    oldestLocalRecordedAt: null,
    oldestAgeMs: null,
    staleCount: 0,
  },
  boundaries: {
    readOnly: true,
    postsDiscord: false,
    changesScannerState: false,
    changesTradingLogic: false,
  },
};

const readyStatus = buildSupervisorStatus(config, state, health, delivery, new Date('2026-06-10T12:00:00.000Z'), {
  enabled: true,
  due: false,
  attempted: false,
  reason: 'Not due.',
  run: null,
});
const readyDrill = buildSupervisorReadinessDrill(readyStatus);
assert.equal(readyDrill.sourceOfTruth, 'supervisor_phase_10_delta_readiness_drill');
assert.equal(readyDrill.status, 'ready');
assert.equal(readyDrill.risks.length, 0);
assert.ok(readyDrill.checks.every((check) => check.status === 'pass'));
assert.equal(readyDrill.boundaries.readOnly, true);
assert.equal(readyDrill.boundaries.postsDiscord, false);
assert.equal(readyDrill.boundaries.startsProcesses, false);
assert.equal(readyDrill.boundaries.changesTradingLogic, false);
assert.equal(readyDrill.boundaries.changesScannerBehavior, false);
assert.equal(readyDrill.boundaries.changesBridgeBehavior, false);
assert.equal(readyDrill.boundaries.changesDiscordBehavior, false);
assert.equal(readyDrill.boundaries.changesCanExecute, false);
assert.equal(JSON.stringify(readyDrill).includes('"canExecute":true'), false);

const staleDelivery: DeliveryVisibilityReport = {
  ...delivery,
  status: 'warn',
  failedDeliveries: [{
    alertKey: 'failed-key',
    planVersionId: null,
    instrument: 'MES',
    tradeDate: '2026-06-10',
    session: 'morning',
    state: 'Watching',
    confidence: 70,
    deliveryStatus: 'failed',
    webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
    httpStatus: 500,
    discordMessageId: null,
    error: 'Discord webhook failed.',
    attemptedAt: '2026-06-10T14:10:00.000Z',
    sentAt: null,
    auditLogPath: null,
    stale: false,
    retryEligible: true,
  }],
  staleDataBlockers: ['Latest completed 5M marker is stale: 2026-06-10:morning.'],
  pendingMarketDataGapSync: {
    count: 1,
    oldestLocalRecordedAt: '2026-06-10T14:00:00.000Z',
    oldestAgeMs: 600_000,
    staleCount: 1,
  },
};
const blockedStatus = buildSupervisorStatus(config, {
  ...state,
  services: state.services.map((service) => service.id === 'scanner' ? { ...service, status: 'stopped', pid: null } : service),
}, { ...health, status: 'warn' }, staleDelivery, new Date('2026-06-10T12:00:00.000Z'), {
  enabled: true,
  due: true,
  attempted: true,
  reason: 'Backfill due.',
  run: {
    session: 'morning',
    tradeDate: '2026-06-10',
    ok: false,
    reason: 'NinjaTrader bridge did not return current 5M bars.',
    startedAt: '2026-06-10T13:45:00.000Z',
    finishedAt: '2026-06-10T13:45:03.000Z',
    exitStatus: 1,
    stdoutLog: 'C:\\quant-desk\\logs\\supervisor\\backfill.out.log',
    stderrLog: 'C:\\quant-desk\\logs\\supervisor\\backfill.err.log',
    command: ['npm', 'run', 'nt:backfill'],
  },
});
const blockedDrill = buildSupervisorReadinessDrill(blockedStatus);
assert.equal(blockedDrill.status, 'not_ready');
assert.ok(blockedDrill.risks.some((item) => item.includes('child_services')));
assert.ok(blockedDrill.risks.some((item) => item.includes('failed_deliveries')));
assert.ok(blockedDrill.risks.some((item) => item.includes('stale_data')));
assert.ok(blockedDrill.risks.some((item) => item.includes('market_data_gap_sync')));
assert.ok(blockedDrill.risks.some((item) => item.includes('pre_window_backfill')));
assert.equal(blockedDrill.boundaries.readOnly, true);
assert.equal(blockedDrill.boundaries.postsDiscord, false);
assert.equal(blockedDrill.boundaries.startsProcesses, false);
assert.equal(blockedDrill.boundaries.changesTradingLogic, false);
assert.equal(blockedDrill.boundaries.changesCanExecute, false);

console.log('supervisor readiness drill tests passed');
