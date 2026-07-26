import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildFormalOhlcMasterDeskAuditReport } from './formal-ohlc-master-desk-audit';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'formal-ohlc-master-desk-audit-'));

function writeTape(date: string, session: string, events: Record<string, unknown>) {
  fs.writeFileSync(
    path.join(tempDir, `scanner-decision-tape-${date}-MES-${session}.json`),
    `${JSON.stringify({
      reportType: 'scanner_decision_event_tape',
      tradeDate: date,
      instrument: 'MES',
      session,
      events,
    }, null, 2)}\n`,
    'utf8',
  );
}

writeTape('2026-06-01', 'morning', {
  allowed: {
    completed5m: { time: '2026-06-01T09:20:00.0000000', open: 100, high: 101, low: 99, close: 100 },
    htfHistoryCoverage: { status: 'sufficient' },
    deskState: { dataQualityStatus: 'ok', htfContextStatus: 'sufficient', primaryDeskPlay: { direction: 'LONG' } },
    plan: { decision: 'LONG', entry: 100, stop: 98, t1: 103, t2: 104, canExecute: true },
    setupCandidateStatus: { selected: { setupType: 'historicalReview', direction: 'LONG', requiredTrigger: 'completed 5M close above 100' } },
    visibility: { visibilityMode: 'POST_PLAN' },
  },
  target: {
    completed5m: { time: '2026-06-01T09:25:00.0000000', open: 100, high: 104.25, low: 99.75, close: 104 },
  },
});

writeTape('2026-06-01', 'lunch', {
  heldWinner: {
    completed5m: { time: '2026-06-01T12:05:00.0000000', open: 110, high: 111, low: 109, close: 110 },
    htfHistoryCoverage: { status: 'sufficient' },
    deskState: { dataQualityStatus: 'ok', htfContextStatus: 'sufficient', primaryDeskPlay: { direction: 'SHORT' } },
    setupCandidateStatus: {
      selected: {
        setupType: 'NoInstalledSetup',
        direction: 'SHORT',
        entry: 110,
        stop: 112,
        target1: 107,
        target2: 106,
        requiredTrigger: 'completed 5M close below 110',
      },
    },
    plan: { canExecute: false },
    visibility: { visibilityMode: 'HOLD_WITH_REASON', holdWithReason: 'Risk review only; standard risk gate not clean.' },
  },
  target: {
    completed5m: { time: '2026-06-01T12:10:00.0000000', open: 110, high: 110.25, low: 105.75, close: 106 },
  },
});

writeTape('2026-06-01', 'evening', {
  duplicateWinner: {
    completed5m: { time: '2026-06-01T18:55:00.0000000', open: 120, high: 121, low: 119, close: 120 },
    htfHistoryCoverage: { status: 'sufficient' },
    deskState: { dataQualityStatus: 'ok', htfContextStatus: 'sufficient', primaryDeskPlay: { direction: 'LONG' } },
    setupCandidateStatus: {
      selected: {
        setupType: 'NoInstalledSetup',
        direction: 'LONG',
        entry: 120,
        stop: 118,
        target1: 123,
        target2: 124,
        requiredTrigger: 'completed 5M close above 120',
      },
    },
    plan: { canExecute: false },
    visibility: { visibilityMode: 'HOLD_WITH_REASON', holdWithReason: 'Duplicate alert suppressed by durable campaign ledger.' },
  },
  target: {
    completed5m: { time: '2026-06-01T19:00:00.0000000', open: 120, high: 124.25, low: 119.75, close: 124 },
  },
});

const report = buildFormalOhlcMasterDeskAuditReport({
  startDate: '2026-06-01',
  endDate: '2026-06-01',
  instrument: 'MES',
  auditDir: tempDir,
  outDir: tempDir,
  json: true,
}, '2026-07-16T00:00:00.000Z');

assert.equal(report.reportType, 'formal_ohlc_master_desk_audit');
assert.equal(report.source, 'scanner_decision_tapes_completed_5m_ohlc');
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.changesTradingRules, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.changesEntryStopTargets, false);
assert.equal(report.summary.scannerAllowed, 1);
assert.equal(report.summary.researchCandidates, 1);
assert.equal(report.summary.visibilityDriftRisks, 1);
assert.equal(report.summary.positiveHeldCompleteCandidates, 2);
assert.ok(report.findings.some((finding) => finding.verdict === 'research_candidate' && finding.setupType === 'NoInstalledSetup'));
assert.ok(report.findings.some((finding) => finding.verdict === 'visibility_drift_risk' && finding.setupType === 'NoInstalledSetup'));
assert.match(report.reportMarkdown, /Master Desk Audit/);
assert.match(report.reportMarkdown, /Research-only audit/);

console.log('formal OHLC Master Desk audit verified.');
