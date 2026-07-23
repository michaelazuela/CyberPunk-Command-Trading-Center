import assert from 'node:assert/strict';
import {
  buildUnifiedDeskOutputProductionScannerSurfaceActivation,
  type UnifiedDeskOutputFinalProductionReadinessChecklistInput,
} from './unifiedDeskOutputProductionScannerSurface';

const checklist: UnifiedDeskOutputFinalProductionReadinessChecklistInput = {
  reportType: 'unified_desk_output_final_production_readiness_checklist',
  status: 'pass',
  summary: {
    selectedRows: 2,
    morningRows: 1,
    lunchRows: 1,
    approvedDeskPlanRows: 2,
    browserRenderedRows: 2,
    discordPostRows: 0,
    supabaseWriteRows: 0,
    liveSupabaseReadRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    canExecuteChangedRows: 0,
    tradingLogicChangedRows: 0,
    automatedOrderRows: 0,
    runtimeGateEnabled: false,
    productionGoLiveApproved: false,
    blockedRows: 0,
    recommendation: 'ready_for_explicit_production_go_live_approval',
  },
  selectedCandidates: [{
    cardId: 'morning-card',
    date: '2026-07-22',
    session: 'morning',
    state: 'APPROVED_DESK_PLAN',
    model: 'HtfDisplacementFvgContinuation',
    direction: 'LONG',
    proofTime: '2026-07-22T09:10:00.0000000',
    entry: 7519.5,
    stop: 7515.25,
    target1: 7526,
    target2: 7528,
    riskPoints: 4.25,
  }, {
    cardId: 'lunch-card',
    date: '2026-07-22',
    session: 'lunch',
    state: 'APPROVED_DESK_PLAN',
    model: 'IntradayMssMicroContinuation',
    direction: 'LONG',
    proofTime: '2026-07-22T15:45:00.0000000',
    entry: 7540,
    stop: 7535.75,
    target1: 7546.5,
    target2: 7548.5,
    riskPoints: 4.25,
  }],
  blockers: [],
};

const active = buildUnifiedDeskOutputProductionScannerSurfaceActivation({
  finalReadinessChecklistPath: 'final-readiness.json',
  finalReadinessChecklist: checklist,
}, '2026-07-22T23:59:00.000Z');

assert.equal(active.reportType, 'unified_desk_output_production_scanner_surface_activation');
assert.equal(active.status, 'active');
assert.equal(active.approval.explicitProductionApproval, true);
assert.equal(active.approval.discordPostingRemainsGuarded, true);
assert.equal(active.approval.changesTradingLogic, false);
assert.equal(active.approval.changesCanExecute, false);
assert.equal(active.approval.changesEntryStopTargets, false);
assert.equal(active.authority.scannerVisibleNow, true);
assert.equal(active.authority.postsDiscord, false);
assert.equal(active.authority.writesSupabase, false);
assert.equal(active.authority.readsLiveSupabase, false);
assert.equal(active.authority.readsLiveBridge, false);
assert.equal(active.authority.canExecute, false);
assert.equal(active.authority.automatedOrders, false);
assert.equal(active.summary.selectedRows, 2);
assert.equal(active.summary.morningRows, 1);
assert.equal(active.summary.lunchRows, 1);
assert.equal(active.summary.approvedDeskPlanRows, 2);
assert.equal(active.summary.discordPostRows, 0);
assert.equal(active.summary.supabaseWriteRows, 0);
assert.equal(active.summary.liveBridgeReadRows, 0);
assert.equal(active.summary.canExecuteTrueRows, 0);
assert.equal(active.summary.tradingLogicChangedRows, 0);
assert.equal(active.rows[0]?.headline, 'Approved Desk Plan | MORNING | LONG | HtfDisplacementFvgContinuation');
assert.equal(active.rows[1]?.headline, 'Approved Desk Plan | LUNCH | LONG | IntradayMssMicroContinuation');
assert.equal(active.rows.every((row) => row.publishDiscord === false), true);
assert.equal(active.rows.every((row) => row.canExecute === false), true);
assert.deepEqual(active.blockers, []);

const blocked = buildUnifiedDeskOutputProductionScannerSurfaceActivation({
  finalReadinessChecklistPath: 'final-readiness.json',
  finalReadinessChecklist: {
    ...checklist,
    summary: {
      ...checklist.summary,
      discordPostRows: 1,
    },
  },
});

assert.equal(blocked.status, 'blocked');
assert.equal(blocked.authority.scannerVisibleNow, false);
assert.equal(blocked.rows.length, 0);
assert.ok(blocked.blockers.some((blocker) => blocker.includes('Discord post rows')));

console.log('Unified Desk Output production scanner surface activation verified.');
