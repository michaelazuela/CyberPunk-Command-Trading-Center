import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildRawOhlcSourceLoaderReport } from './raw-ohlc-source-loader';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'raw-ohlc-source-loader-'));
const auditDir = path.join(root, 'discord-audit');
const outDir = path.join(root, 'reports');
fs.mkdirSync(auditDir, { recursive: true });

fs.writeFileSync(
  path.join(auditDir, 'scanner-decision-tape-2026-06-01-MES-morning.json'),
  `${JSON.stringify({
    events: {
      first: {
        completed5m: { time: '2026-06-01T09:20:00.0000000', open: 100, high: 101, low: 99, close: 100.5 },
      },
      duplicate: {
        completed5m: { time: '2026-06-01T09:20:00.0000000', open: 100, high: 101, low: 99, close: 100.5 },
      },
    },
  }, null, 2)}\n`,
  'utf8',
);

const inputPath = path.join(root, 'input-bars.json');
fs.writeFileSync(
  inputPath,
  `${JSON.stringify({
    bars: {
      '5m': [
        { time: '2026-06-01T18:45:00', open: 110, high: 111, low: 109, close: 110.5 },
        { time: '2026-06-01T18:50:00', open: 110.5, high: 109, low: 110, close: 110.25 },
      ],
      '15m': [{ time: '2026-06-01T18:45:00', open: 110, high: 112, low: 109, close: 111 }],
      '60m': [{ time: '2026-06-01T18:00:00', open: 108, high: 112, low: 107, close: 111 }],
      '120m': [{ time: '2026-06-01T18:00:00', open: 106, high: 112, low: 105, close: 111 }],
      '240m': [{ time: '2026-06-01T16:00:00', open: 104, high: 112, low: 103, close: 111 }],
    },
  }, null, 2)}\n`,
  'utf8',
);

const report = buildRawOhlcSourceLoaderReport({
  startDate: '2026-06-01',
  endDate: '2026-06-01',
  instrument: 'MES',
  auditDir,
  outDir,
  inputJson: inputPath,
  json: true,
}, '2026-07-16T00:00:00.000Z');

const canonical = JSON.parse(fs.readFileSync(report.canonicalMarketBarsPath, 'utf8')) as any;
const fiveMinute = report.coverageByTimeframe.find((row) => row.timeframe === '5m');

assert.equal(report.reportType, 'raw_ohlc_source_loader');
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingRules, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.missingBarsAreNotInvented, true);
assert.equal(report.summary.localInputBars, 5);
assert.equal(report.summary.decisionTapeFiveMinuteBars, 1);
assert.equal(report.summary.totalBars, 6);
assert.equal(report.summary.malformedBars, 1);
assert.deepEqual(report.summary.htfTimeframesWithData, ['15m', '60m', '120m', '240m']);
assert.equal(fiveMinute?.bars, 2);
assert.equal(fiveMinute?.malformedBars, 1);
assert.equal(canonical.reportType, 'raw_ohlc_source_canonical_market_bars');
assert.equal(canonical.authority.noLiveSupabaseRead, true);
assert.equal(canonical.authority.noLiveBridgeRead, true);
assert.equal(canonical.bars['5m'].length, 2);
assert.match(report.reportMarkdown, /Raw OHLC Source Loader/);

console.log('raw OHLC source loader verified.');
