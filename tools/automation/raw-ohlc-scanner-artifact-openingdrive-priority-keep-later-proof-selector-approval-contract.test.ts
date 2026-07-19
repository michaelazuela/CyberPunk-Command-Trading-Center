import assert from 'node:assert/strict';
import { buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorApprovalContractReport } from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-approval-contract';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-dry-run';

const selectorDryRun = {
  status: 'pass',
  summary: {
    bestSelectorId: 'keep_long_or_lunch_else_replacement',
  },
  selectors: [
    {
      selectorId: 'keep_long_or_lunch_else_replacement',
      selectedOneMesPl: 500,
      keepAllOneMesPl: 300,
      replaceAllOneMesPl: 250,
      deltaVsKeepAllOneMesPl: 200,
      deltaVsReplaceAllOneMesPl: 250,
    },
  ],
} as RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunReport;

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorApprovalContractReport({
  selectorDryRunPath: 'selector.json',
  selectorDryRun,
});

assert.equal(report.status, 'pass');
assert.equal(report.summary.bestSelectorId, 'keep_long_or_lunch_else_replacement');
assert.equal(report.summary.approvalBoundaryClean, true);
assert.equal(report.summary.proposalReady, false);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.approvalBoundary.liveInstallAllowed, false);
assert.equal(report.approvalBoundary.scannerVisibleChangeAllowed, false);
assert.equal(report.approvalBoundary.changesCanExecute, false);
assert.equal(report.approvalBoundary.changesEntryStopTargets, false);
assert.equal(report.approvalBoundary.changesRiskRules, false);
assert.equal(report.approvalBoundary.changesDiscordPosting, false);
assert.equal(report.approvalBoundary.changesSupabaseWrites, false);
assert.equal(report.approvalBoundary.changesBridgeBehavior, false);

console.log('OpeningDrive keep-later-proof selector approval contract verified.');
