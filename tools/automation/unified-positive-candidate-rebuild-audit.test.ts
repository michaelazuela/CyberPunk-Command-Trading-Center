import assert from 'node:assert/strict';
import { ExecutionStatus, SetupCandidateStatus, SetupType, type SetupCandidate } from '../../src/types';
import type { UnifiedDeskCandidateDiagnosticReport } from './unified-desk-candidate-book-diagnostic';
import {
  buildUnifiedPositiveCandidateRebuildAuditReport,
  type UnifiedPositiveCandidateRebuildAuditReport,
} from './unified-positive-candidate-rebuild-audit';

function candidate(overrides: Partial<SetupCandidate> = {}): SetupCandidate {
  return {
    setupType: SetupType.NoSetup,
    scenarioLabel: 'fixture',
    direction: 'LONG',
    detectedStatus: SetupCandidateStatus.Conditional,
    confidence: 'Medium',
    priority: 80,
    entry: 100,
    stop: 96,
    target1: 106,
    target2: 108,
    riskPoints: 4,
    modelConfidenceScore: 80,
    evidence: ['Completed 5M proof with 15M context support.'],
    missingEvidence: [],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: null,
    requiredTrigger: 'Completed 5M retest proof is present.',
    nextAction: 'Human review only.',
    reducedRiskPlan: null,
    ...overrides,
  };
}

const reviewTicket = candidate({
  setupType: SetupType.NoSetup,
  scenarioLabel: 'review',
  modelConfidenceScore: 90,
});
const needsProof = candidate({
  setupType: SetupType.NoSetup,
  scenarioLabel: 'stale',
  evidence: ['15M context support only.'],
  requiredTrigger: 'No chase. Wait for fresh completed 5M re-entry proof.',
  nextAction: 'No chase.',
});
const needsGeometry = candidate({
  setupType: SetupType.NoSetup,
  scenarioLabel: 'missing-plan',
  entry: null,
  stop: null,
  target1: null,
  target2: null,
  evidence: ['Completed 5M proof with 15M context support.'],
});

const diagnostic = {
  reportType: 'unified_desk_candidate_book_diagnostic',
  generatedAt: '2026-07-16T00:00:00.000Z',
  authority: {
    readOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRiskRules: false,
    changesBridgeBehavior: false,
  },
  summary: {
    snapshotsAudited: 3,
    samePrimaryCount: 0,
    unifiedDifferentPrimaryCount: 3,
    currentMissingCount: 0,
    noCandidateCount: 0,
    executableCurrentSelectionsPreserved: 0,
    humanReviewPrimaryCount: 1,
    noChasePrimaryCount: 1,
    blockedPrimaryCount: 1,
    tradingModelStateCounts: {
      execution_ready: 0,
      review_ticket: 1,
      ranked_candidate: 1,
      blocked_missing_5m_proof: 0,
      blocked_missing_plan_geometry: 1,
      blocked_no_fill: 0,
      blocked: 0,
      no_trade: 0,
    },
    outcomeOverlayRecordsLoaded: 3,
    outcomeOverlayMatchedRows: 3,
    outcomeOverlayPositiveRows: 3,
    outcomeOverlayNegativeRows: 0,
    outcomeOverlayNoFillOrUnresolvedRows: 0,
    outcomeOverlayGrossOneMes: 300,
    findingsCount: 0,
  },
  rows: [
    {
      snapshotId: 'review-ticket',
      tradeDate: '2026-07-01',
      sessionType: 'morning',
      completedBarTime: '2026-07-01T10:00:00',
      currentSelectedKey: null,
      currentSelectedState: null,
      currentCanExecute: false,
      unifiedPrimaryKey: 'NoInstalledSetup|review|LONG|100.00|0',
      unifiedPrimaryState: 'human_review',
      unifiedPrimaryTradingModelState: 'review_ticket',
      unifiedPrimaryScore: 80,
      outcomeOverlayAdjustedScore: 94,
      outcomeOverlay: {
        evidenceCount: 1,
        wins: 1,
        losses: 0,
        noFillsOrUnresolved: 0,
        grossOneMes: 100,
        scoreAdjustment: 14,
        classification: 'positive',
        sources: ['formal_master_desk'],
      },
      comparison: 'unified_promotes_different',
      recommendation: 'fixture',
    },
    {
      snapshotId: 'needs-proof',
      tradeDate: '2026-07-01',
      sessionType: 'morning',
      completedBarTime: '2026-07-01T10:05:00',
      currentSelectedKey: null,
      currentSelectedState: null,
      currentCanExecute: false,
      unifiedPrimaryKey: 'NoInstalledSetup|stale|LONG|100.00|0',
      unifiedPrimaryState: 'no_chase',
      unifiedPrimaryTradingModelState: 'ranked_candidate',
      unifiedPrimaryScore: 50,
      outcomeOverlayAdjustedScore: 64,
      outcomeOverlay: {
        evidenceCount: 1,
        wins: 1,
        losses: 0,
        noFillsOrUnresolved: 0,
        grossOneMes: 100,
        scoreAdjustment: 14,
        classification: 'positive',
        sources: ['formal_master_desk'],
      },
      comparison: 'unified_promotes_different',
      recommendation: 'fixture',
    },
    {
      snapshotId: 'needs-geometry',
      tradeDate: '2026-07-01',
      sessionType: 'morning',
      completedBarTime: '2026-07-01T10:10:00',
      currentSelectedKey: null,
      currentSelectedState: null,
      currentCanExecute: false,
      unifiedPrimaryKey: 'NoInstalledSetup|missing-plan|LONG|no-line|0',
      unifiedPrimaryState: 'watch',
      unifiedPrimaryTradingModelState: 'blocked_missing_plan_geometry',
      unifiedPrimaryScore: 55,
      outcomeOverlayAdjustedScore: 69,
      outcomeOverlay: {
        evidenceCount: 1,
        wins: 1,
        losses: 0,
        noFillsOrUnresolved: 0,
        grossOneMes: 100,
        scoreAdjustment: 14,
        classification: 'positive',
        sources: ['formal_master_desk'],
      },
      comparison: 'unified_promotes_different',
      recommendation: 'fixture',
    },
  ],
  findings: [],
  markdown: '',
} satisfies UnifiedDeskCandidateDiagnosticReport;

const report: UnifiedPositiveCandidateRebuildAuditReport = buildUnifiedPositiveCandidateRebuildAuditReport({
  diagnostic,
  snapshots: [
    {
      snapshotId: 'review-ticket',
      tradeDate: '2026-07-01',
      sessionType: 'morning',
      completedBarTime: '2026-07-01T10:00:00',
      candidates: [reviewTicket],
      currentCanExecute: false,
    },
    {
      snapshotId: 'needs-proof',
      tradeDate: '2026-07-01',
      sessionType: 'morning',
      completedBarTime: '2026-07-01T10:05:00',
      candidates: [needsProof],
      currentCanExecute: false,
    },
    {
      snapshotId: 'needs-geometry',
      tradeDate: '2026-07-01',
      sessionType: 'morning',
      completedBarTime: '2026-07-01T10:10:00',
      candidates: [needsGeometry],
      currentCanExecute: false,
    },
  ],
  auditDir: 'fixture-audit',
}, '2026-07-16T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_candidate_rebuild_audit');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.positiveOverlayRows, 3);
assert.equal(report.summary.auditedPositiveRows, 3);
assert.equal(report.summary.eligibleReviewTicketCandidates, 0);
assert.equal(report.summary.needsFresh5mProof, 0);
assert.equal(report.summary.needsPlanGeometryRebuild, 0);
assert.equal(report.summary.notRebuildCandidates, 3);
assert.equal(report.summary.canExecuteFalseRows, 3);
assert.equal(report.summary.publishDiscordFalseRows, 3);
assert.equal(report.summary.missingCandidateRows, 3);
assert.equal(report.findings.length, 3);
assert.equal(report.rows.find((row) => row.snapshotId === 'review-ticket')?.rebuildClassification, 'not_rebuild_candidate');
assert.equal(report.rows.find((row) => row.snapshotId === 'needs-proof')?.rebuildClassification, 'not_rebuild_candidate');
assert.equal(report.rows.find((row) => row.snapshotId === 'needs-geometry')?.rebuildClassification, 'not_rebuild_candidate');
assert.match(report.markdown, /Eligible review-ticket candidates: 0/);

console.log('unified positive candidate rebuild audit verified.');
