import assert from 'node:assert/strict';
import { buildFiveModelGuardedProductionRehearsalManifestReport } from './five-model-guarded-production-rehearsal-manifest';

const surfaceRow = {
  cardId: 'five-model-scanner-visibility-wiring|row-1',
  date: '2026-06-22',
  session: 'morning' as const,
  stateLabel: 'Approved Desk Plan' as const,
  model: 'Drive Raid Continuation',
  direction: 'LONG' as const,
  levelLine: 'Entry 7540.75 | Stop 7536.25 | T1 7547.50 | T2 7549.75',
  proofLine: 'Completed 5M proof: 10:15 ET.',
  publishDiscord: false as const,
  writesSupabase: false as const,
  readsLiveBridge: false as const,
  canExecute: false as const,
};

const surfacePreview = {
  reportType: 'five_model_local_scanner_visibility_surface_preview',
  status: 'pass' as const,
  summary: {
    surfaceRows: 2,
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
  surface: {
    rows: [
      surfaceRow,
      { ...surfaceRow, cardId: 'five-model-scanner-visibility-wiring|row-2', session: 'lunch' as const, stateLabel: 'Forming Desk Read' as const },
    ],
  },
  blockers: [],
};

const report = buildFiveModelGuardedProductionRehearsalManifestReport({
  surfacePreviewPath: 'surface-preview.json',
  surfacePreview,
}, '2026-07-26T11:35:00.000Z');

assert.equal(report.reportType, 'five_model_guarded_production_rehearsal_manifest');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.rehearsalManifestOnly, true);
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
assert.match(report.rehearsal.manifestId, /^five-model-rehearsal-/);
assert.equal(report.rehearsal.requiredNextApproval, 'explicit_guarded_production_rehearsal_execution');
assert.equal(report.summary.sourceSurfaceRows, 2);
assert.equal(report.summary.manifestRows, 2);
assert.equal(report.summary.approvedDeskPlanRows, 1);
assert.equal(report.summary.formingDeskReadRows, 1);
assert.equal(report.summary.morningRows, 1);
assert.equal(report.summary.lunchRows, 1);
assert.equal(report.summary.eveningRows, 0);
assert.equal(report.summary.productionScannerVisibleNowRows, 0);
assert.equal(report.summary.discordPostRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.liveSupabaseReadRows, 0);
assert.equal(report.summary.liveBridgeReadRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.tradingLogicChangedRows, 0);
assert.equal(report.summary.canExecuteChangedRows, 0);
assert.equal(report.summary.automatedOrderRows, 0);
assert.equal(report.summary.recommendation, 'ready_for_guarded_production_rehearsal_execution_dry_run');
assert.equal(report.manifestRows.every((row) => row.discordRequiresSeparateApproval), true);
assert.equal(report.manifestRows.every((row) => row.canExecuteRemainsUnchanged), true);
assert.deepEqual(report.blockers, []);

const dirty = structuredClone(surfacePreview) as any;
dirty.summary.canExecuteTrueRows = 1;
const blocked = buildFiveModelGuardedProductionRehearsalManifestReport({
  surfacePreviewPath: 'surface-preview.json',
  surfacePreview: dirty,
});

assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.manifestRows, 0);
assert.equal(blocked.summary.recommendation, 'hold_for_five_model_rehearsal_manifest_fix');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('canExecute=true rows')));

console.log('five-model guarded production rehearsal manifest verified');
