import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildRawOhlcScannerArtifactSweepMorningLongFullDayUnresolvedDrilldownReport } from './raw-ohlc-scanner-artifact-sweep-morning-long-full-day-unresolved-drilldown';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'full-day-unresolved-drilldown-'));
fs.writeFileSync(path.join(tmpDir, 'synthetic-artifact.json'), JSON.stringify({
  events: {
    '2026-06-10T11:00:00': {
      completed5m: { time: '2026-06-10T11:00:00', open: 99, high: 101, low: 98, close: 100 },
    },
    '2026-06-10T12:00:00': {
      completed5m: { time: '2026-06-10T12:00:00', open: 100, high: 112, low: 99, close: 110 },
    },
  },
}, null, 2));

const ticketId = 'synthetic-artifact|2026-06-10T11:00:00:0:SweepMssFvgRetrace:LONG';
const report = buildRawOhlcScannerArtifactSweepMorningLongFullDayUnresolvedDrilldownReport({
  reportDir: tmpDir,
  fullDayComparisonPath: 'synthetic-comparison.json',
  replayPackagePath: 'synthetic-package.json',
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
  fullDayComparison: {
    status: 'pass',
    rows: [{
      ticketId,
      tradeDate: '2026-06-10',
      proofTime: '2026-06-10T11:00:00',
      baselineOutcomeLabel: 'no_target_or_stop_hit',
      fullDayOutcomeLabel: 'no_target_or_stop_hit',
      baselineOneMesPl: null,
      fullDayOneMesPl: null,
      sourceArtifactPath: path.join(tmpDir, 'synthetic-artifact.json'),
    }],
  },
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.unresolvedRows, 1);
assert.equal(report.summary.weakFollowThroughRows, 0);
assert.equal(report.summary.nearT1UnresolvedRows, 1);
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(report.summary.recommendation, 'inspect_remaining_unresolved');
assert.equal(report.rows[0].entryHitTime, '2026-06-10T11:00:00');
assert.equal(report.rows[0].maximumFavorableExcursion, 12);
assert.equal(report.rows[0].mfeR, 1.2);
assert.equal(report.rows[0].pointsShortOfT1, 3);
assert.equal(report.rows[0].causeClass, 'near_t1_unresolved');
assert.equal(report.rows[0].rankResearchAction, 'keep_as_unresolved_review_note');
assert.match(report.markdown, /Full-Day Unresolved Drilldown/);

console.log('raw OHLC scanner artifact Sweep morning LONG full-day unresolved drilldown verified.');
