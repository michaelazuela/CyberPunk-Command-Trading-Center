import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionNonreproductionDrilldownReport,
  parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionNonreproductionDrilldownArgs,
} from './unified-positive-held-local-preview-sweep-primary-exclusion-nonreproduction-drilldown';
import type { UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactPackageMetadataAuditReport } from './unified-positive-held-local-preview-sweep-primary-exclusion-scanner-artifact-package-metadata-audit';

const packageAudit = {
  reportType: 'unified_positive_held_local_preview_sweep_primary_exclusion_scanner_artifact_package_metadata_audit',
  generatedAt: '2026-07-20T00:00:00.000Z',
  status: 'fail',
  authority: {} as any,
  source: { dryRunPath: 'dry.json', scannerPackageDir: 'packages' },
  assumptions: {} as any,
  summary: {} as any,
  slates: [{
    slateId: '2026-07-20|morning',
    tradeDate: '2026-07-20',
    session: 'morning',
    direction: 'SHORT',
    baselinePrimaryRowId: '2026-07-20-morning-SweepMssFvgRetrace-SHORT',
    packageMatches: 0,
    packageFiles: [],
    executionStatusRows: 0,
    blockReasonRows: 0,
    invalidStopLocationRows: 0,
    executableRows: 0,
    conditionalRows: 0,
    blockedRows: 0,
  }, {
    slateId: '2026-07-20|evening',
    tradeDate: '2026-07-20',
    session: 'evening',
    direction: 'LONG',
    baselinePrimaryRowId: '2026-07-20-evening-SweepMssFvgRetrace-LONG',
    packageMatches: 0,
    packageFiles: [],
    executionStatusRows: 0,
    blockReasonRows: 0,
    invalidStopLocationRows: 0,
    executableRows: 0,
    conditionalRows: 0,
    blockedRows: 0,
  }],
  blockers: [],
  recommendations: [],
  markdown: '',
} satisfies UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactPackageMetadataAuditReport;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-sweep-nonrepro-'));
fs.writeFileSync(path.join(tmpDir, 'raw-ohlc-scanner-artifacts-MES-2026-07-20-to-2026-07-20-1.json'), `${JSON.stringify({
  events: {
    a: {
      date: '2026-07-20',
      session: 'morning',
      setupCandidateStatus: {
        statuses: [{
          setupType: 'SweepMssFvgRetrace',
          direction: 'LONG',
          executionStatus: 'Conditional',
        }],
      },
    },
  },
})}\n`);

const report = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionNonreproductionDrilldownReport({
  packageMetadataAuditPath: 'audit.json',
  packageMetadataAuditReport: packageAudit,
  scannerPackageDir: tmpDir,
}, '2026-07-20T00:01:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.missingSlates, 2);
assert.equal(report.summary.unsupportedEveningReplaySession, 1);
assert.equal(report.summary.currentScannerDirectionOrDetectionMismatch, 1);
assert.equal(report.summary.runtimeInstallAllowed, false);
assert.equal(report.summary.recommendation, 'keep_research_only_do_not_install_runtime');

const parsed = parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionNonreproductionDrilldownArgs([
  '--package-metadata-audit',
  'audit.json',
  '--scanner-package-dir',
  'packages',
  '--out-dir',
  'out',
  '--json',
]);
assert.equal(parsed.packageMetadataAuditPath, 'audit.json');
assert.equal(parsed.scannerPackageDir, 'packages');
assert.equal(parsed.outDir, 'out');
assert.equal(parsed.json, true);

console.log('unified positive held-local Sweep primary exclusion nonreproduction drilldown verified.');
