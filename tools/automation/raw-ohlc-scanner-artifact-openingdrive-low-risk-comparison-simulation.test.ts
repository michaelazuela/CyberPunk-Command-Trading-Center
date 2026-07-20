import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDriveLowRiskComparisonSimulationReport,
  parseRawOhlcScannerArtifactOpeningDriveLowRiskComparisonSimulationArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-low-risk-comparison-simulation';

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

function summary(args: {
  rows: number;
  winners: number;
  losses: number;
  oneMesPl: number;
  avgRiskPoints: number;
}) {
  return {
    rows: args.rows,
    winners: args.winners,
    losses: args.losses,
    otherResolved: 0,
    unresolved: 0,
    oneMesPl: args.oneMesPl,
    avgRiskPoints: args.avgRiskPoints,
  };
}

const lowRiskContract = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_low_risk_approval_contract',
  generatedAt: '2026-07-20T14:00:00.000Z',
  status: 'pass',
  authority,
  source: { lowRiskValidationPath: 'validation.json', freshReplayPackagePath: 'fresh.json' },
  assumptions: {
    savedReportsOnly: true,
    contractOnly: true,
    validatesLowRiskResearchLaneOnly: true,
    implementationAllowedNow: false,
    scannerVisibleInstallAllowedNow: false,
    promotionDisabled: true,
  },
  proposedResearchBoundary: {
    setupType: 'OpeningDriveFvgContinuation',
    selector: 'low_risk_lt_4',
    scannerVisibleNow: false,
    requiresFutureApprovalGate: true,
    proposedLaterBehavior: 'prefer low-risk only after separate approval',
  },
  approvalContract: {
    name: 'openingdrive_low_risk_approval_contract',
    approvalRequiredBeforeImplementation: true,
    implementationAllowedNow: false,
    scannerVisibleInstallAllowedNow: false,
    gates: [],
    requiredRegressionCommands: [],
    implementationInvariants: [],
    rollbackContract: [],
  },
  summary: {
    validationRows: 73,
    lowRiskRows: 15,
    lowRiskWinners: 15,
    lowRiskLosses: 0,
    lowRiskOtherResolved: 0,
    lowRiskUnresolved: 0,
    lowRiskOneMesPl: 350.64,
    validationLowRiskRows: 3,
    validationLowRiskLosses: 0,
    freshPackageLowRiskRows: 1,
    freshPackageLowRiskLosses: 0,
    livePromotionAllowedRows: 0,
    failedGateCount: 0,
    recommendation: 'await_explicit_approval_or_broaden_research',
  },
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const freshReplayPackage = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_fresh_replay_package',
  generatedAt: '2026-07-20T14:01:00.000Z',
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
    firstPriority: 'low_risk_lt_4',
    secondPriority: 'tight_long_risk_4_to_8',
    thirdPriority: 'fine_risk_24_to_32',
    tieBreak: 'lowest_risk_points',
    minReadySelectedRows: 3,
  },
  summary: {
    sourceReports: 3,
    sourceRows: 10,
    dedupedRows: 8,
    proofEvents: 8,
    selectedRows: 4,
    rejectedRows: 4,
    collisionEvents: 1,
    selectedSummary: summary({ rows: 4, winners: 4, losses: 0, oneMesPl: 151.26, avgRiskPoints: 8.5 }),
    rejectedSummary: summary({ rows: 4, winners: 2, losses: 2, oneMesPl: -40, avgRiskPoints: 12 }),
    sampleSizeReady: true,
    livePromotionAllowedRows: 0,
    recommendation: 'prepare_research_only_proposal_update',
  },
  selectorSummaries: [
    { selector: 'low_risk_lt_4', ...summary({ rows: 1, winners: 1, losses: 0, oneMesPl: 36.88, avgRiskPoints: 3.5 }) },
    { selector: 'tight_long_risk_4_to_8', ...summary({ rows: 2, winners: 2, losses: 0, oneMesPl: 74.38, avgRiskPoints: 5.25 }) },
    { selector: 'fine_risk_24_to_32', ...summary({ rows: 1, winners: 1, losses: 0, oneMesPl: 40, avgRiskPoints: 25 }) },
  ],
  selectedRows: [],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const combinedCleanPocketSimulation = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_combined_clean_pocket_simulation',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { slateDryRunPath: 'slate.json', freshReplayPackagePath: 'fresh.json', tightLongMinerPath: 'miner.json' },
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
    broadSelected: summary({ rows: 51, winners: 39, losses: 6, oneMesPl: 6595.16, avgRiskPoints: 14 }),
    fineRiskOnly: summary({ rows: 22, winners: 20, losses: 0, oneMesPl: 5728.8, avgRiskPoints: 27 }),
  },
  scenarios: [
    {
      scenario: 'fine_risk_plus_all_live_zero_loss_tight_buckets',
      ...summary({ rows: 44, winners: 38, losses: 0, oneMesPl: 6726.38, avgRiskPoints: 18.2 }),
      addedTightLongRows: 22,
      addedTightLongWinners: 18,
      addedTightLongLosses: 0,
      deltaVsFineRiskOnlyOneMesPl: 997.58,
      deltaVsBroadBaselineOneMesPl: 131.22,
      lossFree: true,
      livePromotionAllowedRows: 0,
    },
  ],
  selectedRows: [],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const report = buildRawOhlcScannerArtifactOpeningDriveLowRiskComparisonSimulationReport({
  lowRiskContractPath: 'contract.json',
  lowRiskContract,
  freshReplayPackagePath: 'fresh.json',
  freshReplayPackage,
  combinedCleanPocketSimulationPath: 'combined.json',
  combinedCleanPocketSimulation,
}, '2026-07-20T14:02:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_low_risk_comparison_simulation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.scannerVisibleInstallAllowedNow, false);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'broaden_low_risk_research_before_any_proposal');
assert.equal(report.summary.bestLossFreeScenario, 'prior_best_combined_clean_pocket');

const lowRiskOnly = report.scenarios.find((scenario) => scenario.scenario === 'low_risk_only');
assert(lowRiskOnly);
assert.equal(lowRiskOnly.losses, 0);
assert.equal(lowRiskOnly.deltaVsLowRiskOneMesPl, 0);

const tightLong = report.scenarios.find((scenario) => scenario.scenario === 'tight_long_current');
assert(tightLong);
assert.equal(tightLong.losses, 0);
assert.equal(tightLong.deltaVsLowRiskOneMesPl, 37.5);

const priorBest = report.scenarios.find((scenario) => scenario.scenario === 'prior_best_combined_clean_pocket');
assert(priorBest);
assert.equal(priorBest.losses, 0);
assert.equal(priorBest.deltaVsLowRiskOneMesPl, 6689.5);
assert.match(report.markdown, /OpeningDrive Low-Risk Comparison Simulation/);

const blocked = buildRawOhlcScannerArtifactOpeningDriveLowRiskComparisonSimulationReport({
  lowRiskContractPath: 'contract.json',
  lowRiskContract: { ...lowRiskContract, status: 'fail' },
  freshReplayPackagePath: 'fresh.json',
  freshReplayPackage,
}, '2026-07-20T14:03:00.000Z');

assert.equal(blocked.status, 'fail');
assert(blocked.blockers.some((blocker) => blocker.includes('low-risk approval contract status fail')));

const parsed = parseRawOhlcScannerArtifactOpeningDriveLowRiskComparisonSimulationArgs([
  '--low-risk-contract',
  'contract.json',
  '--fresh-replay-package',
  'fresh.json',
  '--combined-clean-pocket-simulation',
  'combined.json',
  '--out-dir',
  'reports',
  '--json',
]);
assert.equal(parsed.lowRiskContract, 'contract.json');
assert.equal(parsed.freshReplayPackage, 'fresh.json');
assert.equal(parsed.combinedCleanPocketSimulation, 'combined.json');
assert.equal(parsed.outDir, 'reports');
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive low-risk comparison simulation verified.');
