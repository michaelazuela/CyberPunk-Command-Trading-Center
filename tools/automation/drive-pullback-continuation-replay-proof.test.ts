import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildDrivePullbackContinuationReplayProof } from './drive-pullback-continuation-replay-proof';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drive-pullback-continuation-proof-'));
const marketBarsJson = path.join(tempDir, 'bars.json');

const bars5m = [
  { time: '2026-06-08T09:15:00', open: 100, high: 101, low: 99, close: 100 },
  { time: '2026-06-08T09:20:00', open: 100, high: 101.25, low: 99.5, close: 100.5 },
  { time: '2026-06-08T09:25:00', open: 100.5, high: 101, low: 100, close: 100.75 },
  { time: '2026-06-08T09:30:00', open: 100.75, high: 108, low: 102, close: 107 },
  { time: '2026-06-08T09:35:00', open: 107, high: 108, low: 101, close: 103.5 },
  { time: '2026-06-08T09:40:00', open: 103.5, high: 106, low: 101.5, close: 105.5 },
  { time: '2026-06-08T09:45:00', open: 105.5, high: 107, low: 105, close: 106.5 },
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

const report = buildDrivePullbackContinuationReplayProof({
  marketBarsJson,
  startDate: '2026-06-08',
  endDate: '2026-06-08',
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
assert.equal(report.rows[0]?.entry, 105.5);
assert.equal(report.rows[0]?.stop, 98.75);
assert.equal(report.rows[0]?.target1, 115.75);
assert.equal(report.rows[0]?.target2, 119);
assert.equal(report.rows[0]?.driveTime, '2026-06-08T09:30:00');
assert.deepEqual(report.rows[0]?.pullbackZone, { lower: 101.25, upper: 102, midpoint: 101.75 });

console.log('drive pullback continuation replay proof verified');
