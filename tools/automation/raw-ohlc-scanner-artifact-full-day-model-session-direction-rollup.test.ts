import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildRawOhlcScannerArtifactFullDayModelSessionDirectionRollupReport } from './raw-ohlc-scanner-artifact-full-day-model-session-direction-rollup';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'full-day-model-rollup-'));
const weakArtifact = path.join(tmpDir, 'weak-artifact.json');
const strongArtifact = path.join(tmpDir, 'strong-artifact.json');
fs.writeFileSync(weakArtifact, JSON.stringify({
  events: {
    '2026-06-10T10:00:00': { completed5m: { time: '2026-06-10T10:00:00', open: 100, high: 101, low: 99, close: 100 } },
    '2026-06-10T10:05:00': { completed5m: { time: '2026-06-10T10:05:00', open: 100, high: 101, low: 89, close: 90 } },
  },
}, null, 2));
fs.writeFileSync(strongArtifact, JSON.stringify({
  events: {
    '2026-06-11T10:00:00': { completed5m: { time: '2026-06-11T10:00:00', open: 100, high: 101, low: 99, close: 100 } },
    '2026-06-11T10:05:00': { completed5m: { time: '2026-06-11T10:05:00', open: 100, high: 121, low: 99, close: 120 } },
  },
}, null, 2));

const replayRows = [
  ...Array.from({ length: 20 }, (_, index) => ({
    ticketId: `weak-artifact|2026-06-10T10:00:00:${index}:NoInstalledSetup:LONG`,
    tradeDate: '2026-06-10',
    session: 'morning',
    setupType: 'NoInstalledSetup',
    direction: 'LONG' as const,
    proofTime: '2026-06-10T10:00:00',
    entry: 100,
    stop: 90,
    t1: 115,
    t2: 120,
  })),
  ...Array.from({ length: 20 }, (_, index) => ({
    ticketId: `strong-artifact|2026-06-11T10:00:00:${index}:NoInstalledSetup:LONG`,
    tradeDate: '2026-06-11',
    session: 'morning',
    setupType: 'NoInstalledSetup',
    direction: 'LONG' as const,
    proofTime: '2026-06-11T10:00:00',
    entry: 100,
    stop: 90,
    t1: 115,
    t2: 120,
  })),
];

const report = buildRawOhlcScannerArtifactFullDayModelSessionDirectionRollupReport({
  reportDir: tmpDir,
  replayPackagePath: 'synthetic-replay-package.json',
  replayPackage: {
    status: 'pass',
    source: { artifactPaths: [weakArtifact, strongArtifact] },
    rows: replayRows,
  },
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.replayRows, 40);
assert.equal(report.summary.resolvedRows, 40);
assert.equal(report.summary.groups, 2);
assert.equal(report.summary.weakestGroupId, 'NoInstalledSetup|morning|LONG');
assert.equal(report.summary.strongestGroupId, 'NoInstalledSetup|morning|LONG');
assert.equal(report.rollupRows[0].researchPriority, 'weak_pocket');
assert.equal(report.rollupRows.find((row) => row.groupId === 'NoInstalledSetup|morning|LONG')?.researchPriority, 'strong_pocket');
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.match(report.markdown, /Full-Day Model\/Session\/Direction Rollup/);

console.log('raw OHLC scanner artifact full-day model/session/direction rollup verified.');
