import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationRollupReport,
  parseRawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationRollupArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-structural-validation-rollup';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityStructuralContextMinerReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-structural-context-miner';

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

function report(args: {
  tradeDate: string;
  featureLossRows: number;
  featureNonLossRows: number;
}): RawOhlcScannerArtifactOpeningDrivePriorityStructuralContextMinerReport {
  return {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_structural_context_miner',
    generatedAt: '2026-07-19T00:00:00.000Z',
    status: 'pass',
    authority,
    source: { minerReports: ['miner.json'] },
    assumptions: {
      consumesSavedMinerReportsReplayPackagesAndScannerTapesOnly: true,
      usesProofTimeSnapshotOnly: true,
      noFutureOutcomeLabelsUsedForStructuralTags: true,
      noLiveScoringUsed: true,
      noSetupScannerRun: true,
      livePromotionAllowed: false,
    },
    summary: {
      minerReports: 1,
      sourceRows: 3,
      dedupedRows: 3,
      rowsWithStructuralContext: 3,
      priorityLossRows: args.featureLossRows,
      priorityNonLossRows: 3 - args.featureLossRows,
      candidateFeatureRows: args.featureLossRows > 0 && args.featureNonLossRows === 0 ? 1 : 0,
      liveInitialRankFeatureRows: 0,
      livePromotionAllowedRows: 0,
      broadeningAllowedNow: false,
      recommendation: args.featureLossRows > 0 && args.featureNonLossRows === 0 ? 'queue_fresh_structural_validation' : 'do_not_install_structural_filter',
    },
    featureRows: [{
      featureTag: 'best_conditional_NoInstalledSetup',
      rows: args.featureLossRows + args.featureNonLossRows,
      priorityLossRows: args.featureLossRows,
      priorityNonLossRows: args.featureNonLossRows,
      priorityOneMesPl: args.featureLossRows ? -97.5 : null,
      falseRejectPriorityNonLossRows: args.featureNonLossRows,
      liveInitialRankInstallableNow: false,
      conclusion: args.featureLossRows >= 2 && args.featureNonLossRows === 0 ? 'candidate_needs_fresh_validation' : 'reject_initial_rank',
    }],
    rows: [{
      ticketId: `${args.tradeDate}-ticket`,
      tradeDate: args.tradeDate,
      session: 'morning',
      proofTime: `${args.tradeDate}T10:30:00`,
      direction: 'LONG',
      prioritySetupType: 'NoInstalledSetup',
      priorityOneMesPl: args.featureLossRows ? -48.75 : 212.5,
      priorityLoss: args.featureLossRows > 0,
      sourceTapePath: 'tape.json',
      bestConditionalSetupType: 'NoInstalledSetup',
      candidateState: null,
      executionStatus: 'Conditional',
      blockReason: 'EntryTriggerPending',
      targetRoomStatus: 'blocked_before_t1',
      htfLineInSandStatus: 'blocked',
      timeframeMssStatus: 'blocked',
      riskAdvisoryStatus: 'RISK_EXTENDED_STRUCTURAL',
      activeCampaignLayerTags: [],
      structuralTags: ['best_conditional_NoInstalledSetup'],
      blockers: [],
    }],
    blockers: [],
    recommendations: [],
    markdown: '',
  };
}

const rollup = buildRawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationRollupReport({
  structuralContextReports: ['july15.json', 'july17.json'],
  featureTag: 'best_conditional_NoInstalledSetup',
  loadedReports: [
    report({ tradeDate: '2026-07-15', featureLossRows: 2, featureNonLossRows: 0 }),
    report({ tradeDate: '2026-07-17', featureLossRows: 0, featureNonLossRows: 0 }),
  ],
}, '2026-07-19T05:00:00.000Z');

assert.equal(rollup.status, 'pass');
assert.equal(rollup.summary.reports, 2);
assert.equal(rollup.summary.featurePriorityLossRows, 2);
assert.equal(rollup.summary.featurePriorityNonLossRows, 0);
assert.equal(rollup.summary.liveInitialRankFeatureRows, 0);
assert.equal(rollup.summary.livePromotionAllowedRows, 0);
assert.equal(rollup.summary.broadeningAllowedNow, false);
assert.equal(rollup.summary.recommendation, 'needs_more_unseen_negative_observations');
assert.equal(rollup.authority.changesTradingLogic, false);

const parsed = parseRawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationRollupArgs([
  '--structural-context-reports',
  'a.json,b.json',
  '--feature-tag',
  'x',
  '--out-dir',
  'out',
  '--json',
]);
assert.deepEqual(parsed.structuralContextReports.map((item) => item.endsWith('a.json') || item.endsWith('b.json')), [true, true]);
assert.equal(parsed.featureTag, 'x');
assert.equal(parsed.outDir.endsWith('out'), true);
assert.equal(parsed.json, true);

console.log('raw-ohlc-scanner-artifact-openingdrive-priority-structural-validation-rollup.test passed');
