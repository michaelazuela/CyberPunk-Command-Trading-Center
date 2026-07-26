import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveReviewTicketRebuildSimulationReport,
  type UnifiedPositiveReviewTicketRebuildSimulationReport,
} from './unified-positive-review-ticket-rebuild-simulation';
import type { UnifiedPositiveFresh5mProofReport, UnifiedPositiveFresh5mProofRow } from './unified-positive-fresh-5m-proof-extractor';

function row(overrides: Partial<UnifiedPositiveFresh5mProofRow> = {}): UnifiedPositiveFresh5mProofRow {
  return {
    snapshotId: 'fresh-a',
    tradeDate: '2026-07-01',
    sessionType: 'morning',
    candidateKey: 'historicalReview|fixture|LONG|100.00|0',
    setupType: 'historicalReview',
    direction: 'LONG',
    completedBarTime: '2026-07-01T10:00:00',
    entry: 100,
    stop: 96,
    target1: 106,
    target2: 108,
    outcomeAdjustedScore: 70,
    outcomeGrossOneMes: 100,
    barsChecked: 10,
    proofStatus: 'fresh_5m_proof_found',
    proofType: 'completed_5m_retest_reentry',
    proofBarTime: '2026-07-01T10:05:00',
    proofBar: { time: '2026-07-01T10:05:00', open: 99, high: 101, low: 99, close: 100.5 },
    blockingBarTime: null,
    blockingBar: null,
    reviewReadiness: 'eligible_after_fresh_5m_proof',
    blockers: [],
    canExecute: false,
    publishDiscord: false,
    recommendation: 'fixture',
    ...overrides,
  };
}

const freshProofReport: UnifiedPositiveFresh5mProofReport = {
  reportType: 'unified_positive_fresh_5m_proof_extractor',
  generatedAt: '2026-07-16T00:00:00.000Z',
  authority: {
    readOnly: true,
    researchOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    runsSetupScanner: false,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRiskRules: false,
    changesBridgeBehavior: false,
  },
  source: {
    positiveRebuildAuditPath: 'positive.json',
    auditDir: 'fixture-audit',
    marketBarsJson: 'bars.json',
    startDate: '2026-07-01',
    endDate: '2026-07-01',
    instrument: 'MES',
    tolerancePoints: 0.25,
  },
  summary: {
    positiveRowsLoaded: 4,
    proofScopeRows: 4,
    freshProofFound: 3,
    eligibleAfterFresh5mProof: 3,
    invalidatedBeforeProof: 1,
    targetReachedBeforeProof: 0,
    noFresh5mProof: 0,
    missingFutureBars: 0,
    missingSnapshot: 0,
    missingPlanGeometry: 0,
    notInScope: 0,
    canExecuteFalseRows: 4,
    publishDiscordFalseRows: 4,
    fiveMinuteBarsLoaded: 100,
    fiveMinuteSource: 'local_market_bars_json',
  },
  rows: [
    row({ snapshotId: 'fresh-a', outcomeAdjustedScore: 70, proofBarTime: '2026-07-01T10:10:00' }),
    row({ snapshotId: 'fresh-b', outcomeAdjustedScore: 75, proofBarTime: '2026-07-01T10:05:00', outcomeGrossOneMes: 125 }),
    row({
      snapshotId: 'sweep',
      tradeDate: '2026-07-02',
      setupType: 'NoInstalledSetup',
      candidateKey: 'NoInstalledSetup|fixture|SHORT|200.00|0',
      direction: 'SHORT',
      entry: 200,
      stop: 204,
      target1: 194,
      target2: 192,
      outcomeAdjustedScore: 80,
      proofBarTime: '2026-07-02T10:05:00',
      proofBar: { time: '2026-07-02T10:05:00', open: 201, high: 201, low: 199, close: 199.5 },
    }),
    row({
      snapshotId: 'blocked',
      proofStatus: 'invalidated_before_proof',
      reviewReadiness: 'still_blocked',
      proofType: null,
      proofBarTime: null,
      proofBar: null,
      blockers: ['protected stop touched before fresh 5M proof'],
    }),
  ],
  recommendations: [],
  markdown: '',
};

const report: UnifiedPositiveReviewTicketRebuildSimulationReport = buildUnifiedPositiveReviewTicketRebuildSimulationReport({
  freshProofReport,
  freshProofReportPath: 'fresh-proof.json',
}, '2026-07-16T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_review_ticket_rebuild_simulation');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.freshProofRowsLoaded, 4);
assert.equal(report.summary.eligibleFreshProofRows, 3);
assert.equal(report.summary.simulatedReviewTickets, 2);
assert.equal(report.summary.duplicateRowsSuppressed, 1);
assert.equal(report.summary.blockedNotEligible, 1);
assert.equal(report.summary.canExecuteFalseTickets, 2);
assert.equal(report.summary.publishDiscordFalseTickets, 2);
assert.equal(report.summary.reviewOnlyTickets, 2);

const turtleTicket = report.tickets.find((ticket) => ticket.setupType === 'historicalReview');
assert.equal(turtleTicket?.sourceSnapshotId, 'fresh-b');
assert.deepEqual(turtleTicket?.suppressedDuplicateSnapshotIds, ['fresh-a']);
assert.equal(turtleTicket?.duplicateRowsCollapsed, 1);
assert.equal(turtleTicket?.riskPoints, 4);
assert.equal(turtleTicket?.canExecute, false);
assert.equal(turtleTicket?.publishDiscord, false);
assert.equal(turtleTicket?.reviewOnly, true);
assert.match(turtleTicket?.ticketText.authority || '', /Research-only simulated review ticket/);
assert.equal(report.suppressions.some((item) => item.snapshotId === 'blocked' && item.status === 'blocked_not_eligible'), true);
assert.equal(report.suppressions.some((item) => item.snapshotId === 'fresh-a' && item.status === 'suppressed_duplicate'), true);
assert.match(report.markdown, /Simulated review tickets: 2/);

console.log('unified positive review-ticket rebuild simulation verified.');
