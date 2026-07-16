import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ExecutionStatus, SetupCandidateStatus, SetupType, type SetupCandidate } from '../../src/types';
import {
  buildNoChaseOhlcProofExtractorReport,
  writeNoChaseOhlcProofExtractorReport,
} from './no-chase-ohlc-proof-extractor';
import type { UnifiedDeskCandidateDiagnosticSnapshot } from './unified-desk-candidate-book-diagnostic';

function candidate(overrides: Partial<SetupCandidate> = {}): SetupCandidate {
  return {
    setupType: SetupType.IntradayMssMicroContinuation,
    scenarioLabel: 'fixture',
    direction: 'LONG',
    detectedStatus: SetupCandidateStatus.Conditional,
    confidence: 'High',
    priority: 80,
    entry: 100,
    stop: 96,
    target1: 106,
    target2: 108,
    riskPoints: 4,
    evidence: ['Completed 5M proof existed earlier, but the current line requires fresh proof.'],
    missingEvidence: ['No chase: wait for a completed 5M close beyond the line in the sand.'],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: null,
    requiredTrigger: 'Preferred entry was missed. Do not chase.',
    nextAction: 'No chase. Wait for fresh completed 5M re-entry proof.',
    reducedRiskPlan: null,
    activeRuleset: {
      htfLineInSand: {
        lineInSand: 101,
      },
    } as SetupCandidate['activeRuleset'],
    ...overrides,
  };
}

const snapshots: UnifiedDeskCandidateDiagnosticSnapshot[] = [
  {
    snapshotId: 'intraday-long-no-chase',
    tradeDate: '2026-06-10',
    sessionType: 'morning',
    completedBarTime: '2026-06-10T10:00:00',
    candidates: [candidate()],
    currentCanExecute: false,
  },
  {
    snapshotId: 'intraday-short-blocked',
    tradeDate: '2026-06-11',
    sessionType: 'morning',
    completedBarTime: '2026-06-11T10:00:00',
    candidates: [
      candidate({
        direction: 'SHORT',
        entry: 100,
        stop: 104,
        target1: 94,
        target2: 92,
        activeRuleset: { htfLineInSand: { lineInSand: 99 } } as SetupCandidate['activeRuleset'],
      }),
    ],
    currentCanExecute: false,
  },
  {
    snapshotId: 'after-lunch-short-no-chase',
    tradeDate: '2026-06-12',
    sessionType: 'lunch',
    completedBarTime: '2026-06-12T12:40:00',
    candidates: [
      candidate({
        setupType: SetupType.AfterLunchDriveFvgContinuation,
        direction: 'SHORT',
        entry: 100,
        stop: 104,
        target1: 94,
        target2: 92,
        activeRuleset: { htfLineInSand: { lineInSand: 99 } } as SetupCandidate['activeRuleset'],
      }),
    ],
    currentCanExecute: false,
  },
  {
    snapshotId: 'turtle-out-of-scope',
    tradeDate: '2026-06-13',
    sessionType: 'morning',
    completedBarTime: '2026-06-13T10:00:00',
    candidates: [candidate({ setupType: SetupType.TurtleSoup })],
    currentCanExecute: false,
  },
];

const bars = [
  { time: '2026-06-10T10:05:00', open: 100.25, high: 101.5, low: 100, close: 101.25 },
  { time: '2026-06-10T10:10:00', open: 101.25, high: 101.5, low: 100.75, close: 101.25 },
  { time: '2026-06-11T10:05:00', open: 100, high: 100.5, low: 99.25, close: 99.5 },
  { time: '2026-06-12T12:45:00', open: 99.25, high: 99.5, low: 98.25, close: 98.75 },
];

const report = buildNoChaseOhlcProofExtractorReport({
  snapshots,
  bars,
  auditDir: 'fixture-audit',
  startDate: '2026-06-10',
  endDate: '2026-06-13',
  tolerancePoints: 0.25,
  fiveMinuteSource: 'scanner_decision_tape_completed_5m',
}, '2026-07-16T00:00:00.000Z');

assert.equal(report.reportType, 'no_chase_ohlc_proof_extractor');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.snapshotsAudited, 4);
assert.equal(report.summary.noChaseCases, 3);
assert.equal(report.summary.ohlcProofFound, 2);
assert.equal(report.summary.noLocalOhlcProof, 1);
assert.equal(report.summary.intradayCases, 2);
assert.equal(report.summary.intradayProofFound, 1);
assert.equal(report.summary.afterLunchCases, 1);
assert.equal(report.summary.afterLunchProofFound, 1);
assert.equal(report.cases.some((item) => (item.setupType as SetupType) === SetupType.TurtleSoup), false);

const intradayProof = report.cases.find((item) => item.caseId === '2026-06-10|morning|IntradayMssMicroContinuation|LONG');
const intradayBlocked = report.cases.find((item) => item.caseId === '2026-06-11|morning|IntradayMssMicroContinuation|SHORT');
const afterLunchProof = report.cases.find((item) => item.caseId === '2026-06-12|lunch|AfterLunchDriveFvgContinuation|SHORT');

assert.equal(intradayProof?.referenceSource, 'htf_line_in_sand');
assert.equal(intradayProof?.referenceLevel, 101);
assert.equal(intradayProof?.proofStatus, 'ohlc_proof_found');
assert.equal(intradayProof?.proofType, 'completed_5m_close_through');
assert.equal(intradayProof?.proofBarTime, '2026-06-10T10:05:00');
assert.equal(intradayBlocked?.proofStatus, 'no_local_ohlc_proof');
assert.equal(afterLunchProof?.proofStatus, 'ohlc_proof_found');
assert.equal(afterLunchProof?.proofBarTime, '2026-06-12T12:45:00');
assert.match(report.markdown, /No-Chase OHLC Proof Extractor/);
assert.match(report.recommendations.join(' '), /research-only/);

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'no-chase-ohlc-proof-extractor-'));
const paths = writeNoChaseOhlcProofExtractorReport(report, root);
assert.equal(fs.existsSync(paths.jsonPath), true);
assert.equal(fs.existsSync(paths.markdownPath), true);

console.log('no-chase OHLC proof extractor verified.');
