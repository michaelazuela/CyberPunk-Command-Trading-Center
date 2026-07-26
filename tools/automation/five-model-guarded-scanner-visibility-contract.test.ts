import assert from 'node:assert/strict';
import { buildFiveModelGuardedScannerVisibilityContractReport } from './five-model-guarded-scanner-visibility-contract';

const adapterRow = {
  adapterId: 'five-model-ui-adapter|five-model|row-1',
  sourceCardId: 'five-model|row-1',
  date: '2026-06-22',
  session: 'morning' as const,
  stateLabel: 'Approved Desk Plan' as const,
  model: 'Drive Raid Continuation',
  direction: 'LONG' as const,
  display: {
    headline: 'Approved Desk Plan | MORNING | LONG | Drive Raid Continuation',
    levelLine: 'Entry 7540.75 | Stop 7536.25 | T1 7547.50 | T2 7549.75',
    proofLine: 'Completed 5M proof: 10:15 ET.',
    authorityLine: 'Decision support only. Discord/Supabase/bridge/canExecute remain off in this surface.',
  },
  runtimeGateEnabled: false as const,
  productionGoLiveApproved: false as const,
  scannerRuntimeWired: false as const,
  scannerVisibleNow: false as const,
  publishDiscord: false as const,
  writesSupabase: false as const,
  readsLiveSupabase: false as const,
  readsLiveBridge: false as const,
  changesScannerBehavior: false as const,
  changesTradingLogic: false as const,
  changesCanExecute: false as const,
  canExecute: false as const,
  automatedOrders: false as const,
};

const uiAdapterPreview = {
  reportType: 'five_model_disabled_scanner_ui_adapter_preview',
  status: 'pass' as const,
  summary: {
    adaptedRows: 2,
    runtimeGateEnabled: false,
    productionGoLiveApproved: false,
    scannerRuntimeWiredRows: 0,
    scannerVisibleRows: 0,
    discordPostRows: 0,
    supabaseWriteRows: 0,
    liveSupabaseReadRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    tradingLogicChangedRows: 0,
    automatedOrderRows: 0,
  },
  adapterRows: [
    adapterRow,
    { ...adapterRow, adapterId: 'five-model-ui-adapter|five-model|row-2', sourceCardId: 'five-model|row-2', session: 'lunch' as const, stateLabel: 'Forming Desk Read' as const },
  ],
  blockers: [],
};

const browserAdapterPreview = {
  reportType: 'five_model_disabled_scanner_ui_browser_adapter_preview',
  status: 'pass' as const,
  summary: {
    renderedRows: 2,
    runtimeGateEnabled: false,
    productionGoLiveApproved: false,
    scannerRuntimeWiredRows: 0,
    productionScannerVisibleRows: 0,
    discordPostRows: 0,
    supabaseWriteRows: 0,
    liveSupabaseReadRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    tradingLogicChangedRows: 0,
    automatedOrderRows: 0,
  },
  blockers: [],
};

const report = buildFiveModelGuardedScannerVisibilityContractReport({
  uiAdapterPreviewPath: 'ui-adapter.json',
  uiAdapterPreview,
  browserAdapterPreviewPath: 'browser-adapter.json',
  browserAdapterPreview,
}, '2026-07-26T09:35:00.000Z');

assert.equal(report.reportType, 'five_model_guarded_scanner_visibility_contract');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.installsRuntimeAdapter, false);
assert.equal(report.authority.defaultDisabled, true);
assert.equal(report.authority.explicitProductionApprovalRequired, true);
assert.equal(report.authority.runtimeGateEnabled, false);
assert.equal(report.authority.productionGoLiveApproved, false);
assert.equal(report.authority.scannerRuntimeWired, false);
assert.equal(report.authority.scannerVisibleNow, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.canExecute, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.gateContract.explicitProductionApprovalRequired, true);
assert.equal(report.gateContract.discordRequiresSeparateApproval, true);
assert.equal(report.gateContract.supabaseRequiresSeparateApproval, true);
assert.equal(report.gateContract.canExecuteMustRemainExistingDeterministicGate, true);
assert.equal(report.summary.sourceAdapterRows, 2);
assert.equal(report.summary.browserRenderedRows, 2);
assert.equal(report.summary.candidateRows, 2);
assert.equal(report.summary.approvedDeskPlanRows, 1);
assert.equal(report.summary.formingDeskReadRows, 1);
assert.equal(report.summary.morningRows, 1);
assert.equal(report.summary.lunchRows, 1);
assert.equal(report.summary.eveningRows, 0);
assert.equal(report.summary.scannerRuntimeWiredRows, 0);
assert.equal(report.summary.scannerVisibleNowRows, 0);
assert.equal(report.summary.discordPostRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.liveSupabaseReadRows, 0);
assert.equal(report.summary.liveBridgeReadRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.tradingLogicChangedRows, 0);
assert.equal(report.summary.automatedOrderRows, 0);
assert.equal(report.summary.recommendation, 'ready_for_explicit_production_scanner_visibility_decision');
assert.equal(report.candidates.every((candidate) => candidate.scannerVisibilityIfExplicitlyApproved), true);
assert.equal(report.candidates.every((candidate) => candidate.discordRequiresSeparateApproval), true);
assert.equal(report.candidates.every((candidate) => candidate.canExecuteRemainsExistingDeterministicGate), true);
assert.doesNotMatch(report.markdown, /human[- ]review|no chase|missed|no[- ]trade/i);
assert.deepEqual(report.blockers, []);

const dirty = structuredClone(browserAdapterPreview) as any;
dirty.summary.productionScannerVisibleRows = 1;
const blocked = buildFiveModelGuardedScannerVisibilityContractReport({
  uiAdapterPreviewPath: 'ui-adapter.json',
  uiAdapterPreview,
  browserAdapterPreviewPath: 'browser-adapter.json',
  browserAdapterPreview: dirty,
});

assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.candidateRows, 0);
assert.equal(blocked.summary.recommendation, 'hold_for_five_model_visibility_contract_fix');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('production scanner-visible rows')));

console.log('five-model guarded scanner visibility contract verified');
