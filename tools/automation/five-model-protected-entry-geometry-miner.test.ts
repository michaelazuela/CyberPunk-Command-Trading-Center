import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildFiveModelProtectedEntryGeometryMiner } from './five-model-protected-entry-geometry-miner';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'five-model-geometry-miner-'));
const previewPath = path.join(tempDir, 'preview.json');
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

function row(args: { date: string; proofTime: string; entry: number; stop: number; modelId?: string }) {
  return {
    modelId: args.modelId ?? 'raid_failure_displacement_reversal',
    displayName: 'Raid Failure Displacement Reversal',
    laneRole: 'primary_candidate_lane',
    date: args.date,
    session: 'morning',
    direction: 'SHORT',
    proofTime: args.proofTime,
    entry: args.entry,
    stop: args.stop,
    riskPoints: Math.abs(args.stop - args.entry),
    pdfMatchedDollars: 40,
    readiness: 'held_by_risk',
  };
}

fs.writeFileSync(previewPath, JSON.stringify({
  rows: [
    row({ date: '2026-06-17', proofTime: '2026-06-17T10:35:00', entry: 97, stop: 101.25 }),
    row({ date: '2026-06-18', proofTime: '2026-06-18T10:10:00', entry: 199, stop: 205.25, modelId: 'structure_shift_continuation' }),
  ],
}, null, 2));

const report = buildFiveModelProtectedEntryGeometryMiner({
  previewDryRunJson: previewPath,
  marketBarsJson: barsPath,
  json: true,
});

assert.equal(report.authority.noSetupRegistryChange, true);
assert.equal(report.authority.noScannerWiring, true);
assert.equal(report.authority.noDiscordPost, true);
assert.equal(report.authority.noSupabaseRead, true);
assert.equal(report.authority.noSupabaseWrite, true);
assert.equal(report.authority.noBridgeRead, true);
assert.equal(report.authority.noExecutionApproval, true);
assert.equal(report.authority.noCanExecuteChange, true);
assert.equal(report.summary.sourceRows, 2);
assert.equal(report.summary.geometryRows, 2);
assert.equal(report.summary.immediateRiskCleanRows, 1);
assert.equal(report.summary.retestRiskCleanRows, 2);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.rows[0]?.immediateVariants[0]?.riskClean, true);
assert.equal(report.rows[1]?.immediateVariants[0]?.riskClean, false);
assert.equal(report.rows[1]?.retestVariants[0]?.riskClean, true);
assert.equal(report.rows.every((row) => row.scannerInstallEligible === false), true);
assert.equal(report.rows.every((row) => row.canExecute === false), true);

console.log('five-model protected-entry geometry miner verified');
