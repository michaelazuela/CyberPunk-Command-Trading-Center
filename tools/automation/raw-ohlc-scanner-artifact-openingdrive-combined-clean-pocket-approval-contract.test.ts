import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketApprovalContractReport,
  parseRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketApprovalContractArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-combined-clean-pocket-approval-contract';

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

const simulation = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_combined_clean_pocket_simulation',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    slateDryRunPath: 'dry-run.json',
    freshReplayPackagePath: 'fresh.json',
    tightLongMinerPath: 'miner.json',
  },
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
    broadSelected: {
      rows: 51,
      winners: 39,
      losses: 6,
      otherResolved: 3,
      unresolved: 3,
      oneMesPl: 6595.16,
      avgRiskPoints: 14.64,
    },
    fineRiskOnly: {
      rows: 22,
      winners: 20,
      losses: 0,
      otherResolved: 2,
      unresolved: 0,
      oneMesPl: 5728.8,
      avgRiskPoints: 26.62,
    },
  },
  scenarios: [
    {
      scenario: 'fine_risk_plus_all_live_zero_loss_tight_buckets',
      rows: 44,
      winners: 38,
      losses: 0,
      otherResolved: 3,
      unresolved: 3,
      oneMesPl: 6726.38,
      avgRiskPoints: 16,
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

const report = buildRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketApprovalContractReport({
  simulationPath: 'simulation.json',
  simulation,
}, '2026-07-19T00:01:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_combined_clean_pocket_approval_contract');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.scannerVisibleInstallAllowedNow, false);
assert.equal(report.assumptions.livePromotionAllowed, false);
assert.equal(report.summary.failedGateCount, 0);
assert.equal(report.summary.decision, 'approved_for_research_proposal_only');
assert.equal(report.summary.targetRows, 44);
assert.equal(report.summary.targetLosses, 0);
assert.equal(report.summary.deltaVsFineRiskOnlyOneMesPl, 997.58);
assert.equal(report.summary.deltaVsBroadBaselineOneMesPl, 131.22);
assert.equal(report.proposedScannerVisibleBehavior.implementationAllowedNow, false);
assert.match(report.markdown, /OpeningDrive Combined Clean-Pocket Approval Contract/);

const failed = buildRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketApprovalContractReport({
  simulationPath: 'simulation.json',
  simulation: {
    ...simulation,
    scenarios: [
      {
        ...simulation.scenarios[0],
        losses: 1,
        deltaVsBroadBaselineOneMesPl: -10,
      },
    ],
  },
}, '2026-07-19T00:02:00.000Z');

assert.equal(failed.status, 'fail');
assert.equal(failed.summary.decision, 'rejected');
assert(failed.blockers.some((blocker) => blocker.includes('target_zero_losses')));
assert(failed.blockers.some((blocker) => blocker.includes('positive_delta_vs_broad_baseline')));

const parsed = parseRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketApprovalContractArgs([
  '--simulation',
  'simulation.json',
  '--out-dir',
  'reports',
  '--json',
]);
assert.equal(parsed.simulation, 'simulation.json');
assert.equal(parsed.outDir, 'reports');
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive combined clean-pocket approval contract verified.');
