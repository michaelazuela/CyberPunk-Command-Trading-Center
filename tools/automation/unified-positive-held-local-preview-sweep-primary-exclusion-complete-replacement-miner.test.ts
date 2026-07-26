import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCompleteReplacementMinerReport,
  parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCompleteReplacementMinerArgs,
} from './unified-positive-held-local-preview-sweep-primary-exclusion-complete-replacement-miner';
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
    proofKey: '2026-07-20|morning|2026-07-20T09:35:00|LONG|100|null|InvalidStopLocation',
    tradeDate: '2026-07-20',
    session: 'morning',
    eventTime: '2026-07-20T09:35:00',
    direction: 'LONG',
    executionStatus: 'Conditional',
    blockReason: 'InvalidStopLocation',
    entry: 100,
    stop: null,
    riskPoints: null,
    rankScore: 100,
    sourceFiles: ['raw.json'],
    duplicateSourceRows: 1,
    overlapsEvidenceBoundarySlate: true,
  }],
  blockers: [],
  recommendations: [],
  markdown: '',
} satisfies UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageReport;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-sweep-complete-replacement-'));
fs.writeFileSync(path.join(tmpDir, 'raw-ohlc-scanner-artifacts-sample.json'), `${JSON.stringify({
  events: {
    sample: {
      date: '2026-07-20',
      session: 'morning',
      eventTime: '2026-07-20T09:35:00',
      setupCandidateStatus: {
        statuses: [{
          setupType: 'NoInstalledSetup',
          direction: 'LONG',
          executionStatus: 'Conditional',
          blockReason: 'InvalidStopLocation',
          entry: 100,
          stop: null,
          target1: null,
          target2: null,
          riskPoints: null,
          rankScore: 100,
          humanReview: { canExecute: false },
        }, {
          setupType: 'NoInstalledSetup',
          direction: 'LONG',
          executionStatus: 'Conditional',
          blockReason: null,
          entry: 101,
          stop: 97,
          target1: 107,
          target2: 109,
          riskPoints: 4,
          rankScore: 95,
          humanReview: { canExecute: false },
        }],
      },
    },
  },
})}\n`);

const report = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCompleteReplacementMinerReport({
  exactProofPackagePath: 'exact.json',
  exactProofPackageReport: exactProofPackage,
  scannerPackageDir: tmpDir,
}, '2026-07-20T00:01:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.packageFilesRead, 1);
assert.equal(report.summary.candidateRows, 2);
assert.equal(report.summary.events, 1);
assert.equal(report.summary.eventsWithExactInvalidStopSweep, 1);
assert.equal(report.summary.baselineTopExactInvalidStopSweepEvents, 1);
assert.equal(report.summary.baselineTopEventsWithReplacement, 1);
assert.equal(report.summary.completeReplacementEvents, 1);
assert.equal(report.summary.completeReplacementCanExecuteTrueEvents, 0);
assert.equal(report.summary.runtimeProposalCandidateEvents, 1);
assert.equal(report.summary.runtimeInstallAllowed, false);
assert.equal(report.summary.recommendation, 'investigate_complete_replacements');
assert.equal(report.events[0].replacementSetupType, 'NoInstalledSetup');
assert.equal(report.events[0].replacementHasCompletePlan, true);

const missing = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCompleteReplacementMinerReport({
  exactProofPackagePath: null,
  exactProofPackageReport: null,
  scannerPackageDir: tmpDir,
}, '2026-07-20T00:02:00.000Z');
assert.equal(missing.status, 'fail');
assert.equal(missing.summary.recommendation, 'fix_missing_input_reports');

const parsed = parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCompleteReplacementMinerArgs([
  '--exact-proof-package',
  'exact.json',
  '--scanner-package-dir',
  'packages',
  '--out-dir',
  'out',
  '--json',
]);
assert.equal(parsed.exactProofPackagePath, 'exact.json');
assert.equal(parsed.scannerPackageDir, 'packages');
assert.equal(parsed.outDir, 'out');
assert.equal(parsed.json, true);

console.log('unified positive held-local Sweep primary exclusion complete replacement miner verified.');
