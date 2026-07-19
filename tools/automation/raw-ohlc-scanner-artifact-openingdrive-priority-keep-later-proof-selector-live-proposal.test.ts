import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorLiveProposalReport,
  parseRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorLiveProposalArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-live-proposal';

const approvalContract = {
  status: 'pass',
  approvalBoundary: {
    liveInstallAllowed: false,
    scannerVisibleChangeAllowed: false,
  },
  summary: {
    bestSelectorId: 'keep_long_or_lunch_else_replacement',
    deltaVsKeepAllOneMesPl: 3737.59,
    deltaVsReplaceAllOneMesPl: 3511.8,
    approvalBoundaryClean: true,
    recommendation: 'selector_contract_ready_for_live_proposal_phase',
  },
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorLiveProposalReport({
  approvalContractPath: 'approval.json',
  approvalContract: approvalContract as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_live_proposal');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.proposedBehavior.scannerVisibleInstallAllowedNow, false);
assert.equal(report.proposedBehavior.requiredFutureApproval, true);
assert.equal(report.proposedBehavior.integrationPoint.file, 'src/lib/unifiedDeskCandidateBook.ts');
assert.equal(report.proposedBehavior.integrationPoint.functionName, 'buildUnifiedDeskCandidateBook');
assert.equal(report.readiness.decision, 'ready_for_contract_only_collision_metadata_phase');
assert.equal(report.readiness.failedGateCount, 0);
assert.ok(report.proposedBehavior.missingLiveMetadataContract.includes('duplicate/campaign group id shared by the competing candidates'));
assert.ok(report.proposedBehavior.disallowedInputs.includes('outcome labels, P/L, MFE, or MAE'));
assert.match(report.markdown, /OpeningDrive Keep-Later-Proof Selector Live Proposal/);

const failed = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorLiveProposalReport({
  approvalContractPath: 'bad.json',
  approvalContract: {
    ...approvalContract,
    summary: {
      ...approvalContract.summary,
      bestSelectorId: 'keep_all',
    },
  } as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(failed.status, 'fail');
assert.equal(failed.readiness.decision, 'not_ready');
assert.ok(failed.blockers.some((item) => item.includes('selector_matches_research_winner')));

const parsed = parseRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorLiveProposalArgs([
  '--approval-contract',
  'approval.json',
  '--json',
]);
assert.equal(parsed.approvalContract.endsWith('approval.json'), true);
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive keep-later-proof selector live proposal verified.');
