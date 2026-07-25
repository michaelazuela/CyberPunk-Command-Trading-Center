import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewArtifactGapReport,
} from './unified-positive-held-local-preview-artifact-gap';

const decisionSummary = {
  status: 'pass',
  rows: [
    {
      ticketId: 'ticket-complete',
      setupType: 'raidReclaim',
      direction: 'LONG',
      decisionAction: 'queue_for_replay_research',
    },
    {
      ticketId: 'ticket-missing-proof',
      setupType: 'SweepMssFvgRetrace',
      direction: 'SHORT',
      decisionAction: 'queue_for_replay_research',
    },
    {
      ticketId: 'ticket-held',
      setupType: 'raidReclaim',
      direction: 'SHORT',
      decisionAction: 'hold_for_manual_review',
    },
  ],
};

const replayQueue = {
  status: 'pass',
  rows: [
    {
      ticketId: 'ticket-complete',
      setupType: 'raidReclaim',
      direction: 'LONG',
      replayStatus: 'ready_for_read_only_outcome_replay',
    },
    {
      ticketId: 'ticket-missing-proof',
      setupType: 'SweepMssFvgRetrace',
      direction: 'SHORT',
      replayStatus: 'ready_for_read_only_outcome_replay',
    },
  ],
};

const ohlcOutcome = {
  status: 'pass',
  rows: [
    {
      ticketId: 'ticket-complete',
      setupType: 'raidReclaim',
      direction: 'LONG',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: 50,
    },
    {
      ticketId: 'ticket-missing-proof',
      setupType: 'SweepMssFvgRetrace',
      direction: 'SHORT',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: 100,
    },
  ],
};

const sourceProof = {
  status: 'pass',
  rows: [
    {
      rowId: 'ticket-complete',
      setupType: 'raidReclaim',
      direction: 'LONG',
      decision: 'accepted_for_research_validation',
    },
  ],
};

const report = buildUnifiedPositiveHeldLocalPreviewArtifactGapReport({
  reportDir: 'diagnostic-reports',
  decisionSummaryPaths: ['decision-summary.json'],
  decisionSummaryReports: [decisionSummary],
  replayQueuePaths: ['replay-queue.json'],
  replayQueueReports: [replayQueue],
  ohlcOutcomePaths: ['ohlc-outcome.json'],
  ohlcOutcomeReports: [ohlcOutcome],
  sourceProofFilterPaths: ['source-proof.json'],
  sourceProofFilterReports: [sourceProof],
}, '2026-07-17T00:00:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_artifact_gap');
assert.equal(report.status, 'pass');
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.uniqueTickets, 2);
assert.equal(report.summary.decisionSummaryQueuedTickets, 2);
assert.equal(report.summary.replayQueueReadyTickets, 2);
assert.equal(report.summary.ohlcOutcomeResolvedTickets, 2);
assert.equal(report.summary.sourceProofAcceptedTickets, 1);
assert.equal(report.summary.ticketsMissingSourceProofAccepted, 1);
assert.equal(report.summary.additionalReviewedSourceProofPositiveTickets, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.rows.find((row) => row.ticketId === 'ticket-missing-proof')?.missingNextStage, 'source_proof_accepted');
assert.match(report.markdown, /ticket-missing-proof/);

const missing = buildUnifiedPositiveHeldLocalPreviewArtifactGapReport({
  reportDir: 'diagnostic-reports',
  decisionSummaryPaths: [],
  decisionSummaryReports: [],
  replayQueuePaths: [],
  replayQueueReports: [],
  ohlcOutcomePaths: [],
  ohlcOutcomeReports: [],
  sourceProofFilterPaths: [],
  sourceProofFilterReports: [],
}, '2026-07-17T00:01:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('no decision-summary reports found'));
assert.ok(missing.blockers.includes('no source/proof filter reports found'));

console.log('unified positive held-local preview artifact gap verified.');
