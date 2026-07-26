import assert from 'node:assert/strict';
import {
  buildNoChaseIntradayBlockerDispositionRollupReport,
  type NoChaseIntradayBlockerDispositionRollupReport,
} from './no-chase-intraday-blocker-disposition-rollup';
import type { NoChaseIntradayGeometryBlockerClassifierReport } from './no-chase-intraday-geometry-blocker-classifier';
import type { NoChaseIntradayFullWindowStopReplayReport } from './no-chase-intraday-full-window-stop-replay';
import type { NoChaseIntradayProtectedMssStopFallbackSimulationReport } from './no-chase-intraday-protected-mss-stop-fallback-simulation';
import type { NoChaseIntradayRemainingBlockerDrilldownReport } from './no-chase-intraday-remaining-blocker-drilldown';

const classifierReport: NoChaseIntradayGeometryBlockerClassifierReport = {
  reportType: 'no_chase_intraday_geometry_blocker_classifier',
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
  source: { omissionReportPath: 'omission.json', auditDir: 'audit' },
  summary: {
    rowsClassified: 2,
    pendingFvgRetestEntryRows: 0,
    pendingCloseThroughRetestEntryRows: 0,
    mssTimestampAlignmentStopBlockedRows: 1,
    retestSwingStopNotConfirmedRows: 0,
    invalidStopLocationRows: 1,
    unclassifiedRows: 0,
    entryOnlyRows: 0,
    stopOnlyRows: 0,
    noEntryStopRows: 0,
    canExecuteChangedRows: 0,
    publishDiscordRows: 0,
    livePromotionAllowedRows: 0,
    recommendedNextFix: 'inspect_invalid_stop_location_rows',
  },
  rows: [
    {
      caseId: '2026-06-17|morning|NoInstalledSetup|SHORT',
      tradeDate: '2026-06-17',
      sessionType: 'morning',
      direction: 'SHORT',
      entry: 7590.75,
      stop: null,
      target1: null,
      target2: null,
      candidateState: 'MSS_CONTINUATION_RETEST_PENDING',
      detectedStatus: 'Possible',
      executionStatus: 'Conditional',
      blockReason: 'EntryTriggerPending',
      blockerFamily: 'mss_timestamp_alignment_stop_blocked',
      recommendedNextAction: 'validate_mss_timestamp_alignment_repair',
      canExecute: false,
      publishDiscord: false,
      livePromotionAllowed: false,
    },
    {
      caseId: '2026-07-01|morning|NoInstalledSetup|LONG',
      tradeDate: '2026-07-01',
      sessionType: 'morning',
      direction: 'LONG',
      entry: null,
      stop: 7532,
      target1: null,
      target2: null,
      candidateState: 'MSS_CONTINUATION_RETEST_PENDING',
      detectedStatus: 'Blocked',
      executionStatus: 'Blocked',
      blockReason: 'InvalidStopLocation',
      blockerFamily: 'invalid_stop_location',
      recommendedNextAction: 'inspect_invalid_stop_location_rows',
      canExecute: false,
      publishDiscord: false,
      livePromotionAllowed: false,
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const fullWindowReplayReport = {
  rows: [{
    caseId: '2026-06-17|morning|NoInstalledSetup|SHORT',
    firstHumanReviewTime: '2026-06-17T11:55:00',
    replayOutcome: 'T2_HIT',
    oneMesGross: 235,
  }],
} as NoChaseIntradayFullWindowStopReplayReport;

const remainingDrilldownReport = { rows: [] } as NoChaseIntradayRemainingBlockerDrilldownReport;
const protectedStopFallbackSimulation = { rows: [] } as NoChaseIntradayProtectedMssStopFallbackSimulationReport;

const report: NoChaseIntradayBlockerDispositionRollupReport = buildNoChaseIntradayBlockerDispositionRollupReport({
  classifierReportPath: 'classifier.json',
  fullWindowReplayReportPath: 'replay.json',
  remainingDrilldownReportPath: 'drilldown.json',
  protectedStopFallbackSimulationPath: 'fallback.json',
  classifierReport,
  fullWindowReplayReport,
  remainingDrilldownReport,
  protectedStopFallbackSimulation,
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.rowsChecked, 2);
assert.equal(report.summary.convertedToHumanReviewRows, 1);
assert.equal(report.summary.needsInvalidStopLocationResearchRows, 1);
assert.equal(report.summary.nextRecommendedFamily, 'invalid_stop_location');
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);

console.log('no-chase Intraday blocker disposition rollup verified.');
