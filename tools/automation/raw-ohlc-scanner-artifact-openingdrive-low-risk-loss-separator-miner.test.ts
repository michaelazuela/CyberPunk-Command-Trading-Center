import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDriveLowRiskLossSeparatorMinerReport,
  parseRawOhlcScannerArtifactOpeningDriveLowRiskLossSeparatorMinerArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-low-risk-loss-separator-miner';

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

function drilldownRow(args: {
  ticketId: string;
  outcomeLabel: 't1_and_t2_hit' | 'stopped_before_t1';
  resolvedOneMesPl: number;
  direction?: string;
  proofTime?: string;
  hourBucket?: string;
  riskBucket?: string;
  separatorTags?: string[];
}) {
  return {
    ticketId: args.ticketId,
    tradeDate: '2026-07-20',
    session: 'morning',
    direction: args.direction || 'LONG',
    outcomeLabel: args.outcomeLabel,
    outcomeStatus: 'resolved',
    resolvedOneMesPl: args.resolvedOneMesPl,
    proofTime: args.proofTime || '2026-07-20T10:35:00.000Z',
    entryHitTime: null,
    firstReplayBarTime: null,
    stopHitTime: args.outcomeLabel === 'stopped_before_t1' ? '2026-07-20T10:40:00.000Z' : null,
    t1HitTime: args.outcomeLabel === 't1_and_t2_hit' ? '2026-07-20T10:40:00.000Z' : null,
    t2HitTime: args.outcomeLabel === 't1_and_t2_hit' ? '2026-07-20T10:45:00.000Z' : null,
    riskPoints: args.riskBucket === 'risk_3_to_4' ? 3.5 : 2.5,
    mfeR: null,
    maeR: null,
    timeBucket: args.hourBucket || '10:00-10:59',
    hourBucket: args.hourBucket || '10:00-10:59',
    riskBucket: args.riskBucket || 'risk_2_to_3',
    separatorTags: args.separatorTags || [args.outcomeLabel],
    sourceReportPath: 'samebar.json',
  };
}

const lossDrilldown = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_low_risk_loss_drilldown',
  generatedAt: '2026-07-20T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'reports', setupType: 'NoInstalledSetup', samebarReportPaths: [] },
  assumptions: {
    savedReportsOnly: true,
    lowRiskRowsOnly: true,
    dedupesByTicketId: true,
    outcomeFieldsAreEvaluationOnly: true,
    scannerVisibleInstallAllowedNow: false,
    livePromotionAllowed: false,
  },
  summary: {
    sourceReports: 1,
    lowRiskRows: 3,
    winners: 2,
    losses: 1,
    oneMesPl: 22.5,
    lossRowsHaveSharedSeparatorTags: true,
    livePromotionAllowedRows: 0,
    recommendation: 'mine_loss_separator',
  },
  lossRows: [
    drilldownRow({ ticketId: 'loss', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -12.5, proofTime: '2026-07-20T10:35:00.000Z' }),
  ],
  winnerRows: [
    drilldownRow({ ticketId: 'winner-other-risk', outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 35, proofTime: '2026-07-20T10:40:00.000Z', riskBucket: 'risk_3_to_4' }),
    drilldownRow({ ticketId: 'winner-other-hour', outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 20, proofTime: '2026-07-20T09:35:00.000Z', hourBucket: '09:00-09:59' }),
  ],
  bucketSummaries: [],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const report = buildRawOhlcScannerArtifactOpeningDriveLowRiskLossSeparatorMinerReport({
  lossDrilldownPath: 'drilldown.json',
  lossDrilldown,
}, '2026-07-20T00:01:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_low_risk_loss_separator_miner');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.scannerVisibleInstallAllowedNow, false);
assert.equal(report.summary.lowRiskRows, 3);
assert.equal(report.summary.startingWinners, 2);
assert.equal(report.summary.startingLosses, 1);
assert.equal(report.summary.zeroWinnerCostLiveUsableScenarios > 0, true);
assert.equal(report.summary.recommendation, 'queue_validation_for_zero_winner_cost_separator');
assert(report.scenarios.some((scenario) =>
  scenario.featureSet === 'hourBucket|riskBucket' &&
  scenario.key === '10:00-10:59|risk_2_to_3' &&
  scenario.liveUsable &&
  scenario.winnersRejected === 0 &&
  scenario.lossesRejected === 1,
));
assert(report.scenarios.some((scenario) => scenario.featureSet === 'tradeDate' && !scenario.liveUsable && scenario.conclusion === 'research_context_only'));
assert.match(report.markdown, /OpeningDrive Low-Risk Loss Separator Miner/);

const blocked = buildRawOhlcScannerArtifactOpeningDriveLowRiskLossSeparatorMinerReport({
  lossDrilldownPath: 'missing.json',
  lossDrilldown: null,
}, '2026-07-20T00:02:00.000Z');

assert.equal(blocked.status, 'fail');
assert(blocked.blockers.some((blocker) => blocker.includes('missing low-risk loss drilldown report')));

const parsed = parseRawOhlcScannerArtifactOpeningDriveLowRiskLossSeparatorMinerArgs([
  '--loss-drilldown',
  'drilldown.json',
  '--out-dir',
  'reports',
  '--json',
]);
assert.equal(parsed.lossDrilldown, 'drilldown.json');
assert.equal(parsed.outDir, 'reports');
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive low-risk loss separator miner verified.');
