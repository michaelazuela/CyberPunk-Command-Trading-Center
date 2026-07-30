import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildScannerDeskOutputLiveFlowParityReplayReport } from './scanner-desk-output-live-flow-parity-replay';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scanner-desk-output-parity-'));
const auditDir = path.join(tmp, 'audit');
const outDir = path.join(tmp, 'out');
fs.mkdirSync(auditDir, { recursive: true });

const cleanAuthority = {
  changesTradingLogic: false,
  changesCanExecute: false,
  changesEntryStopTargets: false,
  changesDiscordPolicy: false,
};

fs.writeFileSync(path.join(auditDir, 'scanner-decision-tape-2026-07-29-MES-morning.json'), `${JSON.stringify({
  reportType: 'scanner_decision_event_tape',
  tradeDate: '2026-07-29',
  instrument: 'MES',
  session: 'morning',
  events: {
    '2026-07-29T09:15:00.0000000': {
      time: '2026-07-29T09:15:00.0000000',
      completed5m: { time: '2026-07-29T09:15:00.0000000', open: 100, high: 101, low: 99, close: 100.5 },
      setupCandidateStatus: {
        selected: { setupType: 'LiquidityRaidReclaimReversal', direction: 'LONG' },
      },
      deskPublishDecision: {
        shouldPost: true,
        setupType: 'LiquidityRaidReclaimReversal',
        direction: 'LONG',
      },
      scannerDeskOutput: {
        sourceOfTruth: 'scanner_desk_output_contract',
        pipeline: 'select_candidate_approve_hold_publish',
        status: 'approved_plan',
        publishToDiscord: true,
        operatorCode: 'POST_READY',
        model: 'LiquidityRaidReclaimReversal',
        direction: 'LONG',
        authority: cleanAuthority,
      },
      discord: { shouldSend: true },
    },
    '2026-07-29T09:20:00.0000000': {
      time: '2026-07-29T09:20:00.0000000',
      completed5m: { time: '2026-07-29T09:20:00.0000000', open: 100, high: 101, low: 99, close: 100.5 },
      setupCandidateStatus: {
        selected: { setupType: 'StructureShiftContinuation', direction: 'SHORT' },
      },
      deskPublishDecision: {
        shouldPost: true,
        setupType: 'StructureShiftContinuation',
        direction: 'SHORT',
      },
      scannerDeskOutput: {
        sourceOfTruth: 'scanner_desk_output_contract',
        pipeline: 'select_candidate_approve_hold_publish',
        status: 'held',
        publishToDiscord: false,
        operatorCode: 'HELD_REVIEW_ONLY',
        model: 'StructureShiftContinuation',
        direction: 'SHORT',
        authority: cleanAuthority,
      },
      discord: { shouldSend: false },
    },
    '2026-07-29T09:25:00.0000000': {
      time: '2026-07-29T09:25:00.0000000',
      completed5m: { time: '2026-07-29T09:25:00.0000000', open: 100, high: 101, low: 99, close: 100.5 },
      setupCandidateStatus: {
        selected: { setupType: 'OpeningDriveFvgContinuation', direction: 'LONG' },
      },
      deskPublishDecision: {
        shouldPost: false,
        setupType: 'OpeningDriveFvgContinuation',
        direction: 'LONG',
      },
      scannerDeskOutput: {
        sourceOfTruth: 'scanner_desk_output_contract',
        pipeline: 'select_candidate_approve_hold_publish',
        status: 'held',
        publishToDiscord: false,
        operatorCode: 'HELD_LOCAL',
        model: 'OpeningDriveFvgContinuation',
        direction: 'LONG',
        authority: cleanAuthority,
      },
      discord: { shouldSend: true },
    },
    '2026-07-29T09:30:00.0000000': {
      time: '2026-07-29T09:30:00.0000000',
      completed5m: { time: '2026-07-29T09:30:00.0000000', open: 100, high: 101, low: 99, close: 100.5 },
      discord: { shouldSend: false },
    },
  },
}, null, 2)}\n`);

const blocked = await buildScannerDeskOutputLiveFlowParityReplayReport({
  dates: ['2026-07-29'],
  instrument: 'MES',
  sessions: ['morning'],
  auditDir,
  outDir,
  json: false,
});

assert.equal(blocked.reportType, 'scanner_desk_output_live_flow_parity_replay');
assert.equal(blocked.authority.readOnly, true);
assert.equal(blocked.authority.postsDiscord, false);
assert.equal(blocked.authority.writesSupabase, false);
assert.equal(blocked.authority.readsLiveBridge, false);
assert.equal(blocked.authority.changesTradingLogic, false);
assert.equal(blocked.summary.tapesReviewed, 1);
assert.equal(blocked.summary.eventsReviewed, 4);
assert.equal(blocked.summary.comparableRows, 3);
assert.equal(blocked.summary.preContractRows, 1);
assert.equal(blocked.summary.oldTradeAlertSendRows, 2);
assert.equal(blocked.summary.deskPublishShouldPostRows, 2);
assert.equal(blocked.summary.scannerOutputPublishRows, 1);
assert.equal(blocked.summary.tradeAlertParityMismatchRows, 1);
assert.equal(blocked.summary.deskPublishDivergenceRows, 1);
assert.equal(blocked.summary.blockingMismatchRows, 1);
assert.equal(blocked.status, 'blocked');
assert.match(blocked.blockers.join('\n'), /disagree/);
assert.match(blocked.markdown, /Blocking Rows/);
assert.match(blocked.markdown, /Desk Publish Divergences/);

fs.writeFileSync(path.join(auditDir, 'scanner-decision-tape-2026-07-30-MES-lunch.json'), `${JSON.stringify({
  tradeDate: '2026-07-30',
  instrument: 'MES',
  session: 'lunch',
  events: {
    '2026-07-30T12:00:00.0000000': {
      time: '2026-07-30T12:00:00.0000000',
      completed5m: { time: '2026-07-30T12:00:00.0000000', open: 100, high: 101, low: 99, close: 100.5 },
      setupCandidateStatus: {
        selected: { setupType: 'AfterLunchDriveFvgContinuation', direction: 'SHORT' },
      },
      deskPublishDecision: {
        shouldPost: false,
        setupType: 'AfterLunchDriveFvgContinuation',
        direction: 'SHORT',
      },
      scannerDeskOutput: {
        sourceOfTruth: 'scanner_desk_output_contract',
        pipeline: 'select_candidate_approve_hold_publish',
        status: 'held',
        publishToDiscord: false,
        operatorCode: 'HELD_LOCAL',
        model: 'AfterLunchDriveFvgContinuation',
        direction: 'SHORT',
        authority: cleanAuthority,
      },
      discord: { shouldSend: false },
    },
  },
}, null, 2)}\n`);

const pass = await buildScannerDeskOutputLiveFlowParityReplayReport({
  dates: ['2026-07-30'],
  instrument: 'MES',
  sessions: ['lunch'],
  auditDir,
  outDir,
  json: false,
});

assert.equal(pass.status, 'pass');
assert.equal(pass.summary.blockingMismatchRows, 0);
assert.equal(pass.summary.nextRecommendedBranch, 'next_downstream_branch');

console.log('Scanner desk output live-flow parity replay verified.');
