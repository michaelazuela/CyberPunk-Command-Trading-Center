import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ExecutionStatus, SetupCandidateStatus, SetupType, type SetupCandidate } from '../../src/types';
import {
  buildNoChaseIntradayGeometryBlockerClassifierReport,
  parseNoChaseIntradayGeometryBlockerClassifierArgs,
} from './no-chase-intraday-geometry-blocker-classifier';
import type { NoChaseProtectedGeometryOmissionDiagnosticReport } from './no-chase-protected-geometry-omission-diagnostic';

function candidate(overrides: Partial<SetupCandidate> = {}): SetupCandidate {
  return {
    setupType: SetupType.NoSetup,
    scenarioLabel: 'Intraday MSS Micro Continuation',
    candidateState: 'MSS_CONTINUATION_RETEST_PENDING',
    direction: 'LONG',
    detectedStatus: SetupCandidateStatus.Possible,
    confidence: 'Low',
    priority: 80,
    entry: null,
    stop: null,
    target1: null,
    target2: null,
    riskPoints: null,
    evidence: ['Intraday MSS evidence.'],
    missingEvidence: [],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: null,
    requiredTrigger: 'Human-review long Intraday setup.',
    nextAction: 'Intraday MSS micro-continuation watch.',
    reducedRiskPlan: null,
    ...overrides,
  };
}

function writeSnapshot(dir: string, id: string, setupCandidate: SetupCandidate): void {
  fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify({
    tradeDate: '2026-06-10',
    session: 'morning',
    completed5m: { time: '2026-06-10T10:00:00' },
    normalizedPlan: { setupCandidates: [setupCandidate] },
  }, null, 2));
}

const auditDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-chase-blocker-classifier-'));
writeSnapshot(auditDir, 'fvg-pending', candidate({
  stop: 96,
  missingEvidence: ['Bullish micro-continuation pending: wait for a completed 5M candle to retest the bullish FVG and close back above the upper boundary.'],
}));
writeSnapshot(auditDir, 'timestamp-stop', candidate({
  entry: 100,
  missingEvidence: ['Protected 5M MSS swing stop blocked: 5M MSS evidence timestamp does not align to a completed 5M candle in open-time or close-time mode.'],
}));
writeSnapshot(auditDir, 'retest-stop', candidate({
  entry: 100,
  nextAction: 'Completed 5M bullish MSS close-through/retest confirmed at 2026-06-10T10:05:00.',
  missingEvidence: ['Protected 5M retest swing stop blocked: retest low is not a confirmed protected 5M swing low.'],
}));
writeSnapshot(auditDir, 'invalid-stop', candidate({
  stop: 102,
  blockReason: 'InvalidStopLocation' as SetupCandidate['blockReason'],
  nextAction: 'Candidate invalidated. Stand down; do not reuse this stale entry/stop plan.',
}));

const omissionReport: NoChaseProtectedGeometryOmissionDiagnosticReport = {
  reportType: 'no_chase_protected_geometry_omission_diagnostic',
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
  source: { proofReportPath: 'proof.json', auditDir, startDate: null, endDate: null },
  summary: {
    proofOnlyMissingPlanRows: 4,
    snapshotsJoinedRows: 4,
    snapshotsMissingRows: 0,
    sourceNeverBuiltFullGeometryRows: 4,
    unifiedMappingLostGeometryRows: 0,
    sourceInvalidGeometryRows: 0,
    sourceMissingEntryRows: 2,
    sourceMissingStopRows: 2,
    sourceMissingTargetsRows: 4,
    sourceEntryOnlyRows: 2,
    sourceStopOnlyRows: 2,
    sourceNoEntryStopRows: 0,
    canExecuteChangedRows: 0,
    publishDiscordRows: 0,
    livePromotionAllowedRows: 0,
    recommendedNextFix: 'inspect_intraday_candidate_builder_plan_geometry',
  },
  rows: ['fvg-pending', 'timestamp-stop', 'retest-stop', 'invalid-stop'].map((id) => ({
    caseId: id,
    tradeDate: '2026-06-10',
    sessionType: 'morning',
    setupType: SetupType.NoSetup,
    direction: 'LONG',
    firstNoChaseSnapshotId: id,
    firstNoChaseTime: '2026-06-10T10:00:00',
    proofBarTime: '2026-06-10T10:05:00',
    snapshotFound: true,
    matchedCandidateKey: id,
    itemState: 'no_chase',
    itemTradingModelState: 'blocked_missing_plan_geometry',
    sourceFields: { entry: null, stop: null, target1: null, target2: null, riskPoints: null },
    unifiedItemFields: { entry: null, stop: null, target1: null, target2: null, riskPoints: null },
    sourceMissingFields: ['target1', 'target2'],
    unifiedMissingFields: ['target1', 'target2'],
    sourceGeometryValid: null,
    unifiedGeometryValid: null,
    omissionClass: 'source_candidate_never_built_full_geometry',
    recommendedNextAction: 'inspect_intraday_candidate_builder_plan_geometry',
    canExecute: false,
    publishDiscord: false,
    livePromotionAllowed: false,
  })),
  blockers: [],
  recommendations: [],
  markdown: 'fixture',
};

const report = buildNoChaseIntradayGeometryBlockerClassifierReport({
  omissionReportPath: 'omission.json',
  auditDir,
  omissionReport,
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.reportType, 'no_chase_intraday_geometry_blocker_classifier');
assert.equal(report.status, 'pass');
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.rowsClassified, 4);
assert.equal(report.summary.pendingFvgRetestEntryRows, 1);
assert.equal(report.summary.mssTimestampAlignmentStopBlockedRows, 1);
assert.equal(report.summary.retestSwingStopNotConfirmedRows, 1);
assert.equal(report.summary.invalidStopLocationRows, 1);
assert.equal(report.summary.canExecuteChangedRows, 0);
assert.equal(report.summary.publishDiscordRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendedNextFix, 'validate_mss_timestamp_alignment_repair');
assert.equal(report.rows.find((row) => row.caseId === 'fvg-pending')?.blockerFamily, 'pending_fvg_retest_entry');
assert.equal(report.rows.find((row) => row.caseId === 'timestamp-stop')?.blockerFamily, 'mss_timestamp_alignment_stop_blocked');
assert.equal(report.rows.find((row) => row.caseId === 'retest-stop')?.blockerFamily, 'retest_swing_stop_not_confirmed');
assert.equal(report.rows.find((row) => row.caseId === 'invalid-stop')?.blockerFamily, 'invalid_stop_location');
assert.match(report.markdown, /Intraday Geometry Blocker Classifier/);

const parsed = parseNoChaseIntradayGeometryBlockerClassifierArgs([
  '--omission-report',
  'omission.json',
  '--audit-dir',
  'audit',
  '--json',
]);
assert.equal(parsed.omissionReport, 'omission.json');
assert.equal(parsed.auditDir, 'audit');
assert.equal(parsed.json, true);

console.log('no-chase intraday geometry blocker classifier verified.');
