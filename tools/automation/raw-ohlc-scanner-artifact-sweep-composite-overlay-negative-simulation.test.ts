import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-negative-simulation';
import type { RawOhlcScannerArtifactSweepCompositeOverlayDryRunReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-dry-run';
import type { RawOhlcScannerArtifactSweepCompositeOverlaySourceContextDrilldownReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-source-context-drilldown';

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

const overlayReport: RawOhlcScannerArtifactSweepCompositeOverlayDryRunReport = {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_dry_run',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    reportDir: 'reports',
    snapshotMinerReportPath: 'snapshot.json',
    scannerArtifactPaths: [],
    outcomeReportPaths: [],
  },
  assumptions: {
    savedArtifactsOnly: true,
    overlayDryRunOnly: true,
    outcomeUsedForEvaluationOnly: true,
    incompleteMatchesAreNotBoosted: true,
    noLiveRankInstalled: true,
    livePromotionAllowed: false,
  },
  scoring: {
    validatedCompositeSweepBoostPoints: 25,
    baselineScoreSource: 'scanner_candidate_rankScore',
  },
  summary: {
    scannerArtifacts: 1,
    outcomeReports: 1,
    candidateRows: 4,
    slates: 2,
    validatedCompositeRows: 0,
    incompleteCompositeMatchesNotBoosted: 0,
    overlayBoostRows: 0,
    changedSlates: 0,
    changedToValidatedCompositeSweepSlates: 0,
    changedFromKnownWinnerSlates: 0,
    baselineTopOneMesPl: 40,
    overlayTopOneMesPl: 40,
    topSelectionDeltaOneMesPl: 0,
    missingOutcomeTopRows: 1,
    livePromotionAllowedRows: 0,
    recommendation: 'keep_research_only',
  },
  rows: [
    {
      slateId: 'slate-1',
      ticketId: 'penalized-missing',
      tradeDate: '2026-07-16',
      session: 'lunch',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      baselineScore: 260,
      overlayScore: 260,
      baselineRank: 1,
      overlayRank: 1,
      completeDeterministicLevels: true,
      validatedCompositeMatch: false,
      overlayBoostApplied: false,
      matchedSegmentKind: null,
      matchedSegmentKey: null,
      outcomeStatus: 'missing',
      outcomeLabel: 'missing',
      resolvedOneMesPl: null,
      scannerVisibleEligible: false,
    },
    {
      slateId: 'slate-1',
      ticketId: 'resolved-second',
      tradeDate: '2026-07-16',
      session: 'lunch',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      baselineScore: 240,
      overlayScore: 240,
      baselineRank: 2,
      overlayRank: 2,
      completeDeterministicLevels: true,
      validatedCompositeMatch: false,
      overlayBoostApplied: false,
      matchedSegmentKind: null,
      matchedSegmentKey: null,
      outcomeStatus: 'resolved',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 40,
      scannerVisibleEligible: false,
    },
    {
      slateId: 'slate-2',
      ticketId: 'known-winner',
      tradeDate: '2026-07-17',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      baselineScore: 260,
      overlayScore: 260,
      baselineRank: 1,
      overlayRank: 1,
      completeDeterministicLevels: true,
      validatedCompositeMatch: false,
      overlayBoostApplied: false,
      matchedSegmentKind: null,
      matchedSegmentKey: null,
      outcomeStatus: 'resolved',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 50,
      scannerVisibleEligible: false,
    },
    {
      slateId: 'slate-2',
      ticketId: 'losing-second',
      tradeDate: '2026-07-17',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      baselineScore: 240,
      overlayScore: 240,
      baselineRank: 2,
      overlayRank: 2,
      completeDeterministicLevels: true,
      validatedCompositeMatch: false,
      overlayBoostApplied: false,
      matchedSegmentKind: null,
      matchedSegmentKey: null,
      outcomeStatus: 'resolved',
      outcomeLabel: 'stopped_before_t1',
      resolvedOneMesPl: -20,
      scannerVisibleEligible: false,
    },
  ],
  slates: [],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const sourceContextReport: RawOhlcScannerArtifactSweepCompositeOverlaySourceContextDrilldownReport = {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_source_context_drilldown',
  generatedAt: '2026-07-19T00:01:00.000Z',
  status: 'pass',
  authority,
  source: {
    reportDir: 'reports',
    replayPackagePath: 'package.json',
    outcomeReportPath: 'outcome.json',
  },
  assumptions: {
    savedReplayPackageAndOutcomeOnly: true,
    savedScannerArtifactsOnly: true,
    outcomeIsNotRecomputed: true,
    noLiveRankInstalled: true,
    livePromotionAllowed: false,
  },
  summary: {
    replayRows: 1,
    outcomeRows: 1,
    joinedRows: 1,
    noChaseTaggedRows: 1,
    targetRoomBlockedRows: 1,
    entryTriggerPendingRows: 1,
    lateDayRows: 1,
    noMissingEvidenceRows: 0,
    livePromotionAllowedRows: 0,
    recommendation: 'use_as_negative_or_review_note_evidence_only',
  },
  rows: [{
    ticketId: 'penalized-missing',
    tradeDate: '2026-07-16',
    session: 'lunch',
    setupType: 'NoInstalledSetup',
    direction: 'LONG',
    outcomeLabel: 'no_target_or_stop_hit',
    favorableR: 0.4,
    adverseR: 0.6,
    rankBucket: 'rank_250_to_269',
    proofState: 'Possible:Conditional:EntryTriggerPending',
    sourceTags: ['no_chase', 'late_day_after_1500', 'target_room_blocked_before_t1', 'entry_trigger_pending'],
    targetRoomStatus: 'blocked_before_t1',
    missingEvidenceCount: 1,
  }],
  tagSummaries: [],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildRawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationReport({
  reportDir: 'reports',
  overlayReportPath: 'overlay.json',
  sourceContextReportPath: 'source.json',
  overlayReport,
  sourceContextReport,
  scoring: {
    noChasePenalty: 35,
    lateDayPenalty: 15,
    targetRoomBlockedBeforeT1Penalty: 30,
    entryTriggerPendingPenalty: 20,
  },
}, '2026-07-19T00:02:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_negative_simulation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.penalizedRows, 1);
assert.equal(report.summary.changedSlates, 1);
assert.equal(report.summary.changedFromKnownWinnerSlates, 0);
assert.equal(report.summary.changedAwayFromPenalizedMissingOutcomeSlates, 1);
assert.equal(report.summary.missingOutcomeTopRowsBefore, 1);
assert.equal(report.summary.missingOutcomeTopRowsAfter, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'prepare_research_live_proposal_with_promotion_disabled');
assert.equal(report.slates.find((slate) => slate.slateId === 'slate-1')?.negativeTopTicketId, 'resolved-second');
assert.equal(report.slates.find((slate) => slate.slateId === 'slate-2')?.negativeTopTicketId, 'known-winner');
assert.match(report.markdown, /Negative Simulation/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationArgs([
  '--overlay-report',
  'overlay.json',
  '--source-context-report',
  'source.json',
  '--no-chase-penalty',
  '40',
  '--json',
]);
assert.equal(parsed.overlayReport, 'overlay.json');
assert.equal(parsed.sourceContextReport, 'source.json');
assert.equal(parsed.noChasePenalty, 40);
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay negative simulation verified.');
