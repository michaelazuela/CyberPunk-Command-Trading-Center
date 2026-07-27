import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildProtectedShelfWatchReplayReport } from './protected-shelf-watch-replay';
import type { ProtectedShelfBar } from '../../src/lib/protectedShelfWatch';

function writeFixture(bars: { five: ProtectedShelfBar[]; fifteen: ProtectedShelfBar[] }): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'protected-shelf-watch-replay-'));
  const filePath = path.join(dir, 'market-bars.json');
  fs.writeFileSync(filePath, JSON.stringify({
    bars: {
      '5m': bars.five,
      '15m': bars.fifteen,
      '60m': [],
      '120m': [],
      '240m': [],
    },
  }));
  return filePath;
}

const june25Source = writeFixture({
  five: [
    { time: '2026-06-25T09:20:00', open: 7480, high: 7483, low: 7472, close: 7478 },
    { time: '2026-06-25T09:25:00', open: 7478, high: 7486, low: 7475, close: 7482 },
    { time: '2026-06-25T09:30:00', open: 7482, high: 7488, low: 7479, close: 7485.75 },
    { time: '2026-06-25T09:35:00', open: 7486, high: 7490.5, low: 7476, close: 7477 },
  ],
  fifteen: [
    { time: '2026-06-25T08:45:00', open: 7482, high: 7490, low: 7478, close: 7485 },
    { time: '2026-06-25T09:00:00', open: 7485, high: 7489.5, low: 7479, close: 7483 },
    { time: '2026-06-25T09:15:00', open: 7483, high: 7490, low: 7476, close: 7485.75 },
    { time: '2026-06-25T09:30:00', open: 7485.75, high: 7490.5, low: 7476, close: 7477 },
  ],
});

const june25 = buildProtectedShelfWatchReplayReport({
  marketBarsJson: june25Source,
  tradeDate: '2026-06-25',
  session: 'morning',
  instrument: 'MES',
  outDir: path.dirname(june25Source),
  json: true,
}, '2026-07-26T12:00:00.000Z');

assert.equal(june25.reportType, 'protected_shelf_watch_replay');
assert.equal(june25.authority.postsDiscord, false);
assert.equal(june25.authority.writesSupabase, false);
assert.equal(june25.authority.readsLiveBridge, false);
assert.equal(june25.summary.direction, 'SHORT');
assert.equal(june25.summary.entry, 7485.75);
assert.equal(june25.summary.stop, 7490.75);
assert.equal(june25.summary.target1, 7478.25);
assert.equal(june25.summary.target2, 7475.75);
assert.equal(june25.summary.proofTime, '2026-06-25T09:35:00');

const june26Source = writeFixture({
  five: [
    { time: '2026-06-26T09:35:00', open: 7381, high: 7388.25, low: 7360, close: 7370.25 },
    { time: '2026-06-26T09:40:00', open: 7370.25, high: 7383.25, low: 7367.25, close: 7372.75 },
    { time: '2026-06-26T09:45:00', open: 7373, high: 7386.5, low: 7368.75, close: 7384.25 },
    { time: '2026-06-26T09:50:00', open: 7384.25, high: 7390.25, low: 7371.25, close: 7379 },
    { time: '2026-06-26T09:55:00', open: 7378.75, high: 7389, low: 7377, close: 7385.75 },
    { time: '2026-06-26T10:00:00', open: 7386, high: 7405.5, low: 7384, close: 7403.5 },
  ],
  fifteen: [
    { time: '2026-06-26T08:45:00', open: 7394.5, high: 7397, low: 7383.5, close: 7384 },
    { time: '2026-06-26T09:00:00', open: 7383.75, high: 7386.75, low: 7380, close: 7383.75 },
    { time: '2026-06-26T09:15:00', open: 7384.25, high: 7385, low: 7373.25, close: 7376.75 },
    { time: '2026-06-26T09:30:00', open: 7376.75, high: 7382.75, low: 7364.5, close: 7380.75 },
    { time: '2026-06-26T09:45:00', open: 7381, high: 7388.25, low: 7360, close: 7384.25 },
    { time: '2026-06-26T10:00:00', open: 7384.25, high: 7405.5, low: 7371.25, close: 7403.5 },
  ],
});

const june26 = buildProtectedShelfWatchReplayReport({
  marketBarsJson: june26Source,
  tradeDate: '2026-06-26',
  session: 'morning',
  instrument: 'MES',
  outDir: path.dirname(june26Source),
  json: true,
}, '2026-07-26T12:00:00.000Z');

assert.equal(june26.summary.state, 'proof_completed');
assert.equal(june26.summary.direction, 'LONG');
assert.equal(june26.summary.entry, 7383);
assert.equal(june26.summary.stop, 7368.5);
assert.equal(june26.summary.target1, 7404.75);
assert.equal(june26.summary.target2, 7412);
assert.equal(june26.summary.proofTime, '2026-06-26T09:45:00');
assert.equal(june26.summary.noChase, false);
assert.ok(june26.markdown.includes('No chase: false'));

console.log('protected-shelf-watch-replay.test passed');
