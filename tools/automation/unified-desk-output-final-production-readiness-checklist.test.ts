import assert from 'node:assert/strict';
import {
  buildUnifiedDeskOutputFinalProductionReadinessChecklistReport,
} from './unified-desk-output-final-production-readiness-checklist';
import { SetupType } from '../../src/types';

const source = (reportType: string, summary: Record<string, unknown> = {}) => ({
  reportType,
  status: 'pass' as const,
  summary: {
    selectedRows: 2,
    morningRows: 1,
    lunchRows: 1,
    approvedDeskPlanRows: 2,
    renderedRows: 2,
    discordPostRows: 0,
    supabaseWriteRows: 0,
    liveSupabaseReadRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    canExecuteChangedRows: 0,
    tradingLogicChangedRows: 0,
    automatedOrderRows: 0,
    runtimeGateEnabled: false,
    runtimeInstallAllowed: false,
    explicitApprovalPresent: false,
    ...summary,
  },
  selectedCandidates: [
    {
      session: 'morning',
      model: SetupType.RaidFailureDisplacementReversal,
      direction: 'LONG',
      proofTime: '2026-07-22T09:10:00',
    },
    {
      session: 'lunch',
      model: SetupType.IntradayMssMicroContinuation,
      direction: 'LONG',
      proofTime: '2026-07-22T15:45:00',
    },
  ],
  blockers: [],
});

const report = buildUnifiedDeskOutputFinalProductionReadinessChecklistReport({
  currentLiveReadinessManifestPath: 'current-live-readiness.json',
  currentLiveReadinessManifest: source('unified_desk_output_current_live_readiness_manifest'),
  disabledRuntimeGateReceiptPath: 'runtime-receipt.json',
  disabledRuntimeGateReceipt: source('unified_desk_output_runtime_gate_manifest_disabled_receipt'),
  disabledE2eRuntimeValidationPath: 'disabled-e2e.json',
  disabledE2eRuntimeValidation: source('unified_desk_output_disabled_e2e_runtime_validation'),
  hiddenPreviewLocalVerificationPath: 'hidden-preview.json',
  hiddenPreviewLocalVerification: source('unified_desk_output_hidden_preview_local_verification'),
}, '2026-07-22T23:59:00.000Z');

assert.equal(report.reportType, 'unified_desk_output_final_production_readiness_checklist');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.readsSavedArtifactsOnly, true);
assert.equal(report.authority.writesReadinessChecklistOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.enablesRuntimeGate, false);
assert.equal(report.authority.productionGoLiveApproved, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.summary.currentLiveReadinessManifestPassed, true);
assert.equal(report.summary.disabledRuntimeGateReceiptPassed, true);
assert.equal(report.summary.disabledE2eRuntimeValidationPassed, true);
assert.equal(report.summary.hiddenPreviewLocalVerificationPassed, true);
assert.equal(report.summary.selectedRows, 2);
assert.equal(report.summary.morningRows, 1);
assert.equal(report.summary.lunchRows, 1);
assert.equal(report.summary.approvedDeskPlanRows, 2);
assert.equal(report.summary.browserRenderedRows, 2);
assert.equal(report.summary.discordPostRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.liveBridgeReadRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.tradingLogicChangedRows, 0);
assert.equal(report.summary.runtimeGateEnabled, false);
assert.equal(report.summary.productionGoLiveApproved, false);
assert.equal(report.summary.blockedRows, 0);
assert.equal(report.summary.recommendation, 'ready_for_explicit_production_go_live_approval');
assert.ok(report.productionGateChecklist.some((item) => item.status === 'requires_explicit_approval'));
assert.match(report.markdown, /does not enable runtime behavior/i);

const blocked = buildUnifiedDeskOutputFinalProductionReadinessChecklistReport({
  currentLiveReadinessManifestPath: 'current-live-readiness.json',
  currentLiveReadinessManifest: source('unified_desk_output_current_live_readiness_manifest', {
    explicitApprovalPresent: true,
  }),
  disabledRuntimeGateReceiptPath: 'runtime-receipt.json',
  disabledRuntimeGateReceipt: source('unified_desk_output_runtime_gate_manifest_disabled_receipt', {
    runtimeGateEnabled: true,
  }),
  disabledE2eRuntimeValidationPath: 'disabled-e2e.json',
  disabledE2eRuntimeValidation: source('unified_desk_output_disabled_e2e_runtime_validation'),
  hiddenPreviewLocalVerificationPath: 'hidden-preview.json',
  hiddenPreviewLocalVerification: source('unified_desk_output_hidden_preview_local_verification', {
    discordPostRows: 1,
  }),
});

assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.recommendation, 'hold_for_final_readiness_fix');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('runtimeGateEnabled=true')));
assert.ok(blocked.blockers.some((blocker) => blocker.includes('discordPostRows')));
assert.ok(blocked.blockers.some((blocker) => blocker.includes('explicit approval')));

console.log('Unified Desk Output final production readiness checklist verified.');
