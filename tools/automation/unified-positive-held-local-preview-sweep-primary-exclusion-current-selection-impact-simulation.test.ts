import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentSelectionImpactSimulationReport,
  parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentSelectionImpactSimulationArgs,
} from './unified-positive-held-local-preview-sweep-primary-exclusion-current-selection-impact-simulation';
import type { UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageReport } from './unified-positive-held-local-preview-sweep-primary-exclusion-current-exact-proof-package';

const exactProofPackage = {
  reportType: 'unified_positive_held_local_preview_sweep_primary_exclusion_current_exact_proof_package',
  generatedAt: '2026-07-20T00:00:00.000Z',
  status: 'pass',
  authority: {} as any,
  source: { evidenceBoundaryAuditPath: 'boundary.json', scannerPackageDir: 'packages' },
  assumptions: {} as any,
  summary: {} as any,
  rows: [{
    proofKey: '2026-07-20|morning|2026-07-20T09:35:00|SHORT|7539|7505.5|InvalidStopLocation',
    tradeDate: '2026-07-20',
    session: 'morning',
    eventTime: '2026-07-20T09:35:00',
    direction: 'SHORT',
    executionStatus: 'Conditional',
    blockReason: 'InvalidStopLocation',
    entry: 7539,
    stop: 7505.5,
    riskPoints: 33.5,
    rankScore: 100,
    sourceFiles: ['raw.json'],
    duplicateSourceRows: 1,
    overlapsEvidenceBoundarySlate: true,
  }],
  blockers: [],
  recommendations: [],
  markdown: '',
} satisfies UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageReport;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-sweep-impact-'));
fs.writeFileSync(path.join(tmpDir, 'raw-ohlc-scanner-artifacts-sample.json'), `${JSON.stringify({
  events: {
    a: {
      date: '2026-07-20',
      session: 'morning',
      eventTime: '2026-07-20T09:35:00',
      setupCandidateStatus: {
        statuses: [{
          setupType: 'SweepMssFvgRetrace',
          direction: 'SHORT',
          executionStatus: 'Conditional',
          blockReason: 'InvalidStopLocation',
          entry: 7539,
          stop: 7505.5,
          target1: 7488.75,
          target2: 7472,
          riskPoints: 33.5,
          rankScore: 100,
          humanReview: { canExecute: false },
        }, {
          setupType: 'HtfDisplacementMssContinuation',
          direction: 'SHORT',
          executionStatus: 'Conditional',
          blockReason: 'EntryTriggerPending',
          entry: 7538,
          stop: 7550,
          target1: 7520,
          target2: 7514,
          riskPoints: 12,
          rankScore: 95,
          humanReview: { canExecute: false },
        }],
      },
    },
    b: {
      date: '2026-07-20',
      session: 'morning',
      eventTime: '2026-07-20T09:40:00',
      setupCandidateStatus: {
        statuses: [{
          setupType: 'SweepMssFvgRetrace',
          direction: 'LONG',
          executionStatus: 'Conditional',
          blockReason: 'EntryTriggerPending',
          rankScore: 90,
          humanReview: { canExecute: false },
        }],
      },
    },
  },
})}\n`);

const report = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentSelectionImpactSimulationReport({
  exactProofPackagePath: 'proof.json',
  exactProofPackageReport: exactProofPackage,
  scannerPackageDir: tmpDir,
}, '2026-07-20T00:01:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.packageFilesRead, 1);
assert.equal(report.summary.events, 2);
assert.equal(report.summary.eventsWithExactInvalidStopSweep, 1);
assert.equal(report.summary.baselineTopExactInvalidStopSweepEvents, 1);
assert.equal(report.summary.changedTopEvents, 1);
assert.equal(report.summary.changedTopEventsWithReplacement, 1);
assert.equal(report.summary.changedTopEventsWithoutReplacement, 0);
assert.equal(report.summary.canExecuteChangedEvents, 0);
assert.equal(report.summary.tradeMathChangedEvents, 1);
assert.equal(report.summary.runtimeInstallAllowed, false);
assert.equal(report.changedEvents[0].baselineTopSetupType, 'SweepMssFvgRetrace');
assert.equal(report.changedEvents[0].simulatedTopSetupType, 'HtfDisplacementMssContinuation');

const missing = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentSelectionImpactSimulationReport({
  exactProofPackagePath: null,
  exactProofPackageReport: null,
  scannerPackageDir: tmpDir,
}, '2026-07-20T00:02:00.000Z');
assert.equal(missing.status, 'fail');
assert.equal(missing.summary.recommendation, 'fix_missing_input_reports');

const parsed = parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentSelectionImpactSimulationArgs([
  '--exact-proof-package',
  'proof.json',
  '--scanner-package-dir',
  'packages',
  '--out-dir',
  'out',
  '--json',
]);
assert.equal(parsed.exactProofPackagePath, 'proof.json');
assert.equal(parsed.scannerPackageDir, 'packages');
assert.equal(parsed.outDir, 'out');
assert.equal(parsed.json, true);

console.log('unified positive held-local Sweep primary exclusion current selection-impact simulation verified.');
