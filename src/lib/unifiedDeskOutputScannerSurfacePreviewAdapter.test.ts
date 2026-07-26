import assert from 'node:assert/strict';
import {
  buildUnifiedDeskOutputScannerSurfacePreviewModel,
  type UnifiedDeskOutputScannerSurfaceSmokeReport,
} from './unifiedDeskOutputScannerSurfacePreviewAdapter';

const report = {
  reportType: 'unified_desk_output_scanner_surface_smoke',
  status: 'pass',
  authority: {
    localOnly: true,
    readsSavedInstallAuditOnly: true,
    rendersScannerSurfaceOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    automatedOrders: false,
  },
  summary: {
    renderedRows: 1,
    approvedDeskPlanRows: 1,
    formingDeskReadRows: 0,
    discordPostRows: 0,
    supabaseWriteRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    wordingViolationRows: 0,
    blockedRows: 0,
  },
  surface: {
    status: 'ready',
    sourceOfTruth: 'scanner_surface_unified_desk_output_consumer',
    localScannerOnly: true,
    rows: [{
      cardId: 'preview-row',
      date: '2026-07-22',
      session: 'morning',
      state: 'APPROVED_DESK_PLAN',
      stateLabel: 'Approved Desk Plan',
      model: 'NoInstalledSetup',
      direction: 'SHORT',
      headline: 'Approved Desk Plan | MORNING | SHORT',
      bodyLines: ['Opening drive short.', 'Selected scanner-owned lane.'],
      levelLine: 'Entry 100 | Stop 104 | T1 94 | T2 92',
      riskLine: 'Risk 4 points.',
      proofLine: 'Completed 5M proof: 09:45 ET.',
      invalidationLine: 'Invalid if price violates the protected 5M stop line.',
      authorityLine: 'Decision support only. Discord/Supabase/bridge/canExecute remain off in this surface.',
      scannerVisibleNow: true,
      publishDiscord: false,
      writesSupabase: false,
      readsLiveBridge: false,
      canExecute: false,
    }],
    summary: {
      rows: 1,
      approvedDeskPlans: 1,
      formingDeskReads: 0,
      discordPostRows: 0,
      supabaseWriteRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: 0,
      wordingViolationRows: 0,
    },
    blockers: [],
  },
  blockers: [],
} satisfies UnifiedDeskOutputScannerSurfaceSmokeReport;

const disabled = buildUnifiedDeskOutputScannerSurfacePreviewModel({
  enabled: false,
  localHost: true,
  report,
});
assert.equal(disabled.status, 'disabled');
assert.equal(disabled.rows.length, 0);
assert.equal(disabled.publishDiscord, false);
assert.equal(disabled.writesSupabase, false);
assert.equal(disabled.canExecute, false);

const ready = buildUnifiedDeskOutputScannerSurfacePreviewModel({
  enabled: true,
  localHost: true,
  report,
});
assert.equal(ready.status, 'ready');
assert.equal(ready.rows.length, 1);
assert.equal(ready.rows[0].stateLabel, 'Approved Desk Plan');
assert.equal(ready.publishDiscord, false);
assert.equal(ready.writesSupabase, false);
assert.equal(ready.readsLiveBridge, false);
assert.equal(ready.canExecute, false);
assert.equal(ready.changesCanExecute, false);

const dirty = structuredClone(report) as UnifiedDeskOutputScannerSurfaceSmokeReport;
dirty.summary.discordPostRows = 1;
const blocked = buildUnifiedDeskOutputScannerSurfacePreviewModel({
  enabled: true,
  localHost: true,
  report: dirty,
});
assert.equal(blocked.status, 'blocked');
assert.equal(blocked.rows.length, 0);
assert.ok(blocked.blockers.includes('Surface smoke has Discord post rows.'));

console.log('Unified Desk Output scanner surface preview adapter verified.');
