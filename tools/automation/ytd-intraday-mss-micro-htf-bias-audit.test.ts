import assert from 'node:assert/strict';
import { buildYtdIntradayMssMicroHtfBiasAuditReport } from './ytd-intraday-mss-micro-htf-bias-audit';

const report = buildYtdIntradayMssMicroHtfBiasAuditReport({
  dayByDayReportPath: 'diagnostic-reports/example.json',
  top: 2,
  report: {
    reportType: 'ytd_full_scanner_day_by_day_market_move_best_model_map',
    generatedAt: '2026-07-21T00:00:00.000Z',
    source: { canonicalOhlc: 'controlled-htf-ohlc-source-MES-2026-01-01-to-2026-07-20.json' },
    provenanceSummary: { artifactDates: 2, currentRunCount: 2, staleCount: 0 },
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
          setupType: 'NoInstalledSetup',
          direction: 'SHORT',
          eventTime: '2026-06-09T10:25:00',
          entry: 7441,
          stop: 7491.25,
          target1: 7365.75,
          target2: 7340.5,
          riskPoints: 50.25,
          outcome: { status: 't2_hit', pnl: 439.38, r: 1.75 },
        },
      },
      {
        date: '2026-06-10',
        session: 'lunch',
        movement: 'bearish_drive',
        htf: {
          '15m': { trend: 'bearish' },
          '60m': { trend: 'bearish' },
          '120m': { trend: 'bearish' },
          '240m': { trend: 'bearish' },
        },
        raids: { overnightLowRaid: true },
        completeCandidateCount: 2,
        selected: {
          setupType: 'NoInstalledSetup',
          direction: 'SHORT',
          eventTime: '2026-06-10T12:55:00',
          entry: 7322.75,
          stop: 7344.25,
          target1: 7290.5,
          target2: 7279.75,
          riskPoints: 21.5,
          outcome: { status: 'stopped_before_t1', pnl: -53.75 },
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
          setupType: 'NoInstalledSetup',
          direction: 'LONG',
          eventTime: '2026-06-11T10:10:00',
          entry: 7400,
          stop: 7395,
          target1: 7407.5,
          target2: 7410,
          riskPoints: 5,
          outcome: { status: 't2_hit', pnl: 43.75 },
        },
      },
    ],
  },
}, '2026-07-21T00:00:00.000Z');

assert.equal(report.reportType, 'ytd_intraday_mss_micro_htf_bias_audit');
assert.equal(report.summary.selectedRows, 2);
assert.equal(report.summary.pnl, 385.63);
assert.equal(report.summary.wins, 1);
assert.equal(report.summary.losses, 1);
assert.equal(report.summary.bestHtfAlignment, 'aligned');
assert.equal(report.byHtfAlignment.aligned.count, 2);
assert.equal(report.bySession.morning.count, 1);
assert.equal(report.bySession.lunch.count, 1);
assert.equal(report.source.sourceDateStart, '2026-06-09');
assert.equal(report.source.sourceDateEnd, '2026-06-11');
assert.equal(report.topRows.length, 2);
assert.equal(report.topRows[0].date, '2026-06-09');
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.changesCanExecute, false);
assert.match(report.markdown, /YTD Intraday MSS Micro HTF Bias Audit/);

console.log('YTD Intraday MSS Micro HTF bias audit verified.');
