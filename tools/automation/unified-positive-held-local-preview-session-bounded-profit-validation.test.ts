import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildUnifiedPositiveHeldLocalPreviewSessionBoundedProfitValidationReport,
} from './unified-positive-held-local-preview-session-bounded-profit-validation';

function writeTape(dir: string, name: string, bars: Array<{ time: string; open: number; high: number; low: number; close: number }>): void {
  fs.writeFileSync(path.join(dir, name), JSON.stringify({
    events: Object.fromEntries(bars.map((bar, index) => [`event-${index}`, { completed5m: bar }])),
  }, null, 2));
}

const auditDir = fs.mkdtempSync(path.join(os.tmpdir(), 'session-bounded-profit-'));
writeTape(auditDir, 'scanner-decision-tape-2026-07-20-MES-morning.json', [
  { time: '2026-07-20T09:35:00', open: 100, high: 101, low: 99, close: 100.5 },
  { time: '2026-07-20T09:40:00', open: 100.5, high: 106, low: 100, close: 105 },
  { time: '2026-07-20T09:45:00', open: 105, high: 109, low: 104, close: 108 },
]);
writeTape(auditDir, 'scanner-decision-tape-2026-07-20-MES-lunch.json', [
  { time: '2026-07-20T12:30:00', open: 200, high: 201, low: 199, close: 200.5 },
  { time: '2026-07-20T12:35:00', open: 200.5, high: 202, low: 195, close: 196 },
]);

const report = buildUnifiedPositiveHeldLocalPreviewSessionBoundedProfitValidationReport({
  outcomeReportPath: 'outcome.json',
  auditDir,
  outcomeReport: {
    reportType: 'unified_positive_held_local_preview_replay_package_outcome',
    rows: [{
      ticketId: 'winner',
      tradeDate: '2026-07-20',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      proofTime: '2026-07-20T09:35:00',
      outcomeStatus: 'resolved',
      outcomeLabel: 't1_and_t2_hit',
      entry: 101,
      stop: 99,
      t1: 104,
      t2: 105,
      riskPoints: 2,
      entryHitTime: '2026-07-20T09:35:00',
      maximumFavorableExcursion: 8,
      maximumAdverseExcursion: 1,
      resolvedOneMesPl: 20,
      resolvedR: 2,
      blockers: [],
    }, {
      ticketId: 'loss',
      tradeDate: '2026-07-20',
      session: 'lunch',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      proofTime: '2026-07-20T12:30:00',
      outcomeStatus: 'resolved',
      outcomeLabel: 't1_and_t2_hit',
      entry: 201,
      stop: 198,
      t1: 205.5,
      t2: 207,
      riskPoints: 3,
      entryHitTime: '2026-07-21T09:30:00',
      maximumFavorableExcursion: 10,
      maximumAdverseExcursion: 1,
      resolvedOneMesPl: 30,
      resolvedR: 2,
      blockers: [],
    }],
  },
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.sourceRows, 2);
assert.equal(report.summary.rowsWithSessionTape, 2);
assert.equal(report.summary.winnerRows, 1);
assert.equal(report.summary.lossRows, 1);
assert.equal(report.summary.oldGrossOneMesPl, 50);
assert.equal(report.summary.sessionGrossOneMesPl, 5);
assert.equal(report.summary.deltaOneMesPl, -45);
assert.equal(report.rows.find((row) => row.ticketId === 'winner')?.sessionOutcomeLabel, 't1_and_t2_hit');
assert.equal(report.rows.find((row) => row.ticketId === 'loss')?.sessionOutcomeLabel, 'stopped_before_t1');
assert.equal(report.summary.livePromotionAllowedRows, 0);

const missing = buildUnifiedPositiveHeldLocalPreviewSessionBoundedProfitValidationReport({
  outcomeReportPath: null,
  outcomeReport: null,
  auditDir,
}, '2026-07-20T00:01:00.000Z');
assert.equal(missing.status, 'fail');
assert.equal(missing.summary.recommendation, 'fix_missing_outcome_report');

console.log('unified positive held-local preview session-bounded profit validation verified.');
