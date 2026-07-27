import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildRawOhlcScannerArtifactGeneratorReport,
  parseRawOhlcScannerArtifactGeneratorArgs,
  writeRawOhlcScannerArtifactGeneratorReport,
} from './raw-ohlc-scanner-artifact-generator';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'raw-ohlc-scanner-artifact-generator-'));
const marketBarsPath = path.join(root, 'market-bars.json');

const htfBars = [
  { time: '2026-05-10T12:00:00', open: 100, high: 102, low: 99, close: 101, volume: 100 },
  { time: '2026-06-10T12:00:00', open: 101, high: 104, low: 100, close: 103, volume: 120 },
  { time: '2026-06-12T12:00:00', open: 103, high: 105, low: 101, close: 104, volume: 130 },
];

fs.writeFileSync(
  marketBarsPath,
  `${JSON.stringify({
    bars: {
      '5m': [
        { time: '2026-06-10T11:55:00', open: 100, high: 101, low: 99.5, close: 100.25, volume: 10 },
        { time: '2026-06-10T12:00:00', open: 100.25, high: 102, low: 100, close: 101.75, volume: 12 },
        { time: '2026-06-10T12:05:00', open: 101.75, high: 103, low: 101.25, close: 102.5, volume: 14 },
        { time: '2026-06-12T12:00:00', open: 104, high: 105, low: 103.5, close: 104.25, volume: 11 },
      ],
      '15m': htfBars,
      '60m': htfBars,
      '120m': htfBars,
      '240m': htfBars,
    },
  }, null, 2)}\n`,
  'utf8',
);

const report = buildRawOhlcScannerArtifactGeneratorReport({
  startDate: '2026-06-10',
  endDate: '2026-06-10',
  instrument: 'MES',
  marketBarsJson: marketBarsPath,
  outDir: root,
  sessions: ['lunch'],
  json: true,
}, '2026-07-18T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_generator');
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.runsSetupScanner, true);
assert.equal(report.authority.scannerRunMode, 'replay_only');
assert.equal(report.authority.changesTradingRules, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.localMarketBarsJsonOnly, true);
assert.equal(report.assumptions.completedFiveMinuteBarsOnly, true);
assert.equal(report.assumptions.livePromotionAllowed, false);
assert.equal(report.summary.eventsGenerated, 2);
assert.equal(report.summary.sessions.lunch, 2);
assert.equal(report.summary.sessions.morning, 0);
assert.equal(report.summary.eventsWithReadyHtf, 2);
assert.equal(report.summary.eventsDataLimited, 0);
assert.equal(Object.keys(report.events).length, 2);
assert.ok(report.events['2026-06-10T12:00:00']);
assert.ok(report.events['2026-06-10T12:05:00']);
assert.equal(report.events['2026-06-10T12:05:00'].setupCandidateStatus.statuses.length, 1);
assert.equal(report.events['2026-06-10T12:05:00'].setupCandidateStatus.statuses[0].setupType, 'RaidFailureDisplacementReversal');
assert.equal(report.events['2026-06-10T12:05:00'].setupCandidateStatus.statuses[0].detectedStatus, 'Possible');
assert.equal(report.events['2026-06-10T12:05:00'].setupCandidateStatus.statuses[0].executionStatus, 'Conditional');
assert.equal(report.events['2026-06-10T12:05:00'].setupCandidateStatus.statuses[0].blockReason, 'EntryTriggerPending');
assert.equal(report.events['2026-06-10T12:05:00'].setupCandidateStatus.statuses[0].entry, null);
assert.equal(report.events['2026-06-10T12:05:00'].setupCandidateStatus.statuses[0].stop, null);
assert.equal(report.events['2026-06-10T12:05:00'].scannerSummary.candidateCount, 1);
assert.equal(report.events['2026-06-10T12:05:00'].scannerSummary.executableCount, 0);
assert.equal(report.events['2026-06-10T12:05:00'].scannerSummary.bestConditionalSetupType, 'RaidFailureDisplacementReversal');
assert.match(report.reportMarkdown, /Research-only local scanner artifact generation/);
assert.match(report.reportMarkdown, /No Discord posts, Supabase reads\/writes, live bridge reads/);

const paths = writeRawOhlcScannerArtifactGeneratorReport(report, root);
assert.equal(fs.existsSync(paths.jsonPath), true);
assert.equal(fs.existsSync(paths.markdownPath), true);
assert.equal(fs.existsSync(paths.artifactPath), true);

const artifact = JSON.parse(fs.readFileSync(paths.artifactPath, 'utf8')) as Record<string, unknown>;
assert.equal(artifact.reportType, 'raw_ohlc_scanner_artifact_package');
assert.equal(Object.keys(artifact.events as Record<string, unknown>).length, 2);

assert.throws(
  () => parseRawOhlcScannerArtifactGeneratorArgs(['--start-date', '2026-06-10']),
  /--market-bars-json is required/,
);
assert.throws(
  () => parseRawOhlcScannerArtifactGeneratorArgs(['--market-bars-json', marketBarsPath, '--sessions', 'morning,invalid']),
  /--sessions must be/,
);

console.log('raw OHLC scanner artifact generator verified.');
