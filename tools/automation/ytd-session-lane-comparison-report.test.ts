import assert from 'node:assert/strict';
import { buildYtdSessionLaneComparisonReport } from './ytd-session-lane-comparison-report';

const htfAlignedLong = {
  '15m': { trend: 'bullish', net: 10, range: 20, bars: 30 },
  '60m': { trend: 'bullish', net: 8, range: 18, bars: 30 },
  '120m': { trend: 'bullish', net: 7, range: 17, bars: 30 },
  '240m': { trend: 'flat', net: 0, range: 16, bars: 30 },
} as const;

const htfCounterShort = {
  '15m': { trend: 'bullish', net: 10, range: 20, bars: 30 },
  '60m': { trend: 'bullish', net: 8, range: 18, bars: 30 },
  '120m': { trend: 'bullish', net: 7, range: 17, bars: 30 },
  '240m': { trend: 'bearish', net: -2, range: 16, bars: 30 },
} as const;

const selected = (setupType: string, direction: 'LONG' | 'SHORT', eventTime: string, status: string, pnl: number) => ({
  setupType,
  direction,
  eventTime,
  entry: 100,
  stop: direction === 'LONG' ? 98 : 102,
  target1: direction === 'LONG' ? 103 : 97,
  target2: direction === 'LONG' ? 104 : 96,
  riskPoints: 2,
  rankScore: 300,
  modelConfidenceScore: 100,
  outcome: { status, pnl, r: pnl > 0 ? 2 : -1, filled: status !== 'no_fill' },
});

const report = buildYtdSessionLaneComparisonReport({
  dayByDayReportPath: 'fixture-ytd-map.json',
  dayByDayReport: {
    reportType: 'ytd_full_scanner_day_by_day_market_move_best_model_map',
    generatedAt: '2026-07-22T00:00:00.000Z',
    rows: [
      {
        date: '2026-01-02',
        session: 'morning',
        movement: 'bullish_drive',
        htf: htfAlignedLong,
        completeCandidateCount: 4,
        selected: selected('NoInstalledSetup', 'LONG', '2026-01-02T09:35:00', 't2_hit', 20),
      },
      {
        date: '2026-01-03',
        session: 'morning',
        movement: 'high_raid_reversal_down',
        htf: htfCounterShort,
        completeCandidateCount: 3,
        selected: selected('NoInstalledSetup', 'SHORT', '2026-01-03T10:05:00', 'stopped_before_t1', -10),
      },
      {
        date: '2026-01-03',
        session: 'lunch',
        movement: 'bearish_drive',
        htf: htfCounterShort,
        completeCandidateCount: 2,
        selected: selected('NoInstalledSetup', 'SHORT', '2026-01-03T12:20:00', 'no_fill', 0),
      },
      {
        date: '2026-01-04',
        session: 'lunch',
        movement: 'low_raid_reversal_up',
        htf: htfAlignedLong,
        completeCandidateCount: 2,
        selected: selected('NoInstalledSetup', 'LONG', '2026-01-04T14:15:00', 'filled_unresolved_by_session_end', 0),
      },
    ],
  },
}, '2026-07-22T01:00:00.000Z');

const openingDrive = report.laneSummaries.find((summary) => summary.session === 'morning' && summary.setupType === 'NoInstalledSetup');
const sweep = report.laneSummaries.find((summary) => summary.session === 'morning' && summary.setupType === 'NoInstalledSetup');
const afterLunch = report.laneSummaries.find((summary) => summary.session === 'lunch' && summary.setupType === 'NoInstalledSetup');
const lunchIntraday = report.laneSummaries.find((summary) => summary.session === 'lunch' && summary.setupType === 'NoInstalledSetup');

assert.equal(report.reportType, 'ytd_session_lane_comparison_report');
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.scannerAdapterInstalled, false);
assert.equal(report.adapterReadiness.status, 'proposal_ready_not_installed');
assert.equal(openingDrive?.count, 1);
assert.equal(openingDrive?.wins, 1);
assert.equal(openingDrive?.storyMatchRows, 1);
assert.equal(openingDrive?.htfAlignment.aligned.count, 1);
assert.equal(sweep?.losses, 1);
assert.equal(sweep?.htfAlignment.counter.count, 1);
assert.equal(afterLunch?.noFill, 1);
assert.equal(lunchIntraday?.unresolved, 1);
assert.equal(report.sessionRecommendations.length, 2);
assert.match(report.reportMarkdown, /one scanner-owned human-review ticket/i);

console.log('YTD session lane comparison report verified.');
