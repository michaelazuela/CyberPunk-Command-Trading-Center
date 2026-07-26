import assert from 'node:assert/strict';
import { buildHeldLocalReviewTicketArtifact } from '../../src/lib/localScannerEngine';
import { SetupType } from '../../src/types';
import type { UnifiedPositiveDeskTicketContractComparisonReport } from './unified-positive-desk-ticket-contract-comparison';
import { buildUnifiedPositiveHeldLocalTicketAdapterReport } from './unified-positive-held-local-ticket-adapter';

const artifact = buildHeldLocalReviewTicketArtifact({
  ticketId: 'fixture-ticket',
  setupType: SetupType.NoSetup,
  direction: 'LONG',
  sourceCandidateKey: 'historicalReview|fixture|LONG|100.00|0',
  entry: 100,
  stop: 96,
  target1: 106,
  target2: 108,
  proofTime: '2026-07-01T10:05:00',
  triggerCondition: 'Fresh completed 5M retest/re-entry proof.',
  invalidationText: 'Invalid at 96.',
});

assert.equal(artifact.sourceOfTruth, 'scanner_owned_held_local_review_ticket_adapter');
assert.equal(artifact.ticketId, 'fixture-ticket');
assert.equal(artifact.publishDiscord, false);
assert.equal(artifact.canExecute, false);
assert.equal(artifact.reviewOnly, true);
assert.equal(artifact.approvalBoundary.changesDiscordPosting, false);
assert.equal(artifact.deskTicket.sourceOfTruth, 'scanner_single_active_desk_ticket');
assert.equal(artifact.deskTicket.state, 'ACTIVE_REVIEW');
assert.equal(artifact.deskTicket.humanReviewOnly, true);
assert.equal(artifact.deskTicket.noAutomatedOrders, true);
assert.equal(artifact.deskTicket.entry, 100);
assert.equal(artifact.deskTicket.stop, 96);
assert.equal(artifact.deskTicket.t1, 106);
assert.equal(artifact.deskTicket.t2, 108);
assert.equal(artifact.deskTicket.invalidationText, 'Invalid if price trades below the protected 5M stop line at 96.00. No automated order authority is granted.');
assert.equal(artifact.deskPublishDecision.sourceOfTruth, 'scanner_desk_publish_decision');
assert.equal(artifact.deskPublishDecision.shouldPost, false);
assert.equal(artifact.deskPublishDecision.canExecute, false);
assert.equal(artifact.deskPublishDecision.hasCompletePlan, true);
assert.equal(artifact.deskPublishDecision.displaySource, 'desk_ticket');
assert.equal(artifact.deskPublishDecision.invalidationText, 'Invalid if price trades below the protected 5M stop line at 96.00. No automated order authority is granted.');

const comparison = {
  reportType: 'unified_positive_desk_ticket_contract_comparison',
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
    changesDiscordPosting: false,
  },
  source: {
    reviewTicketSimulationPath: 'simulation.json',
  },
  summary: {
    simulatedTicketsLoaded: 2,
    compatibleHeldLocalTickets: 1,
    blockedContractGapTickets: 1,
    deskTicketCompatible: 1,
    deskPublishDecisionCompatible: 2,
    shouldPostFalseRows: 2,
    canExecuteFalseRows: 2,
    publishDiscordFalseRows: 2,
  },
  rows: [
    {
      ticketId: '2026-07-01-morning-fixture-ticket',
      sourceSnapshotId: 'scanner-morning-fixture',
      setupType: 'historicalReview',
      direction: 'LONG',
      compatibilityStatus: 'compatible_held_local',
      compatibleWithDeskTicket: true,
      compatibleWithDeskPublishDecision: true,
      shouldPostRemainsFalse: true,
      canExecuteRemainsFalse: true,
      publishDiscordRemainsFalse: true,
      simulatedDeskTicket: artifact.deskTicket,
      simulatedPublishDecision: artifact.deskPublishDecision,
      blockers: [],
      notes: ['fixture compatible'],
    },
    {
      ticketId: '2026-07-01-lunch-blocked-ticket',
      sourceSnapshotId: 'scanner-lunch-blocked',
      setupType: 'historicalReview',
      direction: 'LONG',
      compatibilityStatus: 'blocked_contract_gap',
      compatibleWithDeskTicket: false,
      compatibleWithDeskPublishDecision: true,
      shouldPostRemainsFalse: true,
      canExecuteRemainsFalse: true,
      publishDiscordRemainsFalse: true,
      simulatedDeskTicket: artifact.deskTicket,
      simulatedPublishDecision: artifact.deskPublishDecision,
      blockers: ['directionally invalid entry/stop/T1/T2 geometry'],
      notes: [],
    },
  ],
  recommendations: [],
  markdown: '',
} satisfies UnifiedPositiveDeskTicketContractComparisonReport;

const report = buildUnifiedPositiveHeldLocalTicketAdapterReport({
  contractComparison: comparison,
  contractComparisonPath: 'comparison.json',
}, '2026-07-16T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_ticket_adapter');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.changesDiscordPosting, false);
assert.equal(report.summary.comparisonRowsLoaded, 2);
assert.equal(report.summary.heldLocalArtifactsCreated, 1);
assert.equal(report.summary.blockedContractGapRows, 1);
assert.equal(report.summary.shouldPostFalseArtifacts, 1);
assert.equal(report.summary.canExecuteFalseArtifacts, 1);
assert.equal(report.summary.publishDiscordFalseArtifacts, 1);
assert.equal(report.rows.find((row) => row.ticketId === '2026-07-01-morning-fixture-ticket')?.adapterStatus, 'held_local_artifact_created');
assert.equal(report.rows.find((row) => row.ticketId === '2026-07-01-morning-fixture-ticket')?.session, 'morning');
assert.equal(report.rows.find((row) => row.ticketId === '2026-07-01-lunch-blocked-ticket')?.adapterStatus, 'blocked_contract_gap');
assert.equal(report.rows.find((row) => row.ticketId === '2026-07-01-lunch-blocked-ticket')?.session, 'lunch');
assert.match(report.markdown, /Held-local artifacts created: 1/);

console.log('unified positive held-local ticket adapter verified.');
