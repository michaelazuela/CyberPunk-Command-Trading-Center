import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildLiquidityRaidReclaimReplayProof } from './liquidity-raid-reclaim-reversal-replay-proof';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'liq-raid-reclaim-proof-'));
const marketBarsJson = path.join(tempDir, 'bars.json');

const bars5m = [
  { time: '2026-06-08T09:15:00', open: 100, high: 101, low: 99, close: 100 },
  { time: '2026-06-08T09:20:00', open: 100, high: 101.25, low: 99.5, close: 100.5 },
  { time: '2026-06-08T09:25:00', open: 100.5, high: 101, low: 99.75, close: 100.25 },
  { time: '2026-06-08T09:30:00', open: 100.25, high: 100.75, low: 98.5, close: 100.5 },
  { time: '2026-06-08T09:35:00', open: 100.5, high: 101, low: 100, close: 100.75 },
  { time: '2026-06-08T12:00:00', open: 100.75, high: 102, low: 100.5, close: 101.5 },
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

const report = buildLiquidityRaidReclaimReplayProof({
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
assert.equal(report.rows[0]?.entry, 99);
assert.equal(report.rows[0]?.stop, 98.25);
assert.equal(report.rows[0]?.target1, 100.25);
assert.equal(report.rows[0]?.target2, 100.5);

console.log('liquidity raid reclaim reversal replay proof verified');
