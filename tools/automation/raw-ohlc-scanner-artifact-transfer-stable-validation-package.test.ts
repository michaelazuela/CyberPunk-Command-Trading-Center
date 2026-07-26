import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactTransferStableValidationPackageReport,
  parseRawOhlcScannerArtifactTransferStableValidationPackageArgs,
} from './raw-ohlc-scanner-artifact-transfer-stable-validation-package';
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
    selectedSummary: { rows: 3, winners: 1, losses: 0, otherResolved: 1, unresolved: 1, oneMesPl: 120, avgRiskPoints: 6 },
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
      rankScore: 95,
      ticketId: 'other-1',
      tradeDate: '2026-07-15',
      session: 'lunch',
      proofTime: '2026-07-15T12:20:00',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      riskPoints: 6,
      outcomeLabel: 'no_target_or_stop_hit',
      outcomeStatus: 'resolved',
      oneMesPl: 45,
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

const report = buildRawOhlcScannerArtifactTransferStableValidationPackageReport({
  reportDir: 'reports',
  selectorReportPaths: ['selector.json'],
  selectorReports: [selectorReport],
}, '2026-07-19T00:06:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_transfer_stable_validation_package');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.selectedRowsRead, 3);
assert.equal(report.summary.validationPackageRows, 2);
assert.equal(report.summary.heldUnresolvedRows, 1);
assert.equal(report.summary.winners, 1);
assert.equal(report.summary.otherResolved, 1);
assert.equal(report.summary.losses, 0);
assert.equal(report.summary.oneMesPl, 120);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'run_fresh_replay_validation');
assert.equal(report.validationRows.map((row) => row.ticketId).join(','), 'win-1,other-1');
assert.equal(report.heldUnresolvedRows[0].ticketId, 'unresolved-1');
assert.match(report.heldUnresolvedRows[0].researchNote, /Held out/);
assert.match(report.markdown, /Transfer-Stable Validation Package/);

const parsed = parseRawOhlcScannerArtifactTransferStableValidationPackageArgs([
  '--selector-reports',
  'a.json,b.json',
  '--json',
]);
assert.deepEqual(parsed.selectorReports, ['a.json', 'b.json']);
assert.equal(parsed.json, true);

console.log('raw OHLC transfer-stable validation package verified.');
