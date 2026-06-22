import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildResearchDeskEvidenceTableReport } from './research-desk-evidence-table';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'research-desk-evidence-table-'));
const researchReports = path.join(tmp, 'tools', 'automation', 'research-reports');
const replayDiagnostics = path.join(tmp, 'tools', 'automation', 'replay-diagnostics');
const modelDecisions = path.join(tmp, 'tools', 'automation', 'model-candidate-decisions');
const liveObserver = path.join(tmp, 'tools', 'automation', 'live-desk-observer-reports');
fs.mkdirSync(researchReports, { recursive: true });
fs.mkdirSync(replayDiagnostics, { recursive: true });
fs.mkdirSync(modelDecisions, { recursive: true });
fs.mkdirSync(liveObserver, { recursive: true });

fs.writeFileSync(path.join(researchReports, 'ready-sniper.json'), JSON.stringify({
  reportType: 'sniper_watch_research_phase3_audit',
  instrument: 'MES',
  summary: {
    opportunities: 12,
    t1Hits: 7,
    t2Hits: 3,
    stopped: 2,
    noFiveMinuteConfirmation: 1,
    unresolved: 2,
  },
  conclusion: 'Promising candidate validated for deeper review.',
}, null, 2));
fs.writeFileSync(path.join(researchReports, 'desk-research-evidence-generated.json'), JSON.stringify({
  reportType: 'research_desk_evidence_table_phase2',
  summary: { evidenceRows: 99 },
  conclusion: 'Promising generated meta report should not be re-ingested.',
}, null, 2));
fs.writeFileSync(path.join(researchReports, 'desk-research-case-review-generated.json'), JSON.stringify({
  reportType: 'research_desk_case_review_phase3',
  summary: { readyRowsReviewed: 99 },
  conclusion: 'Promising generated case review should not be re-ingested.',
}, null, 2));

fs.writeFileSync(path.join(replayDiagnostics, 'needs-data.md'), [
  '# Review',
  'Promising watchlist idea, but research-only and needs more data before promotion.',
].join('\n'));

fs.writeFileSync(path.join(modelDecisions, 'reject.json'), JSON.stringify({
  reportType: 'model_candidate_decision',
  instrument: 'MES',
  decision: 'Reject. Do not promote. Failed in replay.',
}, null, 2));
fs.writeFileSync(path.join(liveObserver, 'price-level-stop.json'), JSON.stringify({
  reportType: 'live_desk_observer',
  instrument: 'MES',
  eventCount: 4,
  summary: {
    latestDeskPrimary: 'LONG',
  },
  observation: 'Promising candidate language exists, but stop 7565 is a price level, not an outcome count.',
}, null, 2));

const report = await buildResearchDeskEvidenceTableReport({
  root: tmp,
  outDir: path.join(tmp, 'out'),
  json: false,
});

assert.equal(report.reportType, 'research_desk_evidence_table_phase2');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.changesEntriesStopsTargets, false);
assert.equal(report.authority.createsNewModel, false);
assert.equal(report.authority.promotesModel, false);
assert.equal(report.summary.artifactsReviewed, 4);
assert.equal(report.summary.evidenceRows, 4);
assert.equal(report.summary.readyForDeeperReview, 1);
assert.equal(report.summary.needsMoreData, 2);
assert.equal(report.summary.keepOutOfScanner, 1);
assert.equal(report.summary.rowsWithOutcomeCounts, 1);

const ready = report.rows.find((row) => row.relativePath.endsWith('ready-sniper.json'));
assert.ok(ready);
assert.equal(ready.status, 'ready_for_deeper_review');
assert.equal(ready.sampleSize, 12);
assert.equal(ready.t1Hits, 7);
assert.equal(ready.t2Hits, 3);
assert.equal(ready.stops, 2);
assert.equal(ready.noConfirmation, 1);
assert.equal(ready.unresolved, 2);
const priceStop = report.rows.find((row) => row.relativePath.endsWith('price-level-stop.json'));
assert.ok(priceStop);
assert.equal(priceStop.sampleSize, 4);
assert.equal(priceStop.stops, null);
assert.equal(priceStop.status, 'needs_more_data');

assert.match(report.markdown, /Read-only Phase 2 evidence table/);
assert.match(report.html, /Quant Desk Phase 2 Evidence Table/);
assert.match(report.html, /Posts Discord: false/);
assert.match(report.html, /Creates or promotes model: false/);

fs.rmSync(tmp, { recursive: true, force: true });
