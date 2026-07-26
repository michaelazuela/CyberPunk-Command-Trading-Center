import assert from 'node:assert/strict';
import { buildUnifiedPositiveFresh5mProofReport, type UnifiedPositiveFresh5mProofReport } from './unified-positive-fresh-5m-proof-extractor';
import type { UnifiedPositiveCandidateRebuildAuditReport, UnifiedPositiveCandidateRebuildAuditRow } from './unified-positive-candidate-rebuild-audit';

function positiveRow(overrides: Partial<UnifiedPositiveCandidateRebuildAuditRow> = {}): UnifiedPositiveCandidateRebuildAuditRow {
  return {
    snapshotId: 'fresh-proof',
    tradeDate: '2026-07-01',
    sessionType: 'morning',
    candidateKey: 'historicalReview|fixture|LONG|100.00|0',
    setupType: 'historicalReview',
    direction: 'LONG',
    unifiedState: 'no_chase',
    tradingModelState: 'ranked_candidate',
    score: 55,
    outcomeAdjustedScore: 69,
    outcomeEvidenceCount: 1,
    outcomeGrossOneMes: 100,
    outcomeWins: 1,
    outcomeLosses: 0,
    outcomeNoFillsOrUnresolved: 0,
    hasPlanGeometry: true,
    fiveMinuteProofStatus: 'missing',
    htfContextAlignment: 'context',
    existingPlan: {
      entry: 100,
      stop: 96,
      target1: 106,
      target2: 108,
      riskPoints: 4,
    },
    missingFields: ['fresh completed 5M proof'],
    rebuildClassification: 'needs_fresh_5m_proof',
    canExecute: false,
    publishDiscord: false,
    recommendation: 'fixture',
    ...overrides,
  };
}

const positiveRebuildAudit: UnifiedPositiveCandidateRebuildAuditReport = {
  reportType: 'unified_positive_candidate_rebuild_audit',
  generatedAt: '2026-07-16T00:00:00.000Z',
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
  source: {
    unifiedDiagnosticPath: 'fixture.json',
    auditDir: 'fixture-audit',
    startDate: '2026-07-01',
    endDate: '2026-07-01',
  },
  summary: {
    unifiedRows: 4,
    positiveOverlayRows: 4,
    auditedPositiveRows: 4,
    eligibleReviewTicketCandidates: 0,
    needsFresh5mProof: 3,
    needsPlanGeometryRebuild: 0,
    needsProofAndGeometry: 0,
    notRebuildCandidates: 1,
    positiveOutcomeGrossOneMes: 400,
    canExecuteFalseRows: 4,
    publishDiscordFalseRows: 4,
    missingSnapshotRows: 0,
    missingCandidateRows: 0,
  },
  rows: [
    positiveRow(),
    positiveRow({
      snapshotId: 'stop-first',
      candidateKey: 'historicalReview|fixture|LONG|101.00|0',
      existingPlan: { entry: 101, stop: 97, target1: 107, target2: 109, riskPoints: 4 },
    }),
    positiveRow({
      snapshotId: 'sweep-short',
      candidateKey: 'NoInstalledSetup|fixture|SHORT|200.00|0',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      existingPlan: { entry: 200, stop: 204, target1: 194, target2: 192, riskPoints: 4 },
    }),
    positiveRow({
      snapshotId: 'out-of-scope',
      candidateKey: 'NoInstalledSetup|fixture|LONG|100.00|0',
      setupType: 'NoInstalledSetup',
      rebuildClassification: 'not_rebuild_candidate',
    }),
  ],
  findings: [],
  recommendations: [],
  markdown: '',
};

const report: UnifiedPositiveFresh5mProofReport = buildUnifiedPositiveFresh5mProofReport({
  positiveRebuildAudit,
  snapshots: [
    { snapshotId: 'fresh-proof', tradeDate: '2026-07-01', sessionType: 'morning', completedBarTime: '2026-07-01T10:00:00', candidates: [] },
    { snapshotId: 'stop-first', tradeDate: '2026-07-01', sessionType: 'morning', completedBarTime: '2026-07-01T10:00:00', candidates: [] },
    { snapshotId: 'sweep-short', tradeDate: '2026-07-01', sessionType: 'morning', completedBarTime: '2026-07-01T10:15:00', candidates: [] },
    { snapshotId: 'out-of-scope', tradeDate: '2026-07-01', sessionType: 'morning', completedBarTime: '2026-07-01T10:00:00', candidates: [] },
  ],
  fiveMinuteBars: [
    { time: '2026-07-01T10:05:00', open: 99, high: 101, low: 99, close: 100.5 },
    { time: '2026-07-01T10:10:00', open: 100.5, high: 101, low: 100, close: 100.75 },
    { time: '2026-07-01T10:15:00', open: 100, high: 101, low: 96.75, close: 98 },
    { time: '2026-07-01T10:20:00', open: 201, high: 201, low: 199.75, close: 199.5 },
  ],
  fiveMinuteSource: 'local_market_bars_json',
  auditDir: 'fixture-audit',
  marketBarsJson: 'fixture-bars.json',
  startDate: '2026-07-01',
  endDate: '2026-07-01',
  instrument: 'MES',
  tolerancePoints: 0.25,
}, '2026-07-16T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_fresh_5m_proof_extractor');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.positiveRowsLoaded, 4);
assert.equal(report.summary.proofScopeRows, 3);
assert.equal(report.summary.freshProofFound, 2);
assert.equal(report.summary.eligibleAfterFresh5mProof, 2);
assert.equal(report.summary.invalidatedBeforeProof, 1);
assert.equal(report.summary.notInScope, 1);
assert.equal(report.summary.canExecuteFalseRows, 4);
assert.equal(report.summary.publishDiscordFalseRows, 4);
assert.equal(report.rows.find((row) => row.snapshotId === 'fresh-proof')?.proofStatus, 'fresh_5m_proof_found');
assert.equal(report.rows.find((row) => row.snapshotId === 'fresh-proof')?.proofType, 'completed_5m_retest_reentry');
assert.equal(report.rows.find((row) => row.snapshotId === 'stop-first')?.proofStatus, 'invalidated_before_proof');
assert.equal(report.rows.find((row) => row.snapshotId === 'sweep-short')?.proofStatus, 'fresh_5m_proof_found');
assert.equal(report.rows.find((row) => row.snapshotId === 'out-of-scope')?.proofStatus, 'not_in_scope');
assert.match(report.markdown, /Fresh 5M proof found: 2/);

console.log('unified positive fresh 5M proof extractor verified.');
