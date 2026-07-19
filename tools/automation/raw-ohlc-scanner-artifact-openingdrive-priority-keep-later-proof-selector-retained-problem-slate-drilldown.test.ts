import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRetainedProblemSlateDrilldownReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-retained-problem-slate-drilldown';

type BuildArgs = Parameters<typeof buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRetainedProblemSlateDrilldownReport>[0];

const filterSimulation: BuildArgs['filterSimulation'] = {
  status: 'pass',
  filteredSlateRows: [
    { slateId: '2026-07-01|morning|SweepMssFvgRetrace|LONG', filterDecision: 'retained', filterReason: 'passes', adverseR: 0 },
    { slateId: '2026-07-02|morning|SweepMssFvgRetrace|LONG', filterDecision: 'retained', filterReason: 'passes', adverseR: 2.2 },
    { slateId: '2026-07-03|morning|SweepMssFvgRetrace|LONG', filterDecision: 'excluded_high_adverse_stopped', filterReason: 'adverseR=4', adverseR: 4 },
  ],
};

const problemDrilldown: BuildArgs['problemDrilldown'] = {
  status: 'pass',
  problemSlateRows: [
    {
      slateId: '2026-07-01|morning|SweepMssFvgRetrace|LONG',
      rows: 2,
      earliestTicketId: 'retained-no-fill',
      tradeDate: '2026-07-01',
      session: 'morning',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      earliestProofTime: '2026-07-01T09:30:00',
      earliestOutcomeLabel: 'no_fill',
      earliestResolvedOneMesPl: null,
      earliestBarsAfterProof: 5,
      earliestMfe: null,
      earliestMae: null,
      earliestRiskPoints: 10,
      laterRows: 1,
      laterPositiveRows: 0,
      laterStoppedRows: 0,
      laterUnresolvedRows: 1,
    },
    {
      slateId: '2026-07-02|morning|SweepMssFvgRetrace|LONG',
      rows: 1,
      earliestTicketId: 'retained-stop',
      tradeDate: '2026-07-02',
      session: 'morning',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      earliestProofTime: '2026-07-02T09:30:00',
      earliestOutcomeLabel: 'stopped_before_t1',
      earliestResolvedOneMesPl: -50,
      earliestBarsAfterProof: 8,
      earliestMfe: 4,
      earliestMae: 22,
      earliestRiskPoints: 10,
      laterRows: 0,
      laterPositiveRows: 0,
      laterStoppedRows: 0,
      laterUnresolvedRows: 0,
    },
    {
      slateId: '2026-07-03|morning|SweepMssFvgRetrace|LONG',
      rows: 1,
      earliestTicketId: 'excluded-stop',
      tradeDate: '2026-07-03',
      session: 'morning',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      earliestProofTime: '2026-07-03T09:30:00',
      earliestOutcomeLabel: 'stopped_before_t1',
      earliestResolvedOneMesPl: -50,
      earliestBarsAfterProof: 8,
      earliestMfe: 1,
      earliestMae: 40,
      earliestRiskPoints: 10,
      laterRows: 0,
      laterPositiveRows: 0,
      laterStoppedRows: 0,
      laterUnresolvedRows: 0,
    },
  ],
};

const outcome: BuildArgs['outcome'] = {
  status: 'pass',
  rows: [
    {
      ticketId: 'retained-no-fill',
      tradeDate: '2026-07-01',
      session: 'morning',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      proofTime: '2026-07-01T09:30:00',
      outcomeStatus: 'unresolved',
      outcomeLabel: 'no_fill',
      entry: 100,
      stop: 90,
      t1: 115,
      t2: 120,
      riskPoints: 10,
      barsAfterProof: 5,
      entryHitTime: null,
      firstReplayBarTime: null,
      stopHitTime: null,
      t1HitTime: null,
      t2HitTime: null,
      maximumFavorableExcursion: null,
      maximumAdverseExcursion: null,
      resolvedOneMesPl: null,
    },
    {
      ticketId: 'retained-stop',
      tradeDate: '2026-07-02',
      session: 'morning',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      proofTime: '2026-07-02T09:30:00',
      outcomeStatus: 'resolved',
      outcomeLabel: 'stopped_before_t1',
      entry: 100,
      stop: 90,
      t1: 115,
      t2: 120,
      riskPoints: 10,
      barsAfterProof: 8,
      entryHitTime: '2026-07-02T09:30:00',
      firstReplayBarTime: '2026-07-02T09:35:00',
      stopHitTime: '2026-07-02T10:00:00',
      t1HitTime: null,
      t2HitTime: null,
      maximumFavorableExcursion: 4,
      maximumAdverseExcursion: 22,
      resolvedOneMesPl: -50,
    },
  ],
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRetainedProblemSlateDrilldownReport({
  filterSimulation,
  problemDrilldown,
  outcome,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.problemSlatesRead, 3);
assert.equal(report.summary.retainedProblemSlates, 2);
assert.equal(report.summary.retainedUnresolvedSlates, 1);
assert.equal(report.summary.retainedStoppedSlates, 1);
assert.equal(report.summary.entryNotFilledSlates, 1);
assert.equal(report.summary.moderateAdverseStoppedSlates, 1);
assert.equal(report.retainedProblemSlateRows.some((row) => row.earliestTicketId === 'excluded-stop'), false);
assert.equal(report.retainedProblemSlateRows.find((row) => row.earliestTicketId === 'retained-no-fill')?.residueClass, 'entry_not_filled');
assert.equal(report.retainedProblemSlateRows.find((row) => row.earliestTicketId === 'retained-stop')?.maeR, 2.2);
assert.match(report.markdown, /Retained Problem Slate Drilldown/);

console.log('OpeningDrive retained problem slate drilldown verified.');
