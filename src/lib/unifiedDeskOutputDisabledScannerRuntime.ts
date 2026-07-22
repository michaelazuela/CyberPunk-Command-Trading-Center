import type { UnifiedDeskOutputScannerSurfaceRow } from './unifiedDeskOutputScannerSurface';

type SessionName = 'morning' | 'lunch';
type Direction = 'LONG' | 'SHORT';
type DeskState = 'APPROVED_DESK_PLAN' | 'FORMING_DESK_READ';

export interface UnifiedDeskOutputDisabledE2ERuntimeCandidate {
  cardId: string;
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
  scannerVisibleIfExplicitGateApproved: true;
  discordEligibleIfSeparatelyApproved: true;
  supabaseEligibleIfSeparatelyApproved: true;
  canExecuteRemainsExternalGate: true;
}

export interface UnifiedDeskOutputDisabledE2ERuntimeValidationReport {
  reportType: 'unified_desk_output_disabled_e2e_runtime_validation';
  status: 'pass' | 'blocked';
  authority: {
    localOnly: true;
    readsSavedScannerArtifactsOnly: true;
    writesDiagnosticArtifactsOnly: true;
    runtimeGateEnabled: false;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    automatedOrders: false;
  };
  summary: {
    manifestSelectedRows: number;
    runtimeReceiptSelectedRows: number;
    morningRows: number;
    lunchRows: number;
    runtimeGateEnabled: false;
    scannerRuntimeChangedRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    canExecuteChangedRows: number;
    tradingLogicChangedRows: number;
    automatedOrderRows: number;
    blockedRows: number;
    recommendation: 'ready_for_disabled_scanner_runtime_wiring' | 'hold_for_disabled_e2e_runtime_validation_fix';
  };
  selectedCandidates: UnifiedDeskOutputDisabledE2ERuntimeCandidate[];
  blockers: string[];
}

export interface UnifiedDeskOutputDisabledScannerRuntimePreview {
  reportType: 'unified_desk_output_disabled_scanner_runtime_preview';
  status: 'disabled' | 'ready' | 'blocked';
  sourceOfTruth: 'disabled_e2e_runtime_validation';
  authority: {
    localOnly: true;
    scannerPreviewOnly: true;
    defaultDisabled: true;
    runtimeGateEnabled: false;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    canExecute: false;
    automatedOrders: false;
  };
  request: {
    explicitLocalPreviewFlag: boolean;
    localHost: boolean;
  };
  summary: {
    scannerPreviewAllowed: boolean;
    scannerPreviewRows: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    morningRows: number;
    lunchRows: number;
    runtimeGateEnabled: false;
    scannerRuntimeChangedRows: number;
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

function candidateBlockers(candidate: UnifiedDeskOutputDisabledE2ERuntimeCandidate): string[] {
  return [
    candidate.scannerVisibleIfExplicitGateApproved ? null : `${candidate.cardId} is missing scanner visibility approval marker.`,
    candidate.discordEligibleIfSeparatelyApproved ? null : `${candidate.cardId} is missing separate Discord eligibility marker.`,
    candidate.supabaseEligibleIfSeparatelyApproved ? null : `${candidate.cardId} is missing separate Supabase eligibility marker.`,
    candidate.canExecuteRemainsExternalGate ? null : `${candidate.cardId} does not preserve canExecute as an external gate.`,
    candidate.state === 'APPROVED_DESK_PLAN' || candidate.state === 'FORMING_DESK_READ' ? null : `${candidate.cardId} has unsupported desk state.`,
    candidate.session === 'morning' || candidate.session === 'lunch' ? null : `${candidate.cardId} has unsupported session.`,
    candidate.direction === 'LONG' || candidate.direction === 'SHORT' ? null : `${candidate.cardId} has unsupported direction.`,
    candidate.model ? null : `${candidate.cardId} is missing model.`,
    candidate.proofTime ? null : `${candidate.cardId} is missing completed 5M proof time.`,
    isFinitePrice(candidate.entry) ? null : `${candidate.cardId} is missing entry.`,
    isFinitePrice(candidate.stop) ? null : `${candidate.cardId} is missing stop.`,
    isFinitePrice(candidate.target1) ? null : `${candidate.cardId} is missing T1.`,
    isFinitePrice(candidate.target2) ? null : `${candidate.cardId} is missing T2.`,
    isFinitePrice(candidate.riskPoints) ? null : `${candidate.cardId} is missing risk.`,
  ].filter((item): item is string => Boolean(item));
}

function validationBlockers(report: UnifiedDeskOutputDisabledE2ERuntimeValidationReport | null): string[] {
  if (!report) return ['Missing disabled E2E runtime validation report.'];
  return [
    report.reportType === 'unified_desk_output_disabled_e2e_runtime_validation' ? null : 'Invalid disabled E2E runtime validation report type.',
    report.status === 'pass' ? null : `Disabled E2E runtime validation status is ${report.status}.`,
    report.authority.localOnly ? null : 'Disabled E2E report is not local-only.',
    report.authority.readsSavedScannerArtifactsOnly ? null : 'Disabled E2E report does not read saved scanner artifacts only.',
    report.authority.writesDiagnosticArtifactsOnly ? null : 'Disabled E2E report does not restrict writes to diagnostics.',
    report.authority.runtimeGateEnabled === false ? null : 'Disabled E2E report has runtime gate enabled.',
    report.authority.postsDiscord === false ? null : 'Disabled E2E report posts Discord.',
    report.authority.writesSupabase === false ? null : 'Disabled E2E report writes Supabase.',
    report.authority.readsLiveSupabase === false ? null : 'Disabled E2E report reads live Supabase.',
    report.authority.readsLiveBridge === false ? null : 'Disabled E2E report reads live bridge.',
    report.authority.changesScannerBehavior === false ? null : 'Disabled E2E report changes scanner behavior.',
    report.authority.changesTradingLogic === false ? null : 'Disabled E2E report changes trading logic.',
    report.authority.changesCanExecute === false ? null : 'Disabled E2E report changes canExecute.',
    report.authority.automatedOrders === false ? null : 'Disabled E2E report allows automated orders.',
    report.summary.recommendation === 'ready_for_disabled_scanner_runtime_wiring' ? null : `Disabled E2E recommendation is ${report.summary.recommendation}.`,
    report.summary.manifestSelectedRows === 2 ? null : 'Disabled E2E manifest did not select exactly two rows.',
    report.summary.runtimeReceiptSelectedRows === 2 ? null : 'Disabled E2E receipt did not select exactly two rows.',
    report.summary.morningRows === 1 ? null : 'Disabled E2E report did not select exactly one morning row.',
    report.summary.lunchRows === 1 ? null : 'Disabled E2E report did not select exactly one lunch row.',
    report.summary.runtimeGateEnabled === false ? null : 'Disabled E2E summary has runtime gate enabled.',
    report.summary.scannerRuntimeChangedRows === 0 ? null : 'Disabled E2E report changed scanner runtime.',
    report.summary.discordPostRows === 0 ? null : 'Disabled E2E report has Discord post rows.',
    report.summary.supabaseWriteRows === 0 ? null : 'Disabled E2E report has Supabase write rows.',
    report.summary.liveSupabaseReadRows === 0 ? null : 'Disabled E2E report has live Supabase read rows.',
    report.summary.liveBridgeReadRows === 0 ? null : 'Disabled E2E report has live bridge read rows.',
    report.summary.canExecuteTrueRows === 0 ? null : 'Disabled E2E report has canExecute=true rows.',
    report.summary.canExecuteChangedRows === 0 ? null : 'Disabled E2E report changed canExecute.',
    report.summary.tradingLogicChangedRows === 0 ? null : 'Disabled E2E report changed trading logic.',
    report.summary.automatedOrderRows === 0 ? null : 'Disabled E2E report has automated order rows.',
    report.summary.blockedRows === 0 ? null : 'Disabled E2E report has blocked rows.',
    report.selectedCandidates.length === 2 ? null : 'Disabled E2E report does not expose exactly two selected candidates.',
    ...report.selectedCandidates.flatMap(candidateBlockers),
    ...report.blockers,
  ].filter((item): item is string => Boolean(item));
}

function labelFor(state: DeskState): UnifiedDeskOutputScannerSurfaceRow['stateLabel'] {
  return state === 'APPROVED_DESK_PLAN' ? 'Approved Desk Plan' : 'Forming Desk Read';
}

function rowFromCandidate(candidate: UnifiedDeskOutputDisabledE2ERuntimeCandidate): UnifiedDeskOutputScannerSurfaceRow {
  const stateLabel = labelFor(candidate.state);
  return {
    cardId: candidate.cardId,
    date: candidate.date,
    session: candidate.session,
    state: candidate.state,
    stateLabel,
    model: candidate.model,
    direction: candidate.direction,
    headline: `${stateLabel} | ${candidate.session.toUpperCase()} | ${candidate.direction} | ${candidate.model}`,
    bodyLines: [
      `${candidate.session} ${candidate.direction.toLowerCase()} desk plan from the validated disabled runtime gate.`,
      `${candidate.model} is the selected scanner-owned lane for this window.`,
    ],
    levelLine: `Entry ${candidate.entry} | Stop ${candidate.stop} | T1 ${candidate.target1} | T2 ${candidate.target2}`,
    riskLine: `Risk ${candidate.riskPoints} points from scanner-owned entry/stop.`,
    proofLine: `Completed 5M proof: ${candidate.proofTime.slice(11, 16)} ET.`,
    invalidationLine: `Invalid if price violates the protected 5M stop line at ${candidate.stop}.`,
    authorityLine: 'Decision support only. Disabled scanner-runtime preview; Discord/Supabase/bridge/canExecute remain off.',
    scannerVisibleNow: true,
    publishDiscord: false,
    writesSupabase: false,
    readsLiveBridge: false,
    canExecute: false,
  };
}

export function buildUnifiedDeskOutputDisabledScannerRuntimePreview(args: {
  explicitLocalPreviewFlag: boolean;
  localHost: boolean;
  report: UnifiedDeskOutputDisabledE2ERuntimeValidationReport | null;
}): UnifiedDeskOutputDisabledScannerRuntimePreview {
  const baseAuthority = {
    localOnly: true as const,
    scannerPreviewOnly: true as const,
    defaultDisabled: true as const,
    runtimeGateEnabled: false as const,
    postsDiscord: false as const,
    writesSupabase: false as const,
    readsLiveSupabase: false as const,
    readsLiveBridge: false as const,
    changesScannerBehavior: false as const,
    changesTradingLogic: false as const,
    changesCanExecute: false as const,
    canExecute: false as const,
    automatedOrders: false as const,
  };
  const disabledBlockers = args.explicitLocalPreviewFlag ? [] : ['Disabled scanner runtime preview requires an explicit local preview flag.'];
  const hostBlockers = args.localHost ? [] : ['Disabled scanner runtime preview is allowed only on localhost.'];
  const reportBlockers = args.explicitLocalPreviewFlag && args.localHost ? validationBlockers(args.report) : [];
  const blockers = [...disabledBlockers, ...hostBlockers, ...reportBlockers];
  const rows = blockers.length || !args.report ? [] : args.report.selectedCandidates.map(rowFromCandidate);
  const status = !args.explicitLocalPreviewFlag ? 'disabled' : blockers.length ? 'blocked' : 'ready';

  return {
    reportType: 'unified_desk_output_disabled_scanner_runtime_preview',
    status,
    sourceOfTruth: 'disabled_e2e_runtime_validation',
    authority: baseAuthority,
    request: {
      explicitLocalPreviewFlag: args.explicitLocalPreviewFlag,
      localHost: args.localHost,
    },
    summary: {
      scannerPreviewAllowed: status === 'ready',
      scannerPreviewRows: rows.length,
      approvedDeskPlanRows: rows.filter((row) => row.state === 'APPROVED_DESK_PLAN').length,
      formingDeskReadRows: rows.filter((row) => row.state === 'FORMING_DESK_READ').length,
      morningRows: rows.filter((row) => row.session === 'morning').length,
      lunchRows: rows.filter((row) => row.session === 'lunch').length,
      runtimeGateEnabled: false,
      scannerRuntimeChangedRows: 0,
      discordPostRows: 0,
      supabaseWriteRows: 0,
      liveSupabaseReadRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: 0,
      canExecuteChangedRows: 0,
      tradingLogicChangedRows: 0,
      automatedOrderRows: 0,
      blockedRows: blockers.length,
    },
    rows,
    blockers,
  };
}
