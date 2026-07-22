export interface UnifiedDeskOutputDiscordPostReceiptAuditSummary {
  receiptAccepted: boolean;
  webhookCallRows: number;
  publishDiscordRows: number;
  realPostAllowedRows: number;
  supabaseWriteRows: number;
  liveSupabaseReadRows: number;
  liveBridgeReadRows: number;
  canExecuteTrueRows: number;
  payloadPreviewCompared: boolean;
}

export interface UnifiedDeskOutputDiscordPostReceiptAuditInput {
  reportType: 'unified_desk_output_discord_post_receipt_audit' | string;
  status: 'pass' | 'blocked' | string;
  summary: UnifiedDeskOutputDiscordPostReceiptAuditSummary;
  blockers: string[];
}

export interface UnifiedDeskOutputDiscordGuardedLiveLaneContract {
  reportType: 'unified_desk_output_discord_guarded_live_lane_contract';
  status: 'pass' | 'blocked';
  lane: {
    enabledByDefault: false;
    scannerOwnedOnly: true;
    allowedDeskStates: ['APPROVED_DESK_PLAN'];
    maxPostsPerSession: 1;
    sessions: ['morning', 'lunch'];
    requiresFreshManifest: true;
    requiresFreshIdempotencyKey: true;
    refusesDuplicateIdempotencyKey: true;
    requiresExplicitApprovalForProductionSend: true;
    suppressesSupportingModelDuplicateTickets: true;
  };
  authority: {
    localOnly: true;
    postsDiscordNow: false;
    webhookCallRows: 0;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    automatedOrders: false;
  };
  summary: {
    postReceiptAuditAccepted: boolean;
    laneEnabledByDefault: false;
    approvedDeskPlanOnly: true;
    maxPostsPerSession: 1;
    webhookCallRows: 0;
    supabaseWriteRows: 0;
    liveSupabaseReadRows: 0;
    liveBridgeReadRows: 0;
    canExecuteTrueRows: 0;
    blockedRows: number;
    recommendation: 'ready_for_disabled_guarded_live_lane_wiring' | 'hold_for_guarded_live_lane_contract_fix';
  };
  blockers: string[];
}

export function buildUnifiedDeskOutputDiscordGuardedLiveLaneContract(
  audit: UnifiedDeskOutputDiscordPostReceiptAuditInput | null,
): UnifiedDeskOutputDiscordGuardedLiveLaneContract {
  const blockers = [
    audit ? null : 'Missing Unified Desk Output Discord post-receipt audit.',
    audit?.reportType === 'unified_desk_output_discord_post_receipt_audit'
      ? null
      : 'Source report is not a Unified Desk Output Discord post-receipt audit.',
    audit?.status === 'pass' ? null : `Post-receipt audit status is ${audit?.status || '<missing>'}.`,
    audit?.summary.receiptAccepted ? null : 'Post-receipt audit did not accept the one-row rehearsal receipt.',
    audit?.summary.webhookCallRows === 1 ? null : 'Post-receipt audit did not prove exactly one prior webhook call.',
    audit?.summary.publishDiscordRows === 1 ? null : 'Post-receipt audit did not prove exactly one prior publishDiscord row.',
    audit?.summary.realPostAllowedRows === 1 ? null : 'Post-receipt audit did not prove exactly one prior real-post-allowed row.',
    audit?.summary.supabaseWriteRows === 0 ? null : 'Post-receipt audit recorded Supabase writes.',
    audit?.summary.liveSupabaseReadRows === 0 ? null : 'Post-receipt audit recorded live Supabase reads.',
    audit?.summary.liveBridgeReadRows === 0 ? null : 'Post-receipt audit recorded live bridge reads.',
    audit?.summary.canExecuteTrueRows === 0 ? null : 'Post-receipt audit recorded canExecute=true rows.',
    audit?.summary.payloadPreviewCompared ? null : 'Post-receipt audit did not compare the payload preview.',
    ...(audit?.blockers || []),
  ].filter((item): item is string => Boolean(item));

  return {
    reportType: 'unified_desk_output_discord_guarded_live_lane_contract',
    status: blockers.length ? 'blocked' : 'pass',
    lane: {
      enabledByDefault: false,
      scannerOwnedOnly: true,
      allowedDeskStates: ['APPROVED_DESK_PLAN'],
      maxPostsPerSession: 1,
      sessions: ['morning', 'lunch'],
      requiresFreshManifest: true,
      requiresFreshIdempotencyKey: true,
      refusesDuplicateIdempotencyKey: true,
      requiresExplicitApprovalForProductionSend: true,
      suppressesSupportingModelDuplicateTickets: true,
    },
    authority: {
      localOnly: true,
      postsDiscordNow: false,
      webhookCallRows: 0,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      automatedOrders: false,
    },
    summary: {
      postReceiptAuditAccepted: blockers.length === 0,
      laneEnabledByDefault: false,
      approvedDeskPlanOnly: true,
      maxPostsPerSession: 1,
      webhookCallRows: 0,
      supabaseWriteRows: 0,
      liveSupabaseReadRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: 0,
      blockedRows: blockers.length,
      recommendation: blockers.length
        ? 'hold_for_guarded_live_lane_contract_fix'
        : 'ready_for_disabled_guarded_live_lane_wiring',
    },
    blockers,
  };
}
