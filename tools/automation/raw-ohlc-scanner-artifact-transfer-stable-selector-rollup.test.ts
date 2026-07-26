import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactTransferStableSelectorRollupReport,
  parseRawOhlcScannerArtifactTransferStableSelectorRollupArgs,
} from './raw-ohlc-scanner-artifact-transfer-stable-selector-rollup';
import type { RawOhlcScannerArtifactTransferStableSelectorSimulationReport } from './raw-ohlc-scanner-artifact-transfer-stable-selector-simulation';

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

const selectorReport: RawOhlcScannerArtifactTransferStableSelectorSimulationReport = {
  reportType: 'raw_ohlc_scanner_artifact_transfer_stable_selector_simulation',
  generatedAt: '2026-07-19T00:05:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'reports', transferStabilityReport: 'stability.json', samebarReports: ['samebar.json'] },
  assumptions: {
    consumesExistingSameBarAndTransferStabilityReportsOnly: true,
    selectsAtMostOneRowPerProofEvent: true,
    usesZeroLossTransferStableBucketsOnly: true,
    outcomeFieldsAreEvaluationOnly: true,
    noLiveRankInstalled: true,
    livePromotionAllowed: false,
  },
  summary: {
    sourceRows: 3,
    proofEvents: 3,
    selectedRows: 3,
    rejectedRows: 0,
    selectedSummary: { rows: 3, winners: 2, losses: 0, otherResolved: 0, unresolved: 1, oneMesPl: 150, avgRiskPoints: 6 },
    rejectedSummary: { rows: 0, winners: 0, losses: 0, otherResolved: 0, unresolved: 0, oneMesPl: null, avgRiskPoints: null },
    zeroLossBucketsUsed: 1,
    livePromotionAllowedRows: 0,
    recommendation: 'fresh_replay_validate_selector',
  },
  selectedRows: [
    {
      rankScore: 100,
      ticketId: 'win-1',
      tradeDate: '2026-07-15',
      session: 'lunch',
      proofTime: '2026-07-15T12:15:00',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      riskPoints: 6,
      outcomeLabel: 't1_and_t2_hit',
      outcomeStatus: 'resolved',
      oneMesPl: 75,
      matchedZeroLossBuckets: ['setup_session_risk_time:NoInstalledSetup|lunch|risk_4_to_8|12:00-12:59'],
    },
    {
      rankScore: 100,
      ticketId: 'win-2',
      tradeDate: '2026-07-15',
      session: 'lunch',
      proofTime: '2026-07-15T12:20:00',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      riskPoints: 6,
      outcomeLabel: 't1_and_t2_hit',
      outcomeStatus: 'resolved',
      oneMesPl: 75,
      matchedZeroLossBuckets: ['setup_session_risk_time:NoInstalledSetup|lunch|risk_4_to_8|12:00-12:59'],
    },
    {
      rankScore: 90,
      ticketId: 'unresolved-1',
      tradeDate: '2026-07-16',
      session: 'lunch',
      proofTime: '2026-07-16T12:15:00',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      riskPoints: 6,
      outcomeLabel: 'no_target_or_stop_hit',
      outcomeStatus: 'unresolved',
      oneMesPl: null,
      matchedZeroLossBuckets: ['setup_session_risk_time:NoInstalledSetup|lunch|risk_4_to_8|12:00-12:59'],
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const rollup = buildRawOhlcScannerArtifactTransferStableSelectorRollupReport({
  reportDir: 'reports',
  selectorReportPaths: ['selector.json'],
  selectorReports: [selectorReport],
}, '2026-07-19T00:06:00.000Z');

assert.equal(rollup.reportType, 'raw_ohlc_scanner_artifact_transfer_stable_selector_rollup');
assert.equal(rollup.status, 'pass');
assert.equal(rollup.authority.readOnly, true);
assert.equal(rollup.authority.changesTradingLogic, false);
assert.equal(rollup.authority.changesCanExecute, false);
assert.equal(rollup.summary.selectedRows, 3);
assert.equal(rollup.summary.winners, 2);
assert.equal(rollup.summary.losses, 0);
assert.equal(rollup.summary.unresolved, 1);
assert.equal(rollup.summary.recommendation, 'investigate_unresolved_rows');
assert.equal(rollup.byModel.length, 1);
assert.equal(rollup.unresolvedRows[0].ticketId, 'unresolved-1');
assert.match(rollup.markdown, /Transfer-Stable Selector Rollup/);

const parsed = parseRawOhlcScannerArtifactTransferStableSelectorRollupArgs([
  '--selector-reports',
  'a.json,b.json',
  '--json',
]);
assert.deepEqual(parsed.selectorReports, ['a.json', 'b.json']);
assert.equal(parsed.json, true);

console.log('raw OHLC transfer-stable selector rollup verified.');
