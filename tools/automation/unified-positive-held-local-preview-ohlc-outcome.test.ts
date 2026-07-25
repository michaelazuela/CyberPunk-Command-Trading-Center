import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildUnifiedPositiveHeldLocalPreviewOhlcOutcomeReport,
} from './unified-positive-held-local-preview-ohlc-outcome';
import type { UnifiedPositiveHeldLocalTicketAdapterReport } from './unified-positive-held-local-ticket-adapter';
import type { UnifiedPositiveHeldLocalPreviewReplayQueueReport } from './unified-positive-held-local-preview-replay-queue';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'held-local-ohlc-outcome-'));
const marketBarsJson = path.join(tempDir, 'market-bars.json');

fs.writeFileSync(marketBarsJson, `${JSON.stringify({
  reportType: 'raw_ohlc_source_canonical_market_bars',
  bars: {
    '5m': [
      { time: '2026-06-16T10:05:00', open: 101, high: 101.5, low: 100.5, close: 101 },
      { time: '2026-06-16T10:10:00', open: 101, high: 103, low: 100.75, close: 102.5 },
      { time: '2026-06-16T10:15:00', open: 102.5, high: 106, low: 102.25, close: 105.5 },
      { time: '2026-06-17T10:05:00', open: 201, high: 201.5, low: 200.5, close: 201 },
      { time: '2026-06-17T10:10:00', open: 201, high: 203, low: 198.5, close: 200 },
    ],
  },
}, null, 2)}\n`, 'utf8');

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

const queue: UnifiedPositiveHeldLocalPreviewReplayQueueReport = {
  reportType: 'unified_positive_held_local_preview_replay_queue',
  generatedAt: '2026-07-17T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    decisionSummaryPath: 'decision.json',
    heldLocalAdapterPath: 'adapter.json',
    guardedReplayPath: 'guarded.json',
    previewPayloadPath: 'payload.json',
  },
  summary: {
    decisionRows: 3,
    queuedRows: 3,
    replayReadyRows: 3,
    blockedRows: 0,
    grossOneMesPlAvailableRows: 0,
    grossOneMesPlUnavailableRows: 3,
    grossOneMesPl: null,
    livePromotionAllowedRows: 0,
    explicitReviewerQueuedRows: 3,
    systemNoteDrivenQueueRows: 0,
  },
  rows: [
    {
      ticketId: '2026-06-16-morning-raidReclaim-LONG',
      tradeDate: '2026-06-16',
      session: 'morning',
      setupType: 'raidReclaim',
      direction: 'LONG',
      sourceSnapshotId: 'scanner-1',
      replayStatus: 'ready_for_read_only_outcome_replay',
      entry: 101,
      stop: 99,
      t1: 104,
      t2: 105,
      riskPoints: 2,
      t1R: 1.5,
      t2R: 2,
      oneMesPlStatus: 'not_available_in_local_artifacts',
      oneMesPl: null,
      queueSource: 'explicit_reviewer_candidate_for_later_research',
      systemNotesAffectQueue: false,
      evidence: {
        decisionQueued: true,
        explicitReviewerDisposition: true,
        adapterArtifactCreated: true,
        guardedReplayPass: true,
        previewPayloadPass: true,
        zeroLivePublishBehaviorChange: true,
        canExecute: false,
        publishDiscord: false,
        shouldPost: false,
        writesSupabase: false,
      },
      blockers: [],
    },
    {
      ticketId: '2026-06-17-morning-raidReclaim-LONG',
      tradeDate: '2026-06-17',
      session: 'morning',
      setupType: 'raidReclaim',
      direction: 'LONG',
      sourceSnapshotId: 'scanner-2',
      replayStatus: 'ready_for_read_only_outcome_replay',
      entry: 201,
      stop: 199,
      t1: 203,
      t2: 205,
      riskPoints: 2,
      t1R: 1,
      t2R: 2,
      oneMesPlStatus: 'not_available_in_local_artifacts',
      oneMesPl: null,
      queueSource: 'explicit_reviewer_candidate_for_later_research',
      systemNotesAffectQueue: false,
      evidence: {
        decisionQueued: true,
        explicitReviewerDisposition: true,
        adapterArtifactCreated: true,
        guardedReplayPass: true,
        previewPayloadPass: true,
        zeroLivePublishBehaviorChange: true,
        canExecute: false,
        publishDiscord: false,
        shouldPost: false,
        writesSupabase: false,
      },
      blockers: [],
    },
    {
      ticketId: '2026-06-18-morning-SweepMssFvgRetrace-LONG',
      tradeDate: '2026-06-18',
      session: 'morning',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      sourceSnapshotId: 'scanner-3',
      replayStatus: 'ready_for_read_only_outcome_replay',
      entry: 301,
      stop: 299,
      t1: 304,
      t2: 305,
      riskPoints: 2,
      t1R: 1.5,
      t2R: 2,
      oneMesPlStatus: 'not_available_in_local_artifacts',
      oneMesPl: null,
      queueSource: 'explicit_reviewer_candidate_for_later_research',
      systemNotesAffectQueue: false,
      evidence: {
        decisionQueued: true,
        explicitReviewerDisposition: true,
        adapterArtifactCreated: true,
        guardedReplayPass: true,
        previewPayloadPass: true,
        zeroLivePublishBehaviorChange: true,
        canExecute: false,
        publishDiscord: false,
        shouldPost: false,
        writesSupabase: false,
      },
      blockers: [],
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

function adapterRow(ticketId: string, triggerCondition: string): UnifiedPositiveHeldLocalTicketAdapterReport['rows'][number] {
  return {
    ticketId,
    sourceSnapshotId: 'scanner',
    session: ticketId.includes('morning') ? 'morning' : null,
    setupType: 'raidReclaim',
    direction: 'LONG',
    adapterStatus: 'held_local_artifact_created',
    artifact: {
      canExecute: false,
      publishDiscord: false,
      deskTicket: { triggerCondition },
      deskPublishDecision: { triggerCondition },
    } as UnifiedPositiveHeldLocalTicketAdapterReport['rows'][number]['artifact'],
    blockers: [],
  };
}

const adapter: UnifiedPositiveHeldLocalTicketAdapterReport = {
  reportType: 'unified_positive_held_local_ticket_adapter',
  generatedAt: '2026-07-17T00:01:00.000Z',
  authority: {
    readOnly: true,
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
  },
  source: { contractComparisonPath: 'comparison.json' },
  summary: {
    comparisonRowsLoaded: 3,
    heldLocalArtifactsCreated: 3,
    blockedContractGapRows: 0,
    shouldPostFalseArtifacts: 3,
    canExecuteFalseArtifacts: 3,
    publishDiscordFalseArtifacts: 3,
  },
  rows: [
    adapterRow('2026-06-16-morning-raidReclaim-LONG', 'Fresh completed 5M proof printed at 2026-06-16T10:05:00.'),
    adapterRow('2026-06-17-morning-raidReclaim-LONG', 'Fresh completed 5M proof printed at 2026-06-17T10:05:00.'),
    adapterRow('2026-06-18-morning-SweepMssFvgRetrace-LONG', 'Fresh completed 5M proof printed with missing timestamp.'),
  ],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewOhlcOutcomeReport({
  replayQueuePath: 'queue.json',
  replayQueueReport: queue,
  heldLocalAdapterPath: 'adapter.json',
  heldLocalAdapterReport: adapter,
  marketBarsJsonPath: marketBarsJson,
  auditDir: tempDir,
}, '2026-07-17T00:02:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_ohlc_outcome');
assert.equal(report.status, 'fail');
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.queuedRows, 3);
assert.equal(report.summary.resolvedRows, 2);
assert.equal(report.summary.blockedRows, 1);
assert.equal(report.summary.grossResolvedOneMesPl, 10);
assert.equal(report.summary.raidReclaimResolvedOneMesPl, 10);
assert.equal(report.summary.sweepMssFvgRetraceResolvedOneMesPl, null);

const winner = report.rows.find((row) => row.ticketId === '2026-06-16-morning-raidReclaim-LONG');
assert.equal(winner?.outcomeStatus, 'resolved');
assert.equal(winner?.outcomeLabel, 't1_and_t2_hit');
assert.equal(winner?.resolvedOneMesPl, 20);
assert.equal(winner?.resolvedR, 2);

const conservative = report.rows.find((row) => row.ticketId === '2026-06-17-morning-raidReclaim-LONG');
assert.equal(conservative?.outcomeStatus, 'resolved');
assert.equal(conservative?.outcomeLabel, 'stopped_before_t1');
assert.equal(conservative?.intrabarAmbiguity, true);
assert.equal(conservative?.resolvedOneMesPl, -10);
assert.equal(conservative?.resolvedR, -1);

const blocked = report.rows.find((row) => row.ticketId === '2026-06-18-morning-SweepMssFvgRetrace-LONG');
assert.equal(blocked?.outcomeStatus, 'blocked');
assert.ok(blocked?.blockers.includes('missing completed 5M proof time from held-local adapter'));
assert.ok(report.blockers.some((blocker) => blocker.includes('missing completed 5M proof time')));
assert.match(report.markdown, /local-only read-only OHLC outcome replay/);

console.log('unified positive held-local preview OHLC outcome verified.');
