import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketLiveProposalReport,
  parseRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketLiveProposalArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-combined-clean-pocket-live-proposal';

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

const approvalContract = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_combined_clean_pocket_approval_contract',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { simulationPath: 'simulation.json' },
  assumptions: {
    savedSimulationOnly: true,
    approvalContractOnly: true,
    targetScenario: 'fine_risk_plus_all_live_zero_loss_tight_buckets',
    dateBucketsDisallowed: true,
    scannerVisibleInstallAllowedNow: false,
    livePromotionAllowed: false,
  },
  summary: {
    targetRows: 44,
    targetWinners: 38,
    targetLosses: 0,
    targetOtherResolved: 3,
    targetUnresolved: 3,
    targetOneMesPl: 6726.38,
    deltaVsFineRiskOnlyOneMesPl: 997.58,
    deltaVsBroadBaselineOneMesPl: 131.22,
    addedTightLongRows: 22,
    addedTightLongWinners: 18,
    addedTightLongLosses: 0,
    livePromotionAllowedRows: 0,
    failedGateCount: 0,
    decision: 'approved_for_research_proposal_only',
  },
  gates: [],
  proposedScannerVisibleBehavior: {
    model: 'NoInstalledSetup',
    proposedPackage: 'fine_risk_plus_all_live_zero_loss_tight_buckets',
    implementationAllowedNow: false,
    requiredFutureApproval: true,
    description: 'future proposal',
  },
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const report = buildRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketLiveProposalReport({
  approvalContractPath: 'approval.json',
  approvalContract,
}, '2026-07-19T00:01:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_combined_clean_pocket_live_proposal');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.proposedBehavior.scannerVisibleInstallAllowedNow, false);
assert.equal(report.proposedBehavior.requiredFutureApproval, true);
assert.equal(report.readiness.failedGateCount, 0);
assert.equal(report.readiness.decision, 'ready_for_explicit_implementation_approval');
assert(report.proposedBehavior.disallowedInputs.includes('tradeDate/date buckets'));
assert(report.proposedBehavior.unchangedBoundaries.some((boundary) => boundary.includes('5M remains execution authority')));
assert.match(report.markdown, /OpeningDrive Combined Clean-Pocket Live Proposal/);

const blocked = buildRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketLiveProposalReport({
  approvalContractPath: 'approval.json',
  approvalContract: {
    ...approvalContract,
    summary: {
      ...approvalContract.summary,
      targetLosses: 1,
      deltaVsBroadBaselineOneMesPl: -1,
    },
  },
}, '2026-07-19T00:02:00.000Z');

assert.equal(blocked.status, 'fail');
assert.equal(blocked.readiness.decision, 'not_ready');
assert(blocked.blockers.some((blocker) => blocker.includes('target_loss_free')));
assert(blocked.blockers.some((blocker) => blocker.includes('positive_deltas')));

const parsed = parseRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketLiveProposalArgs([
  '--approval-contract',
  'approval.json',
  '--out-dir',
  'reports',
  '--json',
]);
assert.equal(parsed.approvalContract, 'approval.json');
assert.equal(parsed.outDir, 'reports');
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive combined clean-pocket live proposal verified.');
