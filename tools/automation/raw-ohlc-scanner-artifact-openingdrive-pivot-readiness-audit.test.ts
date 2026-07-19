import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePivotReadinessAuditReport,
  parseRawOhlcScannerArtifactOpeningDrivePivotReadinessAuditArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-pivot-readiness-audit';

const candidateValidation = {
  status: 'pass',
  summary: {
    validationDecision: 'validated_for_more_research',
  },
};

const combinedSelector = {
  status: 'pass',
  summary: {
    selectedRows: 3,
    selectedSummary: { rows: 3, winners: 1, losses: 0, otherResolved: 2, unresolved: 0, oneMesPl: 438.76 },
    rejectedSummary: { rows: 11, winners: 4, losses: 3, otherResolved: 0, unresolved: 4, oneMesPl: 34.38 },
  },
};

const report = buildRawOhlcScannerArtifactOpeningDrivePivotReadinessAuditReport({
  reportDir: 'reports',
  candidateValidationPath: 'candidate.json',
  combinedSelectorPath: 'selector.json',
  candidateValidation: candidateValidation as any,
  combinedSelector: combinedSelector as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_pivot_readiness_audit');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.pivotReadinessOnly, true);
assert.equal(report.summary.selectorSelectedRows, 3);
assert.equal(report.summary.selectorSelectedLosses, 0);
assert.equal(report.summary.sampleSizeReady, false);
assert.equal(report.summary.recommendation, 'build_fresh_openingdrive_replay_package');
assert.match(report.markdown, /OpeningDrive Pivot Readiness Audit/);

const parsed = parseRawOhlcScannerArtifactOpeningDrivePivotReadinessAuditArgs([
  '--candidate-validation',
  'candidate.json',
  '--combined-selector',
  'selector.json',
  '--json',
]);
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive pivot readiness audit verified.');
