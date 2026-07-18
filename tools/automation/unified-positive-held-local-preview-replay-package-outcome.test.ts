import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildUnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport,
} from './unified-positive-held-local-preview-replay-package-outcome';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageReport } from './unified-positive-held-local-preview-replay-package';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'held-local-replay-package-outcome-'));
const auditDir = path.join(tempRoot, 'discord-audit');
fs.mkdirSync(auditDir, { recursive: true });

function writeTape(fileName: string, events: Record<string, unknown>): string {
  const tapePath = path.join(auditDir, fileName);
  fs.writeFileSync(tapePath, JSON.stringify({
    reportType: 'scanner_decision_event_tape',
    events,
  }, null, 2));
  return tapePath;
}

const longTape = writeTape('scanner-decision-tape-2026-06-16-MES-morning.json', {
  '2026-06-16T10:00:00.0000000': {
    completed5m: {
      time: '2026-06-16T10:00:00.0000000',
      open: 99,
      high: 100.25,
      low: 98.75,
      close: 100,
    },
  },
  '2026-06-16T10:05:00.0000000': {
    completed5m: {
      time: '2026-06-16T10:05:00.0000000',
      open: 100,
      high: 103.25,
      low: 99.75,
      close: 102.5,
    },
  },
  '2026-06-16T10:10:00.0000000': {
    completed5m: {
      time: '2026-06-16T10:10:00.0000000',
      open: 102.5,
      high: 104.25,
      low: 102,
      close: 104,
    },
  },
});

const shortTape = writeTape('scanner-decision-tape-2026-06-17-MES-lunch.json', {
  '2026-06-17T13:00:00.0000000': {
    completed5m: {
      time: '2026-06-17T13:00:00.0000000',
      open: 201,
      high: 201.5,
      low: 199.5,
      close: 200,
    },
  },
  '2026-06-17T13:05:00.0000000': {
    completed5m: {
      time: '2026-06-17T13:05:00.0000000',
      open: 200,
      high: 206,
      low: 199,
      close: 205.5,
    },
  },
});

const noFillTape = writeTape('scanner-decision-tape-2026-06-18-MES-morning.json', {
  '2026-06-18T10:00:00.0000000': {
    completed5m: {
      time: '2026-06-18T10:00:00.0000000',
      open: 90,
      high: 92,
      low: 89,
      close: 91,
    },
  },
  '2026-06-18T10:05:00.0000000': {
    completed5m: {
      time: '2026-06-18T10:05:00.0000000',
      open: 91,
      high: 94,
      low: 90,
      close: 93,
    },
  },
});

const replayPackageReport: UnifiedPositiveHeldLocalPreviewReplayPackageReport = {
  reportType: 'unified_positive_held_local_preview_replay_package',
  generatedAt: '2026-07-17T00:00:00.000Z',
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
    reportDir: tempRoot,
    triageReportPath: 'triage.json',
    auditDir,
  },
  assumptions: {
    selectedRowsComeFromReadOnlyTriage: true,
    usesScannerDecisionTapeCompleted5mOnly: true,
    missingBarsAreNotInvented: true,
    outcomeIsNotCalculatedInThisStep: true,
    livePromotionAllowed: false,
  },
  summary: {
    selectedRowsRead: 3,
    replayPackageRows: 3,
    readyRows: 3,
    blockedRows: 0,
    directionallyInvalidGeometryRows: 0,
    modelGroups: 3,
    sessionGroups: 2,
    livePromotionAllowedRows: 0,
  },
  rows: [
    {
      ticketId: '2026-06-16-morning-OpeningDriveFvgContinuation-LONG',
      tradeDate: '2026-06-16',
      session: 'morning',
      instrument: 'MES',
      setupType: 'OpeningDriveFvgContinuation',
      direction: 'LONG',
      proofTime: '2026-06-16T10:00:00.0000000',
      firstSeenTime: '2026-06-16T10:00:00.0000000',
      lastSeenTime: '2026-06-16T10:10:00.0000000',
      occurrences: 3,
      entry: 100,
      stop: 98,
      t1: 103,
      t2: 104,
      riskPoints: 2,
      t1R: 1.5,
      t2R: 2,
      proofState: 'human_review_ready',
      triageScore: 220,
      sourceTapePath: longTape,
      barsSource: 'scanner_decision_tape_completed_5m',
      barsLoaded: 3,
      barsAfterProof: 3,
      firstBarTime: '2026-06-16T10:00:00',
      lastBarTime: '2026-06-16T10:10:00',
      outcomeInputStatus: 'ready_for_read_only_outcome_replay',
      blockers: [],
    },
    {
      ticketId: '2026-06-17-lunch-AfterLunchDriveFvgContinuation-SHORT',
      tradeDate: '2026-06-17',
      session: 'lunch',
      instrument: 'MES',
      setupType: 'AfterLunchDriveFvgContinuation',
      direction: 'SHORT',
      proofTime: '2026-06-17T13:00:00.0000000',
      firstSeenTime: '2026-06-17T13:00:00.0000000',
      lastSeenTime: '2026-06-17T13:05:00.0000000',
      occurrences: 2,
      entry: 200,
      stop: 205,
      t1: 192.5,
      t2: 190,
      riskPoints: 5,
      t1R: 1.5,
      t2R: 2,
      proofState: 'after_lunch_drive_armed',
      triageScore: 200,
      sourceTapePath: shortTape,
      barsSource: 'scanner_decision_tape_completed_5m',
      barsLoaded: 2,
      barsAfterProof: 2,
      firstBarTime: '2026-06-17T13:00:00',
      lastBarTime: '2026-06-17T13:05:00',
      outcomeInputStatus: 'ready_for_read_only_outcome_replay',
      blockers: [],
    },
    {
      ticketId: '2026-06-18-morning-IntradayMssMicroContinuation-LONG',
      tradeDate: '2026-06-18',
      session: 'morning',
      instrument: 'MES',
      setupType: 'IntradayMssMicroContinuation',
      direction: 'LONG',
      proofTime: '2026-06-18T10:00:00.0000000',
      firstSeenTime: '2026-06-18T10:00:00.0000000',
      lastSeenTime: '2026-06-18T10:05:00.0000000',
      occurrences: 2,
      entry: 100,
      stop: 96,
      t1: 106,
      t2: 108,
      riskPoints: 4,
      t1R: 1.5,
      t2R: 2,
      proofState: 'human_review_ready',
      triageScore: 190,
      sourceTapePath: noFillTape,
      barsSource: 'scanner_decision_tape_completed_5m',
      barsLoaded: 2,
      barsAfterProof: 2,
      firstBarTime: '2026-06-18T10:00:00',
      lastBarTime: '2026-06-18T10:05:00',
      outcomeInputStatus: 'ready_for_read_only_outcome_replay',
      blockers: [],
    },
    {
      ticketId: '2026-06-19-morning-SweepMssFvgRetrace-LONG',
      tradeDate: '2026-06-19',
      session: 'morning',
      instrument: 'MES',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      proofTime: '2026-06-16T10:00:00.0000000',
      firstSeenTime: '2026-06-16T10:00:00.0000000',
      lastSeenTime: '2026-06-16T10:10:00.0000000',
      occurrences: 1,
      entry: 100,
      stop: 104,
      t1: 106,
      t2: 108,
      riskPoints: 4,
      t1R: 1.5,
      t2R: 2,
      proofState: 'scanner_held_complete',
      triageScore: 120,
      sourceTapePath: longTape,
      barsSource: 'scanner_decision_tape_completed_5m',
      barsLoaded: 3,
      barsAfterProof: 3,
      firstBarTime: '2026-06-16T10:00:00',
      lastBarTime: '2026-06-16T10:10:00',
      outcomeInputStatus: 'ready_for_read_only_outcome_replay',
      blockers: [],
    },
  ],
  blockers: [],
  recommendations: ['Run outcome replay.'],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport({
  reportDir: tempRoot,
  replayPackagePath: 'replay-package.json',
  replayPackageReport,
}, '2026-07-17T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_replay_package_outcome');
assert.equal(report.status, 'fail');
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.packageRows, 4);
assert.equal(report.summary.resolvedRows, 2);
assert.equal(report.summary.unresolvedRows, 1);
assert.equal(report.summary.blockedRows, 1);
assert.equal(report.summary.noFillRows, 1);
assert.equal(report.summary.stoppedBeforeT1Rows, 1);
assert.equal(report.summary.t1AndT2Rows, 1);
assert.equal(report.summary.grossResolvedOneMesPl, -5);
assert.equal(report.summary.daySessionModelGroups.length, 4);
assert.equal(report.summary.livePromotionAllowedRows, 0);

const longRow = report.rows.find((row) => row.ticketId === '2026-06-16-morning-OpeningDriveFvgContinuation-LONG');
assert.equal(longRow?.outcomeLabel, 't1_and_t2_hit');
assert.equal(longRow?.entryHitTime, '2026-06-16T10:00:00');
assert.equal(longRow?.t1HitTime, '2026-06-16T10:05:00');
assert.equal(longRow?.t2HitTime, '2026-06-16T10:10:00');
assert.equal(longRow?.resolvedOneMesPl, 20);
assert.equal(longRow?.resolvedR, 2);

const shortRow = report.rows.find((row) => row.ticketId === '2026-06-17-lunch-AfterLunchDriveFvgContinuation-SHORT');
assert.equal(shortRow?.outcomeLabel, 'stopped_before_t1');
assert.equal(shortRow?.stopHitTime, '2026-06-17T13:05:00');
assert.equal(shortRow?.resolvedOneMesPl, -25);
assert.equal(shortRow?.resolvedR, -1);

const noFillRow = report.rows.find((row) => row.ticketId === '2026-06-18-morning-IntradayMssMicroContinuation-LONG');
assert.equal(noFillRow?.outcomeStatus, 'unresolved');
assert.equal(noFillRow?.outcomeLabel, 'no_fill');
assert.equal(noFillRow?.resolvedOneMesPl, null);

const invalidStopRow = report.rows.find((row) => row.ticketId === '2026-06-19-morning-SweepMssFvgRetrace-LONG');
assert.equal(invalidStopRow?.outcomeStatus, 'blocked');
assert.equal(invalidStopRow?.outcomeLabel, 'blocked');
assert.equal(invalidStopRow?.resolvedOneMesPl, null);
assert.ok(invalidStopRow?.blockers.includes('directionally invalid entry-to-stop geometry'));
assert.ok(report.blockers.some((blocker) => blocker.includes('directionally invalid entry-to-stop geometry')));
assert.match(report.markdown, /Gross resolved one-MES P\/L: -5/);

const missing = buildUnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport({
  reportDir: tempRoot,
  replayPackagePath: null,
  replayPackageReport: null,
}, '2026-07-17T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing replay package path'));
assert.ok(missing.blockers.includes('replay package has no rows'));

console.log('unified positive held-local preview replay package outcome verified.');
