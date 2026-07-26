import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildRaidFailureDisplacementRetestEntryValidation } from './raid-failure-displacement-retest-entry-validation';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raid-failure-displacement-retest-'));
const geometryPath = path.join(tempDir, 'geometry.json');
const barsPath = path.join(tempDir, 'bars.json');

fs.writeFileSync(barsPath, JSON.stringify({
  bars: {
    '5m': [
      { time: '2026-06-17T10:35:00', open: 100, high: 101, low: 96, close: 97 },
      { time: '2026-06-17T10:40:00', open: 97, high: 99.5, low: 95, close: 96 },
      { time: '2026-06-18T10:35:00', open: 100, high: 101, low: 96, close: 97 },
      { time: '2026-06-18T10:40:00', open: 97, high: 103, low: 95, close: 96 },
      { time: '2026-06-19T10:35:00', open: 100, high: 101, low: 96, close: 97 },
      { time: '2026-06-19T10:40:00', open: 97, high: 98, low: 95, close: 96 },
    ],
  },
}, null, 2));

function row(args: { date: string; entry: number; stop: number; dollars: number }) {
  return {
    trade: {
      date: args.date,
      session: 'morning',
      direction: 'SHORT',
      entryTimeEt: `${args.date}T10:35:00`,
      exitTimeEt: `${args.date}T10:45:00`,
      entry: 97,
      exit: 92,
      dollars: args.dollars,
    },
    quality: 'tight',
    proofTime: `${args.date}T10:35:00`,
    retestVariants: [{
      name: 'required_retest_entry_vs_proof_wick',
      entry: args.entry,
      stop: args.stop,
      riskPoints: Math.abs(args.stop - args.entry),
      riskClean: true,
      target1: args.entry - 7.5,
      target2: args.entry - 10,
    }],
  };
}

fs.writeFileSync(geometryPath, JSON.stringify({
  rows: [
    row({ date: '2026-06-17', entry: 99, stop: 104, dollars: 40 }),
    row({ date: '2026-06-18', entry: 99, stop: 103, dollars: 25 }),
    row({ date: '2026-06-19', entry: 99, stop: 104, dollars: 15 }),
  ],
}, null, 2));

const report = buildRaidFailureDisplacementRetestEntryValidation({
  geometryJson: geometryPath,
  marketBarsJson: barsPath,
  json: true,
});

assert.equal(report.authority.validatesAfterProofOnly, true);
assert.equal(report.authority.noScannerWiring, true);
assert.equal(report.authority.noDiscordPost, true);
assert.equal(report.authority.noSupabaseRead, true);
assert.equal(report.authority.noSupabaseWrite, true);
assert.equal(report.authority.noBridgeRead, true);
assert.equal(report.authority.noExecutionApproval, true);
assert.equal(report.authority.noCanExecuteChange, true);
assert.equal(report.summary.geometryRows, 3);
assert.equal(report.summary.retestTouchedRows, 2);
assert.equal(report.summary.cleanRetestRows, 1);
assert.equal(report.summary.cleanRetestDollars, 40);
assert.equal(report.summary.ambiguousStopTouchRows, 1);
assert.equal(report.summary.ambiguousStopTouchDollars, 25);
assert.equal(report.summary.noRetestTouchRows, 1);
assert.equal(report.summary.noRetestTouchDollars, 15);
assert.equal(report.summary.canExecuteTrueRows, 0);

console.log('raid failure displacement retest-entry validation verified');
