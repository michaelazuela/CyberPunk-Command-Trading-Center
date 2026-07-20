import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentChangedEventDrilldownReport,
  parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentChangedEventDrilldownArgs,
} from './unified-positive-held-local-preview-sweep-primary-exclusion-current-changed-event-drilldown';
import type { UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentSelectionImpactSimulationReport } from './unified-positive-held-local-preview-sweep-primary-exclusion-current-selection-impact-simulation';

const selectionImpactSimulation = {
  reportType: 'unified_positive_held_local_preview_sweep_primary_exclusion_current_selection_impact_simulation',
  generatedAt: '2026-07-20T00:00:00.000Z',
  status: 'pass',
  authority: {} as any,
  source: { exactProofPackagePath: 'exact.json', scannerPackageDir: 'packages' },
  assumptions: {} as any,
  summary: {} as any,
  changedEvents: [{
    eventKey: '2026-06-23|lunch|2026-06-23T13:45:00',
    tradeDate: '2026-06-23',
    session: 'lunch',
    eventTime: '2026-06-23T13:45:00',
    candidates: 2,
    baselineTopCandidateKey: '2026-06-23|lunch|2026-06-23T13:45:00|SweepMssFvgRetrace|LONG|Conditional|InvalidStopLocation|7457.75|null|null|null|null|251',
    baselineTopSetupType: 'SweepMssFvgRetrace',
    baselineTopDirection: 'LONG',
    baselineTopExactInvalidStopSweep: true,
    simulatedTopCandidateKey: '2026-06-23|lunch|2026-06-23T13:45:00|TurtleSoup|LONG|Conditional|EntryTriggerMissing|null|7460.25|null|null|null|249',
    simulatedTopSetupType: 'TurtleSoup',
    simulatedTopDirection: 'LONG',
    topChanged: true,
    simulatedHasReplacement: true,
    canExecuteChanged: false,
    tradeMathChanged: true,
  }],
  blockers: [],
  recommendations: [],
  markdown: '',
} satisfies UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentSelectionImpactSimulationReport;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-sweep-changed-drilldown-'));
fs.writeFileSync(path.join(tmpDir, 'raw-ohlc-scanner-artifacts-sample.json'), `${JSON.stringify({
  events: {
    sample: {
      date: '2026-06-23',
      session: 'lunch',
      eventTime: '2026-06-23T13:45:00',
      scannerSummary: {
        candidateCount: 2,
        executableCount: 0,
        conditionalCount: 2,
        blockedCount: 0,
        bestExecutableSetupType: null,
        bestConditionalSetupType: 'SweepMssFvgRetrace',
      },
      setupCandidateStatus: {
        statuses: [{
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
        }, {
          setupType: 'TurtleSoup',
          direction: 'LONG',
          executionStatus: 'Conditional',
          blockReason: 'EntryTriggerMissing',
          entry: null,
          stop: 7460.25,
          target1: null,
          target2: null,
          riskPoints: null,
          rankScore: 249,
          humanReview: { canExecute: false },
        }],
      },
    },
  },
})}\n`);

const report = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentChangedEventDrilldownReport({
  selectionImpactSimulationPath: 'selection.json',
  selectionImpactSimulationReport: selectionImpactSimulation,
  scannerPackageDir: tmpDir,
}, '2026-07-20T00:01:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.changedEventsRead, 1);
assert.equal(report.summary.changedEventsFoundInRawPackages, 1);
assert.equal(report.summary.scannerOwnedSelectedCandidateFieldEvents, 0);
assert.equal(report.summary.deskTicketFieldEvents, 0);
assert.equal(report.summary.publishDecisionFieldEvents, 0);
assert.equal(report.summary.runtimeProposalReadyEvents, 0);
assert.equal(report.summary.turtleSoupEntryTriggerMissingReplacementEvents, 1);
assert.equal(report.summary.canExecuteChangedEvents, 0);
assert.equal(report.summary.tradeMathChangedEvents, 1);
assert.equal(report.summary.runtimeInstallAllowed, false);
assert.equal(report.changedEvents[0].baselineCandidate?.setupType, 'SweepMssFvgRetrace');
assert.equal(report.changedEvents[0].simulatedCandidate?.setupType, 'TurtleSoup');
assert.equal(report.changedEvents[0].runtimeProposalReady, false);
assert.ok(report.changedEvents[0].runtimeReadinessBlockers.includes('scanner-owned selected-candidate fields are absent from raw package event'));
assert.ok(report.changedEvents[0].runtimeReadinessBlockers.includes('DeskTicket fields are absent from raw package event'));

const missing = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentChangedEventDrilldownReport({
  selectionImpactSimulationPath: null,
  selectionImpactSimulationReport: null,
  scannerPackageDir: tmpDir,
}, '2026-07-20T00:02:00.000Z');
assert.equal(missing.status, 'fail');
assert.equal(missing.summary.recommendation, 'fix_missing_input_reports');

const parsed = parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentChangedEventDrilldownArgs([
  '--selection-impact-simulation',
  'selection.json',
  '--scanner-package-dir',
  'packages',
  '--out-dir',
  'out',
  '--json',
]);
assert.equal(parsed.selectionImpactSimulationPath, 'selection.json');
assert.equal(parsed.scannerPackageDir, 'packages');
assert.equal(parsed.outDir, 'out');
assert.equal(parsed.json, true);

console.log('unified positive held-local Sweep primary exclusion current changed-event drilldown verified.');
