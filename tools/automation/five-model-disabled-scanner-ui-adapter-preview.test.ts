import assert from 'node:assert/strict';
import { buildFiveModelDisabledScannerUiAdapterPreviewReport } from './five-model-disabled-scanner-ui-adapter-preview';

const uiRow = {
  cardId: 'five-model|row-1',
  date: '2026-06-22',
  session: 'morning' as const,
  stateLabel: 'Approved Desk Plan' as const,
  model: 'Drive Raid Continuation',
  direction: 'LONG' as const,
  levelLine: 'Entry 7540.75 | Stop 7536.25 | T1 7547.50 | T2 7549.75',
  proofLine: 'Completed 5M proof: 10:15 ET.',
  authorityLine: 'Decision support only. Discord/Supabase/bridge/canExecute remain off in this surface.',
};

const uiRefreshPreview = {
  reportType: 'five_model_disabled_scanner_ui_refresh_preview',
  status: 'pass' as const,
  summary: {
    scannerUiRefreshAllowed: true,
    defaultDisabled: true,
    localPreviewStatus: 'ready',
    uiRows: 3,
    runtimeGateEnabled: false,
    scannerRuntimeChangedRows: 0,
    discordPostRows: 0,
    supabaseWriteRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    tradingLogicChangedRows: 0,
    automatedOrderRows: 0,
  },
  uiRows: [
    uiRow,
    { ...uiRow, cardId: 'five-model|row-2', session: 'lunch' as const, stateLabel: 'Forming Desk Read' as const },
    { ...uiRow, cardId: 'five-model|row-3', session: 'evening' as const, direction: 'SHORT' as const },
  ],
  blockers: [],
};

const report = buildFiveModelDisabledScannerUiAdapterPreviewReport({
  uiRefreshPreviewPath: 'ui-refresh.json',
  uiRefreshPreview,
}, '2026-07-26T08:15:00.000Z');

assert.equal(report.reportType, 'five_model_disabled_scanner_ui_adapter_preview');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.readsSavedUiRefreshOnly, true);
assert.equal(report.authority.defaultDisabled, true);
assert.equal(report.authority.runtimeGateEnabled, false);
assert.equal(report.authority.productionGoLiveApproved, false);
assert.equal(report.authority.scannerRuntimeWired, false);
assert.equal(report.authority.scannerVisibleNow, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.canExecute, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.summary.sourceUiRows, 3);
assert.equal(report.summary.adaptedRows, 3);
assert.equal(report.summary.approvedDeskPlanRows, 2);
assert.equal(report.summary.formingDeskReadRows, 1);
assert.equal(report.summary.morningRows, 1);
assert.equal(report.summary.lunchRows, 1);
assert.equal(report.summary.eveningRows, 1);
assert.equal(report.summary.runtimeGateEnabled, false);
assert.equal(report.summary.productionGoLiveApproved, false);
assert.equal(report.summary.scannerRuntimeWiredRows, 0);
assert.equal(report.summary.scannerVisibleRows, 0);
assert.equal(report.summary.discordPostRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.liveSupabaseReadRows, 0);
assert.equal(report.summary.liveBridgeReadRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.tradingLogicChangedRows, 0);
assert.equal(report.summary.automatedOrderRows, 0);
assert.equal(report.summary.recommendation, 'ready_for_disabled_scanner_ui_browser_adapter_preview');
assert.equal(report.adapterRows.every((row) => row.localOnly), true);
assert.equal(report.adapterRows.every((row) => !row.scannerVisibleNow), true);
assert.equal(report.adapterRows.every((row) => !row.publishDiscord), true);
assert.equal(report.adapterRows.every((row) => !row.writesSupabase), true);
assert.equal(report.adapterRows.every((row) => !row.canExecute), true);
assert.doesNotMatch(report.markdown, /human[- ]review|no chase|missed|no[- ]trade/i);
assert.deepEqual(report.blockers, []);

const dirty = structuredClone(uiRefreshPreview) as any;
dirty.summary.discordPostRows = 1;
const blocked = buildFiveModelDisabledScannerUiAdapterPreviewReport({
  uiRefreshPreviewPath: 'ui-refresh.json',
  uiRefreshPreview: dirty,
});

assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.adaptedRows, 0);
assert.equal(blocked.summary.recommendation, 'hold_for_five_model_ui_adapter_fix');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('Discord post rows')));

console.log('five-model disabled scanner UI adapter preview verified');
