import assert from 'node:assert/strict';
import { buildRawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeDryRunComparisonReport } from './raw-ohlc-scanner-artifact-openingdrive-priority-campaign-dedupe-dry-run-comparison';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport } from './unified-positive-held-local-preview-replay-package-outcome';
import type { RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeApprovalContractReport } from './raw-ohlc-scanner-artifact-openingdrive-priority-campaign-dedupe-approval-contract';

const outcome: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport = {
  reportType: 'unified_positive_held_local_preview_replay_package_outcome',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority: {
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
  },
  source: { reportDir: 'reports', replayPackagePath: 'package.json' },
  assumptions: {
    oneMesPointValue: 5,
    usesCompletedFiveMinuteBarsOnly: true,
    missingBarsAreNotInvented: true,
    sameBarStopAndTargetUsesConservativeStopFirst: true,
    outcomeIsResearchOnly: true,
    livePromotionAllowed: false,
  },
  summary: {
    packageRows: 3,
    resolvedRows: 3,
    unresolvedRows: 0,
    blockedRows: 0,
    noFillRows: 0,
    stoppedBeforeT1Rows: 1,
    t1OnlyRows: 0,
    t1AndT2Rows: 2,
    noTargetOrStopRows: 0,
    grossResolvedOneMesPl: 250,
    modelGroups: [],
    daySessionModelGroups: [],
    livePromotionAllowedRows: 0,
  },
  rows: [
    {
      ticketId: 'lead',
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
      barsSource: 'scanner_decision_tape_completed_5m',
      barsLoaded: 20,
      barsAfterProof: 20,
      entryHitTime: '2026-07-10T09:35:00',
      firstReplayBarTime: '2026-07-10T09:40:00',
      stopHitTime: null,
      t1HitTime: '2026-07-10T09:50:00',
      t2HitTime: '2026-07-10T10:00:00',
      maximumFavorableExcursion: 10,
      maximumAdverseExcursion: 1,
      resolvedOneMesPl: 40,
      resolvedR: 2,
      intrabarAmbiguity: false,
      blockers: [],
    },
    {
      ticketId: 'duplicate-loss',
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
      barsSource: 'scanner_decision_tape_completed_5m',
      barsLoaded: 19,
      barsAfterProof: 19,
      entryHitTime: '2026-07-10T09:40:00',
      firstReplayBarTime: '2026-07-10T09:45:00',
      stopHitTime: '2026-07-10T09:45:00',
      t1HitTime: null,
      t2HitTime: null,
      maximumFavorableExcursion: 1,
      maximumAdverseExcursion: 5,
      resolvedOneMesPl: -20,
      resolvedR: -1,
      intrabarAmbiguity: false,
      blockers: [],
    },
    {
      ticketId: 'other-model',
      tradeDate: '2026-07-10',
      session: 'morning',
      setupType: 'OpeningDriveFvgContinuation',
      direction: 'LONG',
      proofTime: '2026-07-10T09:35:00',
      outcomeStatus: 'resolved',
      outcomeLabel: 't1_and_t2_hit',
      entry: 101,
      stop: 97,
      t1: 107,
      t2: 109,
      riskPoints: 4,
      barsSource: 'scanner_decision_tape_completed_5m',
      barsLoaded: 20,
      barsAfterProof: 20,
      entryHitTime: '2026-07-10T09:35:00',
      firstReplayBarTime: '2026-07-10T09:40:00',
      stopHitTime: null,
      t1HitTime: '2026-07-10T09:50:00',
      t2HitTime: '2026-07-10T10:00:00',
      maximumFavorableExcursion: 9,
      maximumAdverseExcursion: 1,
      resolvedOneMesPl: 40,
      resolvedR: 2,
      intrabarAmbiguity: false,
      blockers: [],
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const approvalContract = {
  status: 'pass',
  rows: [{ selectedTicketId: 'lead' }],
} as RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeApprovalContractReport;

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeDryRunComparisonReport({
  replayPackageOutcomePath: 'outcome.json',
  replayPackageOutcome: outcome,
  approvalContractPath: 'approval.json',
  approvalContract,
  setupType: 'SweepMssFvgRetrace',
});

assert.equal(report.status, 'pass');
assert.equal(report.summary.targetSetupRows, 2);
assert.equal(report.summary.campaigns, 1);
assert.equal(report.summary.dedupedRows, 1);
assert.equal(report.summary.suppressedDuplicateRows, 1);
assert.equal(report.summary.currentOneMesPl, 20);
assert.equal(report.summary.dedupedOneMesPl, 40);
assert.equal(report.summary.deltaOneMesPl, 20);
assert.equal(report.summary.selectedRowsMatchApprovalContract, true);
assert.equal(report.summary.entryStopTargetRiskDriftRows, 0);
assert.equal(report.summary.canExecuteChangeRows, 0);
assert.equal(report.summary.discordPostingChangeRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'dry_run_supports_earliest_only_campaign_dedupe');

console.log('OpeningDrive priority campaign dedupe dry-run comparison verified.');
