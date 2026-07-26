import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlayNegativeReplacementCoverageReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlayNegativeReplacementCoverageArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-negative-replacement-coverage';
import type { RawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-negative-simulation';

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

const negativeSimulationReport: RawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationReport = {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_negative_simulation',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    reportDir: 'reports',
    overlayReportPath: 'overlay.json',
    sourceContextReportPath: 'source.json',
  },
  assumptions: {
    savedReportsOnly: true,
    negativeOverlaySimulationOnly: true,
    outcomeUsedForEvaluationOnly: true,
    noLiveRankInstalled: true,
    livePromotionAllowed: false,
  },
  scoring: {
    noChasePenalty: 35,
    lateDayPenalty: 15,
    targetRoomBlockedBeforeT1Penalty: 30,
    entryTriggerPendingPenalty: 20,
  },
  summary: {
    sourceRows: 4,
    slates: 3,
    penalizedRows: 1,
    changedSlates: 2,
    changedFromKnownWinnerSlates: 0,
    changedAwayFromPenalizedMissingOutcomeSlates: 2,
    overlayTopOneMesPl: 40,
    negativeTopOneMesPl: 40,
    topSelectionDeltaOneMesPl: 0,
    missingOutcomeTopRowsBefore: 2,
    missingOutcomeTopRowsAfter: 1,
    livePromotionAllowedRows: 0,
    recommendation: 'keep_research_only',
  },
  rows: [],
  slates: [
    {
      slateId: 'slate-1',
      tradeDate: '2026-07-16',
      session: 'lunch',
      rows: 2,
      overlayTopTicketId: '2026-07-16-lunch-NoInstalledSetup-LONG-20260716T140000',
      overlayTopSetupType: 'NoInstalledSetup',
      overlayTopOneMesPl: null,
      negativeTopTicketId: '2026-07-16-lunch-NoInstalledSetup-SHORT-20260716T140000',
      negativeTopSetupType: 'NoInstalledSetup',
      negativeTopOneMesPl: 40,
      topChanged: true,
      changedFromKnownWinner: false,
      changedAwayFromPenalizedMissingOutcome: true,
      deltaOneMesPl: null,
    },
    {
      slateId: 'slate-2',
      tradeDate: '2026-07-16',
      session: 'lunch',
      rows: 2,
      overlayTopTicketId: '2026-07-16-lunch-NoInstalledSetup-LONG-20260716T140500',
      overlayTopSetupType: 'NoInstalledSetup',
      overlayTopOneMesPl: null,
      negativeTopTicketId: '2026-07-16-lunch-NoInstalledSetup-LONG-20260716T140500',
      negativeTopSetupType: 'NoInstalledSetup',
      negativeTopOneMesPl: null,
      topChanged: true,
      changedFromKnownWinner: false,
      changedAwayFromPenalizedMissingOutcome: true,
      deltaOneMesPl: null,
    },
    {
      slateId: 'slate-3',
      tradeDate: '2026-07-16',
      session: 'lunch',
      rows: 2,
      overlayTopTicketId: 'same-top',
      overlayTopSetupType: 'NoInstalledSetup',
      overlayTopOneMesPl: 20,
      negativeTopTicketId: 'same-top',
      negativeTopSetupType: 'NoInstalledSetup',
      negativeTopOneMesPl: 20,
      topChanged: false,
      changedFromKnownWinner: false,
      changedAwayFromPenalizedMissingOutcome: false,
      deltaOneMesPl: 0,
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const scannerArtifact = {
  reportType: 'raw_ohlc_scanner_artifacts',
  instrument: 'MES',
  events: {
    '2026-07-16T14:00:00': {
      eventTime: '2026-07-16T14:00:00',
      date: '2026-07-16',
      session: 'lunch',
      completed5m: { time: '2026-07-16T14:00:00', open: 100, high: 104, low: 96, close: 99 },
      setupCandidateStatus: {
        statuses: [{
          setupType: 'NoInstalledSetup',
          direction: 'SHORT',
          detectedStatus: 'Possible',
          executionStatus: 'Conditional',
          blockReason: 'EntryTriggerPending',
          entry: 99,
          stop: 103,
          target1: 93,
          target2: 91,
          rankScore: 225,
        }],
      },
    },
    '2026-07-16T14:05:00': {
      eventTime: '2026-07-16T14:05:00',
      date: '2026-07-16',
      session: 'lunch',
      completed5m: { time: '2026-07-16T14:05:00', open: 99, high: 100, low: 94, close: 95 },
      setupCandidateStatus: {
        statuses: [{
          setupType: 'NoInstalledSetup',
          direction: 'LONG',
          detectedStatus: 'Possible',
          executionStatus: 'Conditional',
          blockReason: 'EntryTriggerPending',
          entry: null,
          stop: 95,
          target1: null,
          target2: null,
          rankScore: 240,
        }],
      },
    },
    '2026-07-16T14:10:00': {
      eventTime: '2026-07-16T14:10:00',
      date: '2026-07-16',
      session: 'lunch',
      completed5m: { time: '2026-07-16T14:10:00', open: 95, high: 96, low: 90, close: 91 },
      setupCandidateStatus: { statuses: [] },
    },
  },
};

const report = buildRawOhlcScannerArtifactSweepCompositeOverlayNegativeReplacementCoverageReport({
  reportDir: 'reports',
  negativeSimulationReportPath: 'negative.json',
  negativeSimulationReport,
  scannerArtifactPaths: ['artifact.json'],
  scannerArtifacts: [scannerArtifact],
  replayPackagePath: 'replay-package.json',
  minReadyRows: 1,
}, '2026-07-19T00:01:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_negative_replacement_coverage');
assert.equal(report.status, 'pass');
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.changedSlates, 2);
assert.equal(report.summary.replacementTopRefs, 2);
assert.equal(report.summary.replacementTopMissingOutcomeRefs, 1);
assert.equal(report.summary.uniqueReplacementTopTicketIds, 2);
assert.equal(report.summary.readyRows, 1);
assert.equal(report.summary.blockedRows, 1);
assert.equal(report.summary.incompleteLevelRows, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'run_changed_replacement_outcome_replay');
assert.equal(report.rows.find((row) => row.coverageStatus === 'ready_for_replay_package')?.barsAfterProof, 3);
assert.match(report.markdown, /Negative Replacement Coverage/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayNegativeReplacementCoverageArgs([
  '--negative-simulation-report',
  'negative.json',
  '--scanner-artifacts',
  'a.json,b.json',
  '--min-ready-rows',
  '3',
  '--json',
]);
assert.equal(parsed.negativeSimulationReport, 'negative.json');
assert.deepEqual(parsed.scannerArtifacts, ['a.json', 'b.json']);
assert.equal(parsed.minReadyRows, 3);
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay negative replacement coverage verified.');
