import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildUnifiedPositiveHeldLocalPreviewScannerGeometryPathDiagnosticReport,
} from './unified-positive-held-local-preview-scanner-geometry-path-diagnostic';
import type {
  UnifiedPositiveHeldLocalPreviewGeometrySourceDrilldownReport,
} from './unified-positive-held-local-preview-geometry-source-drilldown';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageReport,
} from './unified-positive-held-local-preview-replay-package';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scanner-geometry-path-'));
const tapePath = path.join(tmpDir, 'scanner-decision-tape-2026-06-12-MES-lunch.json');

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
            entry: 7441,
            stop: 7425,
            target1: 7417,
            target2: 7390.5,
            riskPoints: 16,
            blockReason: 'EntryTriggerPending',
          },
        ],
      },
      candidateLifecycleTrace: {
        createdCandidates: [
          {
            candidateKey: 'SweepMssFvgRetrace|SHORT|scenario|Conditional',
            setupType: 'SweepMssFvgRetrace',
            direction: 'SHORT',
            detectedStatus: 'Possible',
            executionStatus: 'Conditional',
            entry: 7441,
            stop: 7425,
            target1: 7417,
            target2: 7390.5,
            riskPoints: 16,
            filteredOutReason: 'EntryTriggerPending',
            selected: false,
            missingEvidence: ['Outside active setup scan window'],
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
            entry: 7441,
            stop: 7446.75,
            target1: 7432.5,
            target2: 7427.75,
            riskPoints: 5.75,
            blockReason: 'EntryTriggerPending',
          },
        ],
      },
    },
  },
}, null, 2));

const replayPackageReport = {
  reportType: 'unified_positive_held_local_preview_replay_package',
  generatedAt: '2026-07-18T00:00:00.000Z',
  status: 'fail',
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
    triageReportPath: 'triage.json',
    auditDir: tmpDir,
  },
  assumptions: {
    selectedRowsComeFromReadOnlyTriage: true,
    usesScannerDecisionTapeCompleted5mOnly: true,
    missingBarsAreNotInvented: true,
    outcomeIsNotCalculatedInThisStep: true,
    livePromotionAllowed: false,
  },
  summary: {
    selectedRowsRead: 1,
    replayPackageRows: 1,
    readyRows: 0,
    blockedRows: 1,
    directionallyInvalidGeometryRows: 1,
    modelGroups: 1,
    sessionGroups: 1,
    livePromotionAllowedRows: 0,
  },
  rows: [
    {
      ticketId: '2026-06-12-lunch-SweepMssFvgRetrace-SHORT',
      tradeDate: '2026-06-12',
      session: 'lunch',
      instrument: 'MES',
      setupType: 'SweepMssFvgRetrace',
      direction: 'SHORT',
      proofTime: '2026-06-12T12:00:00',
      firstSeenTime: '2026-06-12T12:00:00',
      lastSeenTime: '2026-06-12T12:00:00',
      occurrences: 1,
      entry: 7441,
      stop: 7425,
      t1: 7417,
      t2: 7390.5,
      riskPoints: 16,
      t1R: 1.5,
      t2R: 2,
      proofState: 'source_proof_positive',
      triageScore: 100,
      sourceTapePath: tapePath,
      barsSource: 'scanner_decision_tape_completed_5m',
      barsLoaded: 2,
      barsAfterProof: 2,
      firstBarTime: '2026-06-12T12:00:00.0000000',
      lastBarTime: '2026-06-12T13:35:00.0000000',
      outcomeInputStatus: 'blocked',
      blockers: ['directionally invalid entry-to-stop geometry'],
    },
  ],
  blockers: ['2026-06-12-lunch-SweepMssFvgRetrace-SHORT: directionally invalid entry-to-stop geometry'],
  recommendations: [],
  markdown: '',
} satisfies UnifiedPositiveHeldLocalPreviewReplayPackageReport;

const geometrySourceDrilldownReport = {
  reportType: 'unified_positive_held_local_preview_geometry_source_drilldown',
  generatedAt: '2026-07-18T00:01:00.000Z',
  status: 'pass',
  authority: replayPackageReport.authority,
  source: {
    reportDir: tmpDir,
    replacementBlockerDrilldownPath: 'replacement.json',
    replayPackagePath: 'replay.json',
  },
  assumptions: {
    readsSavedDiagnosticsAndLocalTapesOnly: true,
    geometrySourceOnly: true,
    noLiveFilterInstalled: true,
    livePromotionAllowed: false,
  },
  summary: {
    invalidReplacementRows: 1,
    badGeometryOriginatesInScannerTapeRows: 1,
    rowsWithLaterGeometryValidSameDirectionEvent: 1,
    missingSourceTapeRows: 0,
    livePromotionAllowedRows: 0,
    recommendation: 'fix_scanner_candidate_geometry_before_ranking',
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
      replayGeometryValid: false,
      sourceTapePath: tapePath,
      tapeCandidates: 2,
      firstExactBadTapeEventTime: '2026-06-12T12:00:00.0000000',
      exactBadTapeEvents: 1,
      laterGeometryValidSameDirectionEvents: 1,
      firstLaterGeometryValidEvent: null,
      sourceConclusion: 'bad_geometry_originates_in_scanner_tape',
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
} satisfies UnifiedPositiveHeldLocalPreviewGeometrySourceDrilldownReport;

const report = buildUnifiedPositiveHeldLocalPreviewScannerGeometryPathDiagnosticReport({
  reportDir: tmpDir,
  geometrySourceDrilldownPath: 'geometry.json',
  geometrySourceDrilldownReport,
  replayPackagePath: 'replay.json',
  replayPackageReport,
}, '2026-07-18T00:02:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_scanner_geometry_path_diagnostic');
assert.equal(report.status, 'pass');
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.invalidGeometryRows, 1);
assert.equal(report.summary.exactBadCandidateLifecycleRows, 1);
assert.equal(report.summary.exactBadSetupStatusOnlyRows, 0);
assert.equal(report.summary.rowsWithLaterValidSameDirectionCandidate, 1);
assert.equal(report.summary.recommendation, 'inspect_candidate_builder_before_status_export');
assert.equal(report.rows[0].likelySourceLayer, 'candidate_lifecycle_and_setup_status');
assert.equal(report.rows[0].exactBadSurfaceCount, 2);
assert.equal(report.rows[0].exactBadSetupStatusSurfaceCount, 1);
assert.equal(report.rows[0].exactBadLifecycleSurfaceCount, 1);
assert.equal(report.rows[0].firstValidSameDirectionAfterProofTime, '2026-06-12T13:35:00.0000000');
assert.equal(report.rows[0].firstValidSameDirectionAfterProofEntry, 7441);
assert.equal(report.rows[0].firstValidSameDirectionAfterProofStop, 7446.75);
assert.match(report.markdown, /candidate builder/);

const missing = buildUnifiedPositiveHeldLocalPreviewScannerGeometryPathDiagnosticReport({
  reportDir: tmpDir,
  geometrySourceDrilldownPath: null,
  geometrySourceDrilldownReport: null,
  replayPackagePath: null,
  replayPackageReport: null,
}, '2026-07-18T00:03:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing geometry-source drilldown path'));
assert.ok(missing.blockers.includes('no invalid geometry rows found'));

console.log('unified positive held-local scanner geometry path diagnostic verified.');
