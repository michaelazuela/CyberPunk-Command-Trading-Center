import assert from 'node:assert/strict';
import { buildFiveModelDisabledScannerUiRefreshPreviewReport } from './five-model-disabled-scanner-ui-refresh-preview';

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

const consumerProbe = {
  reportType: 'five_model_local_scanner_consumer_probe',
  status: 'pass' as const,
  summary: {
    defaultStatus: 'disabled',
    localPreviewStatus: 'ready',
    consumedRows: 2,
    scannerRuntimeChangedRows: 0,
    tradingLogicChangedRows: 0,
    automatedOrderRows: 0,
  },
  consumedRows: [
    row,
    { ...row, cardId: 'five-model|row-2', session: 'lunch' as const, state: 'FORMING_DESK_READ' as const, stateLabel: 'Forming Desk Read' as const },
  ],
  blockers: [],
};

const report = buildFiveModelDisabledScannerUiRefreshPreviewReport({
  consumerProbePath: 'consumer-probe.json',
  consumerProbe,
}, '2026-07-26T07:45:00.000Z');

assert.equal(report.reportType, 'five_model_disabled_scanner_ui_refresh_preview');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.defaultDisabled, true);
assert.equal(report.authority.runtimeGateEnabled, false);
assert.equal(report.authority.refreshesScannerUiOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.canExecute, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.summary.scannerUiRefreshAllowed, true);
assert.equal(report.summary.defaultDisabled, true);
assert.equal(report.summary.localPreviewStatus, 'ready');
assert.equal(report.summary.uiRows, 2);
assert.equal(report.summary.approvedDeskPlanRows, 1);
assert.equal(report.summary.formingDeskReadRows, 1);
assert.equal(report.summary.morningRows, 1);
assert.equal(report.summary.lunchRows, 1);
assert.equal(report.summary.eveningRows, 0);
assert.equal(report.summary.discordPostRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.liveBridgeReadRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.recommendation, 'ready_for_disabled_scanner_ui_adapter_preview');
assert.equal(report.uiRows.length, 2);
assert.deepEqual(report.blockers, []);

const dirty = structuredClone(consumerProbe) as any;
dirty.consumedRows[0].publishDiscord = true;
const blocked = buildFiveModelDisabledScannerUiRefreshPreviewReport({
  consumerProbePath: 'consumer-probe.json',
  consumerProbe: dirty,
});

assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.scannerUiRefreshAllowed, false);
assert.equal(blocked.summary.recommendation, 'hold_for_five_model_ui_refresh_fix');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('post Discord')));

console.log('five-model disabled scanner UI refresh preview verified');
