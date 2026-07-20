import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewProfitSourceAuditReport,
} from './unified-positive-held-local-preview-profit-source-audit';

const report = buildUnifiedPositiveHeldLocalPreviewProfitSourceAuditReport({
  outcomeReportPath: 'outcome.json',
  outcomeReport: {
    reportType: 'unified_positive_held_local_preview_replay_package_outcome',
    summary: { grossResolvedOneMesPl: 175 },
    rows: [{
      ticketId: 'a-1',
      tradeDate: '2026-07-20',
      session: 'morning',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      proofTime: '2026-07-20T09:35:00',
      outcomeStatus: 'resolved',
      outcomeLabel: 't1_and_t2_hit',
      entry: 100,
      stop: 96,
      t1: 106,
      t2: 108,
      riskPoints: 4,
      entryHitTime: '2026-07-20T09:35:00',
      maximumFavorableExcursion: 12,
      maximumAdverseExcursion: 1,
      resolvedOneMesPl: 40,
      resolvedR: 2,
      blockers: [],
    }, {
      ticketId: 'a-2-duplicate-campaign',
      tradeDate: '2026-07-20',
      session: 'morning',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      proofTime: '2026-07-20T09:40:00',
      outcomeStatus: 'resolved',
      outcomeLabel: 't1_and_t2_hit',
      entry: 100,
      stop: 96,
      t1: 106,
      t2: 108,
      riskPoints: 4,
      entryHitTime: '2026-07-20T09:40:00',
      maximumFavorableExcursion: 12,
      maximumAdverseExcursion: 1,
      resolvedOneMesPl: 40,
      resolvedR: 2,
      blockers: [],
    }, {
      ticketId: 'b-1',
      tradeDate: '2026-07-20',
      session: 'morning',
      setupType: 'OpeningDriveFvgContinuation',
      direction: 'SHORT',
      proofTime: '2026-07-20T09:35:00',
      outcomeStatus: 'resolved',
      outcomeLabel: 'stopped_before_t1',
      entry: 110,
      stop: 115,
      t1: 102.5,
      t2: 100,
      riskPoints: 5,
      entryHitTime: '2026-07-20T09:35:00',
      maximumFavorableExcursion: 2,
      maximumAdverseExcursion: 6,
      resolvedOneMesPl: -25,
      resolvedR: -1,
      blockers: [],
    }, {
      ticketId: 'c-1',
      tradeDate: '2026-07-20',
      session: 'lunch',
      setupType: 'IntradayMssMicroContinuation',
      direction: 'LONG',
      proofTime: '2026-07-20T12:30:00',
      outcomeStatus: 'resolved',
      outcomeLabel: 't1_and_t2_hit',
      entry: 120,
      stop: 112,
      t1: 132,
      t2: 136,
      riskPoints: 8,
      entryHitTime: '2026-07-20T12:30:00',
      maximumFavorableExcursion: 20,
      maximumAdverseExcursion: 2,
      resolvedOneMesPl: 80,
      resolvedR: 2,
      blockers: [],
    }],
  },
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.sourceRows, 4);
assert.equal(report.summary.grossOneMesPl, 135);
assert.equal(report.summary.uniqueCampaignRows, 3);
assert.equal(report.summary.uniqueCampaignGrossOneMesPl, 95);
assert.equal(report.summary.onePerSlateRows, 3);
assert.equal(report.summary.onePerSlateGrossOneMesPl, 160);
assert.equal(report.summary.topModel, 'SweepMssFvgRetrace');
assert.equal(report.summary.topModelGrossOneMesPl, 80);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.rawRiskMethodGroups[0].grossOneMesPl, 80);
assert.equal(report.topTickets[0].ticketId, 'c-1');

const missing = buildUnifiedPositiveHeldLocalPreviewProfitSourceAuditReport({
  outcomeReportPath: null,
  outcomeReport: null,
}, '2026-07-20T00:01:00.000Z');
assert.equal(missing.status, 'fail');
assert.equal(missing.summary.recommendation, 'fix_missing_outcome_report');

console.log('unified positive held-local preview profit source audit verified.');
