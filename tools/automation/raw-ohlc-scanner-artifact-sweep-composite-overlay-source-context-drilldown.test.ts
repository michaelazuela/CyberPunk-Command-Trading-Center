import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlaySourceContextDrilldownReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlaySourceContextDrilldownArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-source-context-drilldown';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageReport } from './unified-positive-held-local-preview-replay-package';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport } from './unified-positive-held-local-preview-replay-package-outcome';

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

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'source-context-drilldown-'));
const artifactPath = path.join(tempDir, 'artifact.json');

fs.writeFileSync(artifactPath, `${JSON.stringify({
  events: {
    '2026-07-16T15:05:00': {
      eventTime: '2026-07-16T15:05:00',
      date: '2026-07-16',
      session: 'lunch',
      setupCandidateStatus: {
        statuses: [{
          setupType: 'IntradayMssMicroContinuation',
          direction: 'SHORT',
          detectedStatus: 'Possible',
          executionStatus: 'Conditional',
          blockReason: 'EntryTriggerPending',
          rankScore: 255,
          targetRoom: {
            targetRoomStatus: 'blocked_before_t1',
            obstacleBeforeT1: true,
            targetRoomReason: 'fixture obstacle before T1',
          },
          evidence: ['bearish 5M MSS confirmed', '5M FVG retest'],
          missingEvidence: ['No chase: wait for a completed 5M close below line'],
        }],
      },
    },
  },
}, null, 2)}\n`, 'utf8');

const replayPackage: UnifiedPositiveHeldLocalPreviewReplayPackageReport = {
  reportType: 'unified_positive_held_local_preview_replay_package',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: tempDir, triageReportPath: null, auditDir: tempDir },
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
    readyRows: 1,
    blockedRows: 0,
    directionallyInvalidGeometryRows: 0,
    modelGroups: 1,
    sessionGroups: 1,
    livePromotionAllowedRows: 0,
  },
  rows: [{
    ticketId: '2026-07-16-lunch-IntradayMssMicroContinuation-SHORT-20260716T150500',
    tradeDate: '2026-07-16',
    session: 'lunch',
    instrument: 'MES',
    setupType: 'IntradayMssMicroContinuation',
    direction: 'SHORT',
    proofTime: '2026-07-16T15:05:00',
    firstSeenTime: '2026-07-16T15:05:00',
    lastSeenTime: '2026-07-16T15:05:00',
    occurrences: 1,
    entry: 100,
    stop: 104,
    t1: 94,
    t2: 92,
    riskPoints: 4,
    t1R: 1.5,
    t2R: 2,
    proofState: 'Possible:Conditional:EntryTriggerPending',
    triageScore: 255,
    sourceTapePath: artifactPath,
    barsSource: 'scanner_decision_tape_completed_5m',
    barsLoaded: 10,
    barsAfterProof: 10,
    firstBarTime: '2026-07-16T15:05:00',
    lastBarTime: '2026-07-16T15:55:00',
    outcomeInputStatus: 'ready_for_read_only_outcome_replay',
    blockers: [],
  }],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const outcomeReport: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport = {
  reportType: 'unified_positive_held_local_preview_replay_package_outcome',
  generatedAt: '2026-07-19T00:01:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: tempDir, replayPackagePath: 'package.json' },
  assumptions: {
    oneMesPointValue: 5,
    usesCompletedFiveMinuteBarsOnly: true,
    missingBarsAreNotInvented: true,
    sameBarStopAndTargetUsesConservativeStopFirst: true,
    outcomeIsResearchOnly: true,
    livePromotionAllowed: false,
  },
  summary: {
    packageRows: 1,
    resolvedRows: 0,
    unresolvedRows: 1,
    blockedRows: 0,
    noFillRows: 0,
    stoppedBeforeT1Rows: 0,
    t1OnlyRows: 0,
    t1AndT2Rows: 0,
    noTargetOrStopRows: 1,
    grossResolvedOneMesPl: null,
    modelGroups: [],
    daySessionModelGroups: [],
    livePromotionAllowedRows: 0,
  },
  rows: [{
    ticketId: '2026-07-16-lunch-IntradayMssMicroContinuation-SHORT-20260716T150500',
    tradeDate: '2026-07-16',
    session: 'lunch',
    setupType: 'IntradayMssMicroContinuation',
    direction: 'SHORT',
    proofTime: '2026-07-16T15:05:00',
    outcomeStatus: 'unresolved',
    outcomeLabel: 'no_target_or_stop_hit',
    entry: 100,
    stop: 104,
    t1: 94,
    t2: 92,
    riskPoints: 4,
    barsSource: 'scanner_decision_tape_completed_5m',
    barsLoaded: 10,
    barsAfterProof: 10,
    entryHitTime: '2026-07-16T15:05:00',
    firstReplayBarTime: '2026-07-16T15:10:00',
    stopHitTime: null,
    t1HitTime: null,
    t2HitTime: null,
    maximumFavorableExcursion: 2,
    maximumAdverseExcursion: 3,
    resolvedOneMesPl: null,
    resolvedR: null,
    intrabarAmbiguity: false,
    blockers: [],
  }],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildRawOhlcScannerArtifactSweepCompositeOverlaySourceContextDrilldownReport({
  reportDir: tempDir,
  replayPackagePath: 'package.json',
  outcomeReportPath: 'outcome.json',
  replayPackage,
  outcomeReport,
}, '2026-07-19T00:02:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_source_context_drilldown');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.joinedRows, 1);
assert.equal(report.summary.noChaseTaggedRows, 1);
assert.equal(report.summary.targetRoomBlockedRows, 1);
assert.equal(report.summary.entryTriggerPendingRows, 1);
assert.equal(report.summary.lateDayRows, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.tagSummaries.find((item) => item.tag === 'no_chase')?.rows, 1);
assert.match(report.markdown, /Source Context Drilldown/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlaySourceContextDrilldownArgs([
  '--replay-package',
  'package.json',
  '--outcome-report',
  'outcome.json',
  '--json',
]);
assert.equal(parsed.replayPackage, 'package.json');
assert.equal(parsed.outcomeReport, 'outcome.json');
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay source-context drilldown verified.');
