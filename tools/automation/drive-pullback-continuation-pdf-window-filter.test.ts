import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildDrivePullbackContinuationPdfWindowFilter,
  extractProfitablePdfTradesFromText,
} from './drive-pullback-continuation-pdf-window-filter';

const text = `
 06/08/2026 02:18:06 PM(GMT) FILL 1 - 7439.75 1,484,031,202
 06/08/2026 03:01:30 PM(GMT) FILL - 1 7475.25 1,484,343,172
 06/09/2026 03:25:00 PM(GMT) FILL - 1 7362.5 1,487,751,757
 06/09/2026 03:27:03 PM(GMT) FILL 1 - 7351.25 1,487,781,600
`;

const trades = extractProfitablePdfTradesFromText(text, '2026-06-08', '2026-06-28');
assert.equal(trades.length, 2);
assert.equal(trades[0]?.entryTimeEt, '2026-06-08T10:18:06');
assert.equal(trades[0]?.direction, 'LONG');
assert.equal(trades[0]?.dollars, 177.5);
assert.equal(trades[1]?.entryTimeEt, '2026-06-09T11:25:00');
assert.equal(trades[1]?.direction, 'SHORT');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drive-pullback-pdf-filter-'));
const pdfTextPath = path.join(tempDir, 'statement.txt');
const replayPath = path.join(tempDir, 'replay.json');
fs.writeFileSync(pdfTextPath, text);
fs.writeFileSync(replayPath, JSON.stringify({
  rows: [
    {
      date: '2026-06-08',
      session: 'morning',
      proofTime: '2026-06-08T10:10:00',
      direction: 'LONG',
      entry: 7440,
      stop: 7437.75,
      target1: 7443.5,
      target2: 7444.5,
      riskPoints: 2.25,
      driveTime: '2026-06-08T09:55:00',
      pullbackZone: { lower: 7438, upper: 7441, midpoint: 7439.5 },
      htfContext: 'support',
      evidence: [],
    },
    {
      date: '2026-06-09',
      session: 'morning',
      proofTime: '2026-06-09T10:00:00',
      direction: 'SHORT',
      entry: 7390,
      stop: 7395,
      target1: 7382.5,
      target2: 7380,
      riskPoints: 5,
      driveTime: '2026-06-09T09:45:00',
      pullbackZone: { lower: 7389, upper: 7391, midpoint: 7390 },
      htfContext: 'conflict',
      evidence: [],
    },
  ],
}, null, 2));

const report = buildDrivePullbackContinuationPdfWindowFilter({
  pdfPath: null,
  pdfTextPath,
  replayProofJson: replayPath,
  startDate: '2026-06-08',
  endDate: '2026-06-28',
  windowMinutes: 60,
  maxEntryDistancePoints: 12,
  json: true,
});

assert.equal(report.authority.noScannerWiring, true);
assert.equal(report.authority.noDiscordPost, true);
assert.equal(report.authority.noSupabaseRead, true);
assert.equal(report.authority.noSupabaseWrite, true);
assert.equal(report.authority.noBridgeRead, true);
assert.equal(report.summary.profitablePdfTrades, 2);
assert.equal(report.summary.matchedTrades, 1);
assert.equal(report.summary.supportHtfMatches, 1);
assert.equal(report.summary.conflictHtfMatches, 0);
assert.equal(report.matches[0]?.matched, true);
assert.equal(report.matches[0]?.minutesBeforeEntry, 8);
assert.equal(report.matches[1]?.matched, false);

console.log('drive pullback continuation PDF-window filter verified');
