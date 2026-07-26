import assert from 'node:assert/strict';
import { buildUnifiedDeskOutputSelectorPreviewReport } from './unified-desk-output-selector-preview';

const candidate = (setupType: string, direction: 'LONG' | 'SHORT', eventTime: string) => ({
  setupType,
  direction,
  eventTime,
  entry: 100,
  stop: direction === 'LONG' ? 98 : 102,
  target1: direction === 'LONG' ? 103 : 97,
  target2: direction === 'LONG' ? 104 : 96,
  riskPoints: 2,
  rankScore: 300,
  outcome: { status: 't2_hit', pnl: 20, r: 2, filled: true },
});

const report = buildUnifiedDeskOutputSelectorPreviewReport({
  dayByDayReportPath: 'fixture-ytd-map.json',
  laneComparisonReportPath: 'fixture-lane-comparison.json',
  laneComparisonReport: {
    reportType: 'ytd_session_lane_comparison_report',
    generatedAt: '2026-07-22T00:00:00.000Z',
    sessionRecommendations: [
      {
        session: 'morning',
        primaryLane: 'NoInstalledSetup',
        contextLanes: ['NoInstalledSetup', 'NoInstalledSetup'],
      },
      {
        session: 'lunch',
        primaryLane: 'NoInstalledSetup',
        contextLanes: ['NoInstalledSetup'],
      },
    ],
  },
  dayByDayReport: {
    reportType: 'ytd_full_scanner_day_by_day_market_move_best_model_map',
    generatedAt: '2026-07-22T00:00:00.000Z',
    rows: [
      {
        date: '2026-01-02',
        session: 'morning',
        movement: 'bullish_drive',
        completeCandidateCount: 4,
        selected: candidate('NoInstalledSetup', 'LONG', '2026-01-02T09:35:00'),
        bestMovementMatch: candidate('NoInstalledSetup', 'LONG', '2026-01-02T09:35:00'),
        bestOverall: candidate('NoInstalledSetup', 'LONG', '2026-01-02T09:40:00'),
      },
      {
        date: '2026-01-03',
        session: 'morning',
        movement: 'high_raid_reversal_down',
        completeCandidateCount: 3,
        selected: candidate('NoInstalledSetup', 'SHORT', '2026-01-03T10:05:00'),
        bestMovementMatch: candidate('NoInstalledSetup', 'SHORT', '2026-01-03T10:05:00'),
        bestOverall: candidate('NoInstalledSetup', 'SHORT', '2026-01-03T10:10:00'),
      },
      {
        date: '2026-01-04',
        session: 'lunch',
        movement: 'balanced_range',
        completeCandidateCount: 0,
        selected: null,
        bestMovementMatch: null,
        bestOverall: null,
      },
    ],
  },
}, '2026-07-22T01:00:00.000Z');

const approved = report.rows.find((row) => row.visibleState === 'APPROVED_DESK_PLAN');
const forming = report.rows.find((row) => row.visibleState === 'FORMING_DESK_READ');

assert.equal(report.reportType, 'unified_desk_output_selector_preview');
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.installsRuntimeAdapter, false);
assert.equal(report.authority.automatedOrders, false);
assert.deepEqual(report.contract.visibleStates, ['FORMING_DESK_READ', 'APPROVED_DESK_PLAN']);
assert.equal(report.contract.noHumanReviewWording, true);
assert.equal(report.summary.sourceRows, 3);
assert.equal(report.summary.visibleOutputRows, 2);
assert.equal(report.summary.approvedDeskPlanRows, 1);
assert.equal(report.summary.formingDeskReadRows, 1);
assert.equal(report.summary.silentRows, 1);
assert.equal(report.summary.canExecuteChangedRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(approved?.model, 'NoInstalledSetup');
assert.equal(approved?.sourceCandidateRole, 'primary_lane');
assert.equal(approved?.deskLanguage.headline, 'Approved Desk Plan: NoInstalledSetup LONG');
assert.equal(approved?.canExecuteVisible, false);
assert.equal(forming?.model, 'NoInstalledSetup');
assert.equal(forming?.sourceCandidateRole, 'context_lane');
assert.match(forming?.deskLanguage.headline || '', /Forming Desk Read/);
assert.doesNotMatch(report.markdown, /human-review/i);

console.log('Unified desk output selector preview verified.');
