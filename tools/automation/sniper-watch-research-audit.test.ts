import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildSniperWatchResearchAuditReport } from './sniper-watch-research-audit';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sniper-watch-research-audit-'));
const auditDir = path.join(tmp, 'audit');
fs.mkdirSync(auditDir, { recursive: true });

fs.writeFileSync(path.join(auditDir, 'scanner-decision-tape-2026-06-21-MES-evening.json'), JSON.stringify({
  reportType: 'scanner_decision_event_tape',
  tradeDate: '2026-06-21',
  instrument: 'MES',
  session: 'evening',
  events: {
    '2026-06-21T20:15:00.0000000': {
      completed5m: { high: 7534, low: 7528, close: 7532.5 },
      currentPrice: 7532.5,
      scannerState: 'Review',
      setupCandidateStatus: {
        selected: {
          direction: 'LONG',
          setupType: 'TurtleSoup',
          executionStatus: 'Conditional',
          entry: 7533.75,
          stop: 7525.75,
          target1: 7550,
          target2: 7553.75,
        },
      },
      plan: { canExecute: false, entry: null, stop: null, t1: null, t2: null },
      deskState: {
        canExecute: false,
        bestShortPlan: {
          direction: 'SHORT',
          entry: 7525,
          stop: 7533,
          target1: 7513,
          target2: 7509,
        },
      },
    },
    '2026-06-21T20:20:00.0000000': {
      completed5m: { high: 7540, low: 7532.75, close: 7535 },
      currentPrice: 7535,
      scannerState: 'Review',
      plan: { canExecute: false },
      deskState: { canExecute: false },
    },
    '2026-06-21T20:25:00.0000000': {
      completed5m: { high: 7551, low: 7535, close: 7548 },
      currentPrice: 7548,
      scannerState: 'Review',
      plan: { canExecute: false },
      deskState: { canExecute: false },
    },
    '2026-06-21T20:30:00.0000000': {
      completed5m: { high: 7531, low: 7523, close: 7524.5 },
      currentPrice: 7524.5,
      scannerState: 'Review',
      setupCandidateStatus: {
        selected: {
          direction: 'SHORT',
          setupType: 'IntradayMssMicroContinuation',
          executionStatus: 'Conditional',
          entry: 7525,
          stop: 7533,
          target1: 7513,
          target2: 7509,
        },
      },
      plan: { canExecute: false },
      deskState: { canExecute: false },
    },
    '2026-06-21T20:35:00.0000000': {
      completed5m: { high: 7525.25, low: 7512.5, close: 7515 },
      currentPrice: 7515,
      scannerState: 'Review',
      plan: { canExecute: false },
      deskState: { canExecute: false },
    },
    '2026-06-21T20:40:00.0000000': {
      completed5m: { high: 7557, low: 7550, close: 7556 },
      currentPrice: 7556,
      scannerState: 'Executable',
      setupCandidateStatus: {
        selected: {
          direction: 'LONG',
          setupType: 'TurtleSoup',
          executionStatus: 'Executable',
          entry: 7551,
          stop: 7546,
          target1: 7558.5,
          target2: 7561,
        },
      },
      plan: { canExecute: true },
      deskState: { canExecute: true },
    },
  },
}));

const report = await buildSniperWatchResearchAuditReport({
  tradeDate: '2026-06-21',
  instrument: 'MES',
  sessions: ['evening'],
  auditDir,
  outDir: path.join(tmp, 'out'),
  json: false,
});

assert.equal(report.reportType, 'sniper_watch_research_phase3_audit');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.createsNewModel, false);
assert.equal(report.authority.oneMinuteApprovesExecution, false);
assert.equal(report.summary.tapesReviewed, 1);
assert.equal(report.summary.eventsReviewed, 6);
assert.equal(report.summary.opportunities, 2);
assert.equal(report.summary.fiveMinuteConfirmed, 2);
assert.equal(report.summary.t1Hits, 2);
assert.equal(report.summary.t2Hits, 0);
assert.equal(report.summary.stopped, 0);
assert.equal(report.summary.canExecuteTrueExcluded, 1);
assert.equal(report.rows.some((row) => row.direction === 'LONG' && row.outcome === 'T1'), true);
assert.equal(report.rows.some((row) => row.direction === 'SHORT' && row.outcome === 'T1'), true);
assert.equal(report.rows.every((row) => row.oneMinuteEvidence === 'not_available_in_scanner_decision_tape'), true);
assert.match(report.markdown, /Sniper Watch Research Phase 3 Audit/);
assert.match(report.markdown, /Research-only audit/);
assert.match(report.markdown, /1M close evidence is not available/);

fs.rmSync(tmp, { recursive: true, force: true });
