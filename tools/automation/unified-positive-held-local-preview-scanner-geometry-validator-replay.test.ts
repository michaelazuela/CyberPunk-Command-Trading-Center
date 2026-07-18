import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildUnifiedPositiveHeldLocalPreviewScannerGeometryValidatorReplayReport,
} from './unified-positive-held-local-preview-scanner-geometry-validator-replay';
import type {
  UnifiedPositiveHeldLocalPreviewScannerGeometryPathDiagnosticReport,
} from './unified-positive-held-local-preview-scanner-geometry-path-diagnostic';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scanner-geometry-validator-replay-'));
const tapePath = path.join(tmpDir, 'scanner-decision-tape.json');

fs.writeFileSync(tapePath, JSON.stringify({
  events: {
    '2026-06-12T12:00:00.0000000': {
      setupCandidateStatus: {
        statuses: [
          {
            setupType: 'SweepMssFvgRetrace',
            direction: 'SHORT',
            detectedStatus: 'Possible',
            executionStatus: 'Conditional',
            blockReason: 'EntryTriggerPending',
            entry: 7441,
            stop: 7425,
            target1: 7417,
            target2: 7390.5,
            riskPoints: 16,
          },
        ],
      },
    },
    '2026-06-12T13:35:00.0000000': {
      setupCandidateStatus: {
        statuses: [
          {
            setupType: 'SweepMssFvgRetrace',
            direction: 'SHORT',
            detectedStatus: 'Possible',
            executionStatus: 'Conditional',
            blockReason: 'EntryTriggerPending',
            entry: 7441,
            stop: 7446.75,
            target1: 7432.5,
            target2: 7427.75,
            riskPoints: 5.75,
          },
        ],
      },
    },
  },
}, null, 2));

const pathReport = {
  reportType: 'unified_positive_held_local_preview_scanner_geometry_path_diagnostic',
  generatedAt: '2026-07-18T00:00:00.000Z',
  status: 'pass',
  authority: {
    readOnly: true,
    localOnly: true,
    researchOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    runsSetupScanner: false,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRiskRules: false,
    changesBridgeBehavior: false,
    changesDiscordPosting: false,
    changesAppRuntime: false,
  },
  source: {
    reportDir: tmpDir,
    geometrySourceDrilldownPath: 'geometry-source.json',
    replayPackagePath: 'replay-package.json',
  },
  assumptions: {
    readsSavedDiagnosticsAndLocalTapesOnly: true,
    noLiveFilterInstalled: true,
    candidatePathOnly: true,
    livePromotionAllowed: false,
  },
  summary: {
    invalidGeometryRows: 1,
    exactBadCandidateLifecycleRows: 0,
    exactBadSetupStatusOnlyRows: 1,
    rowsWithLaterValidSameDirectionCandidate: 1,
    missingTapeRows: 0,
    livePromotionAllowedRows: 0,
    recommendation: 'inspect_setup_status_export_mapping',
  },
  rows: [
    {
      ticketId: '2026-06-12-lunch-SweepMssFvgRetrace-SHORT',
      tradeDate: '2026-06-12',
      session: 'lunch',
      setupType: 'SweepMssFvgRetrace',
      direction: 'SHORT',
      replayProofTime: '2026-06-12T12:00:00',
      replayEntry: 7441,
      replayStop: 7425,
      sourceTapePath: tapePath,
      exactBadSurfaceCount: 1,
      exactBadSurfacePaths: ['2026-06-12T12:00:00.0000000 setupCandidateStatus.statuses[0]'],
      exactBadLifecycleSurfaceCount: 0,
      exactBadSetupStatusSurfaceCount: 1,
      firstValidSameDirectionAfterProofTime: '2026-06-12T13:35:00.0000000',
      firstValidSameDirectionAfterProofPath: 'setupCandidateStatus.statuses[0]',
      firstValidSameDirectionAfterProofEntry: 7441,
      firstValidSameDirectionAfterProofStop: 7446.75,
      likelySourceLayer: 'setup_status_only',
      recommendedNextAction: 'inspect_setup_status_export_mapping',
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
} satisfies UnifiedPositiveHeldLocalPreviewScannerGeometryPathDiagnosticReport;

const report = buildUnifiedPositiveHeldLocalPreviewScannerGeometryValidatorReplayReport({
  reportDir: tmpDir,
  scannerGeometryPathDiagnosticPath: 'path.json',
  scannerGeometryPathDiagnosticReport: pathReport,
}, '2026-07-18T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_scanner_geometry_validator_replay');
assert.equal(report.status, 'pass');
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.geometryPathRows, 1);
assert.equal(report.summary.replayRows, 2);
assert.equal(report.summary.invalidRowsReplayed, 1);
assert.equal(report.summary.invalidRowsDemoted, 1);
assert.equal(report.summary.laterValidRowsReplayed, 1);
assert.equal(report.summary.laterValidRowsPreserved, 1);
assert.equal(report.summary.levelDriftRows, 0);
assert.equal(report.summary.recommendation, 'validator_blocks_bad_geometry_and_preserves_later_valid_candidates');

const invalid = report.rows.find((row) => row.geometryValidBefore === false);
assert.equal(invalid?.beforeExecutionStatus, 'Conditional');
assert.equal(invalid?.afterExecutionStatus, 'Blocked');
assert.equal(invalid?.afterBlockReason, 'InvalidStopLocation');
assert.equal(invalid?.preservedLevels, true);

const valid = report.rows.find((row) => row.geometryValidBefore === true);
assert.equal(valid?.beforeExecutionStatus, 'Conditional');
assert.equal(valid?.afterExecutionStatus, 'Conditional');
assert.equal(valid?.afterBlockReason, 'EntryTriggerPending');
assert.equal(valid?.preservedLevels, true);

const missing = buildUnifiedPositiveHeldLocalPreviewScannerGeometryValidatorReplayReport({
  reportDir: tmpDir,
  scannerGeometryPathDiagnosticPath: null,
  scannerGeometryPathDiagnosticReport: null,
}, '2026-07-18T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing scanner geometry-path diagnostic path'));
assert.ok(missing.blockers.includes('no candidate surfaces replayed'));

console.log('unified positive held-local scanner geometry validator replay verified.');
