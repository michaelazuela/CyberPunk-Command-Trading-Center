import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerOwnedSnapshotExportReport,
  parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerOwnedSnapshotExportArgs,
} from './unified-positive-held-local-preview-sweep-primary-exclusion-scanner-owned-snapshot-export';
import type { UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentChangedEventDrilldownReport } from './unified-positive-held-local-preview-sweep-primary-exclusion-current-changed-event-drilldown';

const changedEventDrilldown = {
  reportType: 'unified_positive_held_local_preview_sweep_primary_exclusion_current_changed_event_drilldown',
  generatedAt: '2026-07-20T00:00:00.000Z',
  status: 'pass',
  authority: {} as any,
  source: { selectionImpactSimulationPath: 'selection.json', scannerPackageDir: 'packages' },
  assumptions: {} as any,
  summary: {} as any,
  changedEvents: [{
    eventKey: '2026-06-23|lunch|2026-06-23T13:45:00',
    tradeDate: '2026-06-23',
    session: 'lunch',
    eventTime: '2026-06-23T13:45:00',
    sourceFiles: ['raw.json'],
    sourceEventFound: true,
    candidateRows: 2,
    scannerSummary: {
      candidateCount: 2,
      executableCount: 0,
      conditionalCount: 2,
      blockedCount: 0,
      bestExecutableSetupType: null,
      bestConditionalSetupType: 'SweepMssFvgRetrace',
    },
    scannerOwnedSelectedCandidateFields: [],
    deskTicketFields: [],
    publishDecisionFields: [],
    baselineCandidate: {
      candidateKey: '2026-06-23|lunch|2026-06-23T13:45:00|SweepMssFvgRetrace|LONG|Conditional|InvalidStopLocation|7457.75|null|null|null|null|251',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      executionStatus: 'Conditional',
      blockReason: 'InvalidStopLocation',
      entry: 7457.75,
      stop: null,
      target1: null,
      target2: null,
      riskPoints: null,
      rankScore: 251,
      canExecute: null,
    },
    simulatedCandidate: {
      candidateKey: '2026-06-23|lunch|2026-06-23T13:45:00|raidReclaim|LONG|Conditional|EntryTriggerMissing|null|7460.25|null|null|null|249',
      setupType: 'raidReclaim',
      direction: 'LONG',
      executionStatus: 'Conditional',
      blockReason: 'EntryTriggerMissing',
      entry: null,
      stop: 7460.25,
      target1: null,
      target2: null,
      riskPoints: null,
      rankScore: 249,
      canExecute: false,
    },
    topReplacementIsraidReclaimEntryTriggerMissing: true,
    canExecuteChanged: false,
    tradeMathChanged: true,
    runtimeProposalReady: false,
    runtimeReadinessBlockers: ['DeskTicket fields are absent from raw package event'],
  }],
  blockers: [],
  recommendations: [],
  markdown: '',
} satisfies UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentChangedEventDrilldownReport;

const report = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerOwnedSnapshotExportReport({
  changedEventDrilldownPath: 'drilldown.json',
  changedEventDrilldownReport: changedEventDrilldown,
}, '2026-07-20T00:01:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.changedEventsRead, 1);
assert.equal(report.summary.snapshotRows, 2);
assert.equal(report.summary.baselineRows, 1);
assert.equal(report.summary.simulatedReplacementRows, 1);
assert.equal(report.summary.selectedCandidateSnapshotRows, 2);
assert.equal(report.summary.deskTicketSnapshotRows, 2);
assert.equal(report.summary.publishDecisionSnapshotRows, 2);
assert.equal(report.summary.publishShouldPostRows, 0);
assert.equal(report.summary.publishCompletePlanRows, 0);
assert.equal(report.summary.publishCanExecuteTrueRows, 0);
assert.equal(report.summary.runtimeProposalReadyRows, 0);
assert.equal(report.summary.canExecuteDriftRows, 0);
assert.equal(report.summary.entryStopTargetDriftRows, 0);
assert.equal(report.summary.runtimeInstallAllowed, false);
assert.equal(report.rows[0].selectedCandidateSourceOfTruth, 'scanner_candidate_lifecycle_trace');
assert.equal(report.rows[0].deskStateSourceOfTruth, 'scanner_desk_state');
assert.equal(report.rows[0].deskTicketSourceOfTruth, 'scanner_single_active_desk_ticket');
assert.equal(report.rows[0].publishDecisionSourceOfTruth, 'scanner_desk_publish_decision');
assert.equal(report.rows[0].publishShouldPost, false);
assert.equal(report.rows[0].publishCanExecute, false);
assert.ok(report.rows[0].runtimeReadinessBlockers.includes('DeskPublishDecision shouldPost is false in the local scanner-owned snapshot.'));

const missing = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerOwnedSnapshotExportReport({
  changedEventDrilldownPath: null,
  changedEventDrilldownReport: null,
}, '2026-07-20T00:02:00.000Z');
assert.equal(missing.status, 'fail');
assert.equal(missing.summary.recommendation, 'fix_missing_input_reports');

const parsed = parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerOwnedSnapshotExportArgs([
  '--changed-event-drilldown',
  'drilldown.json',
  '--out-dir',
  'out',
  '--json',
]);
assert.equal(parsed.changedEventDrilldownPath, 'drilldown.json');
assert.equal(parsed.outDir, 'out');
assert.equal(parsed.json, true);

console.log('unified positive held-local Sweep primary exclusion scanner-owned snapshot export verified.');
