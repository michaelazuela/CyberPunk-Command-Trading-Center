import assert from 'node:assert/strict';
import { buildDailyBarByBarLearningExtract } from './daily-bar-by-bar-learning-extract';

const fixtureTape = {
  reportType: 'scanner_decision_event_tape',
  tradeDate: '2026-07-09',
  instrument: 'MES',
  session: 'lunch',
  events: {
    '2026-07-09T15:05:00.0000000': {
      time: '2026-07-09T15:05:00',
      completed5m: { time: '2026-07-09T15:05:00', open: 7585, high: 7586, low: 7582, close: 7583, volume: 1000 },
      setupCandidateStatus: {
        selected: {
          setupType: 'NoInstalledSetup',
          direction: 'LONG',
          candidateState: 'MSS_CONTINUATION_RETEST_PENDING',
        },
      },
      plan: {
        decision: 'LONG',
        decisionStatus: 'ConditionalTrade',
        entry: 7582.25,
        stop: 7577,
        t1: 7590.25,
        t2: 7592.75,
        riskPoints: 5.25,
        canExecute: false,
      },
      visibility: {
        discordAction: 'post_review',
        suppressionReason: null,
      },
      deskState: {
        lineInSand: 7582.25,
        htfContextStatus: 'sufficient',
        dataQualityStatus: 'ready',
      },
    },
    '2026-07-09T15:10:00.0000000': {
      time: '2026-07-09T15:10:00',
      completed5m: { time: '2026-07-09T15:10:00', open: 7583, high: 7584, low: 7581, close: 7582.25, volume: 1000 },
    },
    '2026-07-09T15:20:00.0000000': {
      time: '2026-07-09T15:20:00',
      completed5m: { time: '2026-07-09T15:20:00', open: 7583.25, high: 7587.25, low: 7583, close: 7587.25, volume: 1000 },
    },
    '2026-07-09T16:00:00.0000000': {
      time: '2026-07-09T16:00:00',
      completed5m: { time: '2026-07-09T16:00:00', open: 7586.5, high: 7590.75, low: 7585.75, close: 7590.5, volume: 1000 },
    },
  },
};

const extract = buildDailyBarByBarLearningExtract({
  tape: fixtureTape,
  sourceTapePath: 'fixture/scanner-decision-tape.json',
  generatedAt: '2026-07-09T21:00:00.000Z',
});

assert.equal(extract.reportType, 'daily_bar_by_bar_learning_extract');
assert.equal(extract.tradeDate, '2026-07-09');
assert.equal(extract.summary.eventCount, 4);
assert.equal(extract.summary.candidateCount, 1);
assert.equal(extract.summary.sourceTapeQuality.status, 'usable');
assert.equal(extract.summary.sourceTapeQuality.validCompleted5mBars, 4);
assert.equal(extract.summary.sourceTapeQuality.blockers.length, 0);
assert.equal(extract.candidates[0].outcome, 'T1_HIT');
assert.equal(extract.candidates[0].outcomeTime, '2026-07-09T16:00:00');
assert.equal(extract.candidates[0].oneMesGross, 40);
assert.equal(extract.summary.bestCandidate?.entry, 7582.25);
assert.match(extract.summary.lessons.join('\n'), /Best reviewed campaign: LONG NoInstalledSetup/);
assert.match(extract.cadence.lessonUsage, /do not auto-promote lessons into live rules/i);
assert.match(extract.cadence.liveRuleBoundary, /canExecute remain deterministic/i);

const dataLimitedExtract = buildDailyBarByBarLearningExtract({
  tape: {
    reportType: 'legacy_unknown_report',
    tradeDate: '2026-07-09',
    instrument: 'MES',
    session: 'lunch',
    events: {
      '2026-07-09T15:05:00.0000000': {
        time: '2026-07-09T15:05:00',
        completed5m: { time: '2026-07-09T15:05:00', open: 7585, high: 7580, low: 7582, close: 7583 },
      },
    },
  },
  sourceTapePath: 'fixture/bad-tape.json',
});
assert.equal(dataLimitedExtract.summary.sourceTapeQuality.status, 'data_limited');
assert.match(dataLimitedExtract.summary.sourceTapeQuality.blockers.join('\n'), /Unexpected tape reportType/);
assert.match(dataLimitedExtract.summary.sourceTapeQuality.blockers.join('\n'), /Tape has no app-owned plan snapshots/);
assert.match(dataLimitedExtract.summary.lessons.join('\n'), /data-limited; do not promote lesson/);

console.log('daily bar-by-bar learning extract verified.');
