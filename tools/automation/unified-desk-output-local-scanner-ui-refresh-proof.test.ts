import assert from 'node:assert/strict';
import { buildUnifiedDeskOutputLocalScannerUiRefreshProofReport } from './unified-desk-output-local-scanner-ui-refresh-proof';

const readiness = {
  reportType: 'unified_desk_output_local_live_readiness' as const,
  status: 'pass' as const,
  authority: {
    localOnly: true as const,
    readsSavedRehearsalOnly: true as const,
    requiresExplicitLocalFlag: true as const,
    postsDiscord: false as const,
    writesSupabase: false as const,
    readsLiveSupabase: false as const,
    readsLiveBridge: false as const,
    changesTradingLogic: false as const,
    changesCanExecute: false as const,
    automatedOrders: false as const,
  },
  summary: {
    defaultDisabled: true,
    remoteBlocked: true,
    localPreviewAllowed: true,
    scannerPreviewAllowed: true,
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
    recommendation: 'ready_for_local_live_preview' as const,
  },
  blockers: [],
};

const report = buildUnifiedDeskOutputLocalScannerUiRefreshProofReport({
  readinessPath: 'fixture-readiness.json',
  readinessReport: readiness,
}, '2026-07-22T04:00:00.000Z');

assert.equal(report.reportType, 'unified_desk_output_local_scanner_ui_refresh_proof');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.readsSavedLocalLiveReadinessOnly, true);
assert.equal(report.authority.requiresExplicitLocalFlag, true);
assert.equal(report.authority.refreshesScannerUiOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.summary.scannerUiRefreshAllowed, true);
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
assert.equal(report.summary.recommendation, 'ready_for_local_scanner_ui_refresh');

const blocked = buildUnifiedDeskOutputLocalScannerUiRefreshProofReport({
  readinessPath: 'fixture-readiness.json',
  readinessReport: {
    ...readiness,
    summary: {
      ...readiness.summary,
      supabaseWriteRows: 1,
    },
  },
});
assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.scannerUiRefreshAllowed, false);
assert.equal(blocked.summary.recommendation, 'hold_for_local_scanner_ui_refresh_fix');
assert.ok(blocked.blockers.includes('Readiness report has Supabase write rows.'));

console.log('Unified Desk Output local scanner UI refresh proof verified.');
