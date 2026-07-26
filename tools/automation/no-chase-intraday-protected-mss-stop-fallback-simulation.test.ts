import assert from 'node:assert/strict';
import {
  buildNoChaseIntradayProtectedMssStopFallbackSimulationReport,
  type NoChaseIntradayProtectedMssStopFallbackSimulationReport,
} from './no-chase-intraday-protected-mss-stop-fallback-simulation';
import type { NoChaseIntradayRemainingBlockerDrilldownReport } from './no-chase-intraday-remaining-blocker-drilldown';
import type { NoChaseMssTimestampAlignmentValidationReport } from './no-chase-mss-timestamp-alignment-validation';

const drilldownReport: NoChaseIntradayRemainingBlockerDrilldownReport = {
  reportType: 'no_chase_intraday_remaining_blocker_drilldown',
  generatedAt: '2026-07-20T00:00:00.000Z',
  status: 'pass',
  authority: {
    readOnly: true,
    localOnly: true,
    researchOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    runsSetupScanner: true,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
  },
  source: {
    replayReportPath: 'replay.json',
    validationReportPath: 'validation.json',
    marketBarsJson: 'bars.json',
  },
  summary: {
    rowsChecked: 1,
    fvgRetestEntryPendingRows: 0,
    retestSwingStopNotConfirmedRows: 1,
    missingEntryProtectedStopOnlyRows: 0,
    otherRows: 0,
    humanReviewRows: 0,
    canExecuteTrueRows: 0,
    recommendation: 'inspect_fvg_and_retest_stop_separately',
  },
  rows: [{
    caseId: '2026-06-18|lunch|NoInstalledSetup|SHORT',
    tradeDate: '2026-06-18',
    sessionType: 'lunch',
    direction: 'SHORT',
    validationEntry: 7558.25,
    validationRecoveredStop: 7565.25,
    validationMssTimestamp: '2026-06-18T09:05:00',
    validationProtectedSwing: null,
    barsScanned: 1,
    candidateSnapshots: 1,
    firstCompleteGeometryTime: null,
    firstHumanReviewTime: null,
    finalSnapshot: null,
    bestSnapshot: null,
    blockerFamily: 'retest_swing_stop_not_confirmed',
    recommendation: 'Research only.',
  }],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const validationReport: NoChaseMssTimestampAlignmentValidationReport = {
  reportType: 'no_chase_mss_timestamp_alignment_validation',
  generatedAt: '2026-07-20T00:00:00.000Z',
  status: 'pass',
  authority: {
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
  },
  source: {
    classifierReportPath: 'classifier.json',
    marketBarsJson: 'bars.json',
    auditDir: 'audit',
  },
  summary: {
    timestampBlockedRows: 0,
    mssTimestampMatchedRows: 0,
    protectedSwingFoundRows: 0,
    validStopRecoveredRows: 0,
    stillMissingEntryRows: 0,
    stillBlockedRows: 0,
    canExecuteChangedRows: 0,
    publishDiscordRows: 0,
    livePromotionAllowedRows: 0,
    recommendedNextFix: 'validate_source_builder_ohlc_alignment_fallback',
  },
  rows: [],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report: NoChaseIntradayProtectedMssStopFallbackSimulationReport = buildNoChaseIntradayProtectedMssStopFallbackSimulationReport({
  drilldownReportPath: 'drilldown.json',
  validationReportPath: 'validation.json',
  marketBarsJson: 'bars.json',
  drilldownReport,
  validationReport,
  bars: {
    '5m': [
      { time: '2026-06-18T12:00:00', open: 7560, high: 7561, low: 7558, close: 7558.25, volume: 1 },
      { time: '2026-06-18T12:05:00', open: 7558.25, high: 7565.5, low: 7557, close: 7565.25, volume: 1 },
    ],
    '15m': [],
    '60m': [],
    '120m': [],
    '240m': [],
  },
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.usesHypotheticalGeometry, true);
assert.equal(report.summary.rowsChecked, 1);
assert.equal(report.summary.maxRiskPassRows, 0);
assert.equal(report.summary.wideRiskRows, 1);
assert.equal(report.summary.recommendation, 'do_not_install_as_live_fallback');
assert.equal(report.rows[0].riskPoints, 7);
assert.equal(report.rows[0].recommendation, 'do_not_install_wide_risk');

console.log('no-chase Intraday protected MSS stop fallback simulation verified.');
