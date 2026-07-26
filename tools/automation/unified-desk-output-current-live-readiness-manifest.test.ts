import assert from 'node:assert/strict';
import {
  buildUnifiedDeskOutputCurrentLiveReadinessManifestReport,
} from './unified-desk-output-current-live-readiness-manifest';

const preview = (policy: 'latest_completed_5m_proof_per_session' | 'proven_lane_priority_then_latest_proof', model: string, proofTime: string) => ({
  reportType: 'unified_desk_output_guarded_local_scanner_lane_preview' as const,
  status: 'pass' as const,
  selectionPolicy: {
    enabledByDefault: false as const,
    state: 'APPROVED_DESK_PLAN' as const,
    sessions: ['morning' as const, 'lunch' as const],
    maxRowsPerSession: 1 as const,
    order: policy,
    proposedPriority: policy === 'proven_lane_priority_then_latest_proof'
      ? {
        morning: ['NoInstalledSetup', 'NoInstalledSetup', 'NoInstalledSetup', 'historicalReview'],
        lunch: ['NoInstalledSetup', 'NoInstalledSetup', 'historicalReview'],
      }
      : null,
  },
  summary: {
    sourceCandidates: 4,
    eligibleApprovedDeskPlanRows: 4,
    selectedRows: 2,
    morningRows: 1,
    lunchRows: 1,
    suppressedRows: 2,
    surfaceRows: 2,
    discordPostRows: 0,
    supabaseWriteRows: 0,
    liveSupabaseReadRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    canExecuteChangedRows: 0,
    tradingLogicChangedRows: 0,
    blockedRows: 0,
    runtimeInstallAllowed: false as const,
    recommendation: 'ready_for_disabled_local_scanner_lane_preview' as const,
  },
  selectedCandidates: [
    {
      cardId: `morning|${policy}|${model}`,
      date: '2026-07-22',
      session: 'morning' as const,
      model,
      direction: 'LONG' as const,
      proofTime,
      entry: 100,
      stop: 96,
      target1: 106,
      target2: 108,
    },
    {
      cardId: `lunch|${policy}|NoInstalledSetup`,
      date: '2026-07-22',
      session: 'lunch' as const,
      model: policy === 'proven_lane_priority_then_latest_proof' ? 'NoInstalledSetup' : 'historicalReview',
      direction: policy === 'proven_lane_priority_then_latest_proof' ? 'LONG' as const : 'SHORT' as const,
      proofTime: policy === 'proven_lane_priority_then_latest_proof' ? '2026-07-22T15:45:00' : '2026-07-22T15:50:00',
      entry: 200,
      stop: 196,
      target1: 206,
      target2: 208,
    },
  ],
  blockers: [],
});

const report = buildUnifiedDeskOutputCurrentLiveReadinessManifestReport({
  proposedPreviewPath: 'fixture-proven-lane-preview.json',
  proposedPreview: preview('proven_lane_priority_then_latest_proof', 'NoInstalledSetup', '2026-07-22T09:10:00'),
  comparisonPreviewPath: 'fixture-latest-preview.json',
  comparisonPreview: preview('latest_completed_5m_proof_per_session', 'historicalReview', '2026-07-22T11:45:00'),
}, '2026-07-22T22:00:00.000Z');

assert.equal(report.reportType, 'unified_desk_output_current_live_readiness_manifest');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.readsSavedGuardedPreviewOnly, true);
assert.equal(report.authority.writesManifestOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.runtimeInstallAllowed, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.runtimeGateContract.commandExistsNow, false);
assert.equal(report.runtimeGateContract.selectedPolicy, 'proven_lane_priority_then_latest_proof');
assert.equal(report.runtimeGateContract.enabledByDefault, false);
assert.equal(report.runtimeGateContract.scannerOwnedOnly, true);
assert.equal(report.runtimeGateContract.approvedDeskPlanOnly, true);
assert.equal(report.runtimeGateContract.maxRowsPerSession, 1);
assert.equal(report.runtimeGateContract.requiresFreshManifest, true);
assert.equal(report.runtimeGateContract.requiresFreshIdempotencyKey, true);
assert.equal(report.runtimeGateContract.requiresExplicitProductionApproval, true);
assert.match(report.runtimeGateContract.proposedCommand, /--selection-policy proven_lane_priority_then_latest_proof/);
assert.equal(report.summary.proposedPreviewPassed, true);
assert.equal(report.summary.comparisonPreviewPassed, true);
assert.equal(report.summary.selectedRows, 2);
assert.equal(report.summary.morningRows, 1);
assert.equal(report.summary.lunchRows, 1);
assert.equal(report.summary.selectedPolicyChangedFromLatestProof, true);
assert.equal(report.summary.discordPostRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.liveBridgeReadRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.canExecuteChangedRows, 0);
assert.equal(report.summary.tradingLogicChangedRows, 0);
assert.equal(report.summary.runtimeInstallAllowed, false);
assert.equal(report.summary.explicitApprovalPresent, false);
assert.equal(report.summary.readbackSteps, 6);
assert.equal(report.summary.rollbackSteps, 4);
assert.equal(report.summary.blockedRows, 0);
assert.equal(report.summary.recommendation, 'ready_to_install_disabled_runtime_gate_manifest');
assert.equal(report.selectedCandidates[0]?.model, 'NoInstalledSetup');
assert.match(report.markdown, /local manifest only/i);

const blocked = buildUnifiedDeskOutputCurrentLiveReadinessManifestReport({
  proposedPreviewPath: 'fixture-proven-lane-preview.json',
  proposedPreview: {
    ...preview('proven_lane_priority_then_latest_proof', 'NoInstalledSetup', '2026-07-22T09:10:00'),
    summary: {
      ...preview('proven_lane_priority_then_latest_proof', 'NoInstalledSetup', '2026-07-22T09:10:00').summary,
      discordPostRows: 1,
    },
  },
  comparisonPreviewPath: 'fixture-latest-preview.json',
  comparisonPreview: preview('latest_completed_5m_proof_per_session', 'historicalReview', '2026-07-22T11:45:00'),
});

assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.recommendation, 'hold_for_current_live_readiness_manifest_fix');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('Discord-post rows')));

console.log('Unified Desk Output current live-readiness manifest verified.');
