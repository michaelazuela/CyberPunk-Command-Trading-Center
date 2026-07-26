import assert from 'node:assert/strict';
import {
  buildNoChaseIntradayFullWindowStopReplayReport,
  type NoChaseIntradayFullWindowStopReplayReport,
} from './no-chase-intraday-full-window-stop-replay';
import type { NoChaseMssTimestampAlignmentValidationReport } from './no-chase-mss-timestamp-alignment-validation';

const validation: NoChaseMssTimestampAlignmentValidationReport = {
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
    timestampBlockedRows: 1,
    mssTimestampMatchedRows: 1,
    protectedSwingFoundRows: 1,
    validStopRecoveredRows: 0,
    stillMissingEntryRows: 1,
    stillBlockedRows: 1,
    canExecuteChangedRows: 0,
    publishDiscordRows: 0,
    livePromotionAllowedRows: 0,
    recommendedNextFix: 'validate_source_builder_ohlc_alignment_fallback',
  },
  rows: [{
    caseId: '2026-06-25|lunch|NoInstalledSetup|SHORT',
    tradeDate: '2026-06-25',
    sessionType: 'lunch',
    direction: 'SHORT',
    entry: null,
    mssEvidenceTimestamp: '2026-06-25T07:15:00',
    mssTimestampMatched: true,
    matchedBarIndex: 3,
    protectedSwing: { type: 'high', price: 7487.25, time: '2026-06-25T07:05:00', index: 1 },
    recoveredStop: 7487.5,
    recoveredStopDirectionallyValid: null,
    stillBlockedReason: 'entry still missing; stop recovery alone cannot form a deterministic plan',
    canExecute: false,
    publishDiscord: false,
    livePromotionAllowed: false,
  }],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report: NoChaseIntradayFullWindowStopReplayReport = buildNoChaseIntradayFullWindowStopReplayReport({
  validationReportPath: 'validation.json',
  marketBarsJson: 'bars.json',
  validationReport: validation,
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
assert.equal(report.authority.runsSetupScanner, true);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.rowsChecked, 1);
assert.equal(report.summary.humanReviewRows, 0);
assert.equal(report.summary.stillBlockedRows, 1);
assert.equal(report.summary.missingEntryRowsStillBlocked, 1);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.oneMesGross, 0);
assert.equal(report.rows[0].replayOutcome, 'BLOCKED');
assert.equal(report.rows[0].oneMesGross, 0);
assert.equal(report.rows[0].remainsBlockedReason, 'entry still missing; full-window stop recovery alone must remain blocked');

console.log('no-chase Intraday full-window stop replay verified.');
