import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildRawOhlcScannerCycleReplayReport,
  parseRawOhlcScannerCycleReplayArgs,
} from './raw-ohlc-scanner-cycle-replay';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'raw-ohlc-scanner-cycle-replay-'));
const marketBarsPath = path.join(root, 'market-bars.json');

const readyHtfBars = [
  { time: '2026-05-01T09:15:00', open: 100, high: 102, low: 99, close: 101 },
  { time: '2026-06-01T09:15:00', open: 101, high: 103, low: 100, close: 102 },
];

fs.writeFileSync(
  marketBarsPath,
  `${JSON.stringify({
    bars: {
      '5m': [
        { time: '2026-05-02T09:20:00', open: 90, high: 91, low: 89, close: 90.5 },
        { time: '2026-06-01T09:20:00', open: 100, high: 101, low: 99, close: 100.5 },
        { time: '2026-06-01T16:05:00', open: 100, high: 101, low: 99, close: 100.25 },
        { time: '2026-06-01T18:45:00', open: 101, high: 102, low: 100, close: 101.25 },
      ],
      '15m': readyHtfBars,
      '60m': readyHtfBars,
      '120m': readyHtfBars,
      '240m': readyHtfBars,
    },
  }, null, 2)}\n`,
  'utf8',
);

const report = buildRawOhlcScannerCycleReplayReport({
  startDate: '2026-05-02',
  endDate: '2026-06-01',
  instrument: 'MES',
  marketBarsJson: marketBarsPath,
  outDir: root,
  json: true,
}, '2026-07-16T00:00:00.000Z');

const readyFrame = report.frames.find((frame) => frame.completed5m.time === '2026-06-01T09:20:00');
const partialFrame = report.frames.find((frame) => frame.completed5m.time === '2026-05-02T09:20:00');

assert.equal(report.reportType, 'raw_ohlc_scanner_cycle_replay');
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesTradingRules, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.changesBridgeBehavior, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.assumptions.missingBarsAreNotInvented, true);
assert.equal(report.assumptions.cycleFramesOnlyNoTradeDecisions, true);
assert.equal(report.summary.totalCycles, 3);
assert.equal(report.summary.readyCycles, 2);
assert.equal(report.summary.dataLimitedCycles, 1);
assert.equal(report.summary.morningCycles, 2);
assert.equal(report.summary.lunchCycles, 0);
assert.equal(report.summary.eveningCycles, 1);
assert.ok(readyFrame);
assert.ok(partialFrame);
assert.equal(readyFrame.dataQualityStatus, 'ready');
assert.equal(readyFrame.blocker, null);
assert.deepEqual(readyFrame.htfCoverage.map((coverage) => coverage.status), [
  'sufficient_30d',
  'sufficient_30d',
  'sufficient_30d',
  'sufficient_30d',
]);
assert.equal(partialFrame.dataQualityStatus, 'data_limited');
assert.match(partialFrame.blocker || '', /15m partial/);
assert.match(report.reportMarkdown, /Raw OHLC Scanner-Cycle Replay/);
assert.match(report.reportMarkdown, /No Discord posts, Supabase reads\/writes, bridge reads/);
assert.throws(
  () => parseRawOhlcScannerCycleReplayArgs(['--start-date', '2026-06-01']),
  /--market-bars-json is required/,
);

console.log('raw OHLC scanner-cycle replay verified.');
