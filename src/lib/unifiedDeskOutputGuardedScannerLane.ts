import {
  buildUnifiedDeskOutputScannerSurfaceModel,
  type UnifiedDeskOutputScannerSurfaceModel,
} from './unifiedDeskOutputScannerSurface';
import {
  buildUnifiedDeskOutputScannerVisibilityModel,
  type UnifiedDeskOutputScannerVisibilityModel,
  type UnifiedDeskOutputVisibilityCandidate,
  type UnifiedDeskOutputVisibilityReadinessReport,
} from './unifiedDeskOutputScannerVisibilityAdapter';

type GuardedSession = 'morning' | 'lunch';
export type UnifiedDeskOutputSelectionPolicyOrder =
  'latest_completed_5m_proof_per_session' |
  'proven_lane_priority_then_latest_proof';

export interface UnifiedDeskOutputGuardedLaneContractInput {
  reportType: 'unified_desk_output_discord_guarded_live_lane_contract' | string;
  status: 'pass' | 'blocked' | string;
  lane: {
    enabledByDefault: boolean;
    scannerOwnedOnly: boolean;
    allowedDeskStates: string[];
    maxPostsPerSession: number;
    sessions: GuardedSession[];
    requiresFreshManifest: boolean;
    requiresFreshIdempotencyKey: boolean;
    refusesDuplicateIdempotencyKey: boolean;
    requiresExplicitApprovalForProductionSend: boolean;
  };
  authority: {
    postsDiscordNow: boolean;
    webhookCallRows: number;
    writesSupabase: boolean;
    readsLiveSupabase: boolean;
    readsLiveBridge: boolean;
    changesTradingLogic: boolean;
    changesCanExecute: boolean;
    automatedOrders: boolean;
  };
  summary: {
    laneEnabledByDefault: boolean;
    approvedDeskPlanOnly: boolean;
    maxPostsPerSession: number;
    webhookCallRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    blockedRows: number;
  };
  blockers: string[];
}

export interface UnifiedDeskOutputGuardedScannerLanePreview {
  reportType: 'unified_desk_output_guarded_local_scanner_lane_preview';
  status: 'pass' | 'blocked';
  authority: {
    localOnly: true;
    readsSavedGuardedLaneContractOnly: true;
    readsSavedReadinessAuditOnly: true;
    rendersScannerSurfaceOnly: true;
    postsDiscord: false;
    webhookCallRows: 0;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    automatedOrders: false;
  };
  selectionPolicy: {
    enabledByDefault: false;
    state: 'APPROVED_DESK_PLAN';
    sessions: GuardedSession[];
    maxRowsPerSession: 1;
    order: UnifiedDeskOutputSelectionPolicyOrder;
    proposedPriority: Record<GuardedSession, string[]> | null;
  };
  summary: {
    sourceCandidates: number;
    eligibleApprovedDeskPlanRows: number;
    selectedRows: number;
    morningRows: number;
    lunchRows: number;
    suppressedRows: number;
    surfaceRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    canExecuteChangedRows: number;
    tradingLogicChangedRows: number;
    blockedRows: number;
    runtimeInstallAllowed: false;
    recommendation: 'ready_for_disabled_local_scanner_lane_preview' | 'hold_for_guarded_scanner_lane_fix';
  };
  selectedCandidates: UnifiedDeskOutputVisibilityCandidate[];
  visibilityModel: UnifiedDeskOutputScannerVisibilityModel;
  surface: UnifiedDeskOutputScannerSurfaceModel;
  blockers: string[];
}

function sortedLatestFirst(candidates: UnifiedDeskOutputVisibilityCandidate[]): UnifiedDeskOutputVisibilityCandidate[] {
  return [...candidates].sort((left, right) => {
    const timeCompare = right.proofTime.localeCompare(left.proofTime);
    return timeCompare || left.cardId.localeCompare(right.cardId);
  });
}

const PROVEN_LANE_PRIORITY: Record<GuardedSession, string[]> = {
  morning: [
    'OpeningDriveFvgContinuation',
    'HtfDisplacementFvgContinuation',
    'HtfDisplacementMssContinuation',
    'HtfDrawContinuationAfterRaid',
    'IntradayMssMicroContinuation',
    'SweepMssFvgRetrace',
    'TurtleSoup',
  ],
  lunch: [
    'AfterLunchDriveFvgContinuation',
    'HtfDisplacementFvgContinuation',
    'HtfDisplacementMssContinuation',
    'HtfDrawContinuationAfterRaid',
    'IntradayMssMicroContinuation',
    'SweepMssFvgRetrace',
    'TurtleSoup',
  ],
};

function priorityFor(session: GuardedSession, model: string): number {
  const index = PROVEN_LANE_PRIORITY[session].indexOf(model);
  return index >= 0 ? index : PROVEN_LANE_PRIORITY[session].length;
}

function sortedByProvenLanePriority(candidates: UnifiedDeskOutputVisibilityCandidate[]): UnifiedDeskOutputVisibilityCandidate[] {
  return [...candidates].sort((left, right) => {
    const priorityCompare = priorityFor(left.session, left.model) - priorityFor(right.session, right.model);
    if (priorityCompare !== 0) return priorityCompare;
    const timeCompare = right.proofTime.localeCompare(left.proofTime);
    return timeCompare || left.cardId.localeCompare(right.cardId);
  });
}

function selectOneApprovedPerSession(args: {
  candidates: UnifiedDeskOutputVisibilityCandidate[];
  sessions: GuardedSession[];
  order: UnifiedDeskOutputSelectionPolicyOrder;
}): UnifiedDeskOutputVisibilityCandidate[] {
  return args.sessions.flatMap((session) => {
    const candidates = args.candidates.filter((candidate) => candidate.session === session);
    const rows = args.order === 'proven_lane_priority_then_latest_proof'
      ? sortedByProvenLanePriority(candidates)
      : sortedLatestFirst(candidates);
    return rows[0] ? [rows[0]] : [];
  });
}

function validateContract(contract: UnifiedDeskOutputGuardedLaneContractInput | null): string[] {
  if (!contract) return ['Missing guarded live-lane contract.'];
  return [
    contract.reportType === 'unified_desk_output_discord_guarded_live_lane_contract'
      ? null
      : 'Source report is not the guarded live-lane contract.',
    contract.status === 'pass' ? null : `Guarded live-lane contract status is ${contract.status}.`,
    contract.lane.enabledByDefault === false ? null : 'Guarded live lane is enabled by default.',
    contract.lane.scannerOwnedOnly ? null : 'Guarded live lane is not scanner-owned only.',
    contract.lane.allowedDeskStates.length === 1 && contract.lane.allowedDeskStates[0] === 'APPROVED_DESK_PLAN'
      ? null
      : 'Guarded live lane allows states beyond APPROVED_DESK_PLAN.',
    contract.lane.maxPostsPerSession === 1 ? null : 'Guarded live lane does not cap at one post per session.',
    contract.lane.sessions.includes('morning') && contract.lane.sessions.includes('lunch')
      ? null
      : 'Guarded live lane does not include both morning and lunch sessions.',
    contract.lane.requiresFreshManifest ? null : 'Guarded live lane does not require a fresh manifest.',
    contract.lane.requiresFreshIdempotencyKey ? null : 'Guarded live lane does not require a fresh idempotency key.',
    contract.lane.refusesDuplicateIdempotencyKey ? null : 'Guarded live lane does not refuse duplicate idempotency keys.',
    contract.lane.requiresExplicitApprovalForProductionSend ? null : 'Guarded live lane does not require explicit production approval.',
    contract.authority.postsDiscordNow === false ? null : 'Guarded live-lane contract posts Discord now.',
    contract.authority.webhookCallRows === 0 ? null : 'Guarded live-lane contract has webhook-call rows.',
    contract.authority.writesSupabase === false ? null : 'Guarded live-lane contract writes Supabase.',
    contract.authority.readsLiveSupabase === false ? null : 'Guarded live-lane contract reads live Supabase.',
    contract.authority.readsLiveBridge === false ? null : 'Guarded live-lane contract reads live bridge.',
    contract.authority.changesTradingLogic === false ? null : 'Guarded live-lane contract changes trading logic.',
    contract.authority.changesCanExecute === false ? null : 'Guarded live-lane contract changes canExecute.',
    contract.authority.automatedOrders === false ? null : 'Guarded live-lane contract allows automated orders.',
    contract.summary.blockedRows === 0 ? null : 'Guarded live-lane contract has blocked rows.',
    ...contract.blockers,
  ].filter((item): item is string => Boolean(item));
}

function validateReadiness(readinessReport: UnifiedDeskOutputVisibilityReadinessReport | null): string[] {
  if (!readinessReport) return ['Missing Unified Desk Output live-gate readiness audit.'];
  return [
    readinessReport.reportType === 'unified_desk_output_live_gate_readiness_audit'
      ? null
      : 'Source report is not the live-gate readiness audit.',
    readinessReport.status === 'pass' ? null : `Live-gate readiness audit status is ${readinessReport.status}.`,
    readinessReport.summary.discordPostNowRows === 0 ? null : 'Live-gate readiness audit has Discord post rows.',
    readinessReport.summary.supabaseWriteNowRows === 0 ? null : 'Live-gate readiness audit has Supabase write rows.',
    readinessReport.summary.liveBridgeReadNowRows === 0 ? null : 'Live-gate readiness audit has live bridge read rows.',
    readinessReport.summary.canExecuteTrueRows === 0 ? null : 'Live-gate readiness audit has canExecute=true rows.',
    readinessReport.summary.canExecuteChangedRows === 0 ? null : 'Live-gate readiness audit has canExecute changed rows.',
    readinessReport.summary.tradingLogicChangedRows === 0 ? null : 'Live-gate readiness audit has trading-logic changed rows.',
    readinessReport.summary.blockedRows === 0 ? null : 'Live-gate readiness audit has blocked rows.',
    ...readinessReport.blockers,
  ].filter((item): item is string => Boolean(item));
}

export function buildUnifiedDeskOutputGuardedScannerLanePreview(args: {
  guardedLaneContract: UnifiedDeskOutputGuardedLaneContractInput | null;
  readinessReport: UnifiedDeskOutputVisibilityReadinessReport | null;
  selectionPolicyOrder?: UnifiedDeskOutputSelectionPolicyOrder;
}): UnifiedDeskOutputGuardedScannerLanePreview {
  const contractBlockers = validateContract(args.guardedLaneContract);
  const readinessBlockers = validateReadiness(args.readinessReport);
  const sessions = args.guardedLaneContract?.lane.sessions || ['morning', 'lunch'];
  const selectionPolicyOrder = args.selectionPolicyOrder || 'latest_completed_5m_proof_per_session';
  const eligible = (args.readinessReport?.candidates || [])
    .filter((candidate) => candidate.state === 'APPROVED_DESK_PLAN' && sessions.includes(candidate.session));
  const selectedCandidates = contractBlockers.length || readinessBlockers.length
    ? []
    : selectOneApprovedPerSession({ candidates: eligible, sessions, order: selectionPolicyOrder });
  const selectionBlockers = [
    selectedCandidates.length > 0 ? null : 'No eligible APPROVED_DESK_PLAN candidates were selected.',
    ...sessions.map((session) => {
      const count = selectedCandidates.filter((candidate) => candidate.session === session).length;
      return count <= 1 ? null : `${session} selected more than one candidate.`;
    }),
  ].filter((item): item is string => Boolean(item));
  const visibilityModel = buildUnifiedDeskOutputScannerVisibilityModel({
    enabled: selectedCandidates.length > 0 && selectionBlockers.length === 0,
    readinessReport: args.readinessReport
      ? {
        ...args.readinessReport,
        candidates: selectedCandidates,
      }
      : null,
  });
  const surface = buildUnifiedDeskOutputScannerSurfaceModel(visibilityModel);
  const blockers = [
    ...contractBlockers,
    ...readinessBlockers,
    ...selectionBlockers,
    ...visibilityModel.blockers,
    ...surface.blockers,
  ];
  return {
    reportType: 'unified_desk_output_guarded_local_scanner_lane_preview',
    status: blockers.length ? 'blocked' : 'pass',
    authority: {
      localOnly: true,
      readsSavedGuardedLaneContractOnly: true,
      readsSavedReadinessAuditOnly: true,
      rendersScannerSurfaceOnly: true,
      postsDiscord: false,
      webhookCallRows: 0,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesScannerBehavior: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      automatedOrders: false,
    },
    selectionPolicy: {
      enabledByDefault: false,
      state: 'APPROVED_DESK_PLAN',
      sessions: [...sessions],
      maxRowsPerSession: 1,
      order: selectionPolicyOrder,
      proposedPriority: selectionPolicyOrder === 'proven_lane_priority_then_latest_proof'
        ? PROVEN_LANE_PRIORITY
        : null,
    },
    summary: {
      sourceCandidates: args.readinessReport?.candidates.length || 0,
      eligibleApprovedDeskPlanRows: eligible.length,
      selectedRows: selectedCandidates.length,
      morningRows: selectedCandidates.filter((candidate) => candidate.session === 'morning').length,
      lunchRows: selectedCandidates.filter((candidate) => candidate.session === 'lunch').length,
      suppressedRows: Math.max(eligible.length - selectedCandidates.length, 0),
      surfaceRows: surface.summary.rows,
      discordPostRows: surface.summary.discordPostRows,
      supabaseWriteRows: surface.summary.supabaseWriteRows,
      liveSupabaseReadRows: 0,
      liveBridgeReadRows: surface.summary.liveBridgeReadRows,
      canExecuteTrueRows: surface.summary.canExecuteTrueRows,
      canExecuteChangedRows: 0,
      tradingLogicChangedRows: 0,
      blockedRows: blockers.length,
      runtimeInstallAllowed: false,
      recommendation: blockers.length
        ? 'hold_for_guarded_scanner_lane_fix'
        : 'ready_for_disabled_local_scanner_lane_preview',
    },
    selectedCandidates,
    visibilityModel,
    surface,
    blockers,
  };
}
