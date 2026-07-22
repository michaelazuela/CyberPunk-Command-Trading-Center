import assert from 'node:assert/strict';
import { buildUnifiedDeskOutputGuardedScannerLanePreview } from '../../src/lib/unifiedDeskOutputGuardedScannerLane';

const report = buildUnifiedDeskOutputGuardedScannerLanePreview({
  guardedLaneContract: {
    reportType: 'unified_desk_output_discord_guarded_live_lane_contract',
    status: 'pass',
    lane: {
      enabledByDefault: false,
      scannerOwnedOnly: true,
      allowedDeskStates: ['APPROVED_DESK_PLAN'],
      maxPostsPerSession: 1,
      sessions: ['morning', 'lunch'],
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
  },
  readinessReport: {
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
      {
        cardId: 'guarded|2026-07-22|morning',
        date: '2026-07-22',
        session: 'morning',
        state: 'APPROVED_DESK_PLAN',
        model: 'OpeningDriveFvgContinuation',
        direction: 'LONG',
        proofTime: '2026-07-22T10:00:00',
        entry: 100,
        stop: 96,
        target1: 106,
        target2: 108,
        riskPoints: 4,
        scannerVisibleIfExplicitGateApproved: true,
        discordEligibleIfSeparatelyApproved: true,
        supabaseEligibleIfSeparatelyApproved: true,
        canExecuteRemainsExternalGate: true,
      },
    ],
    blockers: [],
  },
});

assert.equal(report.status, 'pass');
assert.equal(report.summary.selectedRows, 1);
assert.equal(report.summary.runtimeInstallAllowed, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.webhookCallRows, 0);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.summary.recommendation, 'ready_for_disabled_local_scanner_lane_preview');
