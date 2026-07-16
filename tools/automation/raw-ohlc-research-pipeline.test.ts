import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildRawOhlcResearchPipelineReport,
  parseRawOhlcResearchPipelineArgs,
  writeRawOhlcResearchPipelineReport,
} from './raw-ohlc-research-pipeline';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'raw-ohlc-research-pipeline-'));
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
    },
  }, null, 2)}\n`,
  'utf8',
);

const inputPath = path.join(root, 'input-bars.json');
const htfBars = [
  { time: '2026-05-01T09:15:00', open: 100, high: 102, low: 99, close: 101 },
  { time: '2026-06-01T09:15:00', open: 101, high: 103, low: 100, close: 102 },
];
fs.writeFileSync(
  inputPath,
  `${JSON.stringify({
    bars: {
      '5m': [{ time: '2026-06-01T18:45:00', open: 101, high: 102, low: 100, close: 101.25 }],
      '15m': htfBars,
      '60m': htfBars,
      '120m': htfBars,
      '240m': htfBars,
    },
  }, null, 2)}\n`,
  'utf8',
);

const report = buildRawOhlcResearchPipelineReport({
  startDate: '2026-06-01',
  endDate: '2026-06-01',
  instrument: 'MES',
  auditDir,
  outDir,
  inputJson: inputPath,
  json: true,
}, '2026-07-16T00:00:00.000Z');

const paths = writeRawOhlcResearchPipelineReport(report, outDir);

assert.equal(report.reportType, 'raw_ohlc_research_pipeline');
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesTradingRules, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.missingBarsAreNotInvented, true);
assert.equal(report.assumptions.pipelineDoesNotPromoteTrades, true);
assert.equal(report.summary.sourceTotalBars, 10);
assert.deepEqual(report.summary.sourceHtfTimeframesWithData, ['15m', '60m', '120m', '240m']);
assert.equal(report.summary.scannerCycles, 2);
assert.equal(report.summary.scannerReadyCycles, 2);
assert.equal(report.summary.scannerDataLimitedCycles, 0);
assert.equal(report.summary.replaySessions, 3);
assert.equal(report.summary.replayReconstructableSessions, 2);
assert.equal(report.summary.replayBlockedSessions, 1);
assert.ok(fs.existsSync(report.artifacts.sourceLoaderJson));
assert.ok(fs.existsSync(report.artifacts.canonicalMarketBarsJson));
assert.ok(fs.existsSync(report.artifacts.scannerCycleJson));
assert.ok(fs.existsSync(report.artifacts.replayAdapterJson));
assert.ok(fs.existsSync(paths.jsonPath));
assert.match(report.reportMarkdown, /Raw OHLC Research Pipeline/);
assert.match(report.reportMarkdown, /No Discord posts, Supabase reads\/writes, bridge reads/);
assert.throws(
  () => parseRawOhlcResearchPipelineArgs(['--start-date', '20260799']),
  /--start-date must use YYYY-MM-DD/,
);

console.log('raw OHLC research pipeline verified.');
