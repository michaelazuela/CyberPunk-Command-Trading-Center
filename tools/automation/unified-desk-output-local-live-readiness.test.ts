import assert from 'node:assert/strict';
import { buildUnifiedDeskOutputLocalLiveReadinessReport } from './unified-desk-output-local-live-readiness';
import type { UnifiedDeskOutputLocalGoLiveRehearsalGateReport } from '../../src/lib/unifiedDeskOutputRuntimeGate';

const rehearsal: UnifiedDeskOutputLocalGoLiveRehearsalGateReport = {
  reportType: 'unified_desk_output_local_go_live_rehearsal',
  status: 'pass',
  authority: {
    localOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    automatedOrders: false,
  },
  summary: {
    previewRows: 276,
    approvedDeskPlanRows: 105,
    formingDeskReadRows: 171,
    discordPostRows: 0,
    supabaseWriteRows: 0,
    liveSupabaseReadRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    wordingViolationRows: 0,
    blockedRows: 0,
  },
  blockers: [],
};

const report = buildUnifiedDeskOutputLocalLiveReadinessReport({
  rehearsalPath: 'fixture-rehearsal.json',
  rehearsalReport: rehearsal,
}, '2026-07-22T03:00:00.000Z');

assert.equal(report.reportType, 'unified_desk_output_local_live_readiness');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.readsSavedRehearsalOnly, true);
assert.equal(report.authority.requiresExplicitLocalFlag, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.summary.defaultDisabled, true);
assert.equal(report.summary.remoteBlocked, true);
assert.equal(report.summary.localPreviewAllowed, true);
assert.equal(report.summary.scannerPreviewAllowed, true);
assert.equal(report.summary.previewRows, 276);
assert.equal(report.summary.approvedDeskPlanRows, 105);
assert.equal(report.summary.formingDeskReadRows, 171);
assert.equal(report.summary.discordPostRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.liveSupabaseReadRows, 0);
assert.equal(report.summary.liveBridgeReadRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.wordingViolationRows, 0);
assert.equal(report.summary.blockedRows, 0);
assert.equal(report.summary.recommendation, 'ready_for_local_live_preview');

const blocked = buildUnifiedDeskOutputLocalLiveReadinessReport({
  rehearsalPath: 'fixture-rehearsal.json',
  rehearsalReport: {
    ...rehearsal,
    summary: {
      ...rehearsal.summary,
      liveBridgeReadRows: 1,
    },
  },
});
assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.recommendation, 'hold_for_local_live_gate_fix');
assert.ok(blocked.blockers.includes('Local rehearsal has live bridge read rows.'));

console.log('Unified Desk Output local-live readiness verified.');
