import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { NinjaBridgeBar } from '../../src/lib/ninjaTraderBridge';
import {
  buildControlledHtfOhlcAcquisitionReport,
  parseControlledHtfOhlcAcquisitionArgs,
  writeControlledHtfOhlcAcquisitionReport,
} from './controlled-htf-ohlc-acquisition';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'controlled-htf-ohlc-acquisition-'));
const outDir = path.join(root, 'reports');
const inputPath = path.join(root, 'input-bars.json');

function bar(time: string, close: number): NinjaBridgeBar {
  return { time, open: close - 1, high: close + 1, low: close - 2, close, volume: 1 };
}

fs.writeFileSync(
  inputPath,
  `${JSON.stringify({
    bars: {
      '5m': [bar('2026-05-01T00:00:00', 100), bar('2026-06-01T23:55:00', 101)],
      '15m': [bar('2026-05-01T00:00:00', 100), bar('2026-06-01T23:45:00', 101)],
      '60m': [bar('2026-05-01T00:00:00', 100), bar('2026-06-01T23:00:00', 101)],
      '120m': [bar('2026-05-01T00:00:00', 100), bar('2026-06-01T22:00:00', 101)],
      '240m': [bar('2026-05-01T00:00:00', 100), bar('2026-06-01T20:00:00', 101)],
    },
  }, null, 2)}\n`,
  'utf8',
);

const localReport = await buildControlledHtfOhlcAcquisitionReport({
  startDate: '2026-06-01',
  endDate: '2026-06-01',
  instrument: 'MES',
  bridgeInstrument: 'MES 06-26',
  bridgeUrl: 'http://127.0.0.1:8765',
  source: 'local-json',
  inputJson: inputPath,
  outDir,
  chunkDays: 7,
  lookbackDays: 30,
  json: true,
}, '2026-07-16T00:00:00.000Z');

const localPaths = writeControlledHtfOhlcAcquisitionReport(localReport, outDir);
const canonical = JSON.parse(fs.readFileSync(localReport.canonicalMarketBarsPath, 'utf8')) as any;

assert.equal(localReport.reportType, 'controlled_htf_ohlc_acquisition');
assert.equal(localReport.authority.researchOnly, true);
assert.equal(localReport.authority.postsDiscord, false);
assert.equal(localReport.authority.writesSupabase, false);
assert.equal(localReport.authority.readsLiveSupabase, false);
assert.equal(localReport.authority.readsLiveBridge, false);
assert.equal(localReport.authority.runsSetupScanner, false);
assert.equal(localReport.authority.changesTradingRules, false);
assert.equal(localReport.authority.changesCanExecute, false);
assert.equal(localReport.assumptions.missingBarsAreNotInvented, true);
assert.equal(localReport.summary.totalBars, 10);
assert.deepEqual(localReport.summary.sufficientTimeframes, ['5m', '15m', '60m', '120m', '240m']);
assert.deepEqual(localReport.summary.dataLimitedTimeframes, []);
assert.ok(fs.existsSync(localReport.canonicalMarketBarsPath));
assert.ok(fs.existsSync(localPaths.jsonPath));
assert.equal(canonical.reportType, 'controlled_htf_ohlc_canonical_market_bars');
assert.equal(canonical.authority.noDiscordPost, true);
assert.equal(canonical.authority.noSupabaseWrite, true);
assert.equal(canonical.bars['240m'].length, 2);
assert.match(localReport.reportMarkdown, /Controlled HTF OHLC Acquisition/);
assert.match(localReport.reportMarkdown, /No Discord posts, Supabase writes/);

const bridgeCalls: string[] = [];
const bridgeReport = await buildControlledHtfOhlcAcquisitionReport({
  startDate: '2026-06-01',
  endDate: '2026-06-01',
  instrument: 'MES',
  bridgeInstrument: 'MES 06-26',
  bridgeUrl: 'http://127.0.0.1:8765',
  source: 'bridge',
  inputJson: null,
  outDir,
  chunkDays: 60,
  lookbackDays: 30,
  json: true,
}, '2026-07-16T00:00:00.000Z', {
  fetchHistorical: async ({ timeframe }) => {
    bridgeCalls.push(String(timeframe));
    return {
      ok: true,
      instrument: 'MES 06-26',
      timeframe: timeframe || '5m',
      count: 2,
      bars: [bar('2026-05-01T00:00:00', 100), bar('2026-06-01T23:55:00', 101)],
    };
  },
});

assert.equal(bridgeReport.authority.readsLiveSupabase, false);
assert.equal(bridgeReport.authority.readsLiveBridge, true);
assert.equal(bridgeReport.summary.liveBridgeReadAttempted, true);
assert.equal(bridgeCalls.length, 5);
assert.equal(bridgeReport.coverage.every((row) => row.bridgeRequests === 1), true);

assert.throws(
  () => parseControlledHtfOhlcAcquisitionArgs(['--source', 'bad']),
  /--source must be local-json/,
);

console.log('controlled HTF OHLC acquisition verified.');
