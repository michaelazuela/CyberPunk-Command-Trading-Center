import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDriveCandidateValidationReport,
  parseRawOhlcScannerArtifactOpeningDriveCandidateValidationArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-candidate-validation';
import type { RawOhlcScannerArtifactSameBarSeparatorDrilldownReport } from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';

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

function row(args: {
  ticketId: string;
  tradeDate: string;
  direction: 'LONG' | 'SHORT';
  riskPoints: number;
  outcomeLabel: 't1_and_t2_hit' | 'stopped_before_t1';
  resolvedOneMesPl: number;
}) {
  return {
    ticketId: args.ticketId,
    tradeDate: args.tradeDate,
    session: 'morning',
    setupType: 'OpeningDriveFvgContinuation',
    direction: args.direction,
    outcomeLabel: args.outcomeLabel,
    outcomeStatus: 'resolved' as const,
    resolvedOneMesPl: args.resolvedOneMesPl,
    proofTime: `${args.tradeDate}T10:20:00`,
    entryHitTime: `${args.tradeDate}T10:20:00`,
    firstReplayBarTime: `${args.tradeDate}T10:25:00`,
    stopHitTime: args.outcomeLabel === 'stopped_before_t1' ? `${args.tradeDate}T10:25:00` : null,
    t1HitTime: args.outcomeLabel === 't1_and_t2_hit' ? `${args.tradeDate}T10:25:00` : null,
    t2HitTime: args.outcomeLabel === 't1_and_t2_hit' ? `${args.tradeDate}T10:30:00` : null,
    riskPoints: args.riskPoints,
    mfeR: args.outcomeLabel === 't1_and_t2_hit' ? 2 : 0.2,
    maeR: args.outcomeLabel === 'stopped_before_t1' ? 1 : 0.2,
    timeBucket: '10:00-10:59',
    separatorTags: args.outcomeLabel === 't1_and_t2_hit' ? ['winner_t1_t2'] : ['stopped_before_t1'],
  };
}

const separatorReport: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport = {
  reportType: 'raw_ohlc_scanner_artifact_samebar_separator_drilldown',
  generatedAt: '2026-07-18T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'reports', replayPackageOutcomePath: 'outcome.json' },
  assumptions: {
    usesReadOnlyReplayOutcomeOnly: true,
    analyzesSameBarRowsOnly: true,
    firstReplayBarMeansFirstCompletedBarAfterEntryBar: true,
    livePromotionAllowed: false,
  },
  summary: {
    sameBarRows: 6,
    winners: 4,
    losses: 2,
    unresolved: 0,
    grossOneMesPl: 160,
    modelsWithPositiveSameBar: 1,
    modelsWithSameBarLosses: 1,
    livePromotionAllowedRows: 0,
  },
  modelSummaries: [],
  timeBuckets: [],
  rows: [
    row({ ticketId: 'train-long-win-1', tradeDate: '2026-06-10', direction: 'LONG', riskPoints: 5, outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 40 }),
    row({ ticketId: 'train-short-loss', tradeDate: '2026-06-10', direction: 'SHORT', riskPoints: 18, outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -90 }),
    row({ ticketId: 'train-long-wide-loss', tradeDate: '2026-06-11', direction: 'LONG', riskPoints: 18, outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -90 }),
    row({ ticketId: 'validation-long-win-1', tradeDate: '2026-06-17', direction: 'LONG', riskPoints: 6, outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 45 }),
    row({ ticketId: 'validation-long-win-2', tradeDate: '2026-06-18', direction: 'LONG', riskPoints: 7, outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 50 }),
    { ...row({ ticketId: 'after-lunch-ignored', tradeDate: '2026-06-18', direction: 'LONG', riskPoints: 5, outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 45 }), setupType: 'AfterLunchDriveFvgContinuation' },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildRawOhlcScannerArtifactOpeningDriveCandidateValidationReport({
  reportDir: 'reports',
  samebarSeparatorReportPath: 'separator.json',
  samebarSeparatorReport: separatorReport,
  setupType: 'OpeningDriveFvgContinuation',
  candidateDirection: 'LONG',
  candidateRiskBucket: 'risk_4_to_8',
  validationStart: '2026-06-17',
  minValidationRows: 2,
}, '2026-07-18T00:01:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_candidate_validation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.candidate.featureValue, 'LONG|risk_4_to_8');
assert.deepEqual(report.splitPolicy.validationDates, ['2026-06-17', '2026-06-18']);
assert.equal(report.summary.sourceRows, 5);
assert.equal(report.summary.matchingRows, 3);
assert.equal(report.summary.validationDecision, 'validated_for_more_research');
assert.equal(report.summary.livePromotionAllowedRows, 0);

const validationSummary = report.splitSummaries.find((summary) => summary.split === 'validation');
assert.equal(validationSummary?.matchingRows, 2);
assert.equal(validationSummary?.matchingWinners, 2);
assert.equal(validationSummary?.matchingLosses, 0);
assert.equal(validationSummary?.matchingOtherResolved, 0);
assert.equal(validationSummary?.matchingOneMesPl, 95);
assert.match(report.markdown, /OpeningDrive Candidate Validation/);
assert.match(report.recommendations[0], /held up/);

const failedValidation = buildRawOhlcScannerArtifactOpeningDriveCandidateValidationReport({
  reportDir: 'reports',
  samebarSeparatorReportPath: 'separator.json',
  samebarSeparatorReport: {
    ...separatorReport,
    rows: [
      ...separatorReport.rows,
      row({ ticketId: 'validation-long-loss', tradeDate: '2026-06-18', direction: 'LONG', riskPoints: 5, outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -25 }),
    ],
  },
  setupType: 'OpeningDriveFvgContinuation',
  candidateDirection: 'LONG',
  candidateRiskBucket: 'risk_4_to_8',
  validationStart: '2026-06-17',
  minValidationRows: 2,
}, '2026-07-18T00:02:00.000Z');

assert.equal(failedValidation.summary.validationDecision, 'not_validated');

assert.throws(
  () => parseRawOhlcScannerArtifactOpeningDriveCandidateValidationArgs(['--out-dir', 'missing-dir']),
  /--samebar-separator-report is required/,
);
assert.throws(
  () => parseRawOhlcScannerArtifactOpeningDriveCandidateValidationArgs(['--samebar-separator-report', 'x.json', '--validation-percent', '1']),
  /--validation-percent must be greater than 0 and less than 1/,
);

console.log('raw OHLC OpeningDrive candidate validation verified.');
