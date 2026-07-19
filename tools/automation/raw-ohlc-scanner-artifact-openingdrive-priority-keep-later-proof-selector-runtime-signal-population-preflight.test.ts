import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalPopulationPreflightReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-runtime-signal-population-preflight';

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalPopulationPreflightReport({
  typesText: `
export interface ChartContext { chartTimestamp?: string | null; }
export interface TimeframeMssEvidenceItem { timestamp?: string | null; }
export interface SetupCandidate {
  setupType: SetupType;
  proofSelectionSignal?: SetupCandidateProofSelectionSignal | null;
}
export interface FinalOpportunitySelection { ok: true; }
`,
  setupScannerText: `
export function buildCompletedFiveMinuteProofSelectionSignals() { return {}; }
export function rankSetupCandidate() { return 1; }
`,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_runtime_signal_population_preflight');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.summary.setupCandidateProofSelectionSignalFieldExists, true);
assert.equal(report.summary.setupCandidateTopLevelCompletedBarTimeExists, false);
assert.equal(report.summary.setupScannerBuilderExists, true);
assert.equal(report.summary.setupScannerBuilderExported, true);
assert.equal(report.summary.setupScannerPopulatesProofSelectionSignalInScanOutput, false);
assert.equal(report.summary.chartContextTimestampFieldExists, true);
assert.equal(report.summary.timeframeMssEvidenceTimestampFieldExists, true);
assert.equal(report.summary.safePopulationSourceAvailableForPreflight, true);
assert.equal(report.summary.scannerVisiblePopulationAllowedByThisReport, false);
assert.equal(report.summary.recommendation, 'draft_scanner_output_population_dry_run_next');
assert.match(report.markdown, /Population Preflight/);

const blocked = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalPopulationPreflightReport({
  typesText: 'export interface SetupCandidate { setupType: SetupType; }',
  setupScannerText: 'export function rankSetupCandidate() { return 1; }',
}, '2026-07-19T00:01:00.000Z');

assert.equal(blocked.status, 'fail');
assert.equal(blocked.summary.recommendation, 'fix_inputs');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('proofSelectionSignal field is missing')));

console.log('OpeningDrive keep-later-proof selector proofSelectionSignal population preflight verified.');
