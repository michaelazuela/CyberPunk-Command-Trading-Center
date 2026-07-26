import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDriveLowRiskNoPromotionGuardReport,
  parseRawOhlcScannerArtifactOpeningDriveLowRiskNoPromotionGuardArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-low-risk-no-promotion-guard';

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

const separatorMiner = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_low_risk_loss_separator_miner',
  generatedAt: '2026-07-20T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { lossDrilldownPath: 'loss.json' },
  assumptions: {
    savedLossDrilldownOnly: true,
    lowRiskRowsOnly: true,
    testsPreEntryFieldsOnlyForLiveUsableScenarios: true,
    dateAndOutcomeTagsAreResearchContextOnly: true,
    scannerVisibleInstallAllowedNow: false,
    livePromotionAllowed: false,
  },
  summary: {
    lowRiskRows: 31,
    startingWinners: 29,
    startingLosses: 2,
    zeroWinnerCostLiveUsableScenarios: 0,
    bestLiveUsableScenario: null,
    livePromotionAllowedRows: 0,
    recommendation: 'do_not_filter_low_risk_with_available_fields',
  },
  scenarios: [],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const combinedProposal = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_combined_clean_pocket_live_proposal',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { approvalContractPath: 'approval.json' },
  proposedBehavior: {
    model: 'NoInstalledSetup',
    overlayName: 'openingdrive_combined_clean_pocket_preference',
    scannerVisibleInstallAllowedNow: false,
    requiredFutureApproval: true,
    rankingIntent: 'prefer approved combined clean pocket',
    selectors: ['fine_risk_24_to_32', 'tight_long_risk_4_to_8 rows matching live-usable zero-loss bucket criteria'],
    disallowedInputs: ['tradeDate/date buckets', 'outcome labels or one-MES P/L'],
    unchangedBoundaries: ['canExecute unchanged'],
  },
  implementationPlan: {
    likelyFiles: [],
    testFiles: [],
    rollbackPlan: '',
    verificationCommands: [],
  },
  readiness: {
    failedGateCount: 0,
    decision: 'ready_for_explicit_implementation_approval',
    gates: [],
  },
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const report = buildRawOhlcScannerArtifactOpeningDriveLowRiskNoPromotionGuardReport({
  separatorMinerPath: 'separator.json',
  separatorMiner,
  combinedLiveProposalPath: 'proposal.json',
  combinedLiveProposal: combinedProposal,
}, '2026-07-20T00:01:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_low_risk_no_promotion_guard');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.scannerVisibleInstallAllowedNow, false);
assert.equal(report.decision.lowRiskBroadPromotion, 'blocked');
assert.equal(report.decision.lowRiskExclusion, 'blocked');
assert.equal(report.decision.lowRiskAllowedUse, 'research_context_only');
assert.equal(report.summary.failedGateCount, 0);
assert.equal(report.summary.combinedProposalIncludesLowRisk, false);
assert.equal(report.summary.recommendation, 'preserve_no_promotion_guard');
assert.match(report.markdown, /OpeningDrive Low-Risk No-Promotion Guard/);

const unsafeProposal = buildRawOhlcScannerArtifactOpeningDriveLowRiskNoPromotionGuardReport({
  separatorMinerPath: 'separator.json',
  separatorMiner,
  combinedLiveProposalPath: 'proposal.json',
  combinedLiveProposal: {
    ...combinedProposal,
    proposedBehavior: {
      ...combinedProposal.proposedBehavior,
      selectors: ['low_risk_lt_4', 'fine_risk_24_to_32'],
    },
  },
}, '2026-07-20T00:02:00.000Z');

assert.equal(unsafeProposal.status, 'fail');
assert(unsafeProposal.blockers.some((blocker) => blocker.includes('combined_proposal_excludes_low_risk')));

const unsafeMiner = buildRawOhlcScannerArtifactOpeningDriveLowRiskNoPromotionGuardReport({
  separatorMinerPath: 'separator.json',
  separatorMiner: {
    ...separatorMiner,
    summary: {
      ...separatorMiner.summary,
      zeroWinnerCostLiveUsableScenarios: 1,
      recommendation: 'queue_validation_for_zero_winner_cost_separator',
    },
  },
}, '2026-07-20T00:03:00.000Z');

assert.equal(unsafeMiner.status, 'fail');
assert(unsafeMiner.blockers.some((blocker) => blocker.includes('separator_miner_rejects_low_risk_filter')));

const parsed = parseRawOhlcScannerArtifactOpeningDriveLowRiskNoPromotionGuardArgs([
  '--separator-miner',
  'separator.json',
  '--combined-live-proposal',
  'proposal.json',
  '--out-dir',
  'reports',
  '--json',
]);
assert.equal(parsed.separatorMiner, 'separator.json');
assert.equal(parsed.combinedLiveProposal, 'proposal.json');
assert.equal(parsed.outDir, 'reports');
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive low-risk no-promotion guard verified.');
