import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildUnifiedPositiveHeldLocalPreviewReplayPackageReport,
} from './unified-positive-held-local-preview-replay-package';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'held-local-replay-package-'));
const auditDir = path.join(tempRoot, 'discord-audit');
fs.mkdirSync(auditDir, { recursive: true });

fs.writeFileSync(path.join(auditDir, 'scanner-decision-tape-2026-06-16-MES-morning.json'), JSON.stringify({
  reportType: 'scanner_decision_event_tape',
  tradeDate: '2026-06-16',
  instrument: 'MES',
  session: 'morning',
  events: {
    '2026-06-16T10:00:00.0000000': {
      completed5m: {
        time: '2026-06-16T10:00:00.0000000',
        open: 100,
        high: 101,
        low: 99,
        close: 100.5,
      },
    },
    '2026-06-16T10:05:00.0000000': {
      completed5m: {
        time: '2026-06-16T10:05:00.0000000',
        open: 100.5,
        high: 103,
        low: 100,
        close: 102,
      },
    },
  },
}, null, 2));

const triageReport = {
  reportType: 'unified_positive_held_local_preview_intake_triage',
  status: 'pass',
  selectedReplayPackage: [
    {
      intakeId: '2026-06-16-morning-OpeningDriveFvgContinuation-LONG',
      tradeDate: '2026-06-16',
      session: 'morning',
      instrument: 'MES',
      setupType: 'OpeningDriveFvgContinuation',
      direction: 'LONG',
      firstSeenTime: '2026-06-16T10:00:00.0000000',
      lastSeenTime: '2026-06-16T10:05:00.0000000',
      occurrences: 2,
      entry: 100,
      stop: 98,
      target1: 103,
      target2: 104,
      riskPoints: 2,
      proofState: 'human_review_ready',
      triageScore: 220,
      triageDecision: 'selected_for_replay_package',
      triageReason: 'Selected by test.',
    },
    {
      intakeId: '2026-06-17-lunch-AfterLunchDriveFvgContinuation-SHORT',
      tradeDate: '2026-06-17',
      session: 'lunch',
      instrument: 'MES',
      setupType: 'AfterLunchDriveFvgContinuation',
      direction: 'SHORT',
      firstSeenTime: '2026-06-17T13:00:00.0000000',
      lastSeenTime: '2026-06-17T13:05:00.0000000',
      occurrences: 1,
      entry: 200,
      stop: 205,
      target1: 192.5,
      target2: 190,
      riskPoints: 5,
      proofState: 'after_lunch_drive_armed',
      triageScore: 200,
      triageDecision: 'selected_for_replay_package',
      triageReason: 'Selected by test.',
    },
  ],
};

const blockedReport = buildUnifiedPositiveHeldLocalPreviewReplayPackageReport({
  reportDir: tempRoot,
  triageReportPath: 'triage.json',
  triageReport,
  auditDir,
}, '2026-07-17T00:00:00.000Z');

assert.equal(blockedReport.reportType, 'unified_positive_held_local_preview_replay_package');
assert.equal(blockedReport.status, 'fail');
assert.equal(blockedReport.authority.researchOnly, true);
assert.equal(blockedReport.authority.postsDiscord, false);
assert.equal(blockedReport.authority.writesSupabase, false);
assert.equal(blockedReport.authority.readsLiveBridge, false);
assert.equal(blockedReport.authority.changesTradingLogic, false);
assert.equal(blockedReport.authority.changesCanExecute, false);
assert.equal(blockedReport.summary.selectedRowsRead, 2);
assert.equal(blockedReport.summary.readyRows, 1);
assert.equal(blockedReport.summary.blockedRows, 1);
assert.equal(blockedReport.summary.livePromotionAllowedRows, 0);

const readyRow = blockedReport.rows.find((row) => row.ticketId === '2026-06-16-morning-OpeningDriveFvgContinuation-LONG');
assert.equal(readyRow?.outcomeInputStatus, 'ready_for_read_only_outcome_replay');
assert.equal(readyRow?.t1R, 1.5);
assert.equal(readyRow?.t2R, 2);
assert.equal(readyRow?.barsLoaded, 2);
assert.equal(readyRow?.barsAfterProof, 2);
assert.equal(readyRow?.barsSource, 'scanner_decision_tape_completed_5m');

const blockedRow = blockedReport.rows.find((row) => row.ticketId === '2026-06-17-lunch-AfterLunchDriveFvgContinuation-SHORT');
assert.equal(blockedRow?.outcomeInputStatus, 'blocked');
assert.ok(blockedRow?.blockers.includes('missing scanner decision tape'));
assert.match(blockedReport.markdown, /Ready rows: 1/);

fs.writeFileSync(path.join(auditDir, 'scanner-decision-tape-2026-06-17-MES-lunch.json'), JSON.stringify({
  reportType: 'scanner_decision_event_tape',
  tradeDate: '2026-06-17',
  instrument: 'MES',
  session: 'lunch',
  events: {
    '2026-06-17T13:00:00.0000000': {
      completed5m: {
        time: '2026-06-17T13:00:00.0000000',
        open: 200,
        high: 201,
        low: 198,
        close: 199,
      },
    },
  },
}, null, 2));

const passReport = buildUnifiedPositiveHeldLocalPreviewReplayPackageReport({
  reportDir: tempRoot,
  triageReportPath: 'triage.json',
  triageReport,
  auditDir,
}, '2026-07-17T00:01:00.000Z');

assert.equal(passReport.status, 'pass');
assert.equal(passReport.summary.readyRows, 2);
assert.equal(passReport.summary.blockedRows, 0);
assert.equal(passReport.summary.modelGroups, 2);
assert.equal(passReport.summary.sessionGroups, 2);

const missing = buildUnifiedPositiveHeldLocalPreviewReplayPackageReport({
  reportDir: tempRoot,
  triageReportPath: null,
  triageReport: null,
  auditDir,
}, '2026-07-17T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing intake triage report path'));
assert.ok(missing.blockers.includes('intake triage report has no selected replay package rows'));

console.log('unified positive held-local preview replay package verified.');
