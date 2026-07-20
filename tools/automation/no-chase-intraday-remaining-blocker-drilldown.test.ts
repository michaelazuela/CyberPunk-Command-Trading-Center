import assert from 'node:assert/strict';
import {
  buildNoChaseIntradayRemainingBlockerDrilldownReport,
  type NoChaseIntradayRemainingBlockerDrilldownReport,
} from './no-chase-intraday-remaining-blocker-drilldown';
import type { NoChaseIntradayFullWindowStopReplayReport } from './no-chase-intraday-full-window-stop-replay';
import type { NoChaseMssTimestampAlignmentValidationReport } from './no-chase-mss-timestamp-alignment-validation';

const replayReport: NoChaseIntradayFullWindowStopReplayReport = {
  reportType: 'no_chase_intraday_full_window_stop_replay',
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
    scannerRunMode: 'targeted_replay_only',
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
    validationReportPath: 'validation.json',
    marketBarsJson: 'bars.json',
  },
  summary: {
    rowsChecked: 1,
    humanReviewRows: 0,
    stillBlockedRows: 1,
    missingEntryRowsStillBlocked: 1,
    canExecuteTrueRows: 0,
    publishDiscordEligibleRows: 0,
    livePromotionAllowedRows: 0,
    oneMesGross: 0,
    recommendation: 'hold_and_inspect',
  },
  rows: [{
    caseId: '2026-06-25|lunch|IntradayMssMicroContinuation|SHORT',
    tradeDate: '2026-06-25',
    sessionType: 'lunch',
    direction: 'SHORT',
    validationEntry: null,
    validationRecoveredStop: 7487.5,
    eventsScanned: 1,
    firstHumanReviewTime: null,
    firstHumanReviewEntry: null,
    firstHumanReviewStop: null,
    firstHumanReviewTarget1: null,
    firstHumanReviewTarget2: null,
    canExecute: false,
    publishDiscordEligible: false,
    replayOutcome: 'BLOCKED',
    replayOutcomeTime: null,
    oneMesGross: 0,
    remainsBlockedReason: 'entry still missing; full-window stop recovery alone must remain blocked',
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

const report: NoChaseIntradayRemainingBlockerDrilldownReport = buildNoChaseIntradayRemainingBlockerDrilldownReport({
  replayReportPath: 'replay.json',
  validationReportPath: 'validation.json',
  marketBarsJson: 'bars.json',
  replayReport,
  validationReport,
  bars: {
    '5m': [],
    '15m': [],
    '60m': [],
    '120m': [],
    '240m': [],
  },
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.rowsChecked, 0);
assert.equal(report.summary.recommendation, 'hold');
assert.deepEqual(report.blockers, []);

console.log('no-chase Intraday remaining blocker drilldown verified.');
