import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildCollisionFirstArbitrationPdfWindowReplay } from './collision-first-arbitration-pdf-window-replay';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'collision-first-replay-'));
const pdfTextPath = path.join(dir, 'statement.txt');
const longReplay = path.join(dir, 'structure-shift-continuation-replay-proof-MES-2026-06-08-to-2026-06-28-1.json');
const shortReplay = path.join(dir, 'raid-failure-displacement-reversal-replay-proof-MES-2026-06-08-to-2026-06-28-1.json');

fs.writeFileSync(pdfTextPath, [
  '06/08/2026 02:18:00 PM(GMT) FILL 1 - 7500.00 100',
  '06/08/2026 02:45:00 PM(GMT) FILL - 1 7520.00 100',
].join('\n'));

fs.writeFileSync(longReplay, JSON.stringify({
  rows: [{
    date: '2026-06-08',
    session: 'morning',
    proofTime: '2026-06-08T10:10:00',
    direction: 'LONG',
    entry: 7500,
    stop: 7492,
    target1: 7512,
    target2: 7516,
    riskPoints: 8,
    htfContext: 'support',
    evidence: ['Completed 5M proof.'],
  }],
}, null, 2));

fs.writeFileSync(shortReplay, JSON.stringify({
  rows: [{
    date: '2026-06-08',
    session: 'morning',
    proofTime: '2026-06-08T10:10:00',
    direction: 'SHORT',
    entry: 7501,
    stop: 7510,
    target1: 7487.5,
    target2: 7483,
    riskPoints: 9,
    htfContext: 'support',
    evidence: ['Completed 5M proof.'],
  }],
}, null, 2));

const report = buildCollisionFirstArbitrationPdfWindowReplay({
  pdfTextPath,
  pdfPath: null,
  startDate: '2026-06-08',
  endDate: '2026-06-08',
  windowMinutes: 60,
  maxEntryDistancePoints: 12,
  replayReports: [longReplay, shortReplay],
  json: false,
});

assert.equal(report.reportType, 'collision_first_arbitration_pdf_window_replay');
assert.equal(report.summary.profitablePdfTrades, 1);
assert.equal(report.summary.collisionClusters, 1);
assert.equal(report.summary.naiveOppositeSidePromotions, 0);
assert.equal(report.summary.collisionOppositeSidePromotions, 0);
assert.equal(report.summary.winningSideEvidencePreserved, 1);
assert.equal(report.clusters[0]?.collisionState, 'collision_wait');
assert.equal(report.clusters[0]?.selectedDirection, null);

console.log('collision-first arbitration PDF-window replay verified.');
