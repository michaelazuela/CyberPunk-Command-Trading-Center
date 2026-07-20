import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionApprovalContractReport,
} from './unified-positive-held-local-preview-sweep-primary-exclusion-approval-contract';

const authority = {
  readOnly: true,
  localOnly: true,
  researchOnly: true,
  postsDiscord: false,
  writesSupabase: false,
  readsLiveSupabase: false,
  readsLiveBridge: false,
  runsSetupScanner: false,
  changesScannerBehavior: false,
  changesTradingLogic: false,
  changesCanExecute: false,
  changesEntryStopTargets: false,
  changesRiskRules: false,
  changesBridgeBehavior: false,
  changesDiscordPosting: false,
  changesAppRuntime: false,
} as const;

const installedPenaltyAuditReport = {
  status: 'pass',
  authority,
  summary: {
    invalidStopSweepRows: 4,
    invalidStopSweepRowsBlocked: 4,
    invalidStopSweepCanExecuteTrueRows: 0,
    invalidStopSweepPrimaryRows: 1,
    entryStopTargetRiskDriftRows: 0,
    livePromotionAllowedRows: 0,
  },
};

const validSlateSimulationReport = {
  status: 'pass',
  authority,
  summary: {
    changedSlates: 1,
    topSelectionDeltaOneMesPl: 25,
    livePromotionAllowedRows: 0,
  },
};

const report = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionApprovalContractReport({
  reportDir: 'reports',
  installedPenaltyAuditPath: 'penalty.json',
  installedPenaltyAuditReport: installedPenaltyAuditReport as never,
  validSlateSimulationPath: 'valid.json',
  validSlateSimulationReport: validSlateSimulationReport as never,
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_sweep_primary_exclusion_approval_contract');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.proposedBehaviorNotInstalled, true);
assert.equal(report.proposedScannerVisibleBehavior.implementationAllowedNow, false);
assert.equal(report.proposedScannerVisibleBehavior.appliesOnlyWhen.blockReason, 'InvalidStopLocation');
assert.equal(report.summary.invalidStopSweepPrimaryRows, 1);
assert.equal(report.summary.failedGateCount, 0);
assert.equal(report.summary.decision, 'approved_for_research_dry_run_only');
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.match(report.markdown, /Future scanner dry-run/);

const missing = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionApprovalContractReport({
  reportDir: 'reports',
  installedPenaltyAuditPath: null,
  installedPenaltyAuditReport: null,
  validSlateSimulationPath: null,
  validSlateSimulationReport: null,
}, '2026-07-20T00:00:01.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing installed penalty audit path'));

console.log('unified positive held-local Sweep primary exclusion approval contract verified.');
