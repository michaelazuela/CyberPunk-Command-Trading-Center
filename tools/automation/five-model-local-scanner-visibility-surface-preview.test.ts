import assert from 'node:assert/strict';
import { buildFiveModelLocalScannerVisibilitySurfacePreviewReport } from './five-model-local-scanner-visibility-surface-preview';

const row = {
  wiringId: 'five-model-scanner-visibility-wiring|row-1',
  contractId: 'row-1',
  date: '2026-06-22',
  session: 'morning' as const,
  stateLabel: 'Approved Desk Plan' as const,
  model: 'Drive Raid Continuation',
  direction: 'LONG' as const,
  headline: 'Approved Desk Plan | MORNING | LONG | Drive Raid Continuation',
  levelLine: 'Entry 7540.75 | Stop 7536.25 | T1 7547.50 | T2 7549.75',
  proofLine: 'Completed 5M proof: 10:15 ET.',
  scannerVisibleIfWiredAfterExplicitApproval: true as const,
  productionScannerVisibleNow: false as const,
  publishDiscord: false as const,
  writesSupabase: false as const,
  readsLiveSupabase: false as const,
  readsLiveBridge: false as const,
  canExecute: false as const,
  changesTradingLogic: false as const,
  changesCanExecute: false as const,
  automatedOrders: false as const,
};

const wiringPreview = {
  reportType: 'five_model_scanner_visibility_wiring_preview',
  status: 'pass' as const,
  summary: {
    wiringPreviewRows: 3,
    productionScannerVisibleNowRows: 0,
    discordPostRows: 0,
    supabaseWriteRows: 0,
    liveSupabaseReadRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    tradingLogicChangedRows: 0,
    canExecuteChangedRows: 0,
    automatedOrderRows: 0,
  },
  rows: [
    row,
    { ...row, wiringId: 'five-model-scanner-visibility-wiring|row-2', contractId: 'row-2', session: 'lunch' as const, stateLabel: 'Forming Desk Read' as const },
    { ...row, wiringId: 'five-model-scanner-visibility-wiring|row-3', contractId: 'row-3', session: 'evening' as const, direction: 'SHORT' as const },
  ],
  blockers: [],
};

const report = buildFiveModelLocalScannerVisibilitySurfacePreviewReport({
  wiringPreviewPath: 'wiring-preview.json',
  wiringPreview,
}, '2026-07-26T11:05:00.000Z');

assert.equal(report.reportType, 'five_model_local_scanner_visibility_surface_preview');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.localScannerSurfaceOnly, true);
assert.equal(report.authority.installsRuntimeAdapter, false);
assert.equal(report.authority.productionScannerVisibleNow, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.canExecute, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.summary.wiringPreviewRows, 3);
assert.equal(report.summary.surfaceRows, 3);
assert.equal(report.summary.approvedDeskPlanRows, 2);
assert.equal(report.summary.formingDeskReadRows, 1);
assert.equal(report.summary.morningRows, 1);
assert.equal(report.summary.lunchRows, 1);
assert.equal(report.summary.eveningRows, 1);
assert.equal(report.summary.localScannerSurfaceRows, 3);
assert.equal(report.summary.productionScannerVisibleNowRows, 0);
assert.equal(report.summary.discordPostRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.liveSupabaseReadRows, 0);
assert.equal(report.summary.liveBridgeReadRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.tradingLogicChangedRows, 0);
assert.equal(report.summary.canExecuteChangedRows, 0);
assert.equal(report.summary.automatedOrderRows, 0);
assert.equal(report.summary.wordingViolationRows, 0);
assert.equal(report.summary.recommendation, 'ready_for_guarded_production_rehearsal_manifest');
assert.equal(report.surface.status, 'ready');
assert.equal(report.surface.rows.every((surfaceRow) => surfaceRow.scannerVisibleNow), true);
assert.equal(report.surface.rows.every((surfaceRow) => !surfaceRow.publishDiscord), true);
assert.equal(report.surface.rows.every((surfaceRow) => !surfaceRow.writesSupabase), true);
assert.equal(report.surface.rows.every((surfaceRow) => !surfaceRow.canExecute), true);
assert.doesNotMatch(report.markdown, /human[- ]review|no chase|missed|no[- ]trade/i);
assert.deepEqual(report.blockers, []);

const dirty = structuredClone(wiringPreview) as any;
dirty.summary.liveBridgeReadRows = 1;
const blocked = buildFiveModelLocalScannerVisibilitySurfacePreviewReport({
  wiringPreviewPath: 'wiring-preview.json',
  wiringPreview: dirty,
});

assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.surfaceRows, 0);
assert.equal(blocked.summary.recommendation, 'hold_for_five_model_surface_preview_fix');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('live bridge read rows')));

console.log('five-model local scanner visibility surface preview verified');
