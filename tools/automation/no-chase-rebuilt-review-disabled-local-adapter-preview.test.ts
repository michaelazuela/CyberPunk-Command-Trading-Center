import assert from 'node:assert/strict';
import {
  buildNoChaseRebuiltReviewDisabledLocalAdapterPreviewReport,
  parseNoChaseRebuiltReviewDisabledLocalAdapterPreviewArgs,
} from './no-chase-rebuilt-review-disabled-local-adapter-preview';

const proposal = {
  reportType: 'no_chase_rebuilt_review_live_proposal',
  status: 'pass',
  authority: {
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRiskRules: false,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveBridge: false,
  },
  proposal: {
    scannerVisibleNow: false,
    requiresFutureApprovalGate: true,
  },
  summary: {
    simulatedArtifacts: 3,
    htfSufficientArtifacts: 3,
    completePlanArtifacts: 3,
    humanReviewOnlyArtifacts: 3,
    canExecuteFalseArtifacts: 3,
    publishDiscordFalseArtifacts: 3,
    htfPromotionEvidenceAllowed: 0,
    replayGrossOneMes: 270,
    livePromotionAllowedRows: 0,
    recommendation: 'ready_for_approval_checkpoint',
  },
  tickets: [
    {
      tradeDate: '2026-06-17',
      sessionType: 'lunch',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      entry: 7580.25,
      stop: 7591.5,
      target1: 7563.5,
      target2: 7557.75,
      proofBarTime: '2026-06-17T14:05:00',
      replayOutcome: 'T2_HIT',
      replayOutcomeTime: '2026-06-17T14:45:00',
      replayOneMesGross: 112.5,
      htfReliability: 'structured_context_available',
    },
    {
      tradeDate: '2026-06-25',
      sessionType: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      entry: 7476.75,
      stop: 7487.5,
      target1: 7460.75,
      target2: 7455.25,
      proofBarTime: '2026-06-25T09:35:00',
      replayOutcome: 'T2_HIT',
      replayOutcomeTime: '2026-06-25T09:45:00',
      replayOneMesGross: 107.5,
      htfReliability: 'structured_context_available',
    },
    {
      tradeDate: '2026-06-26',
      sessionType: 'lunch',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      entry: 7433.75,
      stop: 7440.5,
      target1: 7423.75,
      target2: 7420.25,
      proofBarTime: '2026-06-26T12:20:00',
      replayOutcome: 'T1_THEN_STOP',
      replayOutcomeTime: '2026-06-26T12:35:00',
      replayOneMesGross: 50,
      htfReliability: 'structured_context_available',
    },
  ],
};

const approvalContract = {
  reportType: 'no_chase_rebuilt_review_approval_contract',
  status: 'pass',
  summary: {
    proposalReady: true,
    failedGateCount: 0,
  },
  approvalContract: {
    gates: [
      { name: 'proposal_status_pass', required: true, status: 'pass' },
      { name: 'exact_three_rebuilt_artifacts', required: true, status: 'pass' },
    ],
  },
};

const report = buildNoChaseRebuiltReviewDisabledLocalAdapterPreviewReport({
  proposalPath: 'proposal.json',
  approvalContractPath: 'approval.json',
  proposal: proposal as any,
  approvalContract: approvalContract as any,
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.reportType, 'no_chase_rebuilt_review_disabled_local_adapter_preview');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.installState.scannerRuntimeWired, false);
assert.equal(report.installState.scannerVisibleNow, false);
assert.equal(report.installState.discordPostingEnabled, false);
assert.equal(report.installState.supabasePersistenceEnabled, false);
assert.equal(report.summary.previewCards, 3);
assert.equal(report.summary.disabledPreviewCards, 3);
assert.equal(report.summary.humanReviewOnlyCards, 3);
assert.equal(report.summary.completePlanCards, 3);
assert.equal(report.summary.htfSufficientCards, 3);
assert.equal(report.summary.canExecuteFalseCards, 3);
assert.equal(report.summary.publishDiscordFalseCards, 3);
assert.equal(report.summary.scannerVisibleRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.replayGrossOneMes, 270);
assert.equal(report.summary.recommendation, 'keep_disabled_local_preview');
assert.equal(report.previewCards[0].state, 'DISABLED_LOCAL_REVIEW_PREVIEW');
assert.equal(report.previewCards[0].canExecute, false);
assert.equal(report.previewCards[0].publishDiscord, false);
assert.equal(report.previewCards[0].scannerVisible, false);
assert.equal(report.previewCards[0].proof.htfContextUse, 'support_caution_only');
assert.match(report.previewCards[0].deskText.invalidation, /HTF context as execution authority/);
assert.match(report.markdown, /Disabled Local Adapter Preview/);

const failed = buildNoChaseRebuiltReviewDisabledLocalAdapterPreviewReport({
  proposalPath: 'proposal.json',
  approvalContractPath: 'approval.json',
  proposal: {
    ...proposal,
    summary: {
      ...proposal.summary,
      canExecuteFalseArtifacts: 2,
    },
  } as any,
  approvalContract: approvalContract as any,
}, '2026-07-20T00:00:00.000Z');
assert.equal(failed.status, 'fail');
assert.ok(failed.blockers.some((blocker) => blocker.includes('canExecute')));

const parsed = parseNoChaseRebuiltReviewDisabledLocalAdapterPreviewArgs([
  '--proposal',
  'proposal.json',
  '--approval-contract',
  'approval.json',
  '--json',
]);
assert.equal(parsed.proposal, 'proposal.json');
assert.equal(parsed.approvalContract, 'approval.json');
assert.equal(parsed.json, true);

console.log('no-chase rebuilt review disabled local adapter preview verified.');
