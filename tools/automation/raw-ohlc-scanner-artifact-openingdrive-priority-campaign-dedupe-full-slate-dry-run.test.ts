import assert from 'node:assert/strict';
import { buildRawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunReport } from './raw-ohlc-scanner-artifact-openingdrive-priority-campaign-dedupe-full-slate-dry-run';
import { ExecutionStatus, NoTradeReason, SetupCandidateStatus, SetupType } from '../../src/types';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport } from './unified-positive-held-local-preview-replay-package-outcome';

type BuilderInput = Parameters<typeof buildRawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunReport>[0];

const artifact: BuilderInput['scannerArtifact'] = {
  events: {
    '2026-07-10T09:35:00': {
      eventTime: '2026-07-10T09:35:00',
      date: '2026-07-10',
      session: 'morning',
      sessionType: 'replay_morning',
      setupCandidateStatus: {
        statuses: [
          {
            setupType: SetupType.SweepMssFvgRetrace,
            direction: 'LONG',
            detectedStatus: SetupCandidateStatus.Conditional,
            executionStatus: ExecutionStatus.Conditional,
            blockReason: NoTradeReason.EntryTriggerPending,
            entry: 100,
            stop: 96,
            target1: 106,
            target2: 108,
            riskPoints: 4,
            priority: 90,
            modelConfidenceScore: 90,
            decisionQualityScore: 90,
            confidence: 'High',
            evidence: ['Completed 5M proof.'],
            missingEvidence: [],
            requiredTrigger: 'Completed 5M proof.',
            nextAction: 'Review only.',
            reducedRiskPlan: null,
          },
        ],
      },
    },
    '2026-07-10T09:40:00': {
      eventTime: '2026-07-10T09:40:00',
      date: '2026-07-10',
      session: 'morning',
      sessionType: 'replay_morning',
      setupCandidateStatus: {
        statuses: [
          {
            setupType: SetupType.SweepMssFvgRetrace,
            direction: 'LONG',
            detectedStatus: SetupCandidateStatus.Conditional,
            executionStatus: ExecutionStatus.Conditional,
            blockReason: NoTradeReason.EntryTriggerPending,
            entry: 100,
            stop: 96,
            target1: 106,
            target2: 108,
            riskPoints: 4,
            priority: 100,
            modelConfidenceScore: 100,
            decisionQualityScore: 100,
            confidence: 'High',
            evidence: ['Completed 5M proof.'],
            missingEvidence: [],
            requiredTrigger: 'Completed 5M proof.',
            nextAction: 'Review only.',
            reducedRiskPlan: null,
          },
          {
            setupType: SetupType.IntradayMssMicroContinuation,
            direction: 'LONG',
            detectedStatus: SetupCandidateStatus.Conditional,
            executionStatus: ExecutionStatus.Conditional,
            blockReason: NoTradeReason.EntryTriggerPending,
            entry: 101,
            stop: 97,
            target1: 107,
            target2: 109,
            riskPoints: 4,
            priority: 60,
            modelConfidenceScore: 60,
            decisionQualityScore: 60,
            confidence: 'High',
            evidence: ['Completed 5M proof and HTF support.'],
            missingEvidence: [],
            requiredTrigger: 'Completed 5M proof.',
            nextAction: 'Review only.',
            reducedRiskPlan: null,
          },
        ],
      },
    },
  },
};

const outcome = {
  status: 'pass',
  summary: { livePromotionAllowedRows: 0 },
  rows: [
    {
      ticketId: '2026-07-10-morning-SweepMssFvgRetrace-LONG-20260710T093500',
      tradeDate: '2026-07-10',
      session: 'morning',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      proofTime: '2026-07-10T09:35:00',
      outcomeStatus: 'resolved',
      outcomeLabel: 't1_and_t2_hit',
      entry: 100,
      stop: 96,
      t1: 106,
      t2: 108,
      riskPoints: 4,
      resolvedOneMesPl: 40,
    },
    {
      ticketId: '2026-07-10-morning-SweepMssFvgRetrace-LONG-20260710T094000',
      tradeDate: '2026-07-10',
      session: 'morning',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      proofTime: '2026-07-10T09:40:00',
      outcomeStatus: 'resolved',
      outcomeLabel: 'stopped_before_t1',
      entry: 100,
      stop: 96,
      t1: 106,
      t2: 108,
      riskPoints: 4,
      resolvedOneMesPl: -20,
    },
    {
      ticketId: '2026-07-10-morning-IntradayMssMicroContinuation-LONG-20260710T094000',
      tradeDate: '2026-07-10',
      session: 'morning',
      setupType: 'IntradayMssMicroContinuation',
      direction: 'LONG',
      proofTime: '2026-07-10T09:40:00',
      outcomeStatus: 'resolved',
      outcomeLabel: 't1_and_t2_hit',
      entry: 101,
      stop: 97,
      t1: 107,
      t2: 109,
      riskPoints: 4,
      resolvedOneMesPl: 40,
    },
  ],
} as UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport;

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunReport({
  scannerArtifactPath: 'artifact.json',
  scannerArtifact: artifact,
  replayPackageOutcomePath: 'outcome.json',
  replayPackageOutcome: outcome,
  setupType: 'SweepMssFvgRetrace',
});

assert.equal(report.status, 'pass');
assert.equal(report.summary.slates, 2);
assert.equal(report.summary.targetSetupRows, 2);
assert.equal(report.summary.suppressedDuplicateRows, 1);
assert.equal(report.summary.changedSlates, 1);
assert.equal(report.summary.changedFromSuppressedSweepDuplicateSlates, 1);
assert.equal(report.summary.changedToNonSweepSlates, 1);
assert.equal(report.summary.baselineTopOneMesPl, 20);
assert.equal(report.summary.dedupedTopOneMesPl, 80);
assert.equal(report.summary.deltaTopOneMesPl, 60);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.approvalBoundaryDriftRows, 0);
assert.equal(report.summary.recommendation, 'full_slate_dry_run_supports_targeted_duplicate_suppression');

console.log('OpeningDrive priority campaign dedupe full-slate dry run verified.');
