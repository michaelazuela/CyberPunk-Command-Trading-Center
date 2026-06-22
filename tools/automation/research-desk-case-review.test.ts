import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildResearchDeskCaseReviewReport } from './research-desk-case-review';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'research-desk-case-review-'));
const researchReports = path.join(tmp, 'tools', 'automation', 'research-reports');
const liveObserver = path.join(tmp, 'tools', 'automation', 'live-desk-observer-reports');
fs.mkdirSync(researchReports, { recursive: true });
fs.mkdirSync(liveObserver, { recursive: true });

fs.writeFileSync(path.join(researchReports, 'ready-sniper.json'), JSON.stringify({
  reportType: 'sniper_watch_research_phase3_audit',
  instrument: 'MES',
  summary: {
    opportunities: 24,
    t1Hits: 17,
    t2Hits: 11,
    stopped: 4,
    noFiveMinuteConfirmation: 2,
    unresolved: 3,
  },
  conclusion: 'Promising candidate validated for deeper review.',
}, null, 2));

fs.writeFileSync(path.join(liveObserver, 'price-level-stop.json'), JSON.stringify({
  reportType: 'live_desk_observer',
  instrument: 'MES',
  eventCount: 4,
  observation: 'Promising candidate language exists, but stop 7565 is a price level, not an outcome count.',
}, null, 2));

const report = await buildResearchDeskCaseReviewReport({
  root: tmp,
  outDir: path.join(tmp, 'out'),
  json: false,
});

assert.equal(report.reportType, 'research_desk_case_review_phase3');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.changesScannerState, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.changesEntriesStopsTargets, false);
assert.equal(report.authority.createsNewModel, false);
assert.equal(report.authority.promotesModel, false);
assert.equal(report.authority.changesDiscordBehavior, false);
assert.equal(report.summary.readyRowsReviewed, 1);
assert.equal(report.summary.candidateForManualReplay, 1);
assert.equal(report.summary.manualValidationRequired, 0);
assert.equal(report.summary.blockedFromPromotion, 0);
assert.equal(report.cases.length, 1);
assert.equal(report.cases[0].row.relativePath.endsWith('ready-sniper.json'), true);
assert.equal(report.cases[0].row.sampleSize, 24);
assert.equal(report.cases[0].row.stops, 4);
assert.match(report.markdown, /Read-only Phase 3 case review/);
assert.match(report.html, /Quant Desk Phase 3 Case Review/);
assert.match(report.html, /Posts Discord: false/);

fs.rmSync(tmp, { recursive: true, force: true });
