import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDriveTightLongLaneMinerReport,
  parseRawOhlcScannerArtifactOpeningDriveTightLongLaneMinerArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-tight-long-lane-miner';

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

function changedRow(args: {
  ticketId: string;
  proofTime: string;
  riskPoints: number;
  outcomeLabel: 't1_and_t2_hit' | 'stopped_before_t1';
  oneMesPl: number;
}) {
  return {
    ticketId: args.ticketId,
    tradeDate: args.proofTime.slice(0, 10),
    session: 'morning',
    proofTime: args.proofTime,
    direction: 'LONG',
    selector: 'tight_long_risk_4_to_8',
    riskPoints: args.riskPoints,
    outcomeLabel: args.outcomeLabel,
    outcomeStatus: 'resolved',
    oneMesPl: args.oneMesPl,
    slateAction: 'removed_by_fine_risk',
  };
}

const slateDryRun = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_fine_risk_slate_dry_run',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { freshReplayPackagePath: 'fresh.json', approvalContractPath: 'approval.json' },
  assumptions: {
    savedReportsOnly: true,
    dryRunOnly: true,
    baselineIsFreshReplaySelectedSet: true,
    proposedIsFineRiskOnly: true,
    outcomeFieldsAreEvaluationOnly: true,
    implementationAllowedNow: false,
    scannerVisibleInstallAllowedNow: false,
    livePromotionAllowed: false,
  },
  comparisonPolicy: {
    baseline: 'openingdrive_fresh_replay_selected_rows',
    proposed: 'retain_only_fine_risk_24_to_32',
    noLiveScoringUsed: true,
  },
  summary: {} as any,
  selectorSummaries: [],
  changedRows: [
    changedRow({ ticketId: 'winner-0935', proofTime: '2026-07-10T09:35:00', riskPoints: 5.25, outcomeLabel: 't1_and_t2_hit', oneMesPl: 52.5 }),
    changedRow({ ticketId: 'winner-0940', proofTime: '2026-07-11T09:40:00', riskPoints: 5.5, outcomeLabel: 't1_and_t2_hit', oneMesPl: 55 }),
    changedRow({ ticketId: 'loss-1015', proofTime: '2026-07-12T10:15:00', riskPoints: 6.25, outcomeLabel: 'stopped_before_t1', oneMesPl: -31.25 }),
    changedRow({ ticketId: 'loss-1020', proofTime: '2026-07-12T10:20:00', riskPoints: 6.25, outcomeLabel: 'stopped_before_t1', oneMesPl: -31.25 }),
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const report = buildRawOhlcScannerArtifactOpeningDriveTightLongLaneMinerReport({
  slateDryRunPath: 'dry-run.json',
  slateDryRun,
}, '2026-07-19T00:01:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_tight_long_lane_miner');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.dateBucketsAreResearchContextOnly, true);
assert.equal(report.summary.rows, 4);
assert.equal(report.summary.winners, 2);
assert.equal(report.summary.losses, 2);
assert.equal(report.summary.oneMesPl, 45);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert(report.zeroLossBuckets.some((bucket) => bucket.bucketType === 'hourBucket' && bucket.key === '09:00-09:59' && bucket.liveUsable));
assert(report.lossBuckets.some((bucket) => bucket.bucketType === 'tradeDate' && bucket.key === '2026-07-12' && !bucket.liveUsable));
assert.match(report.markdown, /OpeningDrive Tight-Long Lane Miner/);

const blocked = buildRawOhlcScannerArtifactOpeningDriveTightLongLaneMinerReport({
  slateDryRunPath: 'dry-run.json',
  slateDryRun: { ...slateDryRun, status: 'fail' },
}, '2026-07-19T00:02:00.000Z');

assert.equal(blocked.status, 'fail');
assert.equal(blocked.summary.recommendation, 'fix_inputs');
assert(blocked.blockers.some((blocker) => blocker.includes('slate dry-run status fail')));

const parsed = parseRawOhlcScannerArtifactOpeningDriveTightLongLaneMinerArgs([
  '--slate-dry-run',
  'dry-run.json',
  '--out-dir',
  'reports',
  '--json',
]);
assert.equal(parsed.slateDryRun, 'dry-run.json');
assert.equal(parsed.outDir, 'reports');
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive tight-long lane miner verified.');
