import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildUnifiedPositiveHeldLocalPreviewBroadRiskCapValidationReport,
} from './unified-positive-held-local-preview-broad-risk-cap-validation';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'broad-risk-cap-validation-'));
const auditDir = path.join(tempRoot, 'discord-audit');
fs.mkdirSync(auditDir, { recursive: true });

function writeTape(name: string, events: Record<string, unknown>): void {
  fs.writeFileSync(path.join(auditDir, name), JSON.stringify({ events }, null, 2));
}

writeTape('scanner-decision-tape-2026-06-17-MES-morning.json', {
  a: { completed5m: { time: '2026-06-17T09:30:00', open: 100, high: 101, low: 99, close: 100 } },
  b: { completed5m: { time: '2026-06-17T09:35:00', open: 100, high: 105, low: 98, close: 104 } },
});
writeTape('scanner-decision-tape-2026-06-18-MES-morning.json', {
  a: { completed5m: { time: '2026-06-18T09:30:00', open: 200, high: 201, low: 199, close: 200 } },
  b: { completed5m: { time: '2026-06-18T09:35:00', open: 200, high: 210, low: 199, close: 209 } },
});
writeTape('scanner-decision-tape-2026-06-19-MES-lunch.json', {
  a: { completed5m: { time: '2026-06-19T12:00:00', open: 300, high: 301, low: 299, close: 300 } },
  b: { completed5m: { time: '2026-06-19T12:05:00', open: 300, high: 325, low: 299, close: 324 } },
});
writeTape('scanner-decision-tape-2026-06-20-MES-lunch.json', {
  a: { completed5m: { time: '2026-06-20T12:00:00', open: 400, high: 401, low: 399, close: 400 } },
  b: { completed5m: { time: '2026-06-20T12:05:00', open: 400, high: 406, low: 399, close: 405 } },
});

const intakeTriageReport = {
  rows: [
    {
      intakeId: 'intraday-win',
      tradeDate: '2026-06-17',
      session: 'morning',
      instrument: 'MES',
      setupType: 'IntradayMssMicroContinuation',
      direction: 'LONG',
      firstSeenTime: '2026-06-17T09:30:00',
      entry: 100,
      stop: 97,
      target1: 104.5,
      target2: 106,
      riskPoints: 3,
      sourceFile: 'scanner-decision-tape-2026-06-17-MES-morning.json',
      triageDecision: 'held_for_later_batch',
    },
    {
      intakeId: 'intraday-loss',
      tradeDate: '2026-06-18',
      session: 'morning',
      instrument: 'MES',
      setupType: 'IntradayMssMicroContinuation',
      direction: 'SHORT',
      firstSeenTime: '2026-06-18T09:30:00',
      entry: 200,
      stop: 209,
      target1: 192.5,
      target2: 190,
      riskPoints: 9,
      sourceFile: 'scanner-decision-tape-2026-06-18-MES-morning.json',
      triageDecision: 'held_for_later_batch',
    },
    {
      intakeId: 'turtle-win-false-reject',
      tradeDate: '2026-06-19',
      session: 'lunch',
      instrument: 'MES',
      setupType: 'TurtleSoup',
      direction: 'LONG',
      firstSeenTime: '2026-06-19T12:00:00',
      entry: 300,
      stop: 288,
      target1: 318,
      target2: 324,
      riskPoints: 12,
      sourceFile: 'scanner-decision-tape-2026-06-19-MES-lunch.json',
      triageDecision: 'held_for_later_batch',
    },
    {
      intakeId: 'turtle-loss',
      tradeDate: '2026-06-20',
      session: 'lunch',
      instrument: 'MES',
      setupType: 'TurtleSoup',
      direction: 'SHORT',
      firstSeenTime: '2026-06-20T12:00:00',
      entry: 400,
      stop: 405,
      target1: 392.5,
      target2: 390,
      riskPoints: 5,
      sourceFile: 'scanner-decision-tape-2026-06-20-MES-lunch.json',
      triageDecision: 'held_for_later_batch',
    },
  ],
};

const report = buildUnifiedPositiveHeldLocalPreviewBroadRiskCapValidationReport({
  reportDir: tempRoot,
  intakeTriagePath: 'triage.json',
  intakeTriageReport,
  auditDir,
}, '2026-07-17T00:00:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_broad_risk_cap_validation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.evaluatedTargetRows, 4);
assert.equal(report.summary.blockedRows, 0);
assert.equal(report.summary.winners, 2);
assert.equal(report.summary.losses, 2);
assert.equal(report.summary.livePromotionAllowedRows, 0);

const intraday = report.capRows.find((row) => row.setupType === 'IntradayMssMicroContinuation');
assert.equal(intraday?.decision, 'candidate_for_more_research');
assert.equal(intraday?.keptWinners, 1);
assert.equal(intraday?.keptLosses, 0);
assert.equal(intraday?.rejectedLosses, 1);
assert.equal(intraday?.falseRejectWinnerRows, 0);

const turtle = report.capRows.find((row) => row.setupType === 'TurtleSoup');
assert.equal(turtle?.decision, 'rejected_for_now');
assert.equal(turtle?.falseRejectWinnerRows, 1);
assert.match(report.markdown, /Broad Risk-Cap Validation/);

const missing = buildUnifiedPositiveHeldLocalPreviewBroadRiskCapValidationReport({
  reportDir: tempRoot,
  intakeTriagePath: null,
  intakeTriageReport: null,
  auditDir,
}, '2026-07-17T00:01:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing intake triage path'));

console.log('unified positive held-local broad risk-cap validation verified.');
