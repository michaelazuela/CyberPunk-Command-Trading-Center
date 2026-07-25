import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ExecutionStatus, SetupCandidateStatus, SetupType, type SetupCandidate } from '../../src/types';
import {
  buildUnifiedDeskCandidateDiagnosticReport,
  loadUnifiedDeskCandidateDiagnosticSnapshots,
  loadUnifiedDeskCandidateDiagnosticSnapshotsFromDir,
  loadUnifiedDeskOutcomeOverlayRecords,
  snapshotFromScannerAuditFile,
  writeUnifiedDeskCandidateDiagnosticReport,
  type UnifiedDeskCandidateDiagnosticSnapshot,
} from './unified-desk-candidate-book-diagnostic';

function candidate(overrides: Partial<SetupCandidate> = {}): SetupCandidate {
  return {
    setupType: SetupType.IntradayMssMicroContinuation,
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
    evidence: ['Completed 5M proof with 15M context support.'],
    missingEvidence: [],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: null,
    requiredTrigger: 'Wait for completed 5M retest proof.',
    nextAction: 'Human review only.',
    reducedRiskPlan: null,
    ...overrides,
  };
}

const executable = candidate({
  setupType: SetupType.RaidReclaimReversal,
  scenarioLabel: 'strict',
  confidence: 'High',
  priority: 99,
  modelConfidenceScore: 92,
  executionStatus: ExecutionStatus.Executable,
  nextAction: 'Existing deterministic gates passed.',
});

const noChase = candidate({
  setupType: SetupType.OpeningDriveFvgContinuation,
  scenarioLabel: 'late',
  confidence: 'High',
  priority: 100,
  modelConfidenceScore: 100,
  decisionQualityScore: 100,
  requiredTrigger: 'Preferred entry was missed. Do not chase.',
  nextAction: 'No chase. Wait for fresh completed 5M re-entry proof.',
});

const humanReview = candidate({
  setupType: SetupType.IntradayMssMicroContinuation,
  scenarioLabel: 'fresh-retest',
  priority: 85,
  modelConfidenceScore: 82,
  requiredTrigger: 'Completed 5M FVG retest/rejection proof is present for human review.',
  nextAction: 'Human-review ticket only; canExecute remains internal.',
});

const snapshots: UnifiedDeskCandidateDiagnosticSnapshot[] = [
  {
    snapshotId: 'same-executable',
    tradeDate: '2026-07-01',
    sessionType: 'morning',
    completedBarTime: '2026-07-01T10:00:00',
    candidates: [executable],
    currentSelectedCandidateIndex: 0,
    currentCanExecute: true,
  },
  {
    snapshotId: 'unified-improves-no-chase',
    tradeDate: '2026-07-01',
    sessionType: 'morning',
    completedBarTime: '2026-07-01T10:30:00',
    candidates: [noChase, humanReview],
    currentSelectedCandidateIndex: 0,
    currentCanExecute: false,
  },
  {
    snapshotId: 'missing-current-selection',
    tradeDate: '2026-07-01',
    sessionType: 'lunch',
    completedBarTime: '2026-07-01T13:05:00',
    candidates: [humanReview],
    currentCanExecute: false,
  },
];

const report = buildUnifiedDeskCandidateDiagnosticReport(snapshots, '2026-07-16T00:00:00.000Z');

assert.equal(report.reportType, 'unified_desk_candidate_book_diagnostic');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.changesEntryStopTargets, false);
assert.equal(report.authority.changesRiskRules, false);
assert.equal(report.summary.snapshotsAudited, 3);
assert.equal(report.summary.samePrimaryCount, 1);
assert.equal(report.summary.unifiedDifferentPrimaryCount, 1);
assert.equal(report.summary.currentMissingCount, 1);
assert.equal(report.summary.executableCurrentSelectionsPreserved, 1);
assert.equal(report.summary.tradingModelStateCounts.execution_ready, 1);
assert.equal(report.summary.tradingModelStateCounts.review_ticket, 2);
assert.equal(report.summary.outcomeOverlayRecordsLoaded, 0);
assert.equal(report.summary.outcomeOverlayMatchedRows, 0);
assert.equal(report.summary.findingsCount, 0);

const sameRow = report.rows.find((row) => row.snapshotId === 'same-executable');
const improvedRow = report.rows.find((row) => row.snapshotId === 'unified-improves-no-chase');
const missingRow = report.rows.find((row) => row.snapshotId === 'missing-current-selection');

assert.equal(sameRow?.currentSelectedState, 'executable');
assert.equal(sameRow?.unifiedPrimaryState, 'executable');
assert.equal(sameRow?.unifiedPrimaryTradingModelState, 'execution_ready');
assert.equal(sameRow?.comparison, 'same_primary');
assert.equal(improvedRow?.comparison, 'unified_promotes_different');
assert.equal(improvedRow?.unifiedPrimaryState, 'human_review');
assert.equal(improvedRow?.unifiedPrimaryTradingModelState, 'review_ticket');
assert.match(improvedRow?.recommendation || '', /possible human-review improvement/);
assert.equal(missingRow?.comparison, 'current_missing');
assert.match(report.markdown, /does not post Discord/);
assert.match(report.markdown, /Unified different primary: 1/);
assert.match(report.markdown, /Trading model states:/);
assert.match(report.markdown, /Outcome\/RAG overlay:/);

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'unified-desk-candidate-diagnostic-'));
const inputPath = path.join(root, 'snapshots.json');
fs.writeFileSync(inputPath, `${JSON.stringify({ snapshots }, null, 2)}\n`, 'utf8');
assert.equal(loadUnifiedDeskCandidateDiagnosticSnapshots(inputPath).length, 3);

const outcomePath = path.join(root, 'outcome-overlay.json');
fs.writeFileSync(outcomePath, `${JSON.stringify({
  reportType: 'no_chase_artifact_rebuild_pack',
  rows: [
    {
      tradeDate: '2026-07-01',
      sessionType: 'morning',
      setupType: SetupType.IntradayMssMicroContinuation,
      direction: 'LONG',
      replayOutcome: 'T2_HIT',
      replayOneMesGross: 125,
    },
    {
      tradeDate: '2026-07-01',
      sessionType: 'morning',
      setupType: SetupType.OpeningDriveFvgContinuation,
      direction: 'LONG',
      replayOutcome: 'NO_FILL',
      replayOneMesGross: 0,
    },
  ],
}, null, 2)}\n`, 'utf8');
const overlayRecords = loadUnifiedDeskOutcomeOverlayRecords([outcomePath]);
assert.equal(overlayRecords.length, 2);

const overlayReport = buildUnifiedDeskCandidateDiagnosticReport(snapshots, '2026-07-16T00:01:00.000Z', {
  outcomeOverlayRecords: overlayRecords,
});
const overlayImprovedRow = overlayReport.rows.find((row) => row.snapshotId === 'unified-improves-no-chase');
assert.equal(overlayReport.summary.outcomeOverlayRecordsLoaded, 2);
assert.equal(overlayReport.summary.outcomeOverlayMatchedRows, 1);
assert.equal(overlayReport.summary.outcomeOverlayPositiveRows, 1);
assert.equal(overlayReport.summary.outcomeOverlayNegativeRows, 0);
assert.equal(overlayImprovedRow?.outcomeOverlay.classification, 'positive');
assert.ok((overlayImprovedRow?.outcomeOverlayAdjustedScore || 0) > (overlayImprovedRow?.unifiedPrimaryScore || 0));
assert.match(overlayImprovedRow?.recommendation || '', /supports this review ticket/);

const noFillOverlayReport = buildUnifiedDeskCandidateDiagnosticReport([
  {
    snapshotId: 'no-fill-primary',
    tradeDate: '2026-07-01',
    sessionType: 'morning',
    completedBarTime: '2026-07-01T10:35:00',
    candidates: [noChase],
    currentSelectedCandidateIndex: 0,
    currentCanExecute: false,
  },
], '2026-07-16T00:02:00.000Z', { outcomeOverlayRecords: overlayRecords });
assert.equal(noFillOverlayReport.summary.outcomeOverlayNegativeRows, 1);
assert.equal(noFillOverlayReport.summary.outcomeOverlayNoFillOrUnresolvedRows, 1);
assert.equal(noFillOverlayReport.rows[0].outcomeOverlay.classification, 'negative');
assert.ok((noFillOverlayReport.rows[0].outcomeOverlayAdjustedScore || 0) < (noFillOverlayReport.rows[0].unifiedPrimaryScore || 0));
assert.match(noFillOverlayReport.rows[0].recommendation, /penalizes this primary/);

const paths = writeUnifiedDeskCandidateDiagnosticReport(report, root);
assert.equal(fs.existsSync(paths.jsonPath), true);
assert.equal(fs.existsSync(paths.markdownPath), true);

const scannerAuditPath = path.join(root, 'scanner-morning-2026-07-01-MES-fixture.json');
fs.writeFileSync(scannerAuditPath, `${JSON.stringify({
  tradeDate: '2026-07-01',
  session: 'evening',
  sourceCandidate: humanReview,
  candidate: { ...humanReview, scenarioLabel: 'display normalized copy' },
  completed5m: { time: '2026-07-01T19:05:00' },
  normalizedPlan: {
    canExecute: false,
    setupCandidates: [noChase, humanReview],
    opportunitySelection: { bestConditionalCandidate: humanReview },
  },
  deskState: { canExecute: false },
}, null, 2)}\n`, 'utf8');

const scannerSnapshot = snapshotFromScannerAuditFile(scannerAuditPath);
assert.equal(scannerSnapshot?.snapshotId, 'scanner-morning-2026-07-01-MES-fixture');
assert.equal(scannerSnapshot?.sessionType, 'evening');
assert.equal(scannerSnapshot?.candidates.length, 2);
assert.equal(scannerSnapshot?.currentSelectedCandidate?.scenarioLabel, 'fresh-retest');

const directorySnapshots = loadUnifiedDeskCandidateDiagnosticSnapshotsFromDir(root, {
  startDate: '2026-07-01',
  endDate: '2026-07-01',
});
assert.equal(directorySnapshots.length, 1);
const directoryReport = buildUnifiedDeskCandidateDiagnosticReport(directorySnapshots, '2026-07-16T00:05:00.000Z');
assert.equal(directoryReport.summary.snapshotsAudited, 1);
assert.equal(directoryReport.summary.samePrimaryCount, 1);
assert.equal(directoryReport.rows[0].sessionType, 'evening');
assert.equal(directoryReport.rows[0].unifiedPrimaryTradingModelState, 'review_ticket');

console.log('unified desk candidate-book diagnostic verified.');
