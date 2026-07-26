import type { UnifiedDeskOutputScannerSurfaceRow } from './unifiedDeskOutputScannerSurface';

export type UnifiedDeskOutputSelectionPolicyOrder =
  | 'latest_completed_5m_proof_per_session'
  | 'proven_lane_priority_then_latest_proof';

export interface UnifiedDeskOutputGuardedLaneContractInput {
  reportType?: string;
  status?: string;
  lane?: {
    enabledByDefault?: boolean;
    scannerOwnedOnly?: boolean;
    allowedDeskStates?: string[];
    maxPostsPerSession?: number;
    sessions?: string[];
    requiresFreshManifest?: boolean;
    requiresFreshIdempotencyKey?: boolean;
    refusesDuplicateIdempotencyKey?: boolean;
    requiresExplicitApprovalForProductionSend?: boolean;
  };
  authority?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  blockers?: string[];
}

export interface UnifiedDeskOutputGuardedScannerLanePolicy {
  scannerVisible: boolean;
  selectedCandidates: UnifiedDeskOutputScannerSurfaceRow[];
  blockedCandidates: UnifiedDeskOutputScannerSurfaceRow[];
  blockers: string[];
}

export function selectUnifiedDeskOutputGuardedScannerLane(
  rows: UnifiedDeskOutputScannerSurfaceRow[] = []
): UnifiedDeskOutputGuardedScannerLanePolicy {
  return {
    scannerVisible: false,
    selectedCandidates: [],
    blockedCandidates: rows,
    blockers: rows.length
      ? ['Blank-slate mode blocks all Unified Desk Output scanner rows until new models are installed.']
      : [],
  };
}

export function buildUnifiedDeskOutputGuardedScannerLanePreview(args: {
  guardedLaneContract: UnifiedDeskOutputGuardedLaneContractInput;
  readinessReport: any;
  selectionPolicyOrder?: UnifiedDeskOutputSelectionPolicyOrder;
}) {
  const sourceCandidates = args.readinessReport.candidates || [];
  return {
    reportType: 'unified_desk_output_guarded_local_scanner_lane_preview',
    status: sourceCandidates.length ? 'blocked' : 'pass',
    selectionPolicy: {
      enabledByDefault: false,
      order: args.selectionPolicyOrder || 'latest_completed_5m_proof_per_session',
      proposedPriority: null,
    },
    authority: {
      postsDiscord: false,
      webhookCallRows: 0,
      writesSupabase: false,
      readsLiveBridge: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      automatedOrders: false,
    },
    summary: {
      sourceCandidates: sourceCandidates.length,
      eligibleApprovedDeskPlanRows: 0,
      selectedRows: 0,
      morningRows: 0,
      lunchRows: 0,
      suppressedRows: sourceCandidates.length,
      surfaceRows: 0,
      discordPostRows: 0,
      supabaseWriteRows: 0,
      liveSupabaseReadRows: 0,
      liveBridgeReadRows: 0,
      webhookCallRows: 0,
      canExecuteTrueRows: 0,
      canExecuteChangedRows: 0,
      tradingLogicChangedRows: 0,
      runtimeInstallAllowed: false,
      recommendation: sourceCandidates.length ? 'hold_for_guarded_scanner_lane_fix' : 'blank_slate_no_models_installed',
    },
    selectedCandidates: [],
    suppressedCandidates: sourceCandidates,
    surface: {
      summary: { rows: 0 },
      rows: [],
    },
    blockers: sourceCandidates.length
      ? ['Blank-slate mode blocks all guarded scanner lane candidates until new models are installed.']
      : [],
  };
}
