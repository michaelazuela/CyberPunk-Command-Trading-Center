import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildRawOhlcScannerArtifactSweepMorningLongExtendedHorizonOutcomeReport } from './raw-ohlc-scanner-artifact-sweep-morning-long-extended-horizon-outcome';

const replayPackage = {
  status: 'pass',
  source: { artifactPaths: [] },
  rows: [
    {
      ticketId: 'synthetic-artifact|2026-06-10T11:00:00:0:SweepMssFvgRetrace:LONG',
      tradeDate: '2026-06-10',
      session: 'morning',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG' as const,
      proofTime: '2026-06-10T11:00:00',
      entry: 100,
      stop: 90,
      t1: 115,
      t2: 120,
    },
  ],
};

const unresolvedTopDrilldown = {
  status: 'pass',
  rows: [
    {
      slateId: '2026-06-10|morning',
      baselineTopTicketId: 'synthetic-artifact|2026-06-10T11:00:00:0:SweepMssFvgRetrace:LONG',
      baselineTopOutcomeLabel: 'no_target_or_stop_hit',
    },
  ],
};

const report = buildRawOhlcScannerArtifactSweepMorningLongExtendedHorizonOutcomeReport({
  reportDir: 'C:/not-real',
  replayPackagePath: 'synthetic-package.json',
  unresolvedTopDrilldownPath: 'synthetic-drilldown.json',
  replayPackage,
  unresolvedTopDrilldown,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.status, 'fail');
assert.equal(report.summary.targetRows, 1);
assert.equal(report.summary.blockedRows, 1);
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.match(report.blockers.join(' '), /missing matching full-day scanner artifact/);
assert.match(report.markdown, /Extended-Horizon Outcome/);

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'extended-horizon-outcome-'));
const artifactPath = path.join(tmpDir, 'synthetic-artifact.json');
fs.writeFileSync(artifactPath, JSON.stringify({
  events: {
    '2026-06-10T11:00:00': {
      completed5m: { time: '2026-06-10T11:00:00', open: 99, high: 101, low: 98, close: 100 },
    },
    '2026-06-10T12:00:00': {
      completed5m: { time: '2026-06-10T12:00:00', open: 100, high: 116, low: 99, close: 115 },
    },
  },
}, null, 2));

const resolvedReport = buildRawOhlcScannerArtifactSweepMorningLongExtendedHorizonOutcomeReport({
  reportDir: tmpDir,
  replayPackagePath: 'synthetic-package.json',
  unresolvedTopDrilldownPath: 'synthetic-drilldown.json',
  replayPackage,
  unresolvedTopDrilldown,
}, '2026-07-19T00:00:00.000Z');

assert.equal(resolvedReport.status, 'pass');
assert.equal(resolvedReport.summary.resolvedRows, 1);
assert.equal(resolvedReport.summary.convertedRows, 1);
assert.equal(resolvedReport.summary.grossExtendedOneMesPl, 75);
assert.equal(resolvedReport.rows[0].extendedOutcomeLabel, 't1_hit_only');
assert.equal(resolvedReport.rows[0].extendedOneMesPl, 75);

console.log('raw OHLC scanner artifact Sweep morning LONG extended-horizon outcome verified.');
