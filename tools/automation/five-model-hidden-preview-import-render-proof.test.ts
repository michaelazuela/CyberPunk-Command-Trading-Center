import assert from 'node:assert/strict';
import { buildFiveModelHiddenPreviewImportRenderProof } from './five-model-hidden-preview-import-render-proof';

const surfaceRow = {
  cardId: 'five-model|row-1',
  date: '2026-06-22',
  session: 'lunch' as const,
  state: 'APPROVED_DESK_PLAN' as const,
  stateLabel: 'Approved Desk Plan' as const,
  model: 'Raid Failure Displacement Reversal',
  direction: 'SHORT' as const,
  headline: 'Approved Desk Plan | LUNCH | SHORT | Raid Failure Displacement Reversal',
  bodyLines: ['lunch short desk plan from Raid Failure Displacement Reversal.', 'Risk-clean protected geometry.'],
  levelLine: 'Entry 7540.75 | Stop 7545.25 | T1 7534 | T2 7531.75',
  riskLine: 'Risk 4.5 points from scanner-owned entry/stop.',
  proofLine: 'Completed 5M proof: 14:45 ET.',
  invalidationLine: 'Invalid if price violates the protected 5M stop line at 7545.25.',
  authorityLine: 'Decision support only. Discord/Supabase/bridge/canExecute remain off in this surface.',
  scannerVisibleNow: true as const,
  publishDiscord: false as const,
  writesSupabase: false as const,
  readsLiveBridge: false as const,
  canExecute: false as const,
};

const sourceReport = {
  reportType: 'five_model_scanner_surface_adapter_preview' as const,
  status: 'pass' as const,
  summary: {
    localPreviewRequested: true,
    renderedRows: 2,
    approvedDeskPlanRows: 1,
    formingDeskReadRows: 1,
    discordPostRows: 0,
    supabaseWriteRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    wordingViolationRows: 0,
    blockedRows: 0,
  },
  surface: {
    status: 'ready' as const,
    sourceOfTruth: 'scanner_surface_unified_desk_output_consumer' as const,
    localScannerOnly: true as const,
    rows: [
      surfaceRow,
      { ...surfaceRow, cardId: 'five-model|row-2', state: 'FORMING_DESK_READ' as const, stateLabel: 'Forming Desk Read' as const },
    ],
    summary: {
      rows: 2,
      approvedDeskPlans: 1,
      formingDeskReads: 1,
      discordPostRows: 0,
      supabaseWriteRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: 0,
      wordingViolationRows: 0,
    },
    blockers: [],
  },
  blockers: [],
};

const report = buildFiveModelHiddenPreviewImportRenderProof({
  surfaceAdapterJson: 'surface-adapter.json',
  surfaceAdapterReport: sourceReport,
}, '2026-07-26T06:10:00.000Z');

assert.equal(report.reportType, 'unified_desk_output_disabled_local_scanner_preview_render_install_proof');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.producesHiddenPreviewImportPayload, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.canExecute, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.summary.hiddenPreviewImportReady, true);
assert.equal(report.summary.renderedRows, 2);
assert.equal(report.summary.approvedDeskPlanRows, 1);
assert.equal(report.summary.formingDeskReadRows, 1);
assert.equal(report.summary.discordPostRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.liveBridgeReadRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.scannerSurfaceSmokeImportPayload?.reportType, 'unified_desk_output_scanner_surface_smoke');
assert.equal(report.scannerSurfaceSmokeImportPayload?.status, 'pass');
assert.equal(report.scannerSurfaceSmokeImportPayload?.surface.rows.length, 2);
assert.deepEqual(report.blockers, []);

const blocked = buildFiveModelHiddenPreviewImportRenderProof({
  surfaceAdapterJson: 'surface-adapter.json',
  surfaceAdapterReport: {
    ...sourceReport,
    summary: { ...sourceReport.summary, localPreviewRequested: false },
  },
});

assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.hiddenPreviewImportReady, false);
assert.equal(blocked.scannerSurfaceSmokeImportPayload, null);
assert.ok(blocked.blockers.includes('Scanner surface smoke import payload is blocked.'));
assert.ok(blocked.blockers.includes('Source surface adapter was not run with explicit local preview.'));

console.log('five-model hidden preview import render proof verified');
