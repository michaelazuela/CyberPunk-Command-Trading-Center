export interface UnifiedDeskOutputLocalGoLiveRehearsalSummary {
  previewRows: number;
  approvedDeskPlanRows: number;
  formingDeskReadRows: number;
  discordPostRows: number;
  supabaseWriteRows: number;
  liveSupabaseReadRows: number;
  liveBridgeReadRows: number;
  canExecuteTrueRows: number;
  wordingViolationRows: number;
  blockedRows: number;
}

export interface UnifiedDeskOutputLocalGoLiveRehearsalGateReport {
  reportType: 'unified_desk_output_local_go_live_rehearsal';
  status: 'pass' | 'blocked';
  authority: {
    localOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    automatedOrders: false;
  };
  summary: UnifiedDeskOutputLocalGoLiveRehearsalSummary;
  blockers: string[];
}

export interface UnifiedDeskOutputRuntimeGateInput {
  explicitLocalFlag: boolean;
  localHost: boolean;
  rehearsal: UnifiedDeskOutputLocalGoLiveRehearsalGateReport | null;
}

export interface UnifiedDeskOutputRuntimeGateDecision {
  status: 'disabled' | 'local_preview_allowed' | 'blocked';
  localOnly: true;
  scannerPreviewAllowed: boolean;
  publishDiscord: false;
  writesSupabase: false;
  readsLiveSupabase: false;
  readsLiveBridge: false;
  canExecute: false;
  changesTradingLogic: false;
  changesCanExecute: false;
  automatedOrders: false;
  blockers: string[];
}

function disabled(blockers: string[]): UnifiedDeskOutputRuntimeGateDecision {
  return {
    status: 'disabled',
    localOnly: true,
    scannerPreviewAllowed: false,
    publishDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    canExecute: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    automatedOrders: false,
    blockers,
  };
}

export function evaluateUnifiedDeskOutputRuntimeGate(
  input: UnifiedDeskOutputRuntimeGateInput
): UnifiedDeskOutputRuntimeGateDecision {
  if (!input.explicitLocalFlag) {
    return disabled(['Unified Desk Output runtime gate requires an explicit local preview flag.']);
  }
  if (!input.localHost) {
    return {
      ...disabled(['Unified Desk Output runtime gate is allowed only on a local host.']),
      status: 'blocked',
    };
  }
  if (!input.rehearsal) {
    return {
      ...disabled(['Missing Unified Desk Output local go-live rehearsal report.']),
      status: 'blocked',
    };
  }

  const { rehearsal } = input;
  const blockers = [
    rehearsal.reportType === 'unified_desk_output_local_go_live_rehearsal' ? null : 'Invalid rehearsal report type.',
    rehearsal.status === 'pass' ? null : `Local rehearsal status is ${rehearsal.status}.`,
    rehearsal.authority.localOnly ? null : 'Local rehearsal is not local-only.',
    rehearsal.authority.postsDiscord === false ? null : 'Local rehearsal posts Discord.',
    rehearsal.authority.writesSupabase === false ? null : 'Local rehearsal writes Supabase.',
    rehearsal.authority.readsLiveSupabase === false ? null : 'Local rehearsal reads live Supabase.',
    rehearsal.authority.readsLiveBridge === false ? null : 'Local rehearsal reads live bridge.',
    rehearsal.authority.changesTradingLogic === false ? null : 'Local rehearsal changes trading logic.',
    rehearsal.authority.changesCanExecute === false ? null : 'Local rehearsal changes canExecute.',
    rehearsal.authority.automatedOrders === false ? null : 'Local rehearsal allows automated orders.',
    rehearsal.summary.previewRows > 0 ? null : 'Local rehearsal has no preview rows.',
    rehearsal.summary.approvedDeskPlanRows + rehearsal.summary.formingDeskReadRows === rehearsal.summary.previewRows
      ? null
      : 'Local rehearsal contains rows outside Approved Desk Plan/Forming Desk Read.',
    rehearsal.summary.discordPostRows === 0 ? null : 'Local rehearsal has Discord post rows.',
    rehearsal.summary.supabaseWriteRows === 0 ? null : 'Local rehearsal has Supabase write rows.',
    rehearsal.summary.liveSupabaseReadRows === 0 ? null : 'Local rehearsal has live Supabase read rows.',
    rehearsal.summary.liveBridgeReadRows === 0 ? null : 'Local rehearsal has live bridge read rows.',
    rehearsal.summary.canExecuteTrueRows === 0 ? null : 'Local rehearsal has canExecute=true rows.',
    rehearsal.summary.wordingViolationRows === 0 ? null : 'Local rehearsal has wording violations.',
    rehearsal.summary.blockedRows === 0 ? null : 'Local rehearsal has blocked rows.',
    ...rehearsal.blockers,
  ].filter((item): item is string => Boolean(item));

  return {
    status: blockers.length ? 'blocked' : 'local_preview_allowed',
    localOnly: true,
    scannerPreviewAllowed: blockers.length === 0,
    publishDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    canExecute: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    automatedOrders: false,
    blockers,
  };
}
