import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDriveOosCollisionReadinessReport,
  parseRawOhlcScannerArtifactOpeningDriveOosCollisionReadinessArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-oos-collision-readiness';

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

const installedCollisionAudit = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_installed_collision_audit',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    freshReplayPackagePath: 'fresh.json',
    slateDryRunPath: 'dry-run.json',
    tightLongMinerPath: 'miner.json',
    simulationPath: 'simulation.json',
  },
  assumptions: {
    savedReportsOnly: true,
    installedOverlayAlreadyExists: true,
    auditOnly: true,
    outcomeFieldsAreEvaluationOnly: true,
    noLiveScoringUsed: true,
    noSetupScannerRun: true,
    livePromotionAllowed: false,
  },
  summary: {
    baselineRows: 51,
    installedRows: 44,
    retainedRows: 22,
    addedBackRows: 22,
    removedRows: 7,
    removedWinners: 1,
    removedLosses: 6,
    removedUnresolved: 0,
    installedLosses: 0,
    installedUnresolved: 3,
    installedOneMesPl: 6726.38,
    baselineOneMesPl: 6595.16,
    deltaVsBaselineOneMesPl: 131.22,
    collisionRisk: 'low_saved_set_risk',
    recommendation: 'continue_to_research_collision_oos',
  },
  baselineSummary: { rows: 51, winners: 39, losses: 6, otherResolved: 3, unresolved: 3, oneMesPl: 6595.16 },
  installedSummary: { rows: 44, winners: 38, losses: 0, otherResolved: 3, unresolved: 3, oneMesPl: 6726.38 },
  addedBackSummary: { rows: 22, winners: 18, losses: 0, otherResolved: 1, unresolved: 3, oneMesPl: 997.58 },
  removedSummary: { rows: 7, winners: 1, losses: 6, otherResolved: 0, unresolved: 0, oneMesPl: -131.22 },
  rows: [],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const transferStableSelectorSimulation = {
  reportType: 'raw_ohlc_scanner_artifact_transfer_stable_selector_simulation',
  generatedAt: '2026-07-19T00:01:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'reports', transferStabilityReport: 'stability.json', samebarReports: [] },
  assumptions: {
    consumesExistingSameBarAndTransferStabilityReportsOnly: true,
    selectsAtMostOneRowPerProofEvent: true,
    usesZeroLossTransferStableBucketsOnly: true,
    outcomeFieldsAreEvaluationOnly: true,
    noLiveRankInstalled: true,
    livePromotionAllowed: false,
  },
  summary: {
    sourceRows: 117,
    proofEvents: 72,
    selectedRows: 0,
    rejectedRows: 117,
    selectedSummary: { rows: 0, winners: 0, losses: 0, otherResolved: 0, unresolved: 0, oneMesPl: null, avgRiskPoints: null },
    rejectedSummary: { rows: 117, winners: 74, losses: 22, otherResolved: 8, unresolved: 13, oneMesPl: 10201.94, avgRiskPoints: 17.92 },
    zeroLossBucketsUsed: 0,
    livePromotionAllowedRows: 0,
    recommendation: 'no_matching_transfer_stable_bucket',
  },
  selectedRows: [],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const transferStabilityMiner = {
  reportType: 'raw_ohlc_scanner_artifact_transfer_stability_miner',
  generatedAt: '2026-07-19T00:02:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'reports', trainSamebarReports: [], testSamebarReports: [], minRowsPerPeriod: 5 },
  assumptions: {
    consumesExistingSameBarReportsOnly: true,
    comparesPreEntryOrModelMetadataBucketsOnly: true,
    outcomeFieldsAreEvaluationOnly: true,
    noLiveRankInstalled: true,
    livePromotionAllowed: false,
  },
  summary: {
    trainRows: 2333,
    testRows: 117,
    sharedBuckets: 217,
    stablePositiveBuckets: 40,
    zeroLossStablePositiveBuckets: 0,
    stableCautionBuckets: 1,
    trainPositiveTestFailedBuckets: 391,
    testPositiveTrainFailedBuckets: 33,
    livePromotionAllowedRows: 0,
    recommendation: 'validate_stable_buckets_on_fresh_replay',
  },
  stablePositiveBuckets: [],
  zeroLossStablePositiveBuckets: [],
  stableCautionBuckets: [],
  unstableBuckets: [],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const report = buildRawOhlcScannerArtifactOpeningDriveOosCollisionReadinessReport({
  installedCollisionAuditPath: 'installed.json',
  installedCollisionAudit,
  transferStableSelectorSimulationPath: 'selector.json',
  transferStableSelectorSimulation,
  transferStabilityMinerPath: 'stability.json',
  transferStabilityMiner,
}, '2026-07-19T00:03:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_oos_collision_readiness');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.summary.installedRows, 44);
assert.equal(report.summary.installedLosses, 0);
assert.equal(report.summary.oosSourceRows, 117);
assert.equal(report.summary.oosSelectedRows, 0);
assert.equal(report.summary.decision, 'saved_set_clean_oos_not_yet_validated');
assert.equal(report.summary.recommendation, 'build_new_oos_replay_collision_package');
assert.match(report.markdown, /OpeningDrive OOS Collision Readiness/);

const ready = buildRawOhlcScannerArtifactOpeningDriveOosCollisionReadinessReport({
  installedCollisionAuditPath: 'installed.json',
  installedCollisionAudit,
  transferStableSelectorSimulationPath: 'selector.json',
  transferStableSelectorSimulation: {
    ...transferStableSelectorSimulation,
    summary: {
      ...transferStableSelectorSimulation.summary,
      selectedRows: 2,
      selectedSummary: { rows: 2, winners: 2, losses: 0, otherResolved: 0, unresolved: 0, oneMesPl: 200, avgRiskPoints: 10 },
    },
  },
  transferStabilityMinerPath: 'stability.json',
  transferStabilityMiner,
}, '2026-07-19T00:04:00.000Z');

assert.equal(ready.summary.decision, 'oos_collision_validation_ready');
assert.equal(ready.summary.recommendation, 'continue_to_live_observation_audit');

const blocked = buildRawOhlcScannerArtifactOpeningDriveOosCollisionReadinessReport({
  installedCollisionAuditPath: 'installed.json',
  installedCollisionAudit: { ...installedCollisionAudit, status: 'fail' },
  transferStableSelectorSimulationPath: 'selector.json',
  transferStableSelectorSimulation,
  transferStabilityMinerPath: 'stability.json',
  transferStabilityMiner,
}, '2026-07-19T00:05:00.000Z');

assert.equal(blocked.status, 'fail');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('installed collision audit status fail')));

const parsed = parseRawOhlcScannerArtifactOpeningDriveOosCollisionReadinessArgs([
  '--installed-collision-audit',
  'installed.json',
  '--transfer-stable-selector-simulation',
  'selector.json',
  '--transfer-stability-miner',
  'stability.json',
  '--out-dir',
  'reports',
  '--json',
]);
assert.equal(parsed.installedCollisionAudit, 'installed.json');
assert.equal(parsed.transferStableSelectorSimulation, 'selector.json');
assert.equal(parsed.transferStabilityMiner, 'stability.json');
assert.equal(parsed.outDir, 'reports');
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive OOS collision readiness verified.');
