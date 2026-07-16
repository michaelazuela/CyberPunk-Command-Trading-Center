import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildFormalReplayResearchReport } from './formal-replay-research-runner';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'formal-replay-research-'));

function writeTape(date: string, session: string, events: Record<string, unknown>) {
  fs.writeFileSync(
    path.join(tempDir, `scanner-decision-tape-${date}-MES-${session}.json`),
    `${JSON.stringify({
      reportType: 'scanner_decision_event_tape',
      tradeDate: date,
      instrument: 'MES',
      session,
      events,
    }, null, 2)}\n`,
    'utf8',
  );
}

writeTape('2026-06-01', 'morning', {
  first: {
    completed5m: { time: '2026-06-01T09:20:00.0000000', open: 100, high: 101, low: 99, close: 100 },
    currentPrice: 100,
    htfHistoryCoverage: { status: 'sufficient' },
    deskState: { dataQualityStatus: 'ok', htfContextStatus: 'sufficient' },
    plan: {
      decision: 'LONG',
      decisionStatus: 'ApprovedTrade',
      entry: 100,
      stop: 98,
      t1: 103,
      t2: 104,
      canExecute: true,
    },
    setupCandidateStatus: { selected: { setupType: 'TurtleSoup', direction: 'LONG', requiredTrigger: 'completed 5M close above 100' } },
    visibility: { visibilityMode: 'POST_PLAN' },
  },
  t1: {
    completed5m: { time: '2026-06-01T09:25:00.0000000', open: 100, high: 103.25, low: 99.75, close: 102 },
  },
  t2: {
    completed5m: { time: '2026-06-01T09:30:00.0000000', open: 102, high: 104.25, low: 101.5, close: 104 },
  },
});

writeTape('2026-06-01', 'lunch', {
  review: {
    completed5m: { time: '2026-06-01T12:05:00.0000000', open: 110, high: 111, low: 109, close: 110 },
    currentPrice: 110,
    htfHistoryCoverage: { status: 'sufficient' },
    deskState: { dataQualityStatus: 'partial', htfContextStatus: 'sufficient' },
    setupCandidateStatus: {
      selected: {
        setupType: 'IntradayMssMicroContinuation',
        direction: 'SHORT',
        detectedStatus: 'Conditional',
        entry: 110,
        stop: 112,
        target1: 107,
        target2: 106,
        requiredTrigger: 'completed 5M close below 110',
      },
    },
    plan: { canExecute: false },
    visibility: { visibilityMode: 'POST_REVIEW' },
  },
  target: {
    completed5m: { time: '2026-06-01T12:10:00.0000000', open: 110, high: 110.25, low: 105.75, close: 106 },
  },
});

const report = buildFormalReplayResearchReport({
  startDate: '2026-06-01',
  endDate: '2026-06-01',
  instrument: 'MES',
  auditDir: tempDir,
  outDir: tempDir,
  json: true,
}, '2026-07-16T00:00:00.000Z');

const strict = report.variants.find((variant) => variant.name === 'strictExecutable');
const dominant = report.variants.find((variant) => variant.name === 'dominantReview');

assert.equal(report.reportType, 'formal_replay_research_runner');
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.changesTradingRules, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.missingSessionsAreNotReconstructed, true);
assert.equal(report.missingSessions.length, 1);
assert.equal(report.missingSessions[0].session, 'evening');

assert.ok(strict);
assert.ok(dominant);
assert.equal(strict.summary.trades, 1);
assert.equal(strict.trades[0].outcome, 'T2_HIT');
assert.equal(strict.summary.grossOneMes, 20);
assert.equal(dominant.summary.trades, 2);
assert.equal(report.gapAnalysis.nonStrictHumanReviewTrades, 1);
assert.equal(report.gapAnalysis.bySetup.IntradayMssMicroContinuation.count, 1);
assert.match(report.reportMarkdown, /Research-only replay/);
assert.match(report.reportMarkdown, /Strict executable/);

console.log('formal replay research runner verified.');
