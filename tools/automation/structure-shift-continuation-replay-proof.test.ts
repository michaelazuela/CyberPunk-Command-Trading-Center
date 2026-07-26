import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildStructureShiftContinuationReplayProof } from './structure-shift-continuation-replay-proof';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'structure-shift-continuation-proof-'));
const marketBarsJson = path.join(tempDir, 'bars.json');

const bars5m = [
  { time: '2026-06-15T09:15:00', open: 100, high: 101, low: 99, close: 100 },
  { time: '2026-06-15T09:20:00', open: 100, high: 101.5, low: 99.5, close: 100.5 },
  { time: '2026-06-15T09:25:00', open: 100.5, high: 101.25, low: 100, close: 100.75 },
  { time: '2026-06-15T09:30:00', open: 100.75, high: 103, low: 100.5, close: 102.5 },
  { time: '2026-06-15T09:35:00', open: 102.5, high: 103.25, low: 101.25, close: 102.75 },
  { time: '2026-06-15T09:40:00', open: 102.75, high: 104, low: 102.5, close: 103.5 },
];

fs.writeFileSync(marketBarsJson, JSON.stringify({
  bars: {
    '5m': bars5m,
    '15m': bars5m,
    '60m': bars5m,
    '120m': bars5m,
    '240m': bars5m,
  },
}, null, 2));

const report = buildStructureShiftContinuationReplayProof({
  marketBarsJson,
  startDate: '2026-06-15',
  endDate: '2026-06-15',
  instrument: 'MES',
  sessions: ['morning'],
  json: true,
});

assert.equal(report.authority.noScannerWiring, true);
assert.equal(report.authority.noDiscordPost, true);
assert.equal(report.authority.noSupabaseRead, true);
assert.equal(report.authority.noSupabaseWrite, true);
assert.equal(report.authority.noBridgeRead, true);
assert.equal(report.authority.noExecutionApproval, true);
assert.equal(report.summary.detections, 1);
assert.equal(report.rows[0]?.direction, 'LONG');
assert.equal(report.rows[0]?.entry, 102.75);
assert.equal(report.rows[0]?.stop, 98.75);
assert.equal(report.rows[0]?.target1, 108.75);
assert.equal(report.rows[0]?.target2, 110.75);
assert.equal(report.rows[0]?.shiftTime, '2026-06-15T09:30:00');
assert.equal(report.rows[0]?.proofTime, '2026-06-15T09:35:00');

console.log('structure shift continuation replay proof verified');
