import assert from 'node:assert/strict';
import { buildFiveModelDisabledScannerRuntimeWiringPreviewReport } from './five-model-disabled-scanner-runtime-wiring-preview';

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

const readiness = {
  reportType: 'five_model_final_local_readiness_checklist',
  status: 'pass' as const,
  summary: {
    renderedRows: 2,
    approvedDeskPlanRows: 1,
    formingDeskReadRows: 1,
  },
  blockers: [],
};

const hiddenImportProof = {
  reportType: 'unified_desk_output_disabled_local_scanner_preview_render_install_proof',
  status: 'pass' as const,
  summary: {
    hiddenPreviewImportReady: true,
  },
  scannerSurfaceSmokeImportPayload: {
    reportType: 'unified_desk_output_scanner_surface_smoke',
    status: 'pass' as const,
    summary: {
      renderedRows: 2,
      approvedDeskPlanRows: 1,
      formingDeskReadRows: 1,
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
  },
  blockers: [],
};

const report = buildFiveModelDisabledScannerRuntimeWiringPreviewReport({
  readinessPath: 'readiness.json',
  readiness,
  hiddenImportProofPath: 'hidden-import-proof.json',
  hiddenImportProof,
}, '2026-07-26T07:05:00.000Z');

assert.equal(report.reportType, 'five_model_disabled_scanner_runtime_wiring_preview');
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
assert.equal(report.summary.localScannerPreviewRows, 2);
assert.equal(report.summary.approvedDeskPlanRows, 1);
assert.equal(report.summary.formingDeskReadRows, 1);
assert.equal(report.summary.discordPostRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.liveBridgeReadRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.runtimeGateEnabled, false);
assert.equal(report.summary.recommendation, 'ready_for_local_scanner_consumer_probe');
assert.deepEqual(report.blockers, []);

const dirty = structuredClone(hiddenImportProof) as any;
dirty.scannerSurfaceSmokeImportPayload.surface.rows[0].canExecute = true;
const blocked = buildFiveModelDisabledScannerRuntimeWiringPreviewReport({
  readinessPath: 'readiness.json',
  readiness,
  hiddenImportProofPath: 'hidden-import-proof.json',
  hiddenImportProof: dirty,
});

assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.recommendation, 'hold_for_five_model_runtime_wiring_fix');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('canExecute=true')));

console.log('five-model disabled scanner runtime wiring preview verified');
