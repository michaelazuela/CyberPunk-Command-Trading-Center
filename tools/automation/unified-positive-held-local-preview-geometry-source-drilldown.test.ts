import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildUnifiedPositiveHeldLocalPreviewGeometrySourceDrilldownReport,
} from './unified-positive-held-local-preview-geometry-source-drilldown';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageReport,
} from './unified-positive-held-local-preview-replay-package';
import type {
  UnifiedPositiveHeldLocalPreviewReplacementBlockerDrilldownReport,
} from './unified-positive-held-local-preview-replacement-blocker-drilldown';

const authority = {
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
} as const;

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'geometry-source-drilldown-'));
const tapePath = path.join(tempDir, 'scanner-decision-tape.json');
fs.writeFileSync(tapePath, JSON.stringify({
  events: {
    '2026-06-10T13:50:00.0000000': {
      setupCandidateStatus: {
        statuses: [{
          setupType: 'NoInstalledSetup',
          direction: 'LONG',
          executionStatus: 'Conditional',
          blockReason: 'EntryTriggerPending',
          entry: 7308.25,
          stop: 7339.5,
          target1: 7355.25,
          target2: 7370.75,
          riskPoints: 31.25,
        }],
      },
    },
    '2026-06-10T14:45:00.0000000': {
      setupCandidateStatus: {
        statuses: [{
          setupType: 'NoInstalledSetup',
          direction: 'LONG',
          executionStatus: 'Conditional',
          blockReason: 'EntryTriggerPending',
          entry: 7308.25,
          stop: 7305,
          target1: 7313.25,
          target2: 7320,
          riskPoints: 3.25,
        }],
      },
    },
  },
}), 'utf8');

const replacement = {
  reportType: 'unified_positive_held_local_preview_replacement_blocker_drilldown',
  generatedAt: '2026-07-18T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    reportDir: 'reports',
    companionFilterPath: 'companion.json',
    installedScoreComparisonPath: 'installed.json',
    sourceProofTimingPath: 'timing.json',
    replayPackageOutcomePath: 'outcome.json',
  },
  assumptions: {
    researchOnly: true,
    readsSavedDiagnosticsOnly: true,
    replacementMustBeHumanReviewAndGeometryValid: true,
    noLiveFilterInstalled: true,
    livePromotionAllowed: false,
  },
  summary: {
    changedSlateReplacementRows: 1,
    viableReplacementRows: 0,
    directionallyInvalidGeometryRows: 1,
    notHumanReviewStateRows: 0,
    blockedOrMissingTimingRows: 0,
    missingOutcomeRows: 0,
    livePromotionAllowedRows: 0,
    recommendation: 'fix_replacement_geometry_source_before_rank_changes',
  },
  rows: [{
    ticketId: 'bad-long',
    slateId: '2026-06-10|lunch',
    tradeDate: '2026-06-10',
    session: 'lunch',
    setupType: 'NoInstalledSetup',
    direction: 'LONG',
    candidateBookState: 'watch',
    executionStatus: 'Conditional',
    blockReason: 'EntryTriggerPending',
    installedScore: 79.32,
    outcomeBucket: 'blocked',
    outcomeLabel: 'blocked',
    entry: 7308.25,
    stop: 7339.5,
    riskPoints: 31.25,
    proofTime: '2026-06-10T13:50:00',
    entryHitTime: null,
    barsAfterProof: 20,
    blockers: ['directionally invalid entry-to-stop geometry'],
    geometryValid: false,
    replacementViable: false,
    failureClass: 'directionally_invalid_entry_stop_geometry',
  }],
  blockers: [],
  recommendations: [],
  markdown: '',
} satisfies UnifiedPositiveHeldLocalPreviewReplacementBlockerDrilldownReport;

const replayPackage = {
  reportType: 'unified_positive_held_local_preview_replay_package',
  generatedAt: '2026-07-18T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    reportDir: 'reports',
    intakeTriagePath: 'intake.json',
  },
  assumptions: {
    usesSelectedReplayPackageOnly: true,
    readsLocalScannerDecisionTapesOnly: true,
    completed5mBarsOnly: true,
    noLivePromotion: true,
  },
  summary: {
    triageRows: 1,
    packageRows: 1,
    readyRows: 1,
    blockedRows: 0,
    livePromotionAllowedRows: 0,
  },
  rows: [{
    ticketId: 'bad-long',
    tradeDate: '2026-06-10',
    session: 'lunch',
    instrument: 'MES',
    setupType: 'NoInstalledSetup',
    direction: 'LONG',
    proofTime: '2026-06-10T13:50:00',
    firstSeenTime: '2026-06-10T13:50:00.0000000',
    lastSeenTime: '2026-06-10T15:25:00.0000000',
    occurrences: 14,
    entry: 7308.25,
    stop: 7339.5,
    t1: 7355.25,
    t2: 7370.75,
    riskPoints: 31.25,
    t1R: 1.5,
    t2R: 2,
    proofState: 'scanner_held_complete',
    triageScore: 153,
    sourceTapePath: tapePath,
    barsSource: 'scanner_decision_tape_completed_5m',
    barsLoaded: 42,
    barsAfterProof: 20,
    firstBarTime: '2026-06-10T12:00:00',
    lastBarTime: '2026-06-10T15:25:00',
    outcomeInputStatus: 'ready_for_read_only_outcome_replay',
    blockers: [],
  }],
  blockers: [],
  recommendations: [],
  markdown: '',
} as unknown as UnifiedPositiveHeldLocalPreviewReplayPackageReport;

const report = buildUnifiedPositiveHeldLocalPreviewGeometrySourceDrilldownReport({
  reportDir: 'reports',
  replacementBlockerDrilldownPath: 'replacement.json',
  replacementBlockerDrilldownReport: replacement,
  replayPackagePath: 'package.json',
  replayPackageReport: replayPackage,
}, '2026-07-18T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.invalidReplacementRows, 1);
assert.equal(report.summary.badGeometryOriginatesInScannerTapeRows, 1);
assert.equal(report.summary.rowsWithLaterGeometryValidSameDirectionEvent, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'fix_scanner_candidate_geometry_before_ranking');
assert.equal(report.rows[0]?.firstExactBadTapeEventTime, '2026-06-10T13:50:00.0000000');
assert.equal(report.rows[0]?.exactBadTapeEvents, 1);
assert.equal(report.rows[0]?.firstLaterGeometryValidEvent?.eventTime, '2026-06-10T14:45:00.0000000');
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.changesEntryStopTargets, false);

const blocked = buildUnifiedPositiveHeldLocalPreviewGeometrySourceDrilldownReport({
  reportDir: 'reports',
  replacementBlockerDrilldownPath: null,
  replacementBlockerDrilldownReport: null,
  replayPackagePath: 'package.json',
  replayPackageReport: replayPackage,
}, '2026-07-18T00:01:00.000Z');

assert.equal(blocked.status, 'fail');
assert.equal(blocked.summary.recommendation, 'reject_missing_source');
assert.ok(blocked.blockers.some((item) => item.includes('missing replacement-blocker drilldown path')));

fs.rmSync(tempDir, { recursive: true, force: true });

console.log('unified positive held-local geometry source drilldown verified.');
