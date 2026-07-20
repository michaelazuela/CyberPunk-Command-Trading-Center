import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildRawOhlcScannerArtifactSweepMorningLongFullDayOutcomeComparisonReport } from './raw-ohlc-scanner-artifact-sweep-morning-long-full-day-outcome-comparison';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'full-day-outcome-comparison-'));
fs.writeFileSync(path.join(tmpDir, 'synthetic-artifact.json'), JSON.stringify({
  events: {
    '2026-06-10T11:00:00': {
      completed5m: { time: '2026-06-10T11:00:00', open: 99, high: 101, low: 98, close: 100 },
    },
    '2026-06-10T12:00:00': {
      completed5m: { time: '2026-06-10T12:00:00', open: 100, high: 116, low: 99, close: 115 },
    },
  },
}, null, 2));

const ticketId = 'synthetic-artifact|2026-06-10T11:00:00:0:SweepMssFvgRetrace:LONG';
const report = buildRawOhlcScannerArtifactSweepMorningLongFullDayOutcomeComparisonReport({
  reportDir: tmpDir,
  replayPackagePath: 'synthetic-package.json',
  baselineOutcomePath: 'synthetic-outcome.json',
  replayPackage: {
    status: 'pass',
    rows: [{
      ticketId,
      tradeDate: '2026-06-10',
      session: 'morning',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      proofTime: '2026-06-10T11:00:00',
      entry: 100,
      stop: 90,
      t1: 115,
      t2: 120,
    }],
  },
  baselineOutcome: {
    status: 'pass',
    rows: [{ ticketId, outcomeLabel: 'no_target_or_stop_hit', resolvedOneMesPl: null }],
  },
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.comparedRows, 1);
assert.equal(report.summary.labelChangedRows, 1);
assert.equal(report.summary.baselineResolvedRows, 0);
assert.equal(report.summary.fullDayResolvedRows, 1);
assert.equal(report.summary.fullDayGrossOneMesPl, 75);
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(report.summary.recommendation, 'rerun_rank_research_with_full_day_outcomes');
assert.equal(report.rows[0].fullDayOutcomeLabel, 't1_hit_only');
assert.match(report.markdown, /Full-Day Outcome Comparison/);

console.log('raw OHLC scanner artifact Sweep morning LONG full-day outcome comparison verified.');
