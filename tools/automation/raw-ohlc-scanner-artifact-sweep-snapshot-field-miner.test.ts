import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepSnapshotFieldMinerReport,
  parseRawOhlcScannerArtifactSweepSnapshotFieldMinerArgs,
} from './raw-ohlc-scanner-artifact-sweep-snapshot-field-miner';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport } from './unified-positive-held-local-preview-replay-package-outcome';

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

function ticketId(index: number, session: 'morning' | 'lunch', direction: 'LONG' | 'SHORT'): string {
  return `2026-07-16-${session}-NoInstalledSetup-${direction}-20260716T14${String(index).padStart(2, '0')}00`;
}

function event(index: number, args: {
  session: 'morning' | 'lunch';
  direction: 'LONG' | 'SHORT';
  evidence: string[];
  outcomeTag: 'clean' | 'lossBearing';
}) {
  const minute = String(index).padStart(2, '0');
  return {
    eventTime: `2026-07-16T14:${minute}:00`,
    date: '2026-07-16',
    session: args.session,
    completed5m: {
      time: `2026-07-16T14:${minute}:00`,
      open: args.direction === 'SHORT' ? 100 : 98,
      high: 104,
      low: 96,
      close: args.direction === 'SHORT' ? 97 : 103,
      volume: 1000,
    },
    setupCandidateStatus: {
      statuses: [{
        setupType: 'NoInstalledSetup',
        direction: args.direction,
        confidence: args.outcomeTag === 'clean' ? 'High' : 'Medium',
        rankScore: args.outcomeTag === 'clean' ? 260 : 175,
        targetRoom: {
          targetRoomStatus: args.outcomeTag === 'clean' ? 'clear_to_t2' : 'obstacle_before_t1',
          obstacleBeforeT1: args.outcomeTag !== 'clean',
          t2ExtensionObstructed: false,
        },
        evidence: args.evidence,
        missingEvidence: args.outcomeTag === 'clean' ? [] : ['Nearest obstacle sits before 1R.'],
        activeRuleset: {
          timeframeMss: { status: args.outcomeTag === 'clean' ? 'confirmed' : 'partial' },
          htfLineInSand: {
            status: args.outcomeTag === 'clean' ? 'aligned' : 'obstacle',
            obstacleSource: args.outcomeTag === 'clean' ? null : '15m',
            obstacleType: args.outcomeTag === 'clean' ? null : 'prior_swing',
          },
        },
      }],
    },
  };
}

function artifact(rows: ReturnType<typeof event>[]) {
  return {
    reportType: 'raw_ohlc_scanner_artifacts',
    events: Object.fromEntries(rows.map((row) => [row.eventTime, row])),
  };
}

function outcomeRow(index: number, args: {
  session: 'morning' | 'lunch';
  direction: 'LONG' | 'SHORT';
  outcomeLabel: 't1_and_t2_hit' | 'stopped_before_t1';
  oneMesPl: number;
}) {
  return {
    ticketId: ticketId(index, args.session, args.direction),
    tradeDate: '2026-07-16',
    session: args.session,
    setupType: 'NoInstalledSetup',
    direction: args.direction,
    proofTime: `2026-07-16T14:${String(index).padStart(2, '0')}:00`,
    outcomeStatus: 'resolved' as const,
    outcomeLabel: args.outcomeLabel,
    entry: 100,
    stop: args.direction === 'LONG' ? 96 : 104,
    t1: args.direction === 'LONG' ? 106 : 94,
    t2: args.direction === 'LONG' ? 108 : 92,
    riskPoints: 4,
    barsSource: 'scanner_decision_tape_completed_5m' as const,
    barsLoaded: 20,
    barsAfterProof: 8,
    entryHitTime: `2026-07-16T14:${String(index).padStart(2, '0')}:00`,
    firstReplayBarTime: `2026-07-16T14:${String(index + 1).padStart(2, '0')}:00`,
    stopHitTime: args.outcomeLabel === 'stopped_before_t1' ? `2026-07-16T14:${String(index + 1).padStart(2, '0')}:00` : null,
    t1HitTime: args.outcomeLabel === 't1_and_t2_hit' ? `2026-07-16T14:${String(index + 1).padStart(2, '0')}:00` : null,
    t2HitTime: args.outcomeLabel === 't1_and_t2_hit' ? `2026-07-16T14:${String(index + 2).padStart(2, '0')}:00` : null,
    maximumFavorableExcursion: args.outcomeLabel === 't1_and_t2_hit' ? 8 : 1,
    maximumAdverseExcursion: args.outcomeLabel === 'stopped_before_t1' ? 5 : 1,
    resolvedOneMesPl: args.oneMesPl,
    resolvedR: args.outcomeLabel === 't1_and_t2_hit' ? 2 : -1,
    intrabarAmbiguity: false,
    blockers: [],
  };
}

function outcomeReport(rows: ReturnType<typeof outcomeRow>[]): UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport {
  return {
    reportType: 'unified_positive_held_local_preview_replay_package_outcome',
    generatedAt: '2026-07-19T00:08:30.000Z',
    status: 'pass',
    authority,
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
      packageRows: rows.length,
      resolvedRows: rows.length,
      unresolvedRows: 0,
      blockedRows: 0,
      noFillRows: 0,
      stoppedBeforeT1Rows: rows.filter((row) => row.outcomeLabel === 'stopped_before_t1').length,
      t1OnlyRows: 0,
      t1AndT2Rows: rows.filter((row) => row.outcomeLabel === 't1_and_t2_hit').length,
      noTargetOrStopRows: 0,
      grossResolvedOneMesPl: rows.reduce((total, row) => total + (row.resolvedOneMesPl || 0), 0),
      modelGroups: [],
      daySessionModelGroups: [],
      livePromotionAllowedRows: 0,
    },
    rows,
    blockers: [],
    recommendations: [],
    markdown: '',
  };
}

const cleanEvidence = [
  'Liquidity sweep confirmed.',
  'Reclaim after sweep confirmed.',
  'Tier A displacement confirmed.',
  'Session narrative: reversal.',
  'Full 30-day HTF context gate satisfied.',
];
const lossBearingEvidence = [
  'Liquidity sweep confirmed.',
  'Reclaim after sweep confirmed.',
  'Tier B displacement confirmed.',
  'Session narrative: chop.',
];

const trainEvents = [
  ...Array.from({ length: 5 }, (_, index) => event(index, { session: 'lunch', direction: 'SHORT', evidence: cleanEvidence, outcomeTag: 'clean' })),
  ...Array.from({ length: 5 }, (_, offset) => event(offset + 10, { session: 'lunch', direction: 'SHORT', evidence: lossBearingEvidence, outcomeTag: 'lossBearing' })),
  ...Array.from({ length: 2 }, (_, offset) => event(offset + 20, { session: 'lunch', direction: 'SHORT', evidence: lossBearingEvidence, outcomeTag: 'lossBearing' })),
];
const trainOutcome = outcomeReport([
  ...Array.from({ length: 5 }, (_, index) => outcomeRow(index, { session: 'lunch', direction: 'SHORT', outcomeLabel: 't1_and_t2_hit', oneMesPl: 80 })),
  ...Array.from({ length: 5 }, (_, offset) => outcomeRow(offset + 10, { session: 'lunch', direction: 'SHORT', outcomeLabel: 't1_and_t2_hit', oneMesPl: 80 })),
  ...Array.from({ length: 2 }, (_, offset) => outcomeRow(offset + 20, { session: 'lunch', direction: 'SHORT', outcomeLabel: 'stopped_before_t1', oneMesPl: -60 })),
]);

const testEvents = [
  ...Array.from({ length: 5 }, (_, index) => event(index, { session: 'lunch', direction: 'SHORT', evidence: cleanEvidence, outcomeTag: 'clean' })),
  ...Array.from({ length: 5 }, (_, offset) => event(offset + 10, { session: 'lunch', direction: 'SHORT', evidence: lossBearingEvidence, outcomeTag: 'lossBearing' })),
];
const testOutcome = outcomeReport([
  ...Array.from({ length: 5 }, (_, index) => outcomeRow(index, { session: 'lunch', direction: 'SHORT', outcomeLabel: 't1_and_t2_hit', oneMesPl: 80 })),
  ...Array.from({ length: 5 }, (_, offset) => outcomeRow(offset + 10, { session: 'lunch', direction: 'SHORT', outcomeLabel: 't1_and_t2_hit', oneMesPl: 80 })),
]);

const report = buildRawOhlcScannerArtifactSweepSnapshotFieldMinerReport({
  reportDir: 'reports',
  trainArtifactPaths: ['train-artifact.json'],
  trainArtifacts: [artifact(trainEvents)],
  trainOutcomeReportPaths: ['train-outcome.json'],
  trainOutcomeReports: [trainOutcome],
  testArtifactPaths: ['test-artifact.json'],
  testArtifacts: [artifact(testEvents)],
  testOutcomeReportPaths: ['test-outcome.json'],
  testOutcomeReports: [testOutcome],
  minRowsPerPeriod: 5,
}, '2026-07-19T00:09:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_snapshot_field_miner');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.trainSnapshotRows, 12);
assert.equal(report.summary.testSnapshotRows, 10);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.zeroLossTransferSegments.some((segment) => segment.kind === 'evidence_tag' && segment.key === 'has_tier_a_displacement'), true);
assert.equal(report.zeroLossTransferSegments.some((segment) => segment.kind === 'session_direction_evidence_target' && segment.key === 'lunch|SHORT|has_tier_a_displacement|clear_to_t2'), true);
assert.equal(report.latestPositiveTrainLossBearingSegments.some((segment) => segment.kind === 'evidence_tag' && segment.key === 'has_tier_b_displacement'), true);
assert.equal(report.latestPositiveTrainLossBearingSegments.some((segment) => segment.kind === 'session_direction_candle_target' && segment.key === 'lunch|SHORT|bearish_close|close_lower_quartile|obstacle_before_t1'), true);
assert.match(report.markdown, /Sweep Snapshot Field Miner/);

const parsed = parseRawOhlcScannerArtifactSweepSnapshotFieldMinerArgs([
  '--train-artifacts',
  'a.json,b.json',
  '--train-outcome-reports',
  'c.json,d.json',
  '--test-artifacts',
  'e.json',
  '--test-outcome-reports',
  'f.json',
  '--min-rows-per-period',
  '7',
  '--json',
]);
assert.deepEqual(parsed.trainArtifacts, ['a.json', 'b.json']);
assert.deepEqual(parsed.trainOutcomeReports, ['c.json', 'd.json']);
assert.deepEqual(parsed.testArtifacts, ['e.json']);
assert.deepEqual(parsed.testOutcomeReports, ['f.json']);
assert.equal(parsed.minRowsPerPeriod, 7);
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep snapshot field miner verified.');
