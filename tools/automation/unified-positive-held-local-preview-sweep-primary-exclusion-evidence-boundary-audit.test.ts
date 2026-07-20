import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionEvidenceBoundaryAuditReport,
  parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionEvidenceBoundaryAuditArgs,
} from './unified-positive-held-local-preview-sweep-primary-exclusion-evidence-boundary-audit';
import type { UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactPackageMetadataAuditReport } from './unified-positive-held-local-preview-sweep-primary-exclusion-scanner-artifact-package-metadata-audit';
import type { UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionNonreproductionDrilldownReport } from './unified-positive-held-local-preview-sweep-primary-exclusion-nonreproduction-drilldown';

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
    packageMatches: 2,
    packageFiles: ['raw.json'],
    executionStatusRows: 2,
    blockReasonRows: 2,
    invalidStopLocationRows: 2,
    executableRows: 0,
    conditionalRows: 2,
    blockedRows: 0,
  }, {
    slateId: '2026-07-21|morning',
    tradeDate: '2026-07-21',
    session: 'morning',
    direction: 'LONG',
    baselinePrimaryRowId: '2026-07-21-morning-SweepMssFvgRetrace-LONG',
    packageMatches: 4,
    packageFiles: ['raw.json'],
    executionStatusRows: 4,
    blockReasonRows: 4,
    invalidStopLocationRows: 0,
    executableRows: 0,
    conditionalRows: 4,
    blockedRows: 0,
  }, {
    slateId: '2026-07-22|evening',
    tradeDate: '2026-07-22',
    session: 'evening',
    direction: 'LONG',
    baselinePrimaryRowId: '2026-07-22-evening-SweepMssFvgRetrace-LONG',
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

const nonreproduction = {
  reportType: 'unified_positive_held_local_preview_sweep_primary_exclusion_nonreproduction_drilldown',
  generatedAt: '2026-07-20T00:01:00.000Z',
  status: 'pass',
  authority: {} as any,
  source: { packageMetadataAuditPath: 'audit.json', scannerPackageDir: 'packages' },
  summary: {
    missingSlates: 1,
    unsupportedEveningReplaySession: 1,
    currentScannerDirectionOrDetectionMismatch: 0,
    missingPackageEvents: 0,
    runtimeInstallAllowed: false,
    recommendation: 'keep_research_only_do_not_install_runtime',
  },
  missingSlates: [{
    slateId: '2026-07-22|evening',
    tradeDate: '2026-07-22',
    session: 'evening',
    expectedDirection: 'LONG',
    sameDateSessionPackageEvents: 0,
    sameDateSessionSweepCandidates: 0,
    sweepDirectionCounts: {},
    sweepExecutionStatusCounts: {},
    likelyCause: 'unsupported_evening_replay_session',
  }],
  blockers: [],
  recommendations: [],
  markdown: '',
} satisfies UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionNonreproductionDrilldownReport;

const report = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionEvidenceBoundaryAuditReport({
  packageMetadataAuditPath: 'package-audit.json',
  packageMetadataAuditReport: packageAudit,
  nonreproductionDrilldownPath: 'nonrepro.json',
  nonreproductionDrilldownReport: nonreproduction,
}, '2026-07-20T00:02:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.changedSlates, 3);
assert.equal(report.summary.exactPackageInvalidStopProofSlates, 1);
assert.equal(report.summary.packageCoveredButNotExactInvalidStopProofSlates, 1);
assert.equal(report.summary.heldLocalOnlyExcludedUntilReproducedSlates, 1);
assert.equal(report.summary.unsupportedEveningReplaySessionSlates, 1);
assert.equal(report.summary.runtimeEvidenceEligibleSlates, 1);
assert.equal(report.summary.runtimeInstallAllowed, false);
assert.equal(report.policy.nonreproducedHeldLocalRows, 'exclude_from_runtime_evidence_until_reproduced');
assert.equal(report.rows.find((row) => row.slateId === '2026-07-22|evening')?.runtimeEvidenceDisposition, 'held_local_only_excluded_until_reproduced');

const missing = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionEvidenceBoundaryAuditReport({
  packageMetadataAuditPath: null,
  packageMetadataAuditReport: null,
  nonreproductionDrilldownPath: null,
  nonreproductionDrilldownReport: null,
}, '2026-07-20T00:03:00.000Z');
assert.equal(missing.status, 'fail');
assert.equal(missing.summary.recommendation, 'fix_missing_input_reports');

const parsed = parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionEvidenceBoundaryAuditArgs([
  '--package-metadata-audit',
  'package.json',
  '--nonreproduction-drilldown',
  'nonrepro.json',
  '--out-dir',
  'out',
  '--json',
]);
assert.equal(parsed.packageMetadataAuditPath, 'package.json');
assert.equal(parsed.nonreproductionDrilldownPath, 'nonrepro.json');
assert.equal(parsed.outDir, 'out');
assert.equal(parsed.json, true);

console.log('unified positive held-local Sweep primary exclusion evidence boundary audit verified.');
