import assert from 'node:assert/strict';
import { buildUnifiedDeskOutputGuardedScannerLanePreview } from './unifiedDeskOutputGuardedScannerLane';
import type {
  UnifiedDeskOutputVisibilityReadinessReport,
  UnifiedDeskVisibleState,
} from './unifiedDeskOutputScannerVisibilityAdapter';

const contract = {
  reportType: 'unified_desk_output_discord_guarded_live_lane_contract',
  status: 'pass',
  lane: {
    enabledByDefault: false,
    scannerOwnedOnly: true,
    allowedDeskStates: ['APPROVED_DESK_PLAN'],
    maxPostsPerSession: 1,
    sessions: ['morning' as const, 'lunch' as const],
    requiresFreshManifest: true,
    requiresFreshIdempotencyKey: true,
    refusesDuplicateIdempotencyKey: true,
    requiresExplicitApprovalForProductionSend: true,
  },
  authority: {
    postsDiscordNow: false,
    webhookCallRows: 0,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    automatedOrders: false,
  },
  summary: {
    laneEnabledByDefault: false,
    approvedDeskPlanOnly: true,
    maxPostsPerSession: 1,
    webhookCallRows: 0,
    supabaseWriteRows: 0,
    liveSupabaseReadRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    blockedRows: 0,
  },
  blockers: [],
};

const candidate = (
  session: 'morning' | 'lunch',
  proofTime: string,
  state: UnifiedDeskVisibleState = 'APPROVED_DESK_PLAN',
  model = session === 'morning' ? 'OpeningDriveFvgContinuation' : 'AfterLunchDriveFvgContinuation',
) => ({
  cardId: `guarded|${session}|${proofTime}|${state}|${model}`,
  date: proofTime.slice(0, 10),
  session,
  state,
  model,
  direction: session === 'morning' ? 'LONG' as const : 'SHORT' as const,
  proofTime,
  entry: session === 'morning' ? 100 : 200,
  stop: session === 'morning' ? 96 : 204,
  target1: session === 'morning' ? 106 : 194,
  target2: session === 'morning' ? 108 : 192,
  riskPoints: 4,
  scannerVisibleIfExplicitGateApproved: true as const,
  discordEligibleIfSeparatelyApproved: true as const,
  supabaseEligibleIfSeparatelyApproved: true as const,
  canExecuteRemainsExternalGate: true as const,
});

const readinessReport = {
  reportType: 'unified_desk_output_live_gate_readiness_audit',
  status: 'pass',
  summary: {
    discordPostNowRows: 0,
    supabaseWriteNowRows: 0,
    liveBridgeReadNowRows: 0,
    canExecuteTrueRows: 0,
    canExecuteChangedRows: 0,
    tradingLogicChangedRows: 0,
    incompleteVisiblePlanRows: 0,
    wordingViolationRows: 0,
    blockedRows: 0,
  },
  candidates: [
    candidate('morning', '2026-07-20T09:55:00'),
    candidate('morning', '2026-07-21T10:50:00'),
    candidate('lunch', '2026-07-15T13:10:00'),
    candidate('lunch', '2026-07-17T13:25:00'),
    candidate('lunch', '2026-07-18T13:25:00', 'FORMING_DESK_READ'),
  ],
  blockers: [],
} satisfies UnifiedDeskOutputVisibilityReadinessReport;

const preview = buildUnifiedDeskOutputGuardedScannerLanePreview({
  guardedLaneContract: contract,
  readinessReport,
});

assert.equal(preview.reportType, 'unified_desk_output_guarded_local_scanner_lane_preview');
assert.equal(preview.status, 'pass');
assert.equal(preview.selectionPolicy.enabledByDefault, false);
assert.equal(preview.selectionPolicy.order, 'latest_completed_5m_proof_per_session');
assert.equal(preview.selectionPolicy.proposedPriority, null);
assert.equal(preview.summary.sourceCandidates, 5);
assert.equal(preview.summary.eligibleApprovedDeskPlanRows, 4);
assert.equal(preview.summary.selectedRows, 2);
assert.equal(preview.summary.morningRows, 1);
assert.equal(preview.summary.lunchRows, 1);
assert.equal(preview.summary.suppressedRows, 2);
assert.equal(preview.selectedCandidates[0].proofTime, '2026-07-21T10:50:00');
assert.equal(preview.selectedCandidates[1].proofTime, '2026-07-17T13:25:00');
assert.equal(preview.surface.summary.rows, 2);
assert.equal(preview.summary.discordPostRows, 0);
assert.equal(preview.summary.supabaseWriteRows, 0);
assert.equal(preview.summary.liveBridgeReadRows, 0);
assert.equal(preview.summary.canExecuteTrueRows, 0);
assert.equal(preview.summary.runtimeInstallAllowed, false);
assert.equal(preview.authority.postsDiscord, false);
assert.equal(preview.authority.writesSupabase, false);
assert.equal(preview.authority.readsLiveBridge, false);
assert.equal(preview.authority.changesTradingLogic, false);
assert.equal(preview.authority.changesCanExecute, false);
assert.equal(preview.authority.automatedOrders, false);

const blocked = buildUnifiedDeskOutputGuardedScannerLanePreview({
  guardedLaneContract: {
    ...contract,
    lane: {
      ...contract.lane,
      maxPostsPerSession: 2,
    },
  },
  readinessReport,
});

assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.recommendation, 'hold_for_guarded_scanner_lane_fix');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('does not cap at one post per session')));

const priorityReadinessReport = {
  ...readinessReport,
  candidates: [
    candidate('morning', '2026-07-22T09:10:00', 'APPROVED_DESK_PLAN', 'SweepMssFvgRetrace'),
    candidate('morning', '2026-07-22T11:45:00', 'APPROVED_DESK_PLAN', 'raidReclaim'),
    candidate('lunch', '2026-07-22T15:45:00', 'APPROVED_DESK_PLAN', 'IntradayMssMicroContinuation'),
    candidate('lunch', '2026-07-22T15:50:00', 'APPROVED_DESK_PLAN', 'raidReclaim'),
  ],
} satisfies UnifiedDeskOutputVisibilityReadinessReport;

const latestPolicy = buildUnifiedDeskOutputGuardedScannerLanePreview({
  guardedLaneContract: contract,
  readinessReport: priorityReadinessReport,
});

const provenLanePriority = buildUnifiedDeskOutputGuardedScannerLanePreview({
  guardedLaneContract: contract,
  readinessReport: priorityReadinessReport,
  selectionPolicyOrder: 'proven_lane_priority_then_latest_proof',
});

assert.equal(latestPolicy.selectedCandidates[0].model, 'raidReclaim');
assert.equal(latestPolicy.selectedCandidates[1].model, 'raidReclaim');
assert.equal(provenLanePriority.selectionPolicy.order, 'proven_lane_priority_then_latest_proof');
assert.deepEqual(provenLanePriority.selectionPolicy.proposedPriority?.morning.slice(0, 2), [
  'OpeningDriveFvgContinuation',
  'SweepMssFvgRetrace',
]);
assert.equal(provenLanePriority.selectedCandidates[0].model, 'SweepMssFvgRetrace');
assert.equal(provenLanePriority.selectedCandidates[1].model, 'IntradayMssMicroContinuation');
assert.equal(provenLanePriority.summary.discordPostRows, 0);
assert.equal(provenLanePriority.summary.supabaseWriteRows, 0);
assert.equal(provenLanePriority.summary.liveBridgeReadRows, 0);
assert.equal(provenLanePriority.summary.canExecuteChangedRows, 0);
assert.equal(provenLanePriority.summary.tradingLogicChangedRows, 0);
assert.equal(provenLanePriority.summary.runtimeInstallAllowed, false);
