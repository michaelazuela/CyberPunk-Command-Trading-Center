import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildRawOhlcReplayAdapterReport } from './raw-ohlc-replay-adapter';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'raw-ohlc-replay-adapter-'));
const auditDir = path.join(root, 'discord-audit');
const outDir = path.join(root, 'reports');
fs.mkdirSync(auditDir, { recursive: true });

fs.writeFileSync(
  path.join(auditDir, 'scanner-decision-tape-2026-06-01-MES-morning.json'),
  `${JSON.stringify({
    events: {
      one: {
        completed5m: { time: '2026-06-01T09:20:00.0000000', open: 100, high: 101, low: 99, close: 100.5 },
      },
    },
  }, null, 2)}\n`,
  'utf8',
);

const marketBarsPath = path.join(root, 'market-bars.json');
fs.writeFileSync(
  marketBarsPath,
  `${JSON.stringify({
    bars: {
      '5m': [
        { time: '2026-06-01T18:45:00', open: 100, high: 101, low: 99.5, close: 100.25, volume: 10 },
        { time: '2026-06-01T18:50:00', open: 100.25, high: 102, low: 100, close: 101.75, volume: 12 },
        { time: '2026-06-01T18:55:00', open: 101.75, high: 99, low: 100, close: 101 },
      ],
      '15m': [{ time: '2026-06-01T18:45:00', open: 100, high: 102, low: 99.5, close: 101.75 }],
      '60m': [{ time: '2026-06-01T18:00:00', open: 98, high: 102, low: 97, close: 101 }],
      '120m': [{ time: '2026-06-01T18:00:00', open: 97, high: 102, low: 96, close: 101 }],
      '240m': [{ time: '2026-06-01T16:00:00', open: 95, high: 102, low: 94, close: 101 }],
    },
  }, null, 2)}\n`,
  'utf8',
);

const report = buildRawOhlcReplayAdapterReport({
  startDate: '2026-06-01',
  endDate: '2026-06-01',
  instrument: 'MES',
  auditDir,
  outDir,
  marketBarsJson: marketBarsPath,
  json: true,
}, '2026-07-16T00:00:00.000Z');

const morning = report.sessions.find((session) => session.session === 'morning');
const evening = report.sessions.find((session) => session.session === 'evening');
const fiveMinuteCoverage = report.coverageByTimeframe.find((row) => row.timeframe === '5m');

assert.equal(report.reportType, 'raw_ohlc_replay_adapter');
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingRules, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.missingBarsAreNotInvented, true);
assert.equal(report.assumptions.noScannerRuleExecutionYet, true);
assert.ok(morning);
assert.ok(evening);
assert.equal(morning.decisionTapePresent, true);
assert.equal(morning.selectedSource, 'scanner_decision_tape_completed_5m');
assert.equal(evening.decisionTapePresent, false);
assert.equal(evening.selectedSource, 'local_market_bars_json');
assert.equal(evening.reconstructableFromRawOhlc, true);
assert.equal(report.summary.missingDecisionTapeSessionsCoveredByRawOhlc, 1);
assert.equal(fiveMinuteCoverage?.bars, 2);
assert.equal(fiveMinuteCoverage?.malformedBars, 1);
assert.match(report.reportMarkdown, /Raw OHLC Replay Adapter/);
assert.match(report.reportMarkdown, /No Discord posts, Supabase reads\/writes, bridge reads/);

console.log('raw OHLC replay adapter verified.');
