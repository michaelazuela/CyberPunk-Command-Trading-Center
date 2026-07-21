import assert from 'node:assert/strict';
import { buildYtdFullScannerEdgeStoryReport } from './ytd-full-scanner-edge-story';

const report = buildYtdFullScannerEdgeStoryReport({
  dayByDayReportPath: 'diagnostic-reports/example.json',
  top: 2,
  report: {
    reportType: 'ytd_full_scanner_day_by_day_market_move_best_model_map',
    generatedAt: '2026-07-21T00:00:00.000Z',
    rows: [
      {
        date: '2026-06-09',
        session: 'morning',
        movement: 'high_raid_reversal_down',
        htf: {
          '15m': { trend: 'bearish' },
          '60m': { trend: 'bearish' },
          '120m': { trend: 'bearish' },
          '240m': { trend: 'bullish' },
        },
        raids: {
          overnightHighRaid: true,
          overnightLowRaid: false,
          priorHighRaid: true,
          priorLowRaid: false,
        },
        completeCandidateCount: 4,
        selected: {
          setupType: 'IntradayMssMicroContinuation',
          direction: 'SHORT',
          eventTime: '2026-06-09T10:25:00',
          entry: 7441,
          stop: 7491.25,
          target1: 7365.75,
          target2: 7340.5,
          riskPoints: 50.25,
          outcome: {
            status: 't2_hit',
            pnl: 439.38,
            r: 1.75,
          },
          levelContextSummary: 'Bearish 15M MSS/displacement and 5M MSS aligned.',
        },
      },
      {
        date: '2026-06-10',
        session: 'lunch',
        movement: 'bearish_drive',
        htf: {
          '15m': { trend: 'bearish' },
          '60m': { trend: 'bearish' },
          '120m': { trend: 'mixed' },
          '240m': { trend: 'bullish' },
        },
        raids: {},
        completeCandidateCount: 2,
        selected: {
          setupType: 'HtfDisplacementMssContinuation',
          direction: 'SHORT',
          eventTime: '2026-06-10T12:55:00',
          entry: 7322.75,
          stop: 7344.25,
          target1: 7290.5,
          target2: 7279.75,
          riskPoints: 21.5,
          outcome: {
            status: 't2_hit',
            pnl: 188.13,
          },
        },
      },
      {
        date: '2026-06-11',
        session: 'morning',
        movement: 'balanced_range',
        htf: {
          '15m': { trend: 'bullish' },
          '60m': { trend: 'bullish' },
          '120m': { trend: 'bullish' },
          '240m': { trend: 'bullish' },
        },
        raids: {},
        completeCandidateCount: 1,
        selected: {
          setupType: 'OpeningDriveFvgContinuation',
          direction: 'LONG',
          eventTime: '2026-06-11T10:10:00',
          entry: 7400,
          stop: 7395,
          target1: 7407.5,
          target2: 7410,
          riskPoints: 5,
          outcome: {
            status: 'no_fill',
            pnl: 0,
          },
        },
      },
    ],
  },
}, '2026-07-21T00:00:00.000Z');

assert.equal(report.reportType, 'ytd_full_scanner_edge_story');
assert.equal(report.summary.sourceRows, 3);
assert.equal(report.summary.winningRows, 2);
assert.equal(report.summary.topRows, 2);
assert.equal(report.summary.totalTopOneMesPl, 627.51);
assert.equal(report.summary.strongestModel, 'IntradayMssMicroContinuation');
assert.equal(report.summary.strongestMovement, 'high_raid_reversal_down');
assert.equal(report.topStories[0].rank, 1);
assert.equal(report.topStories[0].htfAlignment, 'aligned');
assert.match(report.topStories[0].raidStory, /overnightHighRaid/);
assert.equal(report.topStories[1].htfAlignment, 'mixed');
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.changesCanExecute, false);
assert.match(report.markdown, /YTD Full Scanner Edge Story/);

console.log('YTD full scanner edge story verified.');
