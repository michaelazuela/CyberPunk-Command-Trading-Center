import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageReport,
  parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageArgs,
} from './unified-positive-held-local-preview-sweep-primary-exclusion-current-exact-proof-package';
import type { UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionEvidenceBoundaryAuditReport } from './unified-positive-held-local-preview-sweep-primary-exclusion-evidence-boundary-audit';

const boundary = {
  reportType: 'unified_positive_held_local_preview_sweep_primary_exclusion_evidence_boundary_audit',
  generatedAt: '2026-07-20T00:00:00.000Z',
  status: 'pass',
  authority: {} as any,
  source: { packageMetadataAuditPath: 'package.json', nonreproductionDrilldownPath: 'nonrepro.json' },
  assumptions: {} as any,
  policy: {} as any,
  summary: {} as any,
  rows: [{
    slateId: '2026-07-20|morning',
    tradeDate: '2026-07-20',
    session: 'morning',
    expectedDirection: 'SHORT',
    packageMatches: 1,
    invalidStopLocationRows: 1,
    nonreproductionCause: null,
    runtimeEvidenceDisposition: 'eligible_exact_package_invalid_stop_proof',
  }],
  blockers: [],
  recommendations: [],
  markdown: '',
} satisfies UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionEvidenceBoundaryAuditReport;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-sweep-current-proof-'));
const packageJson = {
  events: {
    a: {
      date: '2026-07-20',
      session: 'morning',
      eventTime: '2026-07-20T09:35:00',
      setupCandidateStatus: {
        statuses: [{
          setupType: 'NoInstalledSetup',
          direction: 'SHORT',
          executionStatus: 'Conditional',
          blockReason: 'InvalidStopLocation',
          entry: 7539,
          stop: 7505.5,
          riskPoints: 33.5,
          rankScore: 97,
        }, {
          setupType: 'NoInstalledSetup',
          direction: 'SHORT',
          executionStatus: 'Conditional',
          blockReason: 'EntryTriggerPending',
        }],
      },
    },
    b: {
      date: '2026-07-20',
      session: 'lunch',
      eventTime: '2026-07-20T12:35:00',
      setupCandidateStatus: {
        statuses: [{
          setupType: 'NoInstalledSetup',
          direction: 'LONG',
          executionStatus: 'Conditional',
          blockReason: 'InvalidStopLocation',
          entry: 7539,
          stop: null,
          riskPoints: null,
          rankScore: 97,
        }],
      },
    },
  },
};
fs.writeFileSync(path.join(tmpDir, 'raw-ohlc-scanner-artifacts-MES-2026-07-20-to-2026-07-20-a.json'), `${JSON.stringify(packageJson)}\n`);
fs.writeFileSync(path.join(tmpDir, 'raw-ohlc-scanner-artifacts-MES-2026-07-20-to-2026-07-20-b.json'), `${JSON.stringify(packageJson)}\n`);

const report = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageReport({
  evidenceBoundaryAuditPath: 'boundary.json',
  evidenceBoundaryAuditReport: boundary,
  scannerPackageDir: tmpDir,
}, '2026-07-20T00:01:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.packageFilesRead, 2);
assert.equal(report.summary.rawExactInvalidStopRows, 4);
assert.equal(report.summary.dedupedExactProofRows, 2);
assert.equal(report.summary.sessions.morning, 1);
assert.equal(report.summary.sessions.lunch, 1);
assert.equal(report.summary.directions.SHORT, 1);
assert.equal(report.summary.directions.LONG, 1);
assert.equal(report.summary.rowsWithStopMissing, 1);
assert.equal(report.summary.rowsWithDirectionallyInvalidStopGeometry, 1);
assert.equal(report.summary.rowsOverlappingEvidenceBoundarySlates, 1);
assert.equal(report.summary.heldLocalOnlyRowsIncluded, 0);
assert.equal(report.summary.runtimeInstallAllowed, false);
assert.equal(report.rows[0].duplicateSourceRows, 2);
assert.equal(report.rows[0].sourceFiles.length, 2);

const missing = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageReport({
  evidenceBoundaryAuditPath: null,
  evidenceBoundaryAuditReport: null,
  scannerPackageDir: tmpDir,
}, '2026-07-20T00:02:00.000Z');
assert.equal(missing.status, 'fail');
assert.equal(missing.summary.recommendation, 'fix_missing_input_reports');

const parsed = parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageArgs([
  '--evidence-boundary-audit',
  'boundary.json',
  '--scanner-package-dir',
  'packages',
  '--out-dir',
  'out',
  '--json',
]);
assert.equal(parsed.evidenceBoundaryAuditPath, 'boundary.json');
assert.equal(parsed.scannerPackageDir, 'packages');
assert.equal(parsed.outDir, 'out');
assert.equal(parsed.json, true);

console.log('unified positive held-local Sweep primary exclusion current exact-proof package verified.');
