import assert from 'node:assert/strict';
import {
  assertProtectedStructureReviewReportIsCompact,
  buildProtectedStructureTradeQuality,
} from './protected-structure-trade-review';

assert.doesNotThrow(() => assertProtectedStructureReviewReportIsCompact({
  reportType: 'protected_structure_trend_confirmation_trade_by_trade_review',
  source: {
    bars5m: 2297,
    cacheBars: 1000,
    bridgeBars: 1297,
    source: 'market_bars_bridge_repair',
    firstBar: '2026-06-08T00:00:00',
    lastBar: '2026-06-12T16:00:00.000',
  },
  campaigns: [
    {
      id: 13,
      direction: 'LONG',
      entry: 7429,
      stop: 7388.25,
      target1: 7490.25,
      target2: 7510.5,
      quality: {
        sourceOfTruth: 'phase_10l_protected_structure_trade_quality',
        label: 'CAUTION',
        score: 66,
        summary: 'CAUTION 66/100',
        flags: {
          tightStop: false,
          wideStop: true,
          extendedFromEntry: false,
          poorEntryLocation: false,
          betterEntryNeeded: true,
          sparseConfirmation: false,
          lateDayRunnerRisk: false,
          fridayRunnerRisk: true,
          tacticalStopInside15mStructure: true,
        },
        findings: ['Wide protected stop.'],
        management: ['Prefer pullback/retest.'],
        approvalBoundary: {
          changesTradeApprovals: false,
          changesCanExecute: false,
          changesEntryStopTargets: false,
          changesRiskRules: false,
        },
        scorecard: [],
      },
      chart: 'reports/protected-structure-review/example.png',
    },
  ],
}));

assert.throws(
  () => assertProtectedStructureReviewReportIsCompact({
    source: { bars5m: 1 },
    bars: [{ time: '2026-06-12T11:00:00', open: 1, high: 2, low: 0, close: 1.5 }],
  }),
  /must not include raw bars data/,
);

assert.throws(
  () => assertProtectedStructureReviewReportIsCompact({
    campaigns: [
      {
        id: 1,
        candles: [{ time: '2026-06-12T11:00:00', open: 1, high: 2, low: 0, close: 1.5 }],
      },
    ],
  }),
  /must not include raw candles data/,
);

assert.throws(
  () => assertProtectedStructureReviewReportIsCompact({
    campaigns: [
      {
        id: 1,
        evidence: [{ timestamp: '2026-06-12T11:00:00', open: 1, high: 2, low: 0, close: 1.5 }],
      },
    ],
  }),
  /must not include raw OHLC bars/,
);

function segment(overrides: Record<string, unknown>) {
  return {
    date: '2026-06-10',
    dir: 'LONG',
    start: '2026-06-10T09:45:00',
    end: '2026-06-10T10:40:00',
    count: 8,
    first: {
      time: '2026-06-10T09:45:00',
      close: 7382.25,
      bias5: { bias: 'BULL', confirm: 7355.75, protect: 7335.25 },
      bias15: { bias: 'BULL', confirm: 7367, protect: 7346.5 },
    },
    ...overrides,
  } as any;
}

const tightStop = buildProtectedStructureTradeQuality(segment({
  dir: 'SHORT',
  start: '2026-06-08T14:05:00',
  end: '2026-06-08T15:30:00',
  count: 13,
  first: {
    time: '2026-06-08T14:05:00',
    close: 7438.5,
    bias5: { bias: 'BEAR', confirm: 7431.25, protect: 7439.75 },
    bias15: { bias: 'BEAR', confirm: 7437.25, protect: 7446.5 },
  },
}));
assert.equal(tightStop.flags.tightStop, true);
assert.ok(tightStop.findings.join(' ').includes('tight'));

const missedFast = buildProtectedStructureTradeQuality(segment({
  dir: 'SHORT',
  start: '2026-06-10T11:15:00',
  end: '2026-06-10T13:45:00',
  count: 6,
  first: {
    time: '2026-06-10T11:15:00',
    close: 7327.5,
    bias5: { bias: 'BEAR', confirm: 7378.25, protect: 7400 },
    bias15: { bias: 'BEAR', confirm: 7335.25, protect: 7404.75 },
  },
}));
assert.equal(missedFast.flags.extendedFromEntry, true);
assert.ok(missedFast.management.join(' ').includes('missed/review'));

const failedSparse = buildProtectedStructureTradeQuality(segment({
  dir: 'SHORT',
  date: '2026-06-11',
  start: '2026-06-11T11:00:00',
  end: '2026-06-11T11:05:00',
  count: 2,
  first: {
    time: '2026-06-11T11:00:00',
    close: 7275.75,
    bias5: { bias: 'BEAR', confirm: 7289, protect: 7320.25 },
    bias15: { bias: 'BEAR', confirm: 7289, protect: 7320.25 },
  },
}));
assert.equal(failedSparse.flags.sparseConfirmation, true);
assert.equal(failedSparse.flags.wideStop, true);

const betterEntry = buildProtectedStructureTradeQuality(segment({
  date: '2026-06-11',
  start: '2026-06-11T12:15:00',
  end: '2026-06-11T15:40:00',
  count: 15,
  first: {
    time: '2026-06-11T12:15:00',
    close: 7318.5,
    bias5: { bias: 'BULL', confirm: 7314.25, protect: 7287.5 },
    bias15: { bias: 'BULL', confirm: 7314.25, protect: 7263 },
  },
}));
assert.equal(betterEntry.flags.betterEntryNeeded, true);
assert.equal(betterEntry.flags.lateDayRunnerRisk, true);

const wrongBiasTrap = buildProtectedStructureTradeQuality(segment({
  dir: 'SHORT',
  date: '2026-06-12',
  start: '2026-06-12T09:45:00',
  end: '2026-06-12T09:50:00',
  count: 2,
  first: {
    time: '2026-06-12T09:45:00',
    close: 7375.25,
    bias5: { bias: 'BEAR', confirm: 7395.5, protect: 7424.75 },
    bias15: { bias: 'BEAR', confirm: 7397, protect: 7447.75 },
  },
}));
assert.equal(wrongBiasTrap.flags.tacticalStopInside15mStructure, true);
assert.equal(wrongBiasTrap.flags.sparseConfirmation, true);

const fridayRunner = buildProtectedStructureTradeQuality(segment({
  date: '2026-06-12',
  start: '2026-06-12T11:00:00',
  end: '2026-06-12T13:55:00',
  count: 9,
  first: {
    time: '2026-06-12T11:00:00',
    close: 7440.75,
    bias5: { bias: 'BULL', confirm: 7429, protect: 7388.25 },
    bias15: { bias: 'BULL', confirm: 7424.75, protect: 7366.5 },
  },
}));
assert.equal(fridayRunner.flags.fridayRunnerRisk, true);
assert.equal(fridayRunner.flags.wideStop, true);
assert.ok(fridayRunner.management.join(' ').includes('T1'));

console.log('Protected structure trade-review compact report guard verified.');
