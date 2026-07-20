import assert from 'node:assert/strict';
import { ExecutionStatus, SetupCandidateStatus, SetupType, type SetupCandidate } from '../../src/types';
import {
  buildNoChaseProtectedGeometryOmissionDiagnosticReport,
  parseNoChaseProtectedGeometryOmissionDiagnosticArgs,
} from './no-chase-protected-geometry-omission-diagnostic';
import type { NoChaseOhlcProofExtractorReport } from './no-chase-ohlc-proof-extractor';
import type { UnifiedDeskCandidateDiagnosticSnapshot } from './unified-desk-candidate-book-diagnostic';

function candidate(overrides: Partial<SetupCandidate> = {}): SetupCandidate {
  return {
    setupType: SetupType.IntradayMssMicroContinuation,
    scenarioLabel: 'fixture',
    direction: 'LONG',
    detectedStatus: SetupCandidateStatus.Conditional,
    confidence: 'High',
    priority: 80,
    entry: null,
    stop: null,
    target1: null,
    target2: null,
    riskPoints: null,
    evidence: ['Completed 5M proof context exists.'],
    missingEvidence: ['Preferred entry was missed. Do not chase.'],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: null,
    requiredTrigger: 'No chase. Wait for fresh completed 5M re-entry proof.',
    nextAction: 'No chase. Wait for fresh completed 5M re-entry proof.',
    reducedRiskPlan: null,
    activeRuleset: { htfLineInSand: { lineInSand: 101 } } as SetupCandidate['activeRuleset'],
    ...overrides,
  };
}

const proofReport: NoChaseOhlcProofExtractorReport = {
  reportType: 'no_chase_ohlc_proof_extractor',
  generatedAt: '2026-07-20T00:00:00.000Z',
  authority: {
    readOnly: true,
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
  },
  scope: {
    setupTypes: [SetupType.IntradayMssMicroContinuation, SetupType.AfterLunchDriveFvgContinuation],
    startDate: '2026-06-10',
    endDate: '2026-06-13',
    auditDir: 'fixture-audit',
    marketBarsJson: null,
    tolerancePoints: 0.25,
    sourcePreference: ['local_market_bars_json', 'scanner_decision_tape_completed_5m'],
  },
  summary: {
    snapshotsAudited: 2,
    noChaseCases: 3,
    ohlcProofFound: 3,
    noLocalOhlcProof: 0,
    missingReferenceLevel: 0,
    missingFutureBars: 0,
    intradayCases: 3,
    intradayProofFound: 3,
    afterLunchCases: 0,
    afterLunchProofFound: 0,
    reviewableFullPlan: 0,
    proofOnlyMissingPlanFields: 3,
    notReviewableNoOhlcProof: 0,
    replayedFullPlanCases: 0,
    replayWins: 0,
    replayLosses: 0,
    replayNoFill: 0,
    replayAmbiguous: 0,
    replayGrossOneMes: 0,
    fiveMinuteBarsLoaded: 10,
    fiveMinuteSource: 'local_market_bars_json',
  },
  cases: [
    {
      caseId: '2026-06-10|morning|IntradayMssMicroContinuation|LONG',
      tradeDate: '2026-06-10',
      sessionType: 'morning',
      setupType: SetupType.IntradayMssMicroContinuation,
      direction: 'LONG',
      firstNoChaseSnapshotId: 'missing-source-fields',
      firstNoChaseTime: '2026-06-10T10:00:00',
      noChaseCount: 1,
      referenceLevel: 101,
      referenceSource: 'htf_line_in_sand',
      entry: null,
      stop: null,
      target1: null,
      target2: null,
      futureBarsChecked: 3,
      proofStatus: 'ohlc_proof_found',
      proofType: 'completed_5m_close_through',
      proofBarTime: '2026-06-10T10:05:00',
      proofBar: { time: '2026-06-10T10:05:00', open: 100, high: 102, low: 99, close: 101.5 },
      reviewClassification: 'proof_only_missing_plan_fields',
      reviewBlockers: ['missing entry', 'missing stop', 'missing T1', 'missing T2'],
      replayOutcome: 'NOT_REPLAYED',
      replayFillTime: null,
      replayOutcomeTime: null,
      replayPoints: 0,
      replayOneMesGross: 0,
      blocker: null,
      recommendation: 'fixture',
    },
    {
      caseId: '2026-06-11|morning|IntradayMssMicroContinuation|LONG',
      tradeDate: '2026-06-11',
      sessionType: 'morning',
      setupType: SetupType.IntradayMssMicroContinuation,
      direction: 'LONG',
      firstNoChaseSnapshotId: 'invalid-source-fields',
      firstNoChaseTime: '2026-06-11T10:00:00',
      noChaseCount: 1,
      referenceLevel: 101,
      referenceSource: 'htf_line_in_sand',
      entry: 100,
      stop: 102,
      target1: null,
      target2: null,
      futureBarsChecked: 3,
      proofStatus: 'ohlc_proof_found',
      proofType: 'completed_5m_close_through',
      proofBarTime: '2026-06-11T10:05:00',
      proofBar: { time: '2026-06-11T10:05:00', open: 100, high: 102, low: 99, close: 101.5 },
      reviewClassification: 'proof_only_missing_plan_fields',
      reviewBlockers: ['missing T1', 'missing T2'],
      replayOutcome: 'NOT_REPLAYED',
      replayFillTime: null,
      replayOutcomeTime: null,
      replayPoints: 0,
      replayOneMesGross: 0,
      blocker: null,
      recommendation: 'fixture',
    },
    {
      caseId: '2026-06-13|morning|IntradayMssMicroContinuation|LONG',
      tradeDate: '2026-06-13',
      sessionType: 'morning',
      setupType: SetupType.IntradayMssMicroContinuation,
      direction: 'LONG',
      firstNoChaseSnapshotId: 'missing-snapshot',
      firstNoChaseTime: '2026-06-13T10:00:00',
      noChaseCount: 1,
      referenceLevel: 101,
      referenceSource: 'htf_line_in_sand',
      entry: null,
      stop: null,
      target1: null,
      target2: null,
      futureBarsChecked: 3,
      proofStatus: 'ohlc_proof_found',
      proofType: 'completed_5m_close_through',
      proofBarTime: '2026-06-13T10:05:00',
      proofBar: { time: '2026-06-13T10:05:00', open: 100, high: 102, low: 99, close: 101.5 },
      reviewClassification: 'proof_only_missing_plan_fields',
      reviewBlockers: ['missing entry'],
      replayOutcome: 'NOT_REPLAYED',
      replayFillTime: null,
      replayOutcomeTime: null,
      replayPoints: 0,
      replayOneMesGross: 0,
      blocker: null,
      recommendation: 'fixture',
    },
  ],
  recommendations: ['fixture'],
  markdown: 'fixture',
};

const snapshots: UnifiedDeskCandidateDiagnosticSnapshot[] = [
  {
    snapshotId: 'missing-source-fields',
    tradeDate: '2026-06-10',
    sessionType: 'morning',
    completedBarTime: '2026-06-10T10:00:00',
    candidates: [candidate()],
    currentCanExecute: false,
  },
  {
    snapshotId: 'invalid-source-fields',
    tradeDate: '2026-06-11',
    sessionType: 'morning',
    completedBarTime: '2026-06-11T10:00:00',
    candidates: [candidate({ entry: 100, stop: 102, target1: null, target2: null })],
    currentCanExecute: false,
  },
];

const report = buildNoChaseProtectedGeometryOmissionDiagnosticReport({
  proofReportPath: 'proof.json',
  auditDir: 'fixture-audit',
  proofReport,
  snapshots,
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.reportType, 'no_chase_protected_geometry_omission_diagnostic');
assert.equal(report.status, 'fail');
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.proofOnlyMissingPlanRows, 3);
assert.equal(report.summary.snapshotsJoinedRows, 2);
assert.equal(report.summary.snapshotsMissingRows, 1);
assert.equal(report.summary.sourceNeverBuiltFullGeometryRows, 1);
assert.equal(report.summary.unifiedMappingLostGeometryRows, 0);
assert.equal(report.summary.sourceInvalidGeometryRows, 1);
assert.equal(report.summary.sourceMissingEntryRows, 1);
assert.equal(report.summary.sourceMissingStopRows, 1);
assert.equal(report.summary.sourceMissingTargetsRows, 2);
assert.equal(report.summary.sourceNoEntryStopRows, 1);
assert.equal(report.summary.canExecuteChangedRows, 0);
assert.equal(report.summary.publishDiscordRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendedNextFix, 'recover_missing_saved_snapshots');
assert.equal(report.rows.find((row) => row.firstNoChaseSnapshotId === 'missing-source-fields')?.omissionClass, 'source_candidate_never_built_full_geometry');
assert.equal(report.rows.find((row) => row.firstNoChaseSnapshotId === 'invalid-source-fields')?.omissionClass, 'source_geometry_directionally_invalid');
assert.equal(report.rows.find((row) => row.firstNoChaseSnapshotId === 'missing-snapshot')?.omissionClass, 'snapshot_or_candidate_missing');
assert.match(report.markdown, /Protected Geometry Omission Diagnostic/);

const cleanReport = buildNoChaseProtectedGeometryOmissionDiagnosticReport({
  proofReportPath: 'proof.json',
  auditDir: 'fixture-audit',
  proofReport: { ...proofReport, summary: { ...proofReport.summary, proofOnlyMissingPlanFields: 1 }, cases: [proofReport.cases[0]] },
  snapshots: [snapshots[0]],
}, '2026-07-20T00:00:00.000Z');
assert.equal(cleanReport.status, 'pass');
assert.equal(cleanReport.summary.recommendedNextFix, 'inspect_intraday_candidate_builder_plan_geometry');

const parsed = parseNoChaseProtectedGeometryOmissionDiagnosticArgs([
  '--proof-report',
  'proof.json',
  '--audit-dir',
  'audit',
  '--start-date',
  '2026-06-01',
  '--end-date',
  '2026-07-02',
  '--json',
]);
assert.equal(parsed.proofReport, 'proof.json');
assert.equal(parsed.auditDir, 'audit');
assert.equal(parsed.startDate, '2026-06-01');
assert.equal(parsed.endDate, '2026-07-02');
assert.equal(parsed.json, true);

console.log('no-chase protected geometry omission diagnostic verified.');
