import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewReviewedCaseIntakeReport,
} from './unified-positive-held-local-preview-reviewed-case-intake';

const sourceProof = {
  status: 'pass',
  rows: [
    {
      rowId: '2026-06-16-morning-TurtleSoup-LONG',
      setupType: 'TurtleSoup',
      direction: 'LONG',
      decision: 'accepted_for_research_validation',
    },
  ],
};

const historicalTape = {
  reportType: 'scanner_decision_event_tape',
  tradeDate: '2026-06-16',
  instrument: 'MES',
  session: 'morning',
  events: {
    '2026-06-16T09:55:00.0000000': {
      setupCandidateStatus: {
        statuses: [
          {
            setupType: 'TurtleSoup',
            direction: 'LONG',
            detectedStatus: 'Conditional',
            executionStatus: 'Conditional',
            entry: 7625.5,
            stop: 7621.5,
            target1: 7634.25,
            target2: 7636.5,
            riskPoints: 4,
            blockReason: null,
            candidateState: 'HUMAN_REVIEW_READY',
          },
          {
            setupType: 'OpeningDriveFvgContinuation',
            direction: 'SHORT',
            detectedStatus: 'Possible',
            executionStatus: 'Conditional',
            entry: 7472.75,
            stop: 7491.25,
            target1: 7445,
            target2: 7435.75,
            riskPoints: 18.5,
            blockReason: 'EntryTriggerPending',
            candidateState: 'OPENING_OBSERVATION_ARMED',
          },
          {
            setupType: 'SweepMssFvgRetrace',
            direction: 'SHORT',
            detectedStatus: 'Conditional',
            executionStatus: 'Executable',
            entry: 7630.25,
            stop: 7635,
            target1: 7620.75,
            target2: 7617,
            riskPoints: 4.75,
            blockReason: null,
            candidateState: null,
          },
          {
            setupType: 'IntradayMssMicroContinuation',
            direction: 'SHORT',
            detectedStatus: 'Possible',
            executionStatus: 'Conditional',
            entry: null,
            stop: 7636.5,
            target1: null,
            target2: null,
            riskPoints: null,
            blockReason: 'EntryTriggerPending',
            candidateState: 'MSS_CONTINUATION_RETEST_PENDING',
          },
        ],
      },
    },
    '2026-06-16T10:00:00.0000000': {
      setupCandidateStatus: {
        statuses: [
          {
            setupType: 'OpeningDriveFvgContinuation',
            direction: 'SHORT',
            detectedStatus: 'Possible',
            executionStatus: 'Conditional',
            entry: 7472.75,
            stop: 7491.25,
            target1: 7445,
            target2: 7435.75,
            riskPoints: 18.5,
            blockReason: 'EntryTriggerPending',
            candidateState: 'OPENING_OBSERVATION_ARMED',
          },
        ],
      },
    },
  },
};

const currentDayTape = {
  reportType: 'scanner_decision_event_tape',
  tradeDate: '2026-07-17',
  instrument: 'MES',
  session: 'morning',
  events: {
    '2026-07-17T09:55:00.0000000': {
      setupCandidateStatus: {
        statuses: [
          {
            setupType: 'TurtleSoup',
            direction: 'SHORT',
            detectedStatus: 'Conditional',
            executionStatus: 'Conditional',
            entry: 7530,
            stop: 7540,
            target1: 7515,
            target2: 7510,
            riskPoints: 10,
            blockReason: null,
            candidateState: 'HUMAN_REVIEW_READY',
          },
        ],
      },
    },
  },
};

const report = buildUnifiedPositiveHeldLocalPreviewReviewedCaseIntakeReport({
  reportDir: 'diagnostic-reports',
  decisionTapeDir: 'discord-audit',
  sourceProofFilterPaths: ['source-proof.json'],
  sourceProofFilterReports: [sourceProof],
  decisionTapePaths: [
    'scanner-decision-tape-2026-06-16-MES-morning.json',
    'scanner-decision-tape-2026-07-17-MES-morning.json',
  ],
  decisionTapeReports: [historicalTape, currentDayTape],
  currentTradeDate: '2026-07-17',
}, '2026-07-17T00:00:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_reviewed_case_intake');
assert.equal(report.status, 'pass');
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.knownProcessedTickets, 1);
assert.equal(report.summary.decisionTapeFilesScanned, 2);
assert.equal(report.summary.decisionTapeEventsScanned, 3);
assert.equal(report.summary.historicalHeldCompleteCandidates, 2);
assert.equal(report.summary.newReviewIntakeCandidates, 1);
assert.equal(report.summary.alreadyProcessedCandidates, 1);
assert.equal(report.summary.currentTradeDateCandidatesExcluded, 1);
assert.equal(report.summary.executableCandidatesIgnored, 1);
assert.equal(report.summary.incompletePlanCandidatesIgnored, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);

const newCandidate = report.rows.find((row) => row.intakeId === '2026-06-16-morning-OpeningDriveFvgContinuation-SHORT');
assert.equal(newCandidate?.intakeDecision, 'candidate_for_review_intake');
assert.equal(newCandidate?.occurrences, 2);
assert.match(newCandidate?.nextAction || '', /reviewed preview\/replay row/);

const knownCandidate = report.rows.find((row) => row.intakeId === '2026-06-16-morning-TurtleSoup-LONG');
assert.equal(knownCandidate?.intakeDecision, 'already_processed');
assert.match(report.markdown, /New review intake candidates: 1/);

const missing = buildUnifiedPositiveHeldLocalPreviewReviewedCaseIntakeReport({
  reportDir: 'diagnostic-reports',
  decisionTapeDir: 'discord-audit',
  sourceProofFilterPaths: [],
  sourceProofFilterReports: [],
  decisionTapePaths: [],
  decisionTapeReports: [],
  currentTradeDate: '2026-07-17',
}, '2026-07-17T00:01:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('no source/proof filter reports found for processed-ticket comparison'));
assert.ok(missing.blockers.includes('no scanner decision tape files found for replay discovery'));

console.log('unified positive held-local preview reviewed case intake verified.');
