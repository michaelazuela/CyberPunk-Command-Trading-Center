import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionDryRunReport,
} from './unified-positive-held-local-preview-sweep-primary-exclusion-dry-run';

const approvalContractReport = { status: 'pass' };
const installedPenaltyAuditReport = {
  status: 'pass',
  summary: {
    entryStopTargetRiskDriftRows: 0,
  },
  rows: [
    {
      rowId: 'bad-primary',
      tradeDate: '2026-06-05',
      session: 'morning',
      invalidStopSweepPenaltyCandidate: true,
      canExecute: false,
      installedState: 'blocked',
      primaryDeskIdea: true,
      installedRank: 1,
      installedScore: 20,
    },
    {
      rowId: 'valid-replacement',
      tradeDate: '2026-06-05',
      session: 'morning',
      invalidStopSweepPenaltyCandidate: false,
      canExecute: false,
      installedState: 'human_review',
      primaryDeskIdea: false,
      installedRank: 2,
      installedScore: 18,
    },
  ],
};

const report = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionDryRunReport({
  reportDir: 'reports',
  approvalContractPath: 'contract.json',
  approvalContractReport: approvalContractReport as never,
  installedPenaltyAuditPath: 'audit.json',
  installedPenaltyAuditReport: installedPenaltyAuditReport as never,
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_sweep_primary_exclusion_dry_run');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.excludesOnlyPrimarySelectionNotAuditVisibility, true);
assert.equal(report.summary.invalidStopSweepRows, 1);
assert.equal(report.summary.baselineInvalidStopSweepPrimarySlates, 1);
assert.equal(report.summary.simulatedInvalidStopSweepPrimarySlates, 0);
assert.equal(report.summary.changedSlates, 1);
assert.equal(report.summary.blockedAuditRowsPreserved, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'dry_run_supports_primary_exclusion_proposal');
assert.match(report.markdown, /Dry Run/);

const missing = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionDryRunReport({
  reportDir: 'reports',
  approvalContractPath: null,
  approvalContractReport: null,
  installedPenaltyAuditPath: null,
  installedPenaltyAuditReport: null,
}, '2026-07-20T00:00:01.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing approval contract path'));

console.log('unified positive held-local Sweep primary exclusion dry-run verified.');
