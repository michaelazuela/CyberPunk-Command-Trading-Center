import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeValidationPackageReport,
  parseRawOhlcScannerArtifactSweepCompositeValidationPackageArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-validation-package';
import type { RawOhlcScannerArtifactSweepSnapshotFieldMinerReport } from './raw-ohlc-scanner-artifact-sweep-snapshot-field-miner';

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

const snapshotReport: RawOhlcScannerArtifactSweepSnapshotFieldMinerReport = {
  reportType: 'raw_ohlc_scanner_artifact_sweep_snapshot_field_miner',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    reportDir: 'reports',
    trainArtifacts: [],
    trainOutcomeReports: [],
    testArtifacts: [],
    testOutcomeReports: [],
    minRowsPerPeriod: 5,
    setupType: 'NoInstalledSetup',
  },
  assumptions: {
    consumesExistingRawScannerArtifactsAndOutcomeReportsOnly: true,
    extractsPreEntrySnapshotTagsOnly: true,
    outcomeFieldsAreEvaluationOnly: true,
    noLiveRankInstalled: true,
    livePromotionAllowed: false,
  },
  summary: {
    trainSnapshotRows: 1,
    testSnapshotRows: 1,
    zeroLossTransferSegments: 1,
    latestPositiveTrainLossBearingSegments: 0,
    latestPositiveTrainWeakSegments: 0,
    livePromotionAllowedRows: 0,
    recommendation: 'fresh_replay_validate_zero_loss_snapshot_segments',
  },
  zeroLossTransferSegments: [{
    kind: 'session_direction_candle_rank' as never,
    key: 'lunch|SHORT|bearish_close|close_middle_half|rank_180_to_239',
    train: { rows: 5, winners: 5, losses: 0, otherResolved: 0, unresolved: 0, oneMesPl: 100, winRateResolved: 1 },
    test: { rows: 5, winners: 5, losses: 0, otherResolved: 0, unresolved: 0, oneMesPl: 100, winRateResolved: 1 },
    verdict: 'research_candidate_zero_loss_transfer',
    reason: 'fixture',
    score: 1,
  }],
  latestPositiveTrainLossBearingSegments: [],
  latestPositiveTrainWeakSegments: [],
  cautionSegments: [],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const artifact = {
  reportType: 'raw_ohlc_scanner_artifacts',
  instrument: 'MES',
  events: {
    '2026-07-16T14:00:00': {
      eventTime: '2026-07-16T14:00:00',
      date: '2026-07-16',
      session: 'lunch',
      completed5m: { time: '2026-07-16T14:00:00', open: 100, high: 104, low: 96, close: 99, volume: 100 },
      setupCandidateStatus: {
        statuses: [{
          setupType: 'NoInstalledSetup',
          direction: 'SHORT',
          detectedStatus: 'Conditional',
          executionStatus: 'EntryTriggerPending',
          blockReason: null,
          entry: 98,
          stop: 102,
          target1: 92,
          target2: 90,
          rankScore: 200,
          targetRoom: { targetRoomStatus: 'clear_to_t2' },
          evidence: ['Liquidity sweep confirmed.'],
          missingEvidence: [],
          activeRuleset: { htfLineInSand: { status: 'not_applicable', obstacleSource: null, obstacleType: null } },
        }],
      },
    },
    '2026-07-16T14:05:00': {
      eventTime: '2026-07-16T14:05:00',
      date: '2026-07-16',
      session: 'lunch',
      completed5m: { time: '2026-07-16T14:05:00', open: 99, high: 101, low: 97, close: 100, volume: 100 },
      setupCandidateStatus: {
        statuses: [{
          setupType: 'NoInstalledSetup',
          direction: 'LONG',
          entry: 100,
          stop: 96,
          target1: 106,
          target2: 108,
          rankScore: 200,
        }],
      },
    },
  },
};

const report = buildRawOhlcScannerArtifactSweepCompositeValidationPackageReport({
  reportDir: 'reports',
  snapshotMinerReportPath: 'snapshot.json',
  snapshotMinerReport: snapshotReport,
  scannerArtifactPaths: ['artifact.json'],
  scannerArtifacts: [artifact],
  minRows: 1,
}, '2026-07-19T00:01:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_validation_package');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.selectorSegments, 1);
assert.equal(report.summary.replayPackageRows, 1);
assert.equal(report.summary.readyRows, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.rows[0].ticketId, '2026-07-16-lunch-NoInstalledSetup-SHORT-20260716T140000');
assert.equal(report.rows[0].sweepCompositeValidation?.matchedSegmentKind, 'session_direction_candle_rank');
assert.match(report.markdown, /Sweep Composite Validation Package/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeValidationPackageArgs([
  '--snapshot-miner-report',
  'snapshot.json',
  '--scanner-artifacts',
  'a.json,b.json',
  '--min-rows',
  '2',
  '--json',
]);
assert.equal(parsed.snapshotMinerReport, 'snapshot.json');
assert.deepEqual(parsed.scannerArtifacts, ['a.json', 'b.json']);
assert.equal(parsed.minRows, 2);
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite validation package verified.');
