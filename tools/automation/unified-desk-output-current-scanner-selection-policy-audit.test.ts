import assert from 'node:assert/strict';
import {
  buildUnifiedDeskOutputCurrentScannerSelectionPolicyAuditReport,
} from './unified-desk-output-current-scanner-selection-policy-audit';
import type {
  UnifiedDeskOutputVisibilityCandidate,
  UnifiedDeskOutputVisibilityReadinessReport,
} from '../../src/lib/unifiedDeskOutputScannerVisibilityAdapter';

const candidate = (
  session: 'morning' | 'lunch',
  model: string,
  proofTime: string,
  direction: 'LONG' | 'SHORT' = 'LONG',
): UnifiedDeskOutputVisibilityCandidate => ({
  cardId: `card|${session}|${model}|${proofTime}`,
  date: proofTime.slice(0, 10),
  session,
  state: 'APPROVED_DESK_PLAN',
  model,
  direction,
  proofTime,
  entry: direction === 'LONG' ? 100 : 200,
  stop: direction === 'LONG' ? 96 : 204,
  target1: direction === 'LONG' ? 106 : 194,
  target2: direction === 'LONG' ? 108 : 192,
  riskPoints: 4,
  scannerVisibleIfExplicitGateApproved: true,
  discordEligibleIfSeparatelyApproved: true,
  supabaseEligibleIfSeparatelyApproved: true,
  canExecuteRemainsExternalGate: true,
});

const readinessReport: UnifiedDeskOutputVisibilityReadinessReport = {
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
    candidate('morning', 'NoInstalledSetup', '2026-07-22T09:10:00'),
    candidate('morning', 'historicalReview', '2026-07-22T11:45:00'),
    candidate('lunch', 'NoInstalledSetup', '2026-07-22T15:45:00'),
    candidate('lunch', 'historicalReview', '2026-07-22T15:50:00', 'SHORT'),
  ],
  blockers: [],
};

const report = buildUnifiedDeskOutputCurrentScannerSelectionPolicyAuditReport({
  readinessAuditPath: 'fixture-live-gate-readiness.json',
  readinessReport,
}, '2026-07-22T18:00:00.000Z');

assert.equal(report.reportType, 'unified_desk_output_current_scanner_selection_policy_audit');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readsSavedReadinessAuditOnly, true);
assert.equal(report.authority.comparesSelectionPolicyOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.summary.sourceCandidates, 4);
assert.equal(report.summary.eligibleApprovedDeskPlanRows, 4);
assert.equal(report.summary.latestProofSelectedRows, 2);
assert.equal(report.summary.proposedPrioritySelectedRows, 2);
assert.equal(report.summary.changedSessionSelections, 2);
assert.equal(report.summary.discordPostRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.liveBridgeReadRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.tradingLogicChangedRows, 0);
assert.equal(report.summary.runtimeInstallAllowed, false);
assert.equal(report.summary.recommendation, 'review_policy_before_runtime_install');

const morning = report.comparisons.find((row) => row.session === 'morning');
const lunch = report.comparisons.find((row) => row.session === 'lunch');
assert.equal(morning?.latestProof?.model, 'historicalReview');
assert.equal(morning?.provenLanePriority?.model, 'NoInstalledSetup');
assert.equal(morning?.changedSelection, true);
assert.equal(lunch?.latestProof?.model, 'historicalReview');
assert.equal(lunch?.provenLanePriority?.model, 'NoInstalledSetup');
assert.equal(lunch?.changedSelection, true);
assert.match(report.markdown, /Latest-proof selects historicalReview/);

console.log('Unified desk output current scanner selection-policy audit verified.');
