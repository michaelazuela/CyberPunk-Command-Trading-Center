import assert from 'node:assert/strict';
import { buildUnifiedDeskOutputRuntimeGateManifestReceipt } from './unified-desk-output-runtime-gate-manifest';

const manifest = {
  reportType: 'unified_desk_output_current_live_readiness_manifest' as const,
  generatedAt: '2026-07-22T22:00:00.000Z',
  status: 'pass' as const,
  runtimeGateContract: {
    commandExistsNow: false as const,
    selectedPolicy: 'proven_lane_priority_then_latest_proof' as const,
    enabledByDefault: false as const,
    scannerOwnedOnly: true as const,
    approvedDeskPlanOnly: true as const,
    maxRowsPerSession: 1 as const,
    sessions: ['morning' as const, 'lunch' as const],
    requiresFreshManifest: true as const,
    requiresFreshIdempotencyKey: true as const,
    requiresExplicitProductionApproval: true as const,
  },
  summary: {
    selectedRows: 2,
    morningRows: 1,
    lunchRows: 1,
    selectedPolicyChangedFromLatestProof: true,
    discordPostRows: 0,
    supabaseWriteRows: 0,
    liveSupabaseReadRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    canExecuteChangedRows: 0,
    tradingLogicChangedRows: 0,
    runtimeInstallAllowed: false as const,
    explicitApprovalPresent: false as const,
    blockedRows: 0,
    recommendation: 'ready_to_install_disabled_runtime_gate_manifest' as const,
  },
  selectedCandidates: [
    {
      cardId: 'morning-htf',
      date: '2026-07-22',
      session: 'morning' as const,
      model: 'HtfDisplacementFvgContinuation',
      direction: 'LONG' as const,
      proofTime: '2026-07-22T09:10:00',
      entry: 7519.5,
      stop: 7515.25,
      target1: 7526,
      target2: 7528,
    },
    {
      cardId: 'lunch-intraday',
      date: '2026-07-22',
      session: 'lunch' as const,
      model: 'IntradayMssMicroContinuation',
      direction: 'LONG' as const,
      proofTime: '2026-07-22T15:45:00',
      entry: 7540,
      stop: 7535.75,
      target1: 7546.5,
      target2: 7548.5,
    },
  ],
  blockers: [],
};

const receipt = buildUnifiedDeskOutputRuntimeGateManifestReceipt({
  manifestPath: 'fixture-current-live-readiness-manifest.json',
  manifest,
  selectionPolicy: 'proven_lane_priority_then_latest_proof',
  idempotencyKey: 'unified-desk-output:runtime-gate:fixture-001',
  disabledFlagPresent: true,
}, '2026-07-22T23:00:00.000Z');

assert.equal(receipt.reportType, 'unified_desk_output_runtime_gate_manifest_disabled_receipt');
assert.equal(receipt.status, 'pass');
assert.equal(receipt.authority.localOnly, true);
assert.equal(receipt.authority.readsSavedCurrentLiveReadinessManifestOnly, true);
assert.equal(receipt.authority.validatesRuntimeGateContractOnly, true);
assert.equal(receipt.authority.runtimeGateEnabled, false);
assert.equal(receipt.authority.postsDiscord, false);
assert.equal(receipt.authority.writesSupabase, false);
assert.equal(receipt.authority.readsLiveBridge, false);
assert.equal(receipt.authority.changesScannerBehavior, false);
assert.equal(receipt.authority.changesTradingLogic, false);
assert.equal(receipt.authority.changesCanExecute, false);
assert.equal(receipt.authority.automatedOrders, false);
assert.equal(receipt.request.explicitProductionApprovalPresent, false);
assert.equal(receipt.contract.commandExistsNow, true);
assert.equal(receipt.contract.selectedPolicy, 'proven_lane_priority_then_latest_proof');
assert.equal(receipt.contract.enabledByDefault, false);
assert.equal(receipt.contract.scannerOwnedOnly, true);
assert.equal(receipt.contract.approvedDeskPlanOnly, true);
assert.equal(receipt.contract.maxRowsPerSession, 1);
assert.equal(receipt.contract.requiresFreshManifest, true);
assert.equal(receipt.contract.requiresFreshIdempotencyKey, true);
assert.equal(receipt.contract.requiresExplicitProductionApproval, true);
assert.equal(receipt.summary.manifestPassed, true);
assert.equal(receipt.summary.selectionPolicyMatched, true);
assert.equal(receipt.summary.idempotencyKeyPresent, true);
assert.equal(receipt.summary.disabledFlagPresent, true);
assert.equal(receipt.summary.selectedRows, 2);
assert.equal(receipt.summary.morningRows, 1);
assert.equal(receipt.summary.lunchRows, 1);
assert.equal(receipt.summary.runtimeGateEnabled, false);
assert.equal(receipt.summary.scannerRuntimeChangedRows, 0);
assert.equal(receipt.summary.discordPostRows, 0);
assert.equal(receipt.summary.supabaseWriteRows, 0);
assert.equal(receipt.summary.liveBridgeReadRows, 0);
assert.equal(receipt.summary.canExecuteTrueRows, 0);
assert.equal(receipt.summary.canExecuteChangedRows, 0);
assert.equal(receipt.summary.tradingLogicChangedRows, 0);
assert.equal(receipt.summary.automatedOrderRows, 0);
assert.equal(receipt.summary.blockedRows, 0);
assert.equal(receipt.summary.recommendation, 'ready_for_disabled_runtime_gate_validation');
assert.equal(receipt.selectedCandidates[0]?.model, 'HtfDisplacementFvgContinuation');
assert.match(receipt.markdown, /disabled runtime-gate contract only/i);

const missingIdempotency = buildUnifiedDeskOutputRuntimeGateManifestReceipt({
  manifestPath: 'fixture-current-live-readiness-manifest.json',
  manifest,
  selectionPolicy: 'proven_lane_priority_then_latest_proof',
  idempotencyKey: null,
  disabledFlagPresent: true,
});
assert.equal(missingIdempotency.status, 'blocked');
assert.ok(missingIdempotency.blockers.some((blocker) => blocker.includes('idempotency')));

const wrongPolicy = buildUnifiedDeskOutputRuntimeGateManifestReceipt({
  manifestPath: 'fixture-current-live-readiness-manifest.json',
  manifest,
  selectionPolicy: 'latest_completed_5m_proof_per_session',
  idempotencyKey: 'unified-desk-output:runtime-gate:fixture-002',
  disabledFlagPresent: true,
});
assert.equal(wrongPolicy.status, 'blocked');
assert.ok(wrongPolicy.blockers.some((blocker) => blocker.includes('does not match manifest policy')));

console.log('Unified Desk Output runtime gate manifest verified.');
