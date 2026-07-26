import assert from 'node:assert/strict';
import { buildYtdFullScannerDayByDayMarketMoveBestModelMap } from './ytd-full-scanner-day-by-day-market-move-best-model-map';

const marketBars = {
  '5m': [
    { time: '2026-07-20T09:15:00', open: 100, high: 102, low: 94, close: 101 },
    { time: '2026-07-20T16:00:00', open: 101, high: 103, low: 94, close: 100 },
    { time: '2026-07-20T18:00:00', open: 100, high: 101, low: 96, close: 97 },
    { time: '2026-07-21T09:10:00', open: 97, high: 99, low: 95, close: 96 },
    { time: '2026-07-21T09:15:00', open: 100, high: 106, low: 100, close: 105 },
    { time: '2026-07-21T09:20:00', open: 105, high: 106, low: 103, close: 104 },
    { time: '2026-07-21T09:25:00', open: 104, high: 104, low: 96, close: 97 },
    { time: '2026-07-21T09:30:00', open: 97, high: 98, low: 96, close: 97 },
    { time: '2026-07-21T12:00:00', open: 97, high: 98, low: 96, close: 97 },
    { time: '2026-07-21T12:05:00', open: 90, high: 91, low: 89, close: 90 },
    { time: '2026-07-21T12:10:00', open: 90, high: 92, low: 89, close: 91 },
    { time: '2026-07-21T16:00:00', open: 91, high: 93, low: 90, close: 92 },
  ],
  '15m': Array.from({ length: 30 }, (_, index) => ({ time: `2026-07-21T${String(Math.floor(index / 4)).padStart(2, '0')}:${String((index % 4) * 15).padStart(2, '0')}:00`, open: 100 + index, high: 101 + index, low: 99 + index, close: 100.5 + index })),
  '60m': Array.from({ length: 30 }, (_, index) => ({ time: `2026-07-${String(20 + Math.floor(index / 24)).padStart(2, '0')}T${String(index % 24).padStart(2, '0')}:00:00`, open: 100 - index, high: 101 - index, low: 99 - index, close: 99.5 - index })),
  '120m': Array.from({ length: 30 }, (_, index) => ({ time: `2026-07-${String(18 + Math.floor(index / 12)).padStart(2, '0')}T${String((index % 12) * 2).padStart(2, '0')}:00:00`, open: 100 + index, high: 101 + index, low: 99 + index, close: 100.5 + index })),
  '240m': Array.from({ length: 30 }, (_, index) => ({ time: `2026-07-${String(15 + Math.floor(index / 6)).padStart(2, '0')}T${String((index % 6) * 4).padStart(2, '0')}:00:00`, open: 100 - index, high: 101 - index, low: 99 - index, close: 99.5 - index })),
};

const report = buildYtdFullScannerDayByDayMarketMoveBestModelMap({
  marketBars,
  canonicalOhlc: 'local-canonical.json',
  baseReport: {
    reportType: 'ytd_full_scanner_day_by_day_market_move_best_model_map',
    generatedAt: '2026-07-20T00:00:00.000Z',
    authority: {
      researchOnly: true,
      exactScannerArtifacts: true,
      projectionMapperUsedForSelection: false,
      changesTradingRules: false,
      changesCanExecute: false,
      postsDiscord: false,
      writesSupabase: false,
    },
    source: { canonicalOhlc: 'old.json', provenance: 'fixture' },
    provenanceSummary: { artifactDates: 1, currentRunCount: 1, staleCount: 0 },
    aggregate: {},
    rows: [
      {
        date: '2026-07-20',
        session: 'morning',
        movement: 'balanced_range',
        sessionStats: null,
        raids: { overnightHighRaid: false, overnightLowRaid: false, priorHighRaid: false, priorLowRaid: false },
        priorTradingDate: null,
        htf: {
          '15m': { trend: 'data_limited', net: null, range: null, bars: 0 },
          '60m': { trend: 'data_limited', net: null, range: null, bars: 0 },
          '120m': { trend: 'data_limited', net: null, range: null, bars: 0 },
          '240m': { trend: 'data_limited', net: null, range: null, bars: 0 },
        },
        completeCandidateCount: 0,
        bestOverall: null,
        bestMovementMatch: null,
        selected: null,
      },
    ],
    reportMarkdown: '',
  },
  artifacts: [
    {
      reportType: 'raw_ohlc_scanner_artifact_package',
      startDate: '2026-07-21',
      endDate: '2026-07-21',
      instrument: 'MES',
      events: {
        '2026-07-21T09:15:00': {
          eventTime: '2026-07-21T09:15:00',
          date: '2026-07-21',
          session: 'morning',
          completed5m: { time: '2026-07-21T09:15:00', open: 100, high: 106, low: 100, close: 105 },
          setupCandidateStatus: {
            statuses: [
              {
                setupType: 'NoInstalledSetup',
                direction: 'LONG',
                entry: 101,
                stop: 99,
                target1: 104,
                target2: 105,
                riskPoints: 2,
                rankScore: 300,
                modelConfidenceScore: 100,
                candidateState: 'HUMAN_REVIEW_READY',
                executionStatus: 'Conditional',
              },
              {
                setupType: 'NoInstalledSetup',
                direction: 'SHORT',
                entry: 104,
                stop: 106,
                target1: 101,
                target2: 100,
                riskPoints: 2,
                rankScore: 250,
                modelConfidenceScore: 90,
                candidateState: 'HUMAN_REVIEW_READY',
                executionStatus: 'Conditional',
              },
            ],
          },
        },
        '2026-07-21T09:20:00': {
          eventTime: '2026-07-21T09:20:00',
          date: '2026-07-21',
          session: 'morning',
          completed5m: { time: '2026-07-21T09:20:00', open: 105, high: 106, low: 103, close: 104 },
          setupCandidateStatus: { statuses: [] },
        },
        '2026-07-21T09:25:00': {
          eventTime: '2026-07-21T09:25:00',
          date: '2026-07-21',
          session: 'morning',
          completed5m: { time: '2026-07-21T09:25:00', open: 104, high: 104, low: 96, close: 97 },
          setupCandidateStatus: { statuses: [] },
        },
        '2026-07-21T09:30:00': {
          eventTime: '2026-07-21T09:30:00',
          date: '2026-07-21',
          session: 'morning',
          completed5m: { time: '2026-07-21T09:30:00', open: 97, high: 98, low: 96, close: 97 },
          setupCandidateStatus: { statuses: [] },
        },
        '2026-07-21T12:00:00': {
          eventTime: '2026-07-21T12:00:00',
          date: '2026-07-21',
          session: 'morning',
          completed5m: { time: '2026-07-21T12:00:00', open: 97, high: 98, low: 96, close: 97 },
          setupCandidateStatus: { statuses: [] },
        },
        '2026-07-21T12:05:00': {
          eventTime: '2026-07-21T12:05:00',
          date: '2026-07-21',
          session: 'lunch',
          completed5m: { time: '2026-07-21T12:05:00', open: 90, high: 91, low: 89, close: 90 },
          setupCandidateStatus: { statuses: [] },
        },
        '2026-07-21T16:00:00': {
          eventTime: '2026-07-21T16:00:00',
          date: '2026-07-21',
          session: 'lunch',
          completed5m: { time: '2026-07-21T16:00:00', open: 91, high: 93, low: 90, close: 92 },
          setupCandidateStatus: { statuses: [] },
        },
      },
    },
  ],
}, '2026-07-22T00:00:00.000Z');

const july21Morning = report.rows.find((row) => row.date === '2026-07-21' && row.session === 'morning');
const july21Lunch = report.rows.find((row) => row.date === '2026-07-21' && row.session === 'lunch');

assert.equal(report.reportType, 'ytd_full_scanner_day_by_day_market_move_best_model_map');
assert.equal(report.rows.length, 3);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(july21Morning?.movement, 'high_raid_reversal_down');
assert.equal(july21Morning?.bestOverall?.setupType, 'NoInstalledSetup');
assert.equal(july21Morning?.bestMovementMatch?.setupType, 'NoInstalledSetup');
assert.equal(july21Morning?.selected?.setupType, 'NoInstalledSetup');
assert.equal(july21Morning?.selected?.outcome.status, 't2_hit');
assert.equal(july21Morning?.selected?.outcome.pnl, 17.5);
assert.equal(july21Morning?.completeCandidateCount, 2);
assert.equal(july21Lunch?.selected, null);
assert.match(report.reportMarkdown, /YTD Full Scanner Day-by-Day Market Move/);

console.log('YTD full scanner day-by-day best-model mapper verified.');
