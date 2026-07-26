import assert from 'node:assert/strict';
import { buildFiveModelLocalScannerConsumerProbeReport } from './five-model-local-scanner-consumer-probe';

const row = {
  cardId: 'five-model|row-1',
  date: '2026-06-22',
  session: 'morning' as const,
  state: 'APPROVED_DESK_PLAN' as const,
  stateLabel: 'Approved Desk Plan' as const,
  model: 'Drive Raid Continuation',
  direction: 'LONG' as const,
  headline: 'Approved Desk Plan | MORNING | LONG | Drive Raid Continuation',
  bodyLines: ['morning long desk plan.', 'Risk-clean protected geometry.'],
  levelLine: 'Entry 7540.75 | Stop 7536.25 | T1 7547.5 | T2 7549.75',
  riskLine: 'Risk 4.5 points from scanner-owned entry/stop.',
  proofLine: 'Completed 5M proof: 10:15 ET.',
  invalidationLine: 'Invalid if price violates the protected 5M stop line at 7536.25.',
  authorityLine: 'Decision support only. Discord/Supabase/bridge/canExecute remain off in this surface.',
  scannerVisibleNow: true as const,
  publishDiscord: false as const,
  writesSupabase: false as const,
  readsLiveBridge: false as const,
  canExecute: false as const,
};

const runtimePreview = {
  reportType: 'five_model_disabled_scanner_runtime_wiring_preview',
  status: 'pass' as const,
  summary: {
    localScannerPreviewRows: 2,
  },
  defaultPreview: {
    status: 'disabled',
    rows: [],
    summary: { scannerPreviewRows: 0 },
  },
  localPreview: {
    status: 'ready',
    rows: [
      row,
      { ...row, cardId: 'five-model|row-2', session: 'lunch' as const, state: 'FORMING_DESK_READ' as const, stateLabel: 'Forming Desk Read' as const },
    ],
    summary: {
      scannerPreviewRows: 2,
    },
    blockers: [],
  },
  blockers: [],
};

const report = buildFiveModelLocalScannerConsumerProbeReport({
  runtimePreviewPath: 'runtime-preview.json',
  runtimePreview,
}, '2026-07-26T07:25:00.000Z');

assert.equal(report.reportType, 'five_model_local_scanner_consumer_probe');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.defaultDisabled, true);
assert.equal(report.authority.runtimeGateEnabled, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.canExecute, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.summary.defaultStatus, 'disabled');
assert.equal(report.summary.localPreviewStatus, 'ready');
assert.equal(report.summary.defaultScannerPreviewRows, 0);
assert.equal(report.summary.consumedRows, 2);
assert.equal(report.summary.approvedDeskPlanRows, 1);
assert.equal(report.summary.formingDeskReadRows, 1);
assert.equal(report.summary.morningRows, 1);
assert.equal(report.summary.lunchRows, 1);
assert.equal(report.summary.eveningRows, 0);
assert.equal(report.summary.discordPostRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.liveBridgeReadRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.recommendation, 'ready_for_disabled_scanner_ui_refresh_preview');
assert.equal(report.consumedRows.length, 2);
assert.deepEqual(report.blockers, []);

const dirty = structuredClone(runtimePreview) as any;
dirty.localPreview.rows[0].publishDiscord = true;
const blocked = buildFiveModelLocalScannerConsumerProbeReport({
  runtimePreviewPath: 'runtime-preview.json',
  runtimePreview: dirty,
});

assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.recommendation, 'hold_for_five_model_consumer_probe_fix');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('post Discord')));

console.log('five-model local scanner consumer probe verified');
