import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketSimulationReport,
  parseRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketSimulationArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-combined-clean-pocket-simulation';

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
  proofTime: string;
  selector: 'fine_risk_24_to_32' | 'tight_long_risk_4_to_8';
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
    selector: args.selector,
    riskPoints: args.riskPoints,
    outcomeLabel: args.outcomeLabel,
    outcomeStatus: 'resolved',
    oneMesPl: args.oneMesPl,
    slateAction: args.selector === 'fine_risk_24_to_32' ? 'retained_by_fine_risk' : 'removed_by_fine_risk',
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
  summary: {
    baselineSummary: {
      rows: 4,
      winners: 3,
      losses: 1,
      otherResolved: 0,
      unresolved: 0,
      oneMesPl: 260,
      avgRiskPoints: 6,
    },
  },
  selectorSummaries: [],
  changedRows: [
    row({ ticketId: 'fine-1', proofTime: '2026-07-10T09:35:00', selector: 'fine_risk_24_to_32', riskPoints: 25, outcomeLabel: 't1_and_t2_hit', oneMesPl: 250 }),
    row({ ticketId: 'tight-clean', proofTime: '2026-07-10T10:35:00', selector: 'tight_long_risk_4_to_8', riskPoints: 4.25, outcomeLabel: 't1_and_t2_hit', oneMesPl: 42.5 }),
    row({ ticketId: 'tight-loss', proofTime: '2026-07-10T09:50:00', selector: 'tight_long_risk_4_to_8', riskPoints: 6.25, outcomeLabel: 'stopped_before_t1', oneMesPl: -31.25 }),
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const tightLongMiner = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_tight_long_lane_miner',
  generatedAt: '2026-07-19T00:01:00.000Z',
  status: 'pass',
  authority,
  source: { slateDryRunPath: 'dry-run.json' },
  assumptions: {
    savedDryRunOnly: true,
    tightLongOnly: true,
    dateBucketsAreResearchContextOnly: true,
    candidateUsesNoLookaheadFieldsOnly: true,
    outcomeFieldsAreEvaluationOnly: true,
    promotionDisabled: true,
    livePromotionAllowed: false,
  },
  summary: {
    rows: 2,
    winners: 1,
    losses: 1,
    otherResolved: 0,
    unresolved: 0,
    oneMesPl: 11.25,
    zeroLossLiveUsableBuckets: 1,
    zeroLossDateBuckets: 0,
    lossBuckets: 1,
    livePromotionAllowedRows: 0,
    recommendation: 'prepare_research_only_candidate',
  },
  zeroLossBuckets: [
    {
      bucketType: 'hourBucket|riskBucket',
      key: '10:00-10:59|risk_4_to_5',
      rows: 1,
      winners: 1,
      losses: 0,
      otherResolved: 0,
      unresolved: 0,
      oneMesPl: 42.5,
      avgRiskPoints: 4.25,
      liveUsable: true,
    },
    {
      bucketType: 'tradeDate',
      key: '2026-07-10',
      rows: 1,
      winners: 1,
      losses: 0,
      otherResolved: 0,
      unresolved: 0,
      oneMesPl: 42.5,
      avgRiskPoints: 4.25,
      liveUsable: false,
    },
  ],
  lossBuckets: [],
  allBuckets: [],
  rows: [],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const report = buildRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketSimulationReport({
  slateDryRunPath: 'dry-run.json',
  slateDryRun,
  tightLongMinerPath: 'miner.json',
  tightLongMiner,
}, '2026-07-19T00:02:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_combined_clean_pocket_simulation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.scannerVisibleInstallAllowedNow, false);
assert.equal(report.assumptions.livePromotionAllowed, false);
assert.equal(report.baseline.fineRiskOnly.rows, 1);
assert.equal(report.baseline.fineRiskOnly.oneMesPl, 250);

const topPocket = report.scenarios.find((scenario) => scenario.scenario === 'fine_risk_plus_tight_10am_risk_4_to_5');
assert(topPocket);
assert.equal(topPocket.rows, 2);
assert.equal(topPocket.losses, 0);
assert.equal(topPocket.addedTightLongRows, 1);
assert.equal(topPocket.addedTightLongWinners, 1);
assert.equal(topPocket.addedTightLongLosses, 0);
assert.equal(topPocket.deltaVsFineRiskOnlyOneMesPl, 42.5);
assert.equal(topPocket.livePromotionAllowedRows, 0);
assert.match(report.markdown, /OpeningDrive Combined Clean-Pocket Simulation/);

const blocked = buildRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketSimulationReport({
  slateDryRunPath: 'dry-run.json',
  slateDryRun: { ...slateDryRun, status: 'fail' },
  tightLongMinerPath: 'miner.json',
  tightLongMiner,
}, '2026-07-19T00:03:00.000Z');

assert.equal(blocked.status, 'fail');
assert(blocked.blockers.some((blocker) => blocker.includes('slate dry-run status fail')));

const parsed = parseRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketSimulationArgs([
  '--slate-dry-run',
  'dry-run.json',
  '--tight-long-miner',
  'miner.json',
  '--out-dir',
  'reports',
  '--json',
]);
assert.equal(parsed.slateDryRun, 'dry-run.json');
assert.equal(parsed.tightLongMiner, 'miner.json');
assert.equal(parsed.outDir, 'reports');
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive combined clean-pocket simulation verified.');
