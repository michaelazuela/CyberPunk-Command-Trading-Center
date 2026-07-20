import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDriveFineRiskLaneValidationReport,
  parseRawOhlcScannerArtifactOpeningDriveFineRiskLaneValidationArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-fine-risk-lane-validation';
import type {
  RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport,
} from './raw-ohlc-scanner-artifact-openingdrive-fresh-replay-package';

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

function selectedRow(args: {
  ticketId: string;
  tradeDate: string;
  selector: 'low_risk_lt_4' | 'fine_risk_24_to_32' | 'tight_long_risk_4_to_8';
  outcomeLabel: 't1_and_t2_hit' | 'stopped_before_t1' | 'unresolved';
  outcomeStatus?: 'resolved' | 'unresolved';
  oneMesPl: number | null;
}) {
  return {
    ticketId: args.ticketId,
    tradeDate: args.tradeDate,
    session: 'morning',
    proofTime: `${args.tradeDate}T10:25:00`,
    direction: args.selector === 'fine_risk_24_to_32' ? 'SHORT' : 'LONG',
    riskPoints: args.selector === 'fine_risk_24_to_32' ? 26 : args.selector === 'low_risk_lt_4' ? 3 : 5,
    selector: args.selector,
    outcomeLabel: args.outcomeLabel === 'unresolved' ? 'unresolved' as any : args.outcomeLabel,
    outcomeStatus: args.outcomeStatus || 'resolved',
    oneMesPl: args.oneMesPl,
    sourceReportPath: 'reports/source.json',
  };
}

const freshReplayPackage: RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_fresh_replay_package',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    reportDir: 'reports',
    setupType: 'OpeningDriveFvgContinuation',
    samebarReportPaths: ['reports/source.json'],
  },
  assumptions: {
    savedReportsOnly: true,
    openingDriveOnly: true,
    aggregatesSameBarSeparatorReports: true,
    dedupesByTicketId: true,
    oneSelectedRowPerProofEvent: true,
    candidateUsesNoLookaheadFieldsOnly: true,
    outcomeFieldsAreEvaluationOnly: true,
    promotionDisabled: true,
    noLiveRankInstalled: true,
    livePromotionAllowed: false,
  },
  selectorPolicy: {
    proofEventKey: 'tradeDate|session|proofTime',
    firstPriority: 'low_risk_lt_4',
    secondPriority: 'tight_long_risk_4_to_8',
    thirdPriority: 'fine_risk_24_to_32',
    tieBreak: 'lowest_risk_points',
    minReadySelectedRows: 5,
  },
  summary: {
    sourceReports: 1,
    sourceRows: 4,
    dedupedRows: 4,
    proofEvents: 4,
    selectedRows: 4,
    rejectedRows: 0,
    collisionEvents: 0,
    selectedSummary: { rows: 4, winners: 3, losses: 1, otherResolved: 0, unresolved: 0, oneMesPl: 795, avgRiskPoints: 20.75 },
    rejectedSummary: { rows: 0, winners: 0, losses: 0, otherResolved: 0, unresolved: 0, oneMesPl: null, avgRiskPoints: null },
    sampleSizeReady: false,
    livePromotionAllowedRows: 0,
    recommendation: 'mine_openingdrive_separator',
  },
  selectorSummaries: [],
  selectedRows: [
    selectedRow({ ticketId: 'fine-1', tradeDate: '2026-07-10', selector: 'fine_risk_24_to_32', outcomeLabel: 't1_and_t2_hit', oneMesPl: 260 }),
    selectedRow({ ticketId: 'fine-2', tradeDate: '2026-07-11', selector: 'fine_risk_24_to_32', outcomeLabel: 't1_and_t2_hit', oneMesPl: 255 }),
    selectedRow({ ticketId: 'fine-3', tradeDate: '2026-07-11', selector: 'fine_risk_24_to_32', outcomeLabel: 't1_and_t2_hit', oneMesPl: 280 }),
    selectedRow({ ticketId: 'tight-loss', tradeDate: '2026-07-12', selector: 'tight_long_risk_4_to_8', outcomeLabel: 'stopped_before_t1', oneMesPl: -25 }),
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildRawOhlcScannerArtifactOpeningDriveFineRiskLaneValidationReport({
  freshReplayPackagePath: 'fresh.json',
  freshReplayPackage,
  minRows: 3,
}, '2026-07-19T00:01:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_fine_risk_lane_validation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.rows, 3);
assert.equal(report.summary.winners, 3);
assert.equal(report.summary.losses, 0);
assert.equal(report.summary.oneMesPl, 795);
assert.equal(report.summary.validationDecision, 'validated_for_research_proposal_candidate');
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.deepEqual(report.daySummaries.map((item) => item.key), ['2026-07-10', '2026-07-11']);
assert.equal(report.sessionSummaries[0]?.key, 'morning');
assert.equal(report.modelSummaries[0]?.key, 'OpeningDriveFvgContinuation');
assert.equal(report.selectedRows.some((row) => row.ticketId === 'tight-loss'), false);
assert.match(report.markdown, /OpeningDrive Fine-Risk Lane Validation/);

const smallSample = buildRawOhlcScannerArtifactOpeningDriveFineRiskLaneValidationReport({
  freshReplayPackagePath: 'fresh.json',
  freshReplayPackage,
  minRows: 4,
}, '2026-07-19T00:02:00.000Z');

assert.equal(smallSample.summary.validationDecision, 'not_validated');
assert.match(smallSample.blockers[0], /below minimum 4/);

const parsed = parseRawOhlcScannerArtifactOpeningDriveFineRiskLaneValidationArgs([
  '--fresh-replay-package',
  'fresh.json',
  '--out-dir',
  'reports',
  '--min-rows',
  '3',
  '--json',
]);
assert.equal(parsed.freshReplayPackage, 'fresh.json');
assert.equal(parsed.outDir, 'reports');
assert.equal(parsed.minRows, 3);
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive fine-risk lane validation verified.');
