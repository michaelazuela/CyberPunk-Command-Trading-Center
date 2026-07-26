import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveDeskTicketContractComparisonReport,
  type UnifiedPositiveDeskTicketContractComparisonReport,
} from './unified-positive-desk-ticket-contract-comparison';
import type {
  UnifiedPositiveReviewTicketRebuildSimulationReport,
  UnifiedPositiveReviewTicketSimulationTicket,
} from './unified-positive-review-ticket-rebuild-simulation';

function ticket(overrides: Partial<UnifiedPositiveReviewTicketSimulationTicket> = {}): UnifiedPositiveReviewTicketSimulationTicket {
  return {
    ticketId: '2026-07-01-morning-historicalReview-LONG',
    tradeDate: '2026-07-01',
    sessionType: 'morning',
    setupType: 'historicalReview',
    direction: 'LONG',
    sourceSnapshotId: 'scanner-morning-fixture',
    sourceCandidateKey: 'historicalReview|fixture|LONG|100.00|0',
    suppressedDuplicateSnapshotIds: [],
    duplicateRowsCollapsed: 0,
    proofBarTime: '2026-07-01T10:05:00',
    proofType: 'completed_5m_retest_reentry',
    entry: 100,
    stop: 96,
    target1: 106,
    target2: 108,
    riskPoints: 4,
    outcomeAdjustedScore: 70,
    outcomeGrossOneMes: 100,
    status: 'simulated_review_ticket',
    canExecute: false,
    publishDiscord: false,
    reviewOnly: true,
    ticketText: {
      what: 'historicalReview long is eligible for human review.',
      where: 'Entry 100, stop 96, T1 106, T2 108.',
      when: 'Fresh completed 5M proof printed at 2026-07-01T10:05:00.',
      why: 'Outcome overlay was positive.',
      invalidation: 'Invalid at 96.',
      authority: 'Research-only simulated review ticket. canExecute=false and publishDiscord=false.',
    },
    ...overrides,
  };
}

const simulation: UnifiedPositiveReviewTicketRebuildSimulationReport = {
  reportType: 'unified_positive_review_ticket_rebuild_simulation',
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
    freshProofReportPath: 'fresh-proof.json',
  },
  summary: {
    freshProofRowsLoaded: 3,
    eligibleFreshProofRows: 3,
    simulatedReviewTickets: 3,
    duplicateRowsSuppressed: 0,
    blockedNotEligible: 0,
    blockedInvalidGeometry: 0,
    canExecuteFalseTickets: 3,
    publishDiscordFalseTickets: 3,
    reviewOnlyTickets: 3,
  },
  tickets: [
    ticket(),
    ticket({
      ticketId: '2026-07-02-morning-NoInstalledSetup-SHORT',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      sourceCandidateKey: 'NoInstalledSetup|fixture|SHORT|200.00|0',
      entry: 200,
      stop: 204,
      target1: 194,
      target2: 192,
    }),
    ticket({
      ticketId: 'bad-geometry',
      target1: 99,
      target2: 98,
    }),
  ],
  suppressions: [],
  recommendations: [],
  markdown: '',
};

const report: UnifiedPositiveDeskTicketContractComparisonReport = buildUnifiedPositiveDeskTicketContractComparisonReport({
  reviewTicketSimulation: simulation,
  reviewTicketSimulationPath: 'simulation.json',
}, '2026-07-16T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_desk_ticket_contract_comparison');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.changesDiscordPosting, false);
assert.equal(report.summary.simulatedTicketsLoaded, 3);
assert.equal(report.summary.compatibleHeldLocalTickets, 2);
assert.equal(report.summary.blockedContractGapTickets, 1);
assert.equal(report.summary.deskTicketCompatible, 2);
assert.equal(report.summary.deskPublishDecisionCompatible, 3);
assert.equal(report.summary.shouldPostFalseRows, 3);
assert.equal(report.summary.canExecuteFalseRows, 3);
assert.equal(report.summary.publishDiscordFalseRows, 3);

const compatible = report.rows.find((row) => row.ticketId === '2026-07-01-morning-historicalReview-LONG');
assert.equal(compatible?.simulatedDeskTicket.sourceOfTruth, 'scanner_single_active_desk_ticket');
assert.equal(compatible?.simulatedDeskTicket.state, 'ACTIVE_REVIEW');
assert.equal(compatible?.simulatedDeskTicket.humanReviewOnly, true);
assert.equal(compatible?.simulatedDeskTicket.noAutomatedOrders, true);
assert.equal(compatible?.simulatedPublishDecision.sourceOfTruth, 'scanner_desk_publish_decision');
assert.equal(compatible?.simulatedPublishDecision.shouldPost, false);
assert.equal(compatible?.simulatedPublishDecision.canExecute, false);
assert.equal(compatible?.compatibilityStatus, 'compatible_held_local');

const blocked = report.rows.find((row) => row.ticketId === 'bad-geometry');
assert.equal(blocked?.compatibilityStatus, 'blocked_contract_gap');
assert.deepEqual(blocked?.blockers, ['directionally invalid entry/stop/T1/T2 geometry']);
assert.match(report.markdown, /Compatible held-local tickets: 2/);

console.log('unified positive DeskTicket contract comparison verified.');
