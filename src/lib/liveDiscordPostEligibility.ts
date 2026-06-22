import type { ScannerHealthReport } from '../agents/scannerHealthAgent';
import type { DeskState } from './localScannerEngine';

export type LiveDiscordEligibilityCheckKey =
  | 'scanner_health_ready'
  | 'bridge_connected'
  | 'bridge_instrument_resolved'
  | 'completed_5m_fresh'
  | 'htf_context_present'
  | 'desk_state_present'
  | 'desk_state_visibility_metadata_present'
  | 'desk_state_approval_boundary_preserved'
  | 'decision_tape_writable'
  | 'audit_path_present'
  | 'discord_payload_validated'
  | 'discord_payload_visibility_metadata_present'
  | 'discord_webhook_configured'
  | 'dry_run_disabled_for_live_post'
  | 'fresh_dry_scan_observed'
  | 'diagnostic_replay_passed';

export interface LiveDiscordEligibilityCheck {
  key: LiveDiscordEligibilityCheckKey;
  passed: boolean;
  reason: string;
}

export interface LiveDiscordEligibilityInput {
  scannerHealth: ScannerHealthReport | null;
  bridgeConnected: boolean;
  bridgeInstrumentResolved: boolean;
  completedFiveMinuteFresh: boolean;
  htfContextPresent: boolean;
  deskState: DeskState | null;
  decisionTapeWritable: boolean;
  auditPath: string | null;
  discordPayloadValidated: boolean;
  discordPayloadHasVisibilityMetadata: boolean;
  discordWebhookConfigured: boolean;
  dryRun: boolean;
  freshDryScanObserved: boolean;
  diagnosticReplayPassed: boolean;
}

export interface LiveDiscordEligibilityReport {
  sourceOfTruth: 'phase_11a_live_discord_post_eligibility_policy';
  eligible: boolean;
  checks: LiveDiscordEligibilityCheck[];
  blockers: string[];
  notes: string[];
  authorityBoundary: {
    changesTradingLogic: false;
    changesScannerBehavior: false;
    changesDiscordSendBehavior: false;
    changesBridgeBehavior: false;
    changesCanExecute: false;
    createsTradeApproval: false;
  };
}

function check(key: LiveDiscordEligibilityCheckKey, passed: boolean, reason: string): LiveDiscordEligibilityCheck {
  return { key, passed, reason };
}

function deskStateBoundaryPreserved(deskState: DeskState | null): boolean {
  const promotionBoundary = deskState?.promotion?.approvalBoundary;
  const primaryBoundary = deskState?.primaryDeskPlay?.approvalBoundary;
  return Boolean(
    promotionBoundary &&
    primaryBoundary &&
    promotionBoundary.changesTradeApprovals === false &&
    promotionBoundary.changesCanExecute === false &&
    promotionBoundary.changesEntryStopTargets === false &&
    promotionBoundary.changesRiskRules === false &&
    promotionBoundary.changesBridgeBehavior === false &&
    primaryBoundary.changesTradeApprovals === false &&
    primaryBoundary.changesCanExecute === false &&
    primaryBoundary.changesEntryStopTargets === false,
  );
}

export function evaluateLiveDiscordPostEligibility(input: LiveDiscordEligibilityInput): LiveDiscordEligibilityReport {
  const checks: LiveDiscordEligibilityCheck[] = [
    check(
      'scanner_health_ready',
      input.scannerHealth?.status === 'READY',
      input.scannerHealth
        ? `Scanner health must be READY before live Discord posting. Observed: ${input.scannerHealth.status}.`
        : 'Scanner health report is required before live Discord posting.',
    ),
    check('bridge_connected', input.bridgeConnected, 'NinjaTrader bridge must be connected.'),
    check('bridge_instrument_resolved', input.bridgeInstrumentResolved, 'Bridge instrument must be resolved to the active contract.'),
    check('completed_5m_fresh', input.completedFiveMinuteFresh, 'Latest completed 5M bar must be fresh.'),
    check('htf_context_present', input.htfContextPresent, 'Required 15M/60M/120M/240M context must be present.'),
    check(
      'desk_state_present',
      input.deskState?.sourceOfTruth === 'scanner_desk_state',
      'Scanner-owned DeskState must be present.',
    ),
    check(
      'desk_state_visibility_metadata_present',
      input.deskState?.visibilityMetadata?.sourceOfTruth === 'scanner_desk_state_visibility_metadata',
      'DeskState visibility metadata must be present.',
    ),
    check(
      'desk_state_approval_boundary_preserved',
      deskStateBoundaryPreserved(input.deskState),
      'DeskState approval boundaries must state no changes to approvals, canExecute, entry/stop/targets, risk, or bridge behavior.',
    ),
    check('decision_tape_writable', input.decisionTapeWritable, 'Decision tape must be writable.'),
    check('audit_path_present', Boolean(input.auditPath), 'Discord/scanner audit path must be available.'),
    check('discord_payload_validated', input.discordPayloadValidated, 'Discord payload must pass formatter validation.'),
    check(
      'discord_payload_visibility_metadata_present',
      input.discordPayloadHasVisibilityMetadata,
      'Discord payload must carry scanner visibility metadata.',
    ),
    check('discord_webhook_configured', input.discordWebhookConfigured, 'Live Discord webhook must be configured.'),
    check('dry_run_disabled_for_live_post', !input.dryRun, 'Live Discord posting requires dry-run suppression to be intentionally disabled.'),
    check('fresh_dry_scan_observed', input.freshDryScanObserved, 'A fresh dry scan must be observed before live posting.'),
    check('diagnostic_replay_passed', input.diagnosticReplayPassed, 'Diagnostic replay must pass against the generated tape before live posting.'),
  ];

  const blockers = checks.filter((item) => !item.passed).map((item) => item.reason);

  return {
    sourceOfTruth: 'phase_11a_live_discord_post_eligibility_policy',
    eligible: blockers.length === 0,
    checks,
    blockers,
    notes: [
      'Phase 11A is a policy contract only; it does not enable live Discord sends.',
      'Eligibility does not approve trades, alter scanner ranking, or change canExecute.',
      'Phase 11B may wire this policy to the send boundary after review.',
    ],
    authorityBoundary: {
      changesTradingLogic: false,
      changesScannerBehavior: false,
      changesDiscordSendBehavior: false,
      changesBridgeBehavior: false,
      changesCanExecute: false,
      createsTradeApproval: false,
    },
  };
}
