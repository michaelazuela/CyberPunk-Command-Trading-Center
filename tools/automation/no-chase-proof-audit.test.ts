import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ExecutionStatus, SetupCandidateStatus, SetupType, type SetupCandidate } from '../../src/types';
import {
  buildNoChaseProofAuditReport,
  writeNoChaseProofAuditReport,
} from './no-chase-proof-audit';
import type { UnifiedDeskCandidateDiagnosticSnapshot } from './unified-desk-candidate-book-diagnostic';

function candidate(overrides: Partial<SetupCandidate> = {}): SetupCandidate {
  return {
    setupType: SetupType.NoSetup,
    scenarioLabel: 'fixture',
    direction: 'LONG',
    detectedStatus: SetupCandidateStatus.Conditional,
    confidence: 'Medium',
    priority: 80,
    entry: 100,
    stop: 96,
    target1: 106,
    target2: 108,
    riskPoints: 4,
    evidence: ['15M context supports the idea.'],
    missingEvidence: [],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: null,
    requiredTrigger: 'Wait for completed 5M proof.',
    nextAction: 'Human review only.',
    reducedRiskPlan: null,
    ...overrides,
  };
}

const snapshots: UnifiedDeskCandidateDiagnosticSnapshot[] = [
  {
    snapshotId: 'intraday-no-chase',
    tradeDate: '2026-06-10',
    sessionType: 'morning',
    completedBarTime: '2026-06-10T10:00:00',
    candidates: [
      candidate({
        requiredTrigger: 'Preferred entry was missed. Do not chase.',
        nextAction: 'No chase. Wait for fresh completed 5M re-entry proof.',
      }),
      candidate({
        setupType: SetupType.NoSetup,
        scenarioLabel: 'strict-out-of-scope',
        requiredTrigger: 'Preferred entry was missed. Do not chase.',
      }),
    ],
    currentCanExecute: false,
  },
  {
    snapshotId: 'intraday-proof',
    tradeDate: '2026-06-10',
    sessionType: 'morning',
    completedBarTime: '2026-06-10T10:25:00',
    candidates: [
      candidate({
        requiredTrigger: 'Completed 5M retest/rejection proof is present for human review.',
        nextAction: 'Human-review ticket only; canExecute remains internal.',
        evidence: ['Completed 5M close-through and retest hold with 15M context support.'],
      }),
    ],
    currentCanExecute: false,
  },
  {
    snapshotId: 'intraday-remains-blocked',
    tradeDate: '2026-06-11',
    sessionType: 'morning',
    completedBarTime: '2026-06-11T10:05:00',
    candidates: [
      candidate({
        direction: 'SHORT',
        entry: 100,
        stop: 104,
        target1: 94,
        target2: 92,
        requiredTrigger: 'Preferred entry was missed. Do not chase.',
        nextAction: 'No chase. Wait for fresh completed 5M re-entry proof.',
      }),
    ],
    currentCanExecute: false,
  },
  {
    snapshotId: 'after-lunch-no-chase',
    tradeDate: '2026-06-12',
    sessionType: 'lunch',
    completedBarTime: '2026-06-12T12:40:00',
    candidates: [
      candidate({
        setupType: SetupType.NoSetup,
        requiredTrigger: 'Preferred entry was missed. Do not chase.',
        nextAction: 'No chase. Wait for fresh completed 5M FVG retest proof.',
      }),
    ],
    currentCanExecute: false,
  },
  {
    snapshotId: 'after-lunch-proof',
    tradeDate: '2026-06-12',
    sessionType: 'lunch',
    completedBarTime: '2026-06-12T13:05:00',
    candidates: [
      candidate({
        setupType: SetupType.NoSetup,
        requiredTrigger: 'Completed 5M FVG retest/rejection proof is present for human review.',
        nextAction: 'Human-review ticket only; canExecute remains internal.',
        evidence: ['Completed 5M retest hold after after-lunch drive FVG reaction.'],
      }),
    ],
    currentCanExecute: false,
  },
  {
    snapshotId: 'sweep-out-of-scope',
    tradeDate: '2026-06-13',
    sessionType: 'morning',
    completedBarTime: '2026-06-13T10:05:00',
    candidates: [
      candidate({
        setupType: SetupType.NoSetup,
        requiredTrigger: 'Preferred entry was missed. Do not chase.',
      }),
    ],
    currentCanExecute: false,
  },
];

const report = buildNoChaseProofAuditReport(snapshots, {
  startDate: '2026-06-10',
  endDate: '2026-06-13',
}, '2026-07-16T00:00:00.000Z');

assert.equal(report.reportType, 'no_chase_proof_audit');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.changesEntryStopTargets, false);
assert.equal(report.authority.changesRiskRules, false);
assert.equal(report.summary.snapshotsAudited, 6);
assert.equal(report.summary.noChaseCases, 0);
assert.equal(report.summary.convertedToHumanReview, 0);
assert.equal(report.summary.remainsNoChase, 0);
assert.equal(report.summary.intradayNoChaseCases, 0);
assert.equal(report.summary.intradayConverted, 0);
assert.equal(report.summary.afterLunchNoChaseCases, 0);
assert.equal(report.summary.afterLunchConverted, 0);
assert.equal(report.cases.some((item) => (item.setupType as SetupType) === SetupType.NoSetup), false);
assert.equal(report.cases.some((item) => (item.setupType as SetupType) === SetupType.NoSetup), false);

const intradayConverted = report.cases.find((item) => item.caseId === '2026-06-10|morning|NoInstalledSetup|LONG');
const intradayBlocked = report.cases.find((item) => item.caseId === '2026-06-11|morning|NoInstalledSetup|SHORT');
const afterLunchConverted = report.cases.find((item) => item.caseId === '2026-06-12|lunch|NoInstalledSetup|LONG');

assert.equal(intradayConverted, undefined);
assert.equal(intradayBlocked, undefined);
assert.equal(afterLunchConverted, undefined);
assert.match(report.markdown, /No-Chase Proof Audit/);
assert.match(report.recommendations.join(' '), /Do not broaden historicalReview or NoInstalledSetup/);

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'no-chase-proof-audit-'));
const paths = writeNoChaseProofAuditReport(report, root);
assert.equal(fs.existsSync(paths.jsonPath), true);
assert.equal(fs.existsSync(paths.markdownPath), true);

console.log('no-chase proof audit verified.');
