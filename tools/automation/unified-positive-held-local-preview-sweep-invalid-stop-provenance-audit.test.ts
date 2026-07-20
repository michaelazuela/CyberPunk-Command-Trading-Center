import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildUnifiedPositiveHeldLocalPreviewSweepInvalidStopProvenanceAuditReport,
  parseUnifiedPositiveHeldLocalPreviewSweepInvalidStopProvenanceAuditArgs,
} from './unified-positive-held-local-preview-sweep-invalid-stop-provenance-audit';
import type { UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageReport } from './unified-positive-held-local-preview-sweep-primary-exclusion-current-exact-proof-package';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-sweep-provenance-'));
const sourceFile = path.join(tmpDir, 'conditionalPlanBuilder.ts');
fs.writeFileSync(sourceFile, `
function hasDirectionallyValidStop(direction: Direction, entry: number | null, stop: number | null): boolean {
  return direction === 'LONG' ? stop < entry : stop > entry;
}
function detectIctModelOne(chartContext: ChartContext): IctModelOneReference | null {
  const sweepExtreme = 100;
  if (!isPrice(sweepExtreme)) continue;
  const stop = direction === 'LONG'
    ? roundToTick(sweepExtreme - tick)
    : roundToTick(sweepExtreme + tick);
  const appTargets = targetsFromEntryStop(direction, entry, stop);
  if (!isPrice(appTargets.target1) || !isPrice(appTargets.target2)) continue;
  return null;
}
function makeCandidate(input: Input): SetupCandidate {
  const stopIsDirectionallyValid = hasDirectionallyValidStop(input.direction, input.entry, structureStop);
  let target1 = stopIsDirectionallyValid ? input.target1Override ?? computedTargets.target1 : null;
}
`);
fs.writeFileSync(path.join(tmpDir, 'raw-ohlc-scanner-artifacts-sample.json'), JSON.stringify({
  generatedAt: '2026-07-20T00:00:00.000Z',
  reportType: 'raw_ohlc_scanner_artifact_package',
}));

const exactProofPackage = {
  reportType: 'unified_positive_held_local_preview_sweep_primary_exclusion_current_exact_proof_package',
  generatedAt: '2026-07-20T00:00:00.000Z',
  status: 'pass',
  authority: {} as any,
  source: { evidenceBoundaryAuditPath: 'boundary.json', scannerPackageDir: tmpDir },
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
    sourceFiles: ['raw-ohlc-scanner-artifacts-sample.json'],
    duplicateSourceRows: 1,
    overlapsEvidenceBoundarySlate: false,
  }, {
    proofKey: '2026-07-20|morning|2026-07-20T09:40:00|SHORT|99|95|InvalidStopLocation',
    tradeDate: '2026-07-20',
    session: 'morning',
    eventTime: '2026-07-20T09:40:00',
    direction: 'SHORT',
    executionStatus: 'Conditional',
    blockReason: 'InvalidStopLocation',
    entry: 99,
    stop: 95,
    riskPoints: 4,
    rankScore: 90,
    sourceFiles: ['raw-ohlc-scanner-artifacts-sample.json'],
    duplicateSourceRows: 1,
    overlapsEvidenceBoundarySlate: false,
  }],
  blockers: [],
  recommendations: [],
  markdown: '',
} satisfies UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageReport;

const report = buildUnifiedPositiveHeldLocalPreviewSweepInvalidStopProvenanceAuditReport({
  exactProofPackagePath: 'exact.json',
  exactProofPackageReport: exactProofPackage,
  scannerPackageDir: tmpDir,
  sourceFile,
}, '2026-07-20T00:01:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.exactProofRows, 2);
assert.equal(report.summary.rowsWithStopMissing, 1);
assert.equal(report.summary.rowsWithDirectionallyInvalidStopGeometry, 1);
assert.equal(report.summary.sourcePackageFiles, 1);
assert.equal(report.summary.sourcePackageFirstGeneratedAt, '2026-07-20T00:00:00.000Z');
assert.equal(report.summary.currentSourceHasDetectIctModelOne, true);
assert.equal(report.summary.currentSourceRequiresSweepExtreme, true);
assert.equal(report.summary.currentSourceComputesDirectionalStop, true);
assert.equal(report.summary.currentSourceRequiresTargets, true);
assert.equal(report.summary.currentSourceHasMakeCandidateDirectionalGuard, true);
assert.equal(report.summary.currentSourceCanReturnMissingStopIctModelOne, false);
assert.equal(report.summary.currentSourceCanReturnWrongSideStopIctModelOne, false);
assert.equal(report.summary.runtimeFixJustified, false);
assert.equal(report.summary.recommendation, 'close_runtime_filter_and_refresh_replay_packages');

const missing = buildUnifiedPositiveHeldLocalPreviewSweepInvalidStopProvenanceAuditReport({
  exactProofPackagePath: null,
  exactProofPackageReport: null,
  scannerPackageDir: tmpDir,
  sourceFile,
}, '2026-07-20T00:02:00.000Z');
assert.equal(missing.status, 'fail');
assert.equal(missing.summary.recommendation, 'fix_missing_input_reports');

const parsed = parseUnifiedPositiveHeldLocalPreviewSweepInvalidStopProvenanceAuditArgs([
  '--exact-proof-package',
  'exact.json',
  '--scanner-package-dir',
  'packages',
  '--source-file',
  'source.ts',
  '--out-dir',
  'out',
  '--json',
]);
assert.equal(parsed.exactProofPackagePath, 'exact.json');
assert.equal(parsed.scannerPackageDir, 'packages');
assert.equal(parsed.sourceFile, 'source.ts');
assert.equal(parsed.outDir, 'out');
assert.equal(parsed.json, true);

console.log('unified positive held-local Sweep invalid-stop provenance audit verified.');
