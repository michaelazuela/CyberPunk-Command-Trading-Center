import type { UnifiedDeskOutputScannerSurfaceRow } from './unifiedDeskOutputScannerSurface';

type SessionName = 'morning' | 'lunch' | 'evening';
type Direction = 'LONG' | 'SHORT';
type DeskState = 'APPROVED_DESK_PLAN' | 'FORMING_DESK_READ';

export const UNIFIED_DESK_OUTPUT_APPROVED_PRODUCTION_MODELS = [] as const;

export type UnifiedDeskOutputApprovedProductionModel = typeof UNIFIED_DESK_OUTPUT_APPROVED_PRODUCTION_MODELS[number];

export interface UnifiedDeskOutputFinalReadinessCandidate {
  cardId?: string;
  date: string;
  session: SessionName;
  state: DeskState;
  model: string;
  direction: Direction;
  proofTime: string;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  riskPoints: number;
}

export interface UnifiedDeskOutputFinalProductionReadinessChecklistInput {
  reportType: 'unified_desk_output_final_production_readiness_checklist';
  status: 'pass' | 'blocked';
  summary: {
    selectedRows: number;
    morningRows: number;
    lunchRows: number;
    eveningRows?: number;
    approvedDeskPlanRows: number;
    browserRenderedRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    canExecuteChangedRows: number;
    tradingLogicChangedRows: number;
    automatedOrderRows: number;
    runtimeGateEnabled: boolean;
    productionGoLiveApproved: false;
    blockedRows: number;
    recommendation: 'ready_for_explicit_production_go_live_approval' | 'hold_for_final_readiness_fix';
  };
  selectedCandidates: UnifiedDeskOutputFinalReadinessCandidate[];
  blockers: string[];
}

export interface UnifiedDeskOutputProductionScannerSurfaceActivation {
  reportType: 'unified_desk_output_production_scanner_surface_activation';
  generatedAt: string;
  status: 'active' | 'blocked';
  approval: {
    explicitProductionApproval: true;
    approvalScope: 'scanner_visibility_one_morning_one_lunch_optional_one_evening_approved_desk_plan_only';
    discordPostingRemainsGuarded: true;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    automatedOrders: false;
  };
  authority: {
    scannerVisibleNow: boolean;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    canExecute: false;
    automatedOrders: false;
  };
  source: {
    finalReadinessChecklistPath: string;
  };
  summary: {
    selectedRows: number;
    morningRows: number;
    lunchRows: number;
    eveningRows: number;
    approvedDeskPlanRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    canExecuteChangedRows: number;
    tradingLogicChangedRows: number;
    automatedOrderRows: number;
    blockedRows: number;
  };
  rows: UnifiedDeskOutputScannerSurfaceRow[];
  blockers: string[];
}

function isFinitePrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isUnifiedDeskOutputApprovedProductionModel(model: string): model is UnifiedDeskOutputApprovedProductionModel {
  return UNIFIED_DESK_OUTPUT_APPROVED_PRODUCTION_MODELS.includes(model as UnifiedDeskOutputApprovedProductionModel);
}

function candidateBlockers(candidate: UnifiedDeskOutputFinalReadinessCandidate): string[] {
  return [
    candidate.date ? null : 'Candidate missing date.',
    candidate.session === 'morning' || candidate.session === 'lunch' || candidate.session === 'evening' ? null : `${candidate.cardId || '<candidate>'} has unsupported session.`,
    candidate.state === 'APPROVED_DESK_PLAN' || candidate.state === 'FORMING_DESK_READ' ? null : `${candidate.cardId || '<candidate>'} has unsupported desk state.`,
    candidate.model ? null : `${candidate.cardId || '<candidate>'} missing model.`,
    candidate.model && !isUnifiedDeskOutputApprovedProductionModel(candidate.model)
      ? `${candidate.cardId || '<candidate>'} model ${candidate.model} is not approved because the desk is in blank-slate mode.`
      : null,
    candidate.direction === 'LONG' || candidate.direction === 'SHORT' ? null : `${candidate.cardId || '<candidate>'} missing direction.`,
    candidate.proofTime ? null : `${candidate.cardId || '<candidate>'} missing completed 5M proof time.`,
    isFinitePrice(candidate.entry) ? null : `${candidate.cardId || '<candidate>'} missing entry.`,
    isFinitePrice(candidate.stop) ? null : `${candidate.cardId || '<candidate>'} missing stop.`,
    isFinitePrice(candidate.target1) ? null : `${candidate.cardId || '<candidate>'} missing T1.`,
    isFinitePrice(candidate.target2) ? null : `${candidate.cardId || '<candidate>'} missing T2.`,
    isFinitePrice(candidate.riskPoints) ? null : `${candidate.cardId || '<candidate>'} missing risk.`,
  ].filter((item): item is string => Boolean(item));
}

function stateLabel(state: DeskState): UnifiedDeskOutputScannerSurfaceRow['stateLabel'] {
  return state === 'APPROVED_DESK_PLAN' ? 'Approved Desk Plan' : 'Forming Desk Read';
}

function surfaceRow(candidate: UnifiedDeskOutputFinalReadinessCandidate): UnifiedDeskOutputScannerSurfaceRow {
  const label = stateLabel(candidate.state);
  const proofEt = candidate.proofTime.includes('T') ? candidate.proofTime.slice(11, 16) : candidate.proofTime.slice(0, 5);
  return {
    cardId: candidate.cardId || `${candidate.date}-${candidate.session}-${candidate.model}-${candidate.proofTime}`,
    date: candidate.date,
    session: candidate.session,
    state: candidate.state,
    stateLabel: label,
    model: candidate.model,
    direction: candidate.direction,
    headline: `${label} | ${candidate.session.toUpperCase()} | ${candidate.direction} | ${candidate.model}`,
    bodyLines: [
      `${candidate.session} ${candidate.direction.toLowerCase()} desk plan is blocked because no trade models are installed.`,
      'Blank-slate mode has no scanner-owned lane for this window.',
    ],
    levelLine: `Entry ${candidate.entry} | Stop ${candidate.stop} | T1 ${candidate.target1} | T2 ${candidate.target2}`,
    riskLine: `Risk ${candidate.riskPoints} points from scanner-owned entry/stop.`,
    proofLine: `Completed 5M proof: ${proofEt} ET.`,
    invalidationLine: `Invalid if price violates the protected 5M stop line at ${candidate.stop}.`,
    authorityLine: 'Decision support only. Discord posting remains separately guarded; canExecute is audit-only for this surface; Supabase, bridge, and automated orders remain off.',
    scannerVisibleNow: true,
    publishDiscord: false,
    writesSupabase: false,
    readsLiveBridge: false,
    canExecute: false,
  };
}

export function buildUnifiedDeskOutputProductionScannerSurfaceActivation(args: {
  finalReadinessChecklistPath: string;
  finalReadinessChecklist: UnifiedDeskOutputFinalProductionReadinessChecklistInput;
}, generatedAt = new Date().toISOString()): UnifiedDeskOutputProductionScannerSurfaceActivation {
  const checklist = args.finalReadinessChecklist;
  const expectedRows = 0;
  const expectedApprovedRows = 0;
  const expectedRenderedRows = 0;
  const sourceBlockers = [
    checklist.reportType === 'unified_desk_output_final_production_readiness_checklist' ? null : 'Source report is not the final production readiness checklist.',
    checklist.status === 'pass' ? null : `Final readiness checklist status is ${checklist.status}.`,
    checklist.summary.recommendation === 'ready_for_explicit_production_go_live_approval' ? null : `Final readiness recommendation is ${checklist.summary.recommendation}.`,
    checklist.summary.selectedRows === expectedRows ? null : 'Final readiness selected rows while the desk is in blank-slate mode.',
    checklist.summary.morningRows === 0 ? null : 'Final readiness selected a morning row while the desk is in blank-slate mode.',
    checklist.summary.lunchRows === 0 ? null : 'Final readiness selected a lunch row while the desk is in blank-slate mode.',
    (checklist.summary.eveningRows || 0) === 0 ? null : 'Final readiness selected an evening row while the desk is in blank-slate mode.',
    checklist.summary.approvedDeskPlanRows === expectedApprovedRows ? null : `Final readiness did not prove ${expectedApprovedRows} Approved Desk Plan rows.`,
    checklist.summary.browserRenderedRows === expectedRenderedRows ? null : `Final readiness did not prove ${expectedRenderedRows} browser-rendered rows.`,
    checklist.summary.discordPostRows === 0 ? null : 'Final readiness has Discord post rows.',
    checklist.summary.supabaseWriteRows === 0 ? null : 'Final readiness has Supabase write rows.',
    checklist.summary.liveSupabaseReadRows === 0 ? null : 'Final readiness has live Supabase read rows.',
    checklist.summary.liveBridgeReadRows === 0 ? null : 'Final readiness has live bridge read rows.',
    checklist.summary.canExecuteChangedRows === 0 ? null : 'Final readiness changed canExecute.',
    checklist.summary.tradingLogicChangedRows === 0 ? null : 'Final readiness changed trading logic.',
    checklist.summary.automatedOrderRows === 0 ? null : 'Final readiness has automated order rows.',
    checklist.summary.runtimeGateEnabled === false ? null : 'Final readiness already has runtime gate enabled.',
    checklist.summary.productionGoLiveApproved === false ? null : 'Final readiness should not pre-claim go-live approval.',
    checklist.summary.blockedRows === 0 ? null : 'Final readiness has blocked rows.',
    ...(checklist.blockers || []),
  ].filter((item): item is string => Boolean(item));
  const candidateBlockerList = checklist.selectedCandidates.flatMap(candidateBlockers);
  const sessionOrder: Record<SessionName, number> = { morning: 0, lunch: 1, evening: 2 };
  const rows = [...checklist.selectedCandidates]
    .sort((left, right) => sessionOrder[left.session] - sessionOrder[right.session])
    .map(surfaceRow);
  const rowBlockers = [
    rows.length === expectedRows ? null : `Production surface did not build exactly ${expectedRows} rows.`,
    rows.filter((row) => row.session === 'morning').length === 0 ? null : 'Production surface has a morning row while blank-slate mode is active.',
    rows.filter((row) => row.session === 'lunch').length === 0 ? null : 'Production surface has a lunch row while blank-slate mode is active.',
    rows.filter((row) => row.session === 'evening').length === 0 ? null : 'Production surface has an evening row while blank-slate mode is active.',
    rows.every((row) => row.state === 'APPROVED_DESK_PLAN') ? null : 'Production surface contains non-Approved Desk Plan rows.',
    rows.length === 0 ? null : 'Production surface contains a model while blank-slate mode is active.',
    rows.every((row) => !row.publishDiscord) ? null : 'Production surface would publish Discord.',
    rows.every((row) => !row.writesSupabase) ? null : 'Production surface would write Supabase.',
    rows.every((row) => !row.readsLiveBridge) ? null : 'Production surface would read live bridge.',
    rows.every((row) => !row.canExecute) ? null : 'Production surface has canExecute=true.',
  ].filter((item): item is string => Boolean(item));
  const blockers = [...sourceBlockers, ...candidateBlockerList, ...rowBlockers];
  const active = blockers.length === 0;

  return {
    reportType: 'unified_desk_output_production_scanner_surface_activation',
    generatedAt,
    status: active ? 'active' : 'blocked',
    approval: {
      explicitProductionApproval: true,
      approvalScope: 'scanner_visibility_one_morning_one_lunch_optional_one_evening_approved_desk_plan_only',
      discordPostingRemainsGuarded: true,
      changesTradingLogic: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      automatedOrders: false,
    },
    authority: {
      scannerVisibleNow: active,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      canExecute: false,
      automatedOrders: false,
    },
    source: {
      finalReadinessChecklistPath: args.finalReadinessChecklistPath,
    },
    summary: {
      selectedRows: active ? rows.length : 0,
      morningRows: active ? rows.filter((row) => row.session === 'morning').length : 0,
      lunchRows: active ? rows.filter((row) => row.session === 'lunch').length : 0,
      eveningRows: active ? rows.filter((row) => row.session === 'evening').length : 0,
      approvedDeskPlanRows: active ? rows.filter((row) => row.state === 'APPROVED_DESK_PLAN').length : 0,
      discordPostRows: 0,
      supabaseWriteRows: 0,
      liveSupabaseReadRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: active ? checklist.summary.canExecuteTrueRows : 0,
      canExecuteChangedRows: 0,
      tradingLogicChangedRows: 0,
      automatedOrderRows: 0,
      blockedRows: blockers.length,
    },
    rows: active ? rows : [],
    blockers,
  };
}
