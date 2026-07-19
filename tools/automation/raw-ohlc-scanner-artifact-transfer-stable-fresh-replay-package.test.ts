import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactTransferStableFreshReplayPackageReport,
  parseRawOhlcScannerArtifactTransferStableFreshReplayPackageArgs,
} from './raw-ohlc-scanner-artifact-transfer-stable-fresh-replay-package';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageReport } from './unified-positive-held-local-preview-replay-package';
import type {
  RawOhlcScannerArtifactTransferStableValidationPackageReport,
} from './raw-ohlc-scanner-artifact-transfer-stable-validation-package';

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

const validationPackage: RawOhlcScannerArtifactTransferStableValidationPackageReport = {
  reportType: 'raw_ohlc_scanner_artifact_transfer_stable_validation_package',
  generatedAt: '2026-07-19T00:06:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'reports', selectorReports: ['selector.json'] },
  assumptions: {
    consumesExistingSelectorReportsOnly: true,
    packagesResolvedRowsOnly: true,
    unresolvedRowsAreHeldOut: true,
    outcomeFieldsAreEvaluationOnly: true,
    noFreshMarketDataLoaded: true,
    noLiveRankInstalled: true,
    livePromotionAllowed: false,
  },
  summary: {
    selectorReports: 1,
    selectedRowsRead: 2,
    validationPackageRows: 2,
    heldUnresolvedRows: 0,
    winners: 2,
    otherResolved: 0,
    losses: 0,
    oneMesPl: 150,
    livePromotionAllowedRows: 0,
    recommendation: 'run_fresh_replay_validation',
  },
  byDaySessionModel: [],
  byModel: [],
  validationRows: [
    {
      ticketId: 'ticket-a',
      tradeDate: '2026-07-15',
      session: 'lunch',
      proofTime: '2026-07-15T12:15:00',
      setupType: 'AfterLunchDriveFvgContinuation',
      direction: 'LONG',
      riskPoints: 6,
      outcomeLabel: 't1_and_t2_hit',
      oneMesPl: 75,
      matchedZeroLossBuckets: [],
    },
    {
      ticketId: 'ticket-b',
      tradeDate: '2026-07-15',
      session: 'lunch',
      proofTime: '2026-07-15T12:20:00',
      setupType: 'SweepMssFvgRetrace',
      direction: 'SHORT',
      riskPoints: 5,
      outcomeLabel: 't1_and_t2_hit',
      oneMesPl: 75,
      matchedZeroLossBuckets: [],
    },
  ],
  heldUnresolvedRows: [],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const sourcePackage: UnifiedPositiveHeldLocalPreviewReplayPackageReport = {
  reportType: 'unified_positive_held_local_preview_replay_package',
  generatedAt: '2026-07-19T00:07:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'reports', triageReportPath: 'triage.json', auditDir: 'reports' },
  assumptions: {
    selectedRowsComeFromReadOnlyTriage: true,
    usesScannerDecisionTapeCompleted5mOnly: true,
    missingBarsAreNotInvented: true,
    outcomeIsNotCalculatedInThisStep: true,
    livePromotionAllowed: false,
  },
  summary: {
    selectedRowsRead: 3,
    replayPackageRows: 3,
    readyRows: 3,
    blockedRows: 0,
    directionallyInvalidGeometryRows: 0,
    modelGroups: 2,
    sessionGroups: 1,
    livePromotionAllowedRows: 0,
  },
  rows: [
    {
      ticketId: 'ticket-b',
      tradeDate: '2026-07-15',
      session: 'lunch',
      instrument: 'MES',
      setupType: 'SweepMssFvgRetrace',
      direction: 'SHORT',
      proofTime: '2026-07-15T12:20:00',
      firstSeenTime: '2026-07-15T12:20:00',
      lastSeenTime: '2026-07-15T12:20:00',
      occurrences: 1,
      entry: 100,
      stop: 105,
      t1: 92.5,
      t2: 90,
      riskPoints: 5,
      t1R: 1.5,
      t2R: 2,
      proofState: 'Possible:Conditional:EntryTriggerPending',
      triageScore: 0,
      sourceTapePath: 'source.json',
      barsSource: 'scanner_decision_tape_completed_5m',
      barsLoaded: 10,
      barsAfterProof: 5,
      firstBarTime: '2026-07-15T12:00:00',
      lastBarTime: '2026-07-15T12:45:00',
      outcomeInputStatus: 'ready_for_read_only_outcome_replay',
      blockers: [],
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildRawOhlcScannerArtifactTransferStableFreshReplayPackageReport({
  reportDir: 'reports',
  validationPackagePath: 'validation.json',
  validationPackage,
  sourceReplayPackagePaths: ['source-package.json'],
  sourceReplayPackages: [sourcePackage],
}, '2026-07-19T00:08:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_replay_package');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.selectedRowsRead, 2);
assert.equal(report.summary.replayPackageRows, 1);
assert.equal(report.summary.readyRows, 1);
assert.equal(report.status, 'fail');
assert.ok(report.blockers.includes('ticket-a: missing source replay package row'));
assert.equal(report.rows[0].ticketId, 'ticket-b');
assert.match(report.markdown, /Transfer-Stable Fresh Replay Package/);

const parsed = parseRawOhlcScannerArtifactTransferStableFreshReplayPackageArgs([
  '--validation-package',
  'validation.json',
  '--source-replay-packages',
  'a.json,b.json',
  '--json',
]);
assert.equal(parsed.validationPackage, 'validation.json');
assert.deepEqual(parsed.sourceReplayPackages, ['a.json', 'b.json']);
assert.equal(parsed.json, true);

console.log('raw OHLC transfer-stable fresh replay package verified.');
