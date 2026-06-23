import assert from 'node:assert/strict';
import type { ScannerHealthReport } from '../agents/scannerHealthAgent';
import type { DeskState } from './localScannerEngine';
import { evaluateLiveDiscordPostEligibility, type LiveDiscordEligibilityInput } from './liveDiscordPostEligibility';

function health(status: ScannerHealthReport['status'] = 'READY'): ScannerHealthReport {
  return {
    status,
    ready: status === 'READY',
    canTrustAlerts: status !== 'BLOCKED',
    checks: [],
    blockingReasons: [],
    warnings: status === 'DEGRADED' ? ['Scanner is in dry-run mode; Discord sends are intentionally suppressed.'] : [],
    summary: `${status}: fixture`,
    recommendedAction: 'Fixture.',
    approvalBoundary: {
      healthApprovesTrade: false,
      healthChangesRules: false,
      healthCreatesEntry: false,
      healthCreatesTargets: false,
      healthOverridesScanner: false,
      healthOverridesRisk: false,
    },
  };
}

function deskState(): DeskState {
  return {
    sourceOfTruth: 'scanner_desk_state',
    marketMode: 'watching',
    activeCampaign: null,
    bestLongPlan: null,
    bestShortPlan: null,
    selectedCandidate: null,
    primaryDeskPlay: {
      sourceOfTruth: 'scanner_primary_desk_play',
      direction: 'WAIT',
      trendConfirmation: {
        sourceOfTruth: 'scanner_protected_structure_trend_confirmation',
        direction: 'WAIT',
        status: 'unavailable',
        supportingTimeframes: [],
        lineInSand: null,
        confirmation: 'Fixture.',
        summary: 'Fixture.',
        approvalBoundary: {
          changesTradeApprovals: false,
          changesCanExecute: false,
          changesEntryStopTargets: false,
        },
      },
      activeTacticalLine: {
        sourceOfTruth: 'scanner_active_tactical_line',
        direction: 'WAIT',
        originalLine: null,
        activeLine: null,
        migrated: false,
        supportingTimeframes: [],
        reason: 'Fixture.',
        nextTrigger: 'Fixture.',
        standDown: 'Fixture.',
        approvalBoundary: {
          changesTradeApprovals: false,
          changesCanExecute: false,
          changesEntryStopTargets: false,
        },
      },
      modelRouting: null as unknown as DeskState['primaryDeskPlay']['modelRouting'],
      title: 'Fixture DeskState',
      summary: 'Fixture.',
      lineInSand: null,
      longAbove: null,
      shortBelow: null,
      targetReactionLevel: null,
      targetReactionLabel: null,
      targetReactionReason: null,
      levelTransition: null,
      htfObjectiveLadder: null as unknown as DeskState['primaryDeskPlay']['htfObjectiveLadder'],
      htfProtectedStructureMap: null as unknown as DeskState['primaryDeskPlay']['htfProtectedStructureMap'],
      nextTrigger: null,
      invalidation: null,
      noChase: 'No chase.',
      longBias: null as unknown as DeskState['primaryDeskPlay']['longBias'],
      shortBias: null as unknown as DeskState['primaryDeskPlay']['shortBias'],
      htfConflict: false,
      countertrendWarning: null,
      discordEligible: true,
      approvalBoundary: {
        changesTradeApprovals: false,
        changesCanExecute: false,
        changesEntryStopTargets: false,
      },
      notes: [],
    },
    lineInSand: null,
    nextTrigger: null,
    invalidation: null,
    visibilityMode: 'POST_WATCH',
    discordAction: 'post_watch',
    suppressionReason: null,
    htfContextStatus: 'sufficient',
    dataQualityStatus: 'ok',
    canExecute: false,
    promotion: {
      sourceOfTruth: 'scanner_desk_state_promotion_path',
      currentStage: 'watch',
      nextStage: 'conditional',
      promotionReadiness: 'watch_waiting_for_completed_5m',
      promotionTrigger: 'Fixture.',
      requiredProof: ['Completed 5M proof.'],
      missingProof: ['Completed 5M proof.'],
      blockedBy: ['Completed 5M proof.'],
      canPromoteNow: false,
      approvalBoundary: {
        changesTradeApprovals: false,
        changesCanExecute: false,
        changesEntryStopTargets: false,
        changesRiskRules: false,
        changesBridgeBehavior: false,
      },
      notes: [],
    },
    visibilityMetadata: {
      sourceOfTruth: 'scanner_desk_state_visibility_metadata',
      visibilityMode: 'POST_WATCH',
      discordAction: 'post_watch',
      suppressionReason: null,
      nextTrigger: null,
      dataQualityBlocker: null,
      holdWithReason: null,
      noTradeWithReason: null,
      hasMeaningfulStructuredEvidence: true,
      authority: {
        registeredModel: true,
        activeModel: true,
        watchEligible: true,
        planEligible: false,
        discordEligible: true,
        executionEligible: false,
        humanReviewOnly: true,
        canExecute: false,
      },
      notes: [],
    },
    candidateLifecycleTrace: null as unknown as DeskState['candidateLifecycleTrace'],
    notes: [],
  };
}

function input(overrides: Partial<LiveDiscordEligibilityInput> = {}): LiveDiscordEligibilityInput {
  return {
    scannerHealth: health(),
    bridgeConnected: true,
    bridgeInstrumentResolved: true,
    completedFiveMinuteFresh: true,
    htfContextPresent: true,
    deskState: deskState(),
    decisionTapeWritable: true,
    auditPath: 'tools/automation/discord-audit/scanner-decision-tape-2026-06-22-MES-lunch.json',
    discordPayloadValidated: true,
    discordPayloadHasVisibilityMetadata: true,
    discordWebhookConfigured: true,
    dryRun: false,
    freshDryScanObserved: true,
    diagnosticReplayPassed: true,
    ...overrides,
  };
}

const eligible = evaluateLiveDiscordPostEligibility(input());
assert.equal(eligible.sourceOfTruth, 'phase_11a_live_discord_post_eligibility_policy');
assert.equal(eligible.eligible, true);
assert.equal(eligible.blockers.length, 0);
assert.ok(eligible.checks.every((item) => item.passed));
assert.deepEqual(eligible.authorityBoundary, {
  changesTradingLogic: false,
  changesScannerBehavior: false,
  changesDiscordSendBehavior: false,
  changesBridgeBehavior: false,
  changesCanExecute: false,
  createsTradeApproval: false,
});

const dryRunBlocked = evaluateLiveDiscordPostEligibility(input({
  scannerHealth: health('DEGRADED'),
  dryRun: true,
  discordWebhookConfigured: false,
}));
assert.equal(dryRunBlocked.eligible, false);
assert.ok(dryRunBlocked.blockers.some((item) => item.includes('READY')));
assert.ok(dryRunBlocked.blockers.some((item) => item.includes('dry-run')));
assert.ok(dryRunBlocked.blockers.some((item) => item.includes('webhook')));

const missingDeskStateBlocked = evaluateLiveDiscordPostEligibility(input({
  deskState: null,
}));
assert.equal(missingDeskStateBlocked.eligible, false);
assert.ok(missingDeskStateBlocked.blockers.some((item) => item.includes('DeskState')));
assert.equal(missingDeskStateBlocked.authorityBoundary.changesCanExecute, false);
assert.equal(missingDeskStateBlocked.authorityBoundary.createsTradeApproval, false);

const duplicateLedgerBlocked = evaluateLiveDiscordPostEligibility(input({
  deskState: {
    ...deskState(),
    suppressionReason: 'ActiveCampaign duplicate suppressed by durable Supabase ledger.',
    visibilityMetadata: {
      ...deskState().visibilityMetadata,
      suppressionReason: 'ActiveCampaign duplicate suppressed by durable Supabase ledger.',
    },
  },
}));
assert.equal(duplicateLedgerBlocked.eligible, false);
assert.ok(duplicateLedgerBlocked.blockers.some((item) => item.includes('duplicate ledger')));
assert.equal(duplicateLedgerBlocked.authorityBoundary.createsTradeApproval, false);

const missedNoChaseBlocked = evaluateLiveDiscordPostEligibility(input({
  deskState: {
    ...deskState(),
    suppressionReason: 'missed_no_chase: T1 was already reached before alert generation.',
    visibilityMetadata: {
      ...deskState().visibilityMetadata,
      suppressionReason: 'missed_no_chase: T1 was already reached before alert generation.',
    },
  },
}));
assert.equal(missedNoChaseBlocked.eligible, false);
assert.ok(missedNoChaseBlocked.blockers.some((item) => item.includes('missed/no-chase')));

const heldDeskStateBlocked = evaluateLiveDiscordPostEligibility(input({
  deskState: {
    ...deskState(),
    visibilityMode: 'HOLD_WITH_REASON',
    discordAction: 'hold',
    suppressionReason: 'Structured evidence is visible, but no fresh trigger is available.',
    visibilityMetadata: {
      ...deskState().visibilityMetadata,
      visibilityMode: 'HOLD_WITH_REASON',
      discordAction: 'hold',
      holdWithReason: 'Structured evidence is visible, but no fresh trigger is available.',
    },
  },
}));
assert.equal(heldDeskStateBlocked.eligible, false);
assert.ok(heldDeskStateBlocked.blockers.some((item) => item.includes('POST_PLAN')));
assert.ok(heldDeskStateBlocked.blockers.some((item) => item.includes('hold')));

console.log('liveDiscordPostEligibility tests passed');
