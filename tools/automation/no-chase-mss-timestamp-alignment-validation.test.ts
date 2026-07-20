import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ExecutionStatus, SetupCandidateStatus, SetupType, type SetupCandidate } from '../../src/types';
import {
  buildNoChaseMssTimestampAlignmentValidationReportFromReports,
  parseNoChaseMssTimestampAlignmentValidationArgs,
} from './no-chase-mss-timestamp-alignment-validation';
import type { NoChaseIntradayGeometryBlockerClassifierReport } from './no-chase-intraday-geometry-blocker-classifier';

function candidate(): SetupCandidate {
  return {
    setupType: SetupType.IntradayMssMicroContinuation,
    scenarioLabel: 'Intraday MSS Micro Continuation',
    direction: 'LONG',
    detectedStatus: SetupCandidateStatus.Possible,
    confidence: 'Low',
    priority: 80,
    entry: 100,
    stop: null,
    target1: null,
    target2: null,
    riskPoints: null,
    evidence: ['Intraday MSS evidence.'],
    missingEvidence: ['Protected 5M MSS swing stop blocked: 5M MSS evidence timestamp does not align to a completed 5M candle in open-time or close-time mode.'],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: null,
    requiredTrigger: 'Human-review long Intraday setup.',
    nextAction: 'Intraday MSS micro-continuation watch.',
    reducedRiskPlan: null,
    activeRuleset: {
      timeframeMss: {
        applied: true,
        status: 'passed',
        required: 'aligned_confirmed_5m_mss',
        appliesToAllModels: true,
        affectsExecution: false,
        evidence: ['Active timeframe MSS 5M read: 5M bullish confirmed_mss break=true completed=completed at 2026-06-10T10:10:00.'],
        blockers: [],
      },
    } as SetupCandidate['activeRuleset'],
  };
}

const auditDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-chase-mss-timestamp-'));
fs.writeFileSync(path.join(auditDir, 'snapshot-a.json'), JSON.stringify({
  normalizedPlan: { setupCandidates: [candidate()] },
}, null, 2));

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
  source: { omissionReportPath: 'omission.json', auditDir },
  summary: {
    rowsClassified: 1,
    pendingFvgRetestEntryRows: 0,
    pendingCloseThroughRetestEntryRows: 0,
    mssTimestampAlignmentStopBlockedRows: 1,
    retestSwingStopNotConfirmedRows: 0,
    invalidStopLocationRows: 0,
    unclassifiedRows: 0,
    entryOnlyRows: 1,
    stopOnlyRows: 0,
    noEntryStopRows: 0,
    canExecuteChangedRows: 0,
    publishDiscordRows: 0,
    livePromotionAllowedRows: 0,
    recommendedNextFix: 'validate_mss_timestamp_alignment_repair',
  },
  rows: [{
    caseId: 'case-a',
    tradeDate: '2026-06-10',
    sessionType: 'morning',
    direction: 'LONG',
    entry: 100,
    stop: null,
    target1: null,
    target2: null,
    candidateState: 'MSS_CONTINUATION_RETEST_PENDING',
    detectedStatus: 'Possible',
    executionStatus: 'Conditional',
    blockReason: null,
    blockerFamily: 'mss_timestamp_alignment_stop_blocked',
    recommendedNextAction: 'validate_mss_timestamp_alignment_repair',
    canExecute: false,
    publishDiscord: false,
    livePromotionAllowed: false,
  }],
  blockers: [],
  recommendations: [],
  markdown: 'fixture',
};

const report = buildNoChaseMssTimestampAlignmentValidationReportFromReports({
  classifierReportPath: 'classifier.json',
  marketBarsJson: 'bars.json',
  auditDir,
  classifierReport,
  omissionRows: [{
    caseId: 'case-a',
    firstNoChaseSnapshotId: 'snapshot-a',
    tradeDate: '2026-06-10',
    sessionType: 'morning',
    direction: 'LONG',
  }],
  bars: [
    { time: '2026-06-10T10:00:00', open: 98, high: 99, low: 97, close: 98.5 },
    { time: '2026-06-10T10:05:00', open: 98.5, high: 99.25, low: 96, close: 98.75 },
    { time: '2026-06-10T10:10:00', open: 98.75, high: 101, low: 98, close: 100.5 },
    { time: '2026-06-10T10:15:00', open: 100.5, high: 101.5, low: 100, close: 101 },
  ],
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.reportType, 'no_chase_mss_timestamp_alignment_validation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.timestampBlockedRows, 1);
assert.equal(report.summary.mssTimestampMatchedRows, 1);
assert.equal(report.summary.protectedSwingFoundRows, 1);
assert.equal(report.summary.validStopRecoveredRows, 1);
assert.equal(report.summary.stillBlockedRows, 0);
assert.equal(report.summary.canExecuteChangedRows, 0);
assert.equal(report.summary.publishDiscordRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.rows[0].recoveredStop, 95.75);
assert.equal(report.rows[0].recoveredStopDirectionallyValid, true);
assert.match(report.markdown, /MSS Timestamp Alignment Validation/);

const parsed = parseNoChaseMssTimestampAlignmentValidationArgs([
  '--classifier-report',
  'classifier.json',
  '--market-bars-json',
  'bars.json',
  '--audit-dir',
  'audit',
  '--json',
]);
assert.equal(parsed.classifierReport, 'classifier.json');
assert.equal(parsed.marketBarsJson, 'bars.json');
assert.equal(parsed.auditDir, 'audit');
assert.equal(parsed.json, true);

console.log('no-chase MSS timestamp alignment validation verified.');
