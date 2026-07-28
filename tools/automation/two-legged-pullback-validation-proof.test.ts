import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildTwoLeggedPullbackValidationProof } from './two-legged-pullback-validation-proof';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'two-legged-pullback-proof-'));
const marketBarsJson = path.join(tempDir, 'bars.json');

const bars5m = [
  { time: '2026-06-08T09:15:00', open: 100, high: 101, low: 99, close: 100 },
  { time: '2026-06-08T09:20:00', open: 100, high: 102, low: 99.75, close: 101.5 },
  { time: '2026-06-08T09:25:00', open: 101.5, high: 104, low: 101.25, close: 103.5 },
  { time: '2026-06-08T09:30:00', open: 103.5, high: 107, low: 103.25, close: 106.5 },
  { time: '2026-06-08T09:35:00', open: 106.5, high: 107, low: 104, close: 104.75 },
  { time: '2026-06-08T09:40:00', open: 104.75, high: 106, low: 103.5, close: 105.75 },
  { time: '2026-06-08T09:45:00', open: 105.75, high: 106, low: 102.75, close: 103.25 },
  { time: '2026-06-08T09:50:00', open: 103.25, high: 106.25, low: 103, close: 105.5 },
  { time: '2026-06-08T09:55:00', open: 105.5, high: 109, low: 105.25, close: 108.5 },
  { time: '2026-06-08T10:00:00', open: 108.5, high: 118, low: 108, close: 116 },
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

const report = buildTwoLeggedPullbackValidationProof({
  marketBarsJson,
  candidatePack: null,
  startDate: '2026-06-08',
  endDate: '2026-06-08',
  instrument: 'MES',
  sessions: ['morning'],
  json: true,
});

assert.equal(report.authority.validationOnly, true);
assert.equal(report.authority.noScannerWiring, true);
assert.equal(report.authority.noDiscordPost, true);
assert.equal(report.authority.noSupabaseRead, true);
assert.equal(report.authority.noSupabaseWrite, true);
assert.equal(report.authority.noBridgeRead, true);
assert.equal(report.authority.noExecutionApproval, true);
assert.equal(report.authority.noTradingRuleChange, true);
assert.equal(report.summary.candidateRows, 2);
assert.equal(report.summary.firstPerWindowRows, 1);
assert.equal(report.rows[0]?.direction, 'LONG');
assert.equal(report.rows[0]?.proofTime, '2026-06-08T09:55:00');
assert.equal(report.rows[0]?.entry, 108.5);
assert.equal(report.rows[0]?.stop, 98.75);
assert.equal(report.rows[0]?.riskPoints, 9.75);
assert.equal(report.rows[0]?.target1, 123.25);
assert.equal(report.rows[0]?.target2, 128);
assert.equal(report.firstPerWindow[0]?.proofTime, '2026-06-08T09:55:00');

console.log('two-legged pullback validation proof verified');
