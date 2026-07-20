import assert from 'node:assert/strict';
import {
  buildNoChaseRebuiltReviewLiveProposalReport,
  parseNoChaseRebuiltReviewLiveProposalArgs,
} from './no-chase-rebuilt-review-live-proposal';

const simulationReport = {
  summary: {
    simulatedArtifacts: 1,
    completePlanArtifacts: 1,
    humanReviewOnlyArtifacts: 1,
    canExecuteFalseArtifacts: 1,
    publishDiscordFalseArtifacts: 1,
    replayGrossOneMes: 112.5,
  },
  artifacts: [
    {
      tradeDate: '2026-06-17',
      sessionType: 'lunch',
      setupType: 'AfterLunchDriveFvgContinuation',
      direction: 'SHORT',
      status: 'human_review_rebuilt',
      plan: { entry: 7580.25, stop: 7591.5, target1: 7563.5, target2: 7557.75 },
      proof: { proofBarTime: '2026-06-17T14:05:00' },
      replay: { outcome: 'T2_HIT', outcomeTime: '2026-06-17T14:45:00', oneMesGross: 112.5 },
      canExecute: false,
      publishDiscord: false,
    },
  ],
};

const htfSufficiencyReport = {
  summary: {
    artifactsChecked: 1,
    sufficientArtifacts: 1,
    htfPromotionEvidenceAllowed: 0,
  },
  rows: [
    {
      tradeDate: '2026-06-17',
      sessionType: 'lunch',
      setupType: 'AfterLunchDriveFvgContinuation',
      direction: 'SHORT',
      proofBarTime: '2026-06-17T14:05:00',
      reliability: 'structured_context_available',
    },
  ],
};

const report = buildNoChaseRebuiltReviewLiveProposalReport({
  simulationReportPath: 'simulation.json',
  htfSufficiencyReportPath: 'htf.json',
  simulationReport: simulationReport as any,
  htfSufficiencyReport: htfSufficiencyReport as any,
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.reportType, 'no_chase_rebuilt_review_live_proposal');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.changesDiscordPosting, false);
assert.equal(report.assumptions.humanReviewOnly, true);
assert.equal(report.assumptions.promotionDisabled, true);
assert.equal(report.proposal.scannerVisibleNow, false);
assert.equal(report.proposal.requiresFutureApprovalGate, true);
assert.equal(report.summary.simulatedArtifacts, 1);
assert.equal(report.summary.htfSufficientArtifacts, 1);
assert.equal(report.summary.canExecuteFalseArtifacts, 1);
assert.equal(report.summary.publishDiscordFalseArtifacts, 1);
assert.equal(report.summary.htfPromotionEvidenceAllowed, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'ready_for_approval_checkpoint');
assert.equal(report.tickets[0].htfReliability, 'structured_context_available');
assert.ok(report.proposal.prohibitedChanges.includes('Do not loosen canExecute.'));
assert.match(report.markdown, /No-Chase Rebuilt Review Proposal/);

const failed = buildNoChaseRebuiltReviewLiveProposalReport({
  simulationReportPath: 'simulation.json',
  htfSufficiencyReportPath: 'htf.json',
  simulationReport: {
    ...simulationReport,
    summary: {
      ...simulationReport.summary,
      canExecuteFalseArtifacts: 0,
    },
  } as any,
  htfSufficiencyReport: htfSufficiencyReport as any,
}, '2026-07-20T00:00:00.000Z');
assert.equal(failed.status, 'fail');
assert.ok(failed.blockers.some((blocker) => blocker.includes('canExecute')));

const parsed = parseNoChaseRebuiltReviewLiveProposalArgs([
  '--simulation-report',
  'simulation.json',
  '--htf-sufficiency-report',
  'htf.json',
  '--json',
]);
assert.equal(parsed.simulationReport, 'simulation.json');
assert.equal(parsed.htfSufficiencyReport, 'htf.json');
assert.equal(parsed.json, true);

console.log('no-chase rebuilt review live proposal verified.');
