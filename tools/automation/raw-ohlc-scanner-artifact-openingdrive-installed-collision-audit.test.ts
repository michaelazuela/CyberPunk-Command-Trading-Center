import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDriveInstalledCollisionAuditReport,
  parseRawOhlcScannerArtifactOpeningDriveInstalledCollisionAuditArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-installed-collision-audit';

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
  outcomeStatus?: 'resolved' | 'unresolved';
  oneMesPl: number | null;
  slateAction: 'retained_by_fine_risk' | 'removed_by_fine_risk';
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
    outcomeStatus: args.outcomeStatus || 'resolved',
    oneMesPl: args.oneMesPl,
    slateAction: args.slateAction,
  };
}

const fine = row({
  ticketId: 'fine-1',
  proofTime: '2026-07-10T09:35:00',
  selector: 'fine_risk_24_to_32',
  riskPoints: 25,
  outcomeLabel: 't1_and_t2_hit',
  oneMesPl: 250,
  slateAction: 'retained_by_fine_risk',
});
const tightClean = row({
  ticketId: 'tight-clean',
  proofTime: '2026-07-10T10:35:00',
  selector: 'tight_long_risk_4_to_8',
  riskPoints: 4.25,
  outcomeLabel: 't1_and_t2_hit',
  oneMesPl: 42.5,
  slateAction: 'removed_by_fine_risk',
});
const tightLoss = row({
  ticketId: 'tight-loss',
  proofTime: '2026-07-10T09:50:00',
  selector: 'tight_long_risk_4_to_8',
  riskPoints: 6.25,
  outcomeLabel: 'stopped_before_t1',
  oneMesPl: -31.25,
  slateAction: 'removed_by_fine_risk',
});
const tightUnresolved = row({
  ticketId: 'tight-unresolved',
  proofTime: '2026-07-10T09:55:00',
  selector: 'tight_long_risk_4_to_8',
  riskPoints: 6.75,
  outcomeLabel: 'stopped_before_t1',
  outcomeStatus: 'unresolved',
  oneMesPl: null,
  slateAction: 'removed_by_fine_risk',
});

const freshReplayPackage = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_fresh_replay_package',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'reports', setupType: 'OpeningDriveFvgContinuation', samebarReportPaths: [] },
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
    firstPriority: 'tight_long_risk_4_to_8',
    secondPriority: 'fine_risk_24_to_32',
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
    selectedSummary: { rows: 4, winners: 2, losses: 1, otherResolved: 0, unresolved: 1, oneMesPl: 261.25, avgRiskPoints: 10 },
    rejectedSummary: { rows: 0, winners: 0, losses: 0, otherResolved: 0, unresolved: 0, oneMesPl: null, avgRiskPoints: null },
    sampleSizeReady: true,
    livePromotionAllowedRows: 0,
    recommendation: 'mine_openingdrive_separator',
  },
  selectorSummaries: [],
  selectedRows: [fine, tightClean, tightLoss, tightUnresolved].map((entry) => ({
    ...entry,
    sourceReportPath: 'samebar.json',
  })),
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const slateDryRun = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_fine_risk_slate_dry_run',
  generatedAt: '2026-07-19T00:01:00.000Z',
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
    baselineSummary: { rows: 4, winners: 2, losses: 1, otherResolved: 0, unresolved: 1, oneMesPl: 261.25, avgRiskPoints: 10 },
  },
  selectorSummaries: [],
  changedRows: [fine, tightClean, tightLoss, tightUnresolved],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const tightLongMiner = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_tight_long_lane_miner',
  generatedAt: '2026-07-19T00:02:00.000Z',
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
    rows: 3,
    winners: 1,
    losses: 1,
    otherResolved: 0,
    unresolved: 1,
    oneMesPl: 11.25,
    zeroLossLiveUsableBuckets: 1,
    zeroLossDateBuckets: 0,
    lossBuckets: 1,
    livePromotionAllowedRows: 0,
    recommendation: 'prepare_research_only_candidate',
  },
  zeroLossBuckets: [{
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
  }],
  lossBuckets: [],
  allBuckets: [],
  rows: [],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const simulation = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_combined_clean_pocket_simulation',
  generatedAt: '2026-07-19T00:03:00.000Z',
  status: 'pass',
  authority,
  source: { slateDryRunPath: 'dry-run.json', freshReplayPackagePath: 'fresh.json', tightLongMinerPath: 'miner.json' },
  assumptions: {
    savedReportsOnly: true,
    simulationOnly: true,
    fineRiskRowsComeFromSlateDryRun: true,
    tightLongRowsComeFromRemovedSlateRows: true,
    onlyLiveUsableNoLookaheadBuckets: true,
    dateBucketsAreResearchContextOnly: true,
    outcomeFieldsAreEvaluationOnly: true,
    scannerVisibleInstallAllowedNow: false,
    livePromotionAllowed: false,
  },
  baseline: {
    broadSelected: { rows: 4, winners: 2, losses: 1, otherResolved: 0, unresolved: 1, oneMesPl: 261.25, avgRiskPoints: 10 },
    fineRiskOnly: { rows: 1, winners: 1, losses: 0, otherResolved: 0, unresolved: 0, oneMesPl: 250, avgRiskPoints: 25 },
  },
  scenarios: [{
    scenario: 'fine_risk_plus_all_live_zero_loss_tight_buckets',
    rows: 2,
    winners: 2,
    losses: 0,
    otherResolved: 0,
    unresolved: 0,
    oneMesPl: 292.5,
    avgRiskPoints: 14.63,
    addedTightLongRows: 1,
    addedTightLongWinners: 1,
    addedTightLongLosses: 0,
    deltaVsFineRiskOnlyOneMesPl: 42.5,
    deltaVsBroadBaselineOneMesPl: 31.25,
    lossFree: true,
    livePromotionAllowedRows: 0,
  }],
  selectedRows: [],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const report = buildRawOhlcScannerArtifactOpeningDriveInstalledCollisionAuditReport({
  freshReplayPackagePath: 'fresh.json',
  freshReplayPackage,
  slateDryRunPath: 'dry-run.json',
  slateDryRun,
  tightLongMinerPath: 'miner.json',
  tightLongMiner,
  simulationPath: 'simulation.json',
  simulation,
}, '2026-07-19T00:04:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_installed_collision_audit');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.summary.baselineRows, 4);
assert.equal(report.summary.installedRows, 2);
assert.equal(report.summary.retainedRows, 1);
assert.equal(report.summary.addedBackRows, 1);
assert.equal(report.summary.removedRows, 2);
assert.equal(report.summary.removedLosses, 1);
assert.equal(report.summary.removedUnresolved, 1);
assert.equal(report.summary.installedLosses, 0);
assert.equal(report.summary.deltaVsBaselineOneMesPl, 31.25);
assert.equal(report.summary.collisionRisk, 'low_saved_set_risk');
assert.equal(report.summary.recommendation, 'continue_to_research_collision_oos');
assert.match(report.markdown, /OpeningDrive Installed Collision Audit/);

const blocked = buildRawOhlcScannerArtifactOpeningDriveInstalledCollisionAuditReport({
  freshReplayPackagePath: 'fresh.json',
  freshReplayPackage,
  slateDryRunPath: 'dry-run.json',
  slateDryRun,
  tightLongMinerPath: 'miner.json',
  tightLongMiner,
  simulationPath: 'simulation.json',
  simulation: { ...simulation, status: 'fail' },
}, '2026-07-19T00:05:00.000Z');

assert.equal(blocked.status, 'fail');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('combined clean-pocket simulation status fail')));

const parsed = parseRawOhlcScannerArtifactOpeningDriveInstalledCollisionAuditArgs([
  '--fresh-replay-package',
  'fresh.json',
  '--slate-dry-run',
  'dry-run.json',
  '--tight-long-miner',
  'miner.json',
  '--simulation',
  'simulation.json',
  '--out-dir',
  'reports',
  '--json',
]);
assert.equal(parsed.freshReplayPackage, 'fresh.json');
assert.equal(parsed.slateDryRun, 'dry-run.json');
assert.equal(parsed.tightLongMiner, 'miner.json');
assert.equal(parsed.simulation, 'simulation.json');
assert.equal(parsed.outDir, 'reports');
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive installed collision audit verified.');
