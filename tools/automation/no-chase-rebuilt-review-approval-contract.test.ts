import assert from 'node:assert/strict';
import {
  buildNoChaseRebuiltReviewApprovalContractReport,
  parseNoChaseRebuiltReviewApprovalContractArgs,
} from './no-chase-rebuilt-review-approval-contract';

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

const proposal = {
  status: 'pass',
  authority,
  proposal: {
    scannerVisibleNow: false,
    requiresFutureApprovalGate: true,
  },
  summary: {
    recommendation: 'ready_for_approval_checkpoint',
    simulatedArtifacts: 3,
    htfSufficientArtifacts: 3,
    completePlanArtifacts: 3,
    canExecuteFalseArtifacts: 3,
    publishDiscordFalseArtifacts: 3,
    htfPromotionEvidenceAllowed: 0,
    replayGrossOneMes: 270,
    livePromotionAllowedRows: 0,
  },
};

const report = buildNoChaseRebuiltReviewApprovalContractReport({
  proposalPath: 'proposal.json',
  proposal: proposal as any,
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.reportType, 'no_chase_rebuilt_review_approval_contract');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.contractOnly, true);
assert.equal(report.assumptions.implementationAllowedNow, false);
assert.equal(report.approvalContract.approvalRequiredBeforeImplementation, true);
assert.equal(report.approvalContract.scannerVisibleInstallAllowedNow, false);
assert.equal(report.summary.proposalReady, true);
assert.equal(report.summary.simulatedArtifacts, 3);
assert.equal(report.summary.canExecuteFalseArtifacts, 3);
assert.equal(report.summary.publishDiscordFalseArtifacts, 3);
assert.equal(report.summary.htfPromotionEvidenceAllowed, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.failedGateCount, 0);
assert.equal(report.summary.recommendation, 'await_explicit_approval_or_broaden_research');
assert.ok(report.approvalContract.implementationInvariants.some((item) => item.includes('HTF context remains')));
assert.match(report.markdown, /No-Chase Rebuilt Review Approval Contract/);

const failed = buildNoChaseRebuiltReviewApprovalContractReport({
  proposalPath: 'proposal.json',
  proposal: {
    ...proposal,
    summary: {
      ...proposal.summary,
      publishDiscordFalseArtifacts: 2,
    },
  } as any,
}, '2026-07-20T00:00:00.000Z');
assert.equal(failed.status, 'fail');
assert.ok(failed.blockers.some((blocker) => blocker.includes('human_review_only_boundaries_preserved')));

const parsed = parseNoChaseRebuiltReviewApprovalContractArgs(['--proposal', 'proposal.json', '--json']);
assert.equal(parsed.proposal, 'proposal.json');
assert.equal(parsed.json, true);

console.log('no-chase rebuilt review approval contract verified.');
