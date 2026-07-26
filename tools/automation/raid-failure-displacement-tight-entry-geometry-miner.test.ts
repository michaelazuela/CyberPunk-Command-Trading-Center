import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildRaidFailureDisplacementTightEntryGeometryMiner } from './raid-failure-displacement-tight-entry-geometry-miner';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raid-failure-displacement-geometry-'));
const selectorPath = path.join(tempDir, 'selector.json');
const barsPath = path.join(tempDir, 'bars.json');

fs.writeFileSync(barsPath, JSON.stringify({
  bars: {
    '5m': [
      { time: '2026-06-17T10:30:00', open: 100, high: 101, low: 99.5, close: 100.5 },
      { time: '2026-06-17T10:35:00', open: 100.5, high: 101, low: 96, close: 97 },
      { time: '2026-06-18T10:05:00', open: 200, high: 205, low: 199, close: 204 },
      { time: '2026-06-18T10:10:00', open: 204, high: 205, low: 198, close: 199 },
    ],
  },
}, null, 2));

function row(args: { date: string; proofTime: string; entry: number; stop: number }) {
  return {
    trade: {
      date: args.date,
      session: 'morning',
      direction: 'SHORT',
      entryTimeEt: args.proofTime,
      entry: args.entry,
      exit: args.entry - 8,
      dollars: 40,
    },
    quality: 'tight',
    bestDetection: {
      proofTime: args.proofTime,
      entry: args.entry,
      stop: args.stop,
      target1: args.entry - 8,
      target2: args.entry - 10,
      riskPoints: Math.abs(args.stop - args.entry),
      htfContext: 'support',
      evidence: ['Displacement left imbalance context.'],
    },
    minutesBeforeEntry: 0,
    entryDistancePoints: 1,
  };
}

fs.writeFileSync(selectorPath, JSON.stringify({
  rows: [
    row({ date: '2026-06-17', proofTime: '2026-06-17T10:35:00', entry: 97, stop: 101.25 }),
    row({ date: '2026-06-18', proofTime: '2026-06-18T10:10:00', entry: 199, stop: 205.25 }),
  ],
}, null, 2));

const report = buildRaidFailureDisplacementTightEntryGeometryMiner({
  selectorJson: selectorPath,
  marketBarsJson: barsPath,
  json: true,
});

assert.equal(report.authority.noScannerWiring, true);
assert.equal(report.authority.noDiscordPost, true);
assert.equal(report.authority.noSupabaseRead, true);
assert.equal(report.authority.noSupabaseWrite, true);
assert.equal(report.authority.noBridgeRead, true);
assert.equal(report.authority.noExecutionApproval, true);
assert.equal(report.authority.noCanExecuteChange, true);
assert.equal(report.summary.clauseQualifiedRows, 2);
assert.equal(report.summary.geometryRows, 2);
assert.equal(report.summary.immediateRiskCleanRows, 1);
assert.equal(report.summary.retestRiskCleanRows, 2);
assert.equal(report.rows[0]?.immediateVariants[0]?.riskClean, true);
assert.equal(report.rows[1]?.immediateVariants[0]?.riskClean, false);
assert.equal(report.rows[1]?.retestVariants[0]?.riskClean, true);

console.log('raid failure displacement tight-entry geometry miner verified');
