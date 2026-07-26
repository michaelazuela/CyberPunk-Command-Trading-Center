import assert from 'node:assert/strict';
import { buildFiveModelFinalLocalReadinessChecklistReport } from './five-model-final-local-readiness-checklist';

const importProof = (summary: Record<string, unknown> = {}) => ({
  reportType: 'unified_desk_output_disabled_local_scanner_preview_render_install_proof',
  status: 'pass' as const,
  summary: {
    hiddenPreviewImportReady: true,
    renderedRows: 18,
    approvedDeskPlanRows: 5,
    formingDeskReadRows: 13,
    discordPostRows: 0,
    supabaseWriteRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    tradingLogicChangedRows: 0,
    automatedOrderRows: 0,
    ...summary,
  },
  blockers: [],
});

const browserProof = (summary: Record<string, unknown> = {}) => ({
  reportType: 'unified_desk_output_hidden_preview_local_verification',
  status: 'pass' as const,
  summary: {
    previewReady: true,
    importReady: true,
    renderedRows: 18,
    approvedDeskPlanRows: 5,
    discordPostRows: 0,
    supabaseWriteRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    tradingLogicChangedRows: 0,
    automatedOrderRows: 0,
    ...summary,
  },
  blockers: [],
});

const report = buildFiveModelFinalLocalReadinessChecklistReport({
  hiddenImportProofPath: 'hidden-import-proof.json',
  hiddenImportProof: importProof(),
  hiddenBrowserVerificationPath: 'browser-proof.json',
  hiddenBrowserVerification: browserProof(),
}, '2026-07-26T06:45:00.000Z');

assert.equal(report.reportType, 'five_model_final_local_readiness_checklist');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.readsSavedArtifactsOnly, true);
assert.equal(report.authority.writesReadinessChecklistOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.enablesRuntimeGate, false);
assert.equal(report.authority.productionGoLiveApproved, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.summary.hiddenImportProofPassed, true);
assert.equal(report.summary.hiddenBrowserVerificationPassed, true);
assert.equal(report.summary.importReady, true);
assert.equal(report.summary.previewReady, true);
assert.equal(report.summary.renderedRows, 18);
assert.equal(report.summary.approvedDeskPlanRows, 5);
assert.equal(report.summary.formingDeskReadRows, 13);
assert.equal(report.summary.browserRenderedRows, 18);
assert.equal(report.summary.browserApprovedDeskPlanRows, 5);
assert.equal(report.summary.discordPostRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.liveBridgeReadRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.tradingLogicChangedRows, 0);
assert.equal(report.summary.automatedOrderRows, 0);
assert.equal(report.summary.runtimeGateEnabled, false);
assert.equal(report.summary.productionGoLiveApproved, false);
assert.equal(report.summary.blockedRows, 0);
assert.equal(report.summary.recommendation, 'ready_for_disabled_scanner_runtime_wiring_preview');
assert.ok(report.readinessChecklist.some((item) => item.status === 'requires_explicit_approval'));
assert.match(report.markdown, /does not enable runtime behavior/i);

const blocked = buildFiveModelFinalLocalReadinessChecklistReport({
  hiddenImportProofPath: 'hidden-import-proof.json',
  hiddenImportProof: importProof({ discordPostRows: 1 }),
  hiddenBrowserVerificationPath: 'browser-proof.json',
  hiddenBrowserVerification: browserProof({ renderedRows: 17 }),
});

assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.recommendation, 'hold_for_five_model_readiness_fix');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('discordPostRows')));
assert.ok(blocked.blockers.some((blocker) => blocker.includes('does not match import renderedRows')));

console.log('five-model final local readiness checklist verified');
