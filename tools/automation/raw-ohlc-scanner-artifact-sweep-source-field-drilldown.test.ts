import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepSourceFieldDrilldownReport,
  parseRawOhlcScannerArtifactSweepSourceFieldDrilldownArgs,
} from './raw-ohlc-scanner-artifact-sweep-source-field-drilldown';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageReport } from './unified-positive-held-local-preview-replay-package';
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

function packageRow(args: {
  id: string;
  proofState: string;
  session: 'morning' | 'lunch';
  direction: 'LONG' | 'SHORT';
  riskPoints: number;
}) {
  return {
    ticketId: args.id,
    tradeDate: '2026-07-16',
    session: args.session,
    instrument: 'MES',
    setupType: 'NoInstalledSetup',
    direction: args.direction,
    proofTime: '2026-07-16T14:15:00',
    firstSeenTime: '2026-07-16T14:15:00',
    lastSeenTime: '2026-07-16T14:15:00',
    occurrences: 1,
    entry: args.direction === 'LONG' ? 100 : 100,
    stop: args.direction === 'LONG' ? 96 : 104,
    t1: args.direction === 'LONG' ? 106 : 94,
    t2: args.direction === 'LONG' ? 108 : 92,
    riskPoints: args.riskPoints,
    t1R: 1.5,
    t2R: 2,
    proofState: args.proofState,
    triageScore: 0,
    sourceTapePath: 'artifact.json',
    barsSource: 'scanner_decision_tape_completed_5m' as const,
    barsLoaded: 20,
    barsAfterProof: 8,
    firstBarTime: '2026-07-16T09:15:00',
    lastBarTime: '2026-07-16T15:55:00',
    outcomeInputStatus: 'ready_for_read_only_outcome_replay' as const,
    blockers: [],
  };
}

function outcomeRow(args: {
  id: string;
  outcomeLabel: 't1_and_t2_hit' | 'stopped_before_t1';
  oneMesPl: number;
}) {
  return {
    ticketId: args.id,
    tradeDate: '2026-07-16',
    session: 'lunch',
    setupType: 'NoInstalledSetup',
    direction: 'SHORT' as const,
    proofTime: '2026-07-16T14:15:00',
    outcomeStatus: 'resolved' as const,
    outcomeLabel: args.outcomeLabel,
    entry: 100,
    stop: 104,
    t1: 94,
    t2: 92,
    riskPoints: 4,
    barsSource: 'scanner_decision_tape_completed_5m' as const,
    barsLoaded: 20,
    barsAfterProof: 8,
    entryHitTime: '2026-07-16T14:15:00',
    firstReplayBarTime: '2026-07-16T14:20:00',
    stopHitTime: args.outcomeLabel === 'stopped_before_t1' ? '2026-07-16T14:20:00' : null,
    t1HitTime: args.outcomeLabel === 't1_and_t2_hit' ? '2026-07-16T14:20:00' : null,
    t2HitTime: args.outcomeLabel === 't1_and_t2_hit' ? '2026-07-16T14:25:00' : null,
    maximumFavorableExcursion: args.outcomeLabel === 't1_and_t2_hit' ? 8 : 1,
    maximumAdverseExcursion: args.outcomeLabel === 'stopped_before_t1' ? 5 : 1,
    resolvedOneMesPl: args.oneMesPl,
    resolvedR: args.outcomeLabel === 't1_and_t2_hit' ? 2 : -1,
    intrabarAmbiguity: false,
    blockers: [],
  };
}

function replayPackage(rows: ReturnType<typeof packageRow>[]): UnifiedPositiveHeldLocalPreviewReplayPackageReport {
  return {
    reportType: 'unified_positive_held_local_preview_replay_package',
    generatedAt: '2026-07-19T00:08:00.000Z',
    status: 'pass',
    authority,
    source: { reportDir: 'reports', triageReportPath: 'artifact.json', auditDir: 'reports' },
    assumptions: {
      selectedRowsComeFromReadOnlyTriage: true,
      usesScannerDecisionTapeCompleted5mOnly: true,
      missingBarsAreNotInvented: true,
      outcomeIsNotCalculatedInThisStep: true,
      livePromotionAllowed: false,
    },
    summary: {
      selectedRowsRead: rows.length,
      replayPackageRows: rows.length,
      readyRows: rows.length,
      blockedRows: 0,
      directionallyInvalidGeometryRows: 0,
      modelGroups: 1,
      sessionGroups: 1,
      livePromotionAllowedRows: 0,
    },
    rows,
    blockers: [],
    recommendations: [],
    markdown: '',
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

const cleanProof = 'Conditional:Conditional:CleanRetest';
const lossBearingProof = 'Conditional:Conditional:ChasingExtendedMove';

const trainPackage = replayPackage([
  ...Array.from({ length: 5 }, (_, index) => packageRow({ id: `clean-train-${index}`, proofState: cleanProof, session: 'lunch', direction: 'SHORT', riskPoints: 8 })),
  ...Array.from({ length: 5 }, (_, index) => packageRow({ id: `loss-train-win-${index}`, proofState: lossBearingProof, session: 'lunch', direction: 'SHORT', riskPoints: 12 })),
  ...Array.from({ length: 2 }, (_, index) => packageRow({ id: `loss-train-loss-${index}`, proofState: lossBearingProof, session: 'lunch', direction: 'SHORT', riskPoints: 12 })),
]);

const trainOutcome = outcomeReport([
  ...Array.from({ length: 5 }, (_, index) => outcomeRow({ id: `clean-train-${index}`, outcomeLabel: 't1_and_t2_hit', oneMesPl: 80 })),
  ...Array.from({ length: 5 }, (_, index) => outcomeRow({ id: `loss-train-win-${index}`, outcomeLabel: 't1_and_t2_hit', oneMesPl: 80 })),
  ...Array.from({ length: 2 }, (_, index) => outcomeRow({ id: `loss-train-loss-${index}`, outcomeLabel: 'stopped_before_t1', oneMesPl: -60 })),
]);

const testPackage = replayPackage([
  ...Array.from({ length: 5 }, (_, index) => packageRow({ id: `clean-test-${index}`, proofState: cleanProof, session: 'lunch', direction: 'SHORT', riskPoints: 8 })),
  ...Array.from({ length: 5 }, (_, index) => packageRow({ id: `loss-test-win-${index}`, proofState: lossBearingProof, session: 'lunch', direction: 'SHORT', riskPoints: 12 })),
]);

const testOutcome = outcomeReport([
  ...Array.from({ length: 5 }, (_, index) => outcomeRow({ id: `clean-test-${index}`, outcomeLabel: 't1_and_t2_hit', oneMesPl: 80 })),
  ...Array.from({ length: 5 }, (_, index) => outcomeRow({ id: `loss-test-win-${index}`, outcomeLabel: 't1_and_t2_hit', oneMesPl: 80 })),
]);

const report = buildRawOhlcScannerArtifactSweepSourceFieldDrilldownReport({
  reportDir: 'reports',
  trainReplayPackagePaths: ['train-package.json'],
  trainReplayPackages: [trainPackage],
  trainOutcomeReportPaths: ['train-outcome.json'],
  trainOutcomeReports: [trainOutcome],
  testReplayPackagePaths: ['test-package.json'],
  testReplayPackages: [testPackage],
  testOutcomeReportPaths: ['test-outcome.json'],
  testOutcomeReports: [testOutcome],
  minRowsPerPeriod: 5,
}, '2026-07-19T00:09:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_source_field_drilldown');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.trainSameBarSweepRows, 12);
assert.equal(report.summary.testSameBarSweepRows, 10);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.zeroLossTransferSegments.some((segment) => segment.kind === 'proof_state' && segment.key === cleanProof), true);
assert.equal(report.latestPositiveTrainLossBearingSegments.some((segment) => segment.kind === 'proof_state' && segment.key === lossBearingProof), true);
assert.match(report.markdown, /Sweep Source-Field Drilldown/);

const parsed = parseRawOhlcScannerArtifactSweepSourceFieldDrilldownArgs([
  '--train-replay-packages',
  'a.json,b.json',
  '--train-outcome-reports',
  'c.json,d.json',
  '--test-replay-packages',
  'e.json',
  '--test-outcome-reports',
  'f.json',
  '--min-rows-per-period',
  '7',
  '--json',
]);
assert.deepEqual(parsed.trainReplayPackages, ['a.json', 'b.json']);
assert.deepEqual(parsed.trainOutcomeReports, ['c.json', 'd.json']);
assert.deepEqual(parsed.testReplayPackages, ['e.json']);
assert.deepEqual(parsed.testOutcomeReports, ['f.json']);
assert.equal(parsed.minRowsPerPeriod, 7);
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep source-field drilldown verified.');
