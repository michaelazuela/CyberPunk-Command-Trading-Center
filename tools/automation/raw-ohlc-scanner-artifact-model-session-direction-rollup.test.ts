import assert from 'node:assert/strict';
import { buildRawOhlcScannerArtifactModelSessionDirectionRollupReport } from './raw-ohlc-scanner-artifact-model-session-direction-rollup';

const report = buildRawOhlcScannerArtifactModelSessionDirectionRollupReport({
  outcome: {
    status: 'pass',
    rows: [
      ...Array.from({ length: 12 }, () => ({
        setupType: 'SweepMssFvgRetrace',
        session: 'morning',
        direction: 'LONG' as const,
        outcomeStatus: 'resolved' as const,
        outcomeLabel: 'stopped_before_t1',
        resolvedOneMesPl: -50,
      })),
      ...Array.from({ length: 8 }, () => ({
        setupType: 'SweepMssFvgRetrace',
        session: 'morning',
        direction: 'LONG' as const,
        outcomeStatus: 'resolved' as const,
        outcomeLabel: 't1_and_t2_hit',
        resolvedOneMesPl: 100,
      })),
      ...Array.from({ length: 20 }, () => ({
        setupType: 'SweepMssFvgRetrace',
        session: 'lunch',
        direction: 'SHORT' as const,
        outcomeStatus: 'resolved' as const,
        outcomeLabel: 't1_and_t2_hit',
        resolvedOneMesPl: 100,
      })),
    ],
  },
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.outcomeRows, 40);
assert.equal(report.summary.groups, 2);
assert.equal(report.summary.weakestGroupId, 'SweepMssFvgRetrace|morning|LONG');
assert.equal(report.summary.weakestProblemRate, 0.6);
assert.equal(report.summary.recommendation, 'focus_weakest_model_session_direction');
assert.equal(report.rollupRows[0].researchPriority, 'weak_pocket');
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.match(report.markdown, /Model\/Session\/Direction Rollup/);

console.log('Raw OHLC scanner artifact model/session/direction rollup verified.');
