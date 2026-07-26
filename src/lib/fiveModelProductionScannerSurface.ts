import type {
  UnifiedDeskOutputScannerSurfaceModel,
  UnifiedDeskOutputScannerSurfaceRow,
} from './unifiedDeskOutputScannerSurface';

export interface FiveModelScannerSurfaceSmokeInput {
  reportType: 'five_model_scanner_surface_smoke';
  status: 'pass' | 'blocked';
  authority: {
    localOnly: true;
    readsSavedAdapterProofOnly: true;
    readsSavedVisibilityContractOnly: true;
    writesDiagnosticArtifactsOnly: true;
    rendersScannerSurfaceOnly: true;
    installsRuntimeAdapter: false;
    scannerRuntimeWired: false;
    productionScannerVisibleNow: false;
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
  summary: {
    renderedRows: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    morningRows: number;
    lunchRows: number;
    eveningRows: number;
    scannerRuntimeWiredRows: number;
    productionScannerVisibleNowRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    tradingLogicChangedRows: number;
    canExecuteChangedRows: number;
    automatedOrderRows: number;
    wordingViolationRows: number;
    blockedRows: number;
    recommendation: 'ready_for_explicit_runtime_visibility_decision' | 'hold_for_five_model_surface_smoke_fix';
  };
  surface: UnifiedDeskOutputScannerSurfaceModel;
  blockers: string[];
}

export interface FiveModelProductionScannerSurfaceActivation {
  reportType: 'five_model_production_scanner_surface_activation';
  generatedAt: string;
  status: 'active' | 'disabled' | 'blocked';
  approval: {
    explicitProductionApproval: boolean;
    approvalScope: 'five_model_scanner_surface_rows_only';
    discordPostingRemainsGuarded: true;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    automatedOrders: false;
  };
  authority: {
    scannerVisibleNow: boolean;
    localRuntimeSurfaceOnly: true;
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
  source: {
    scannerSurfaceSmokePath: string;
  };
  summary: {
    selectedRows: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    morningRows: number;
    lunchRows: number;
    eveningRows: number;
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

function blockedActivation(
  explicitProductionApproval: boolean,
  scannerSurfaceSmokePath: string,
  blockers: string[],
  generatedAt: string,
): FiveModelProductionScannerSurfaceActivation {
  return {
    reportType: 'five_model_production_scanner_surface_activation',
    generatedAt,
    status: explicitProductionApproval ? 'blocked' : 'disabled',
    approval: {
      explicitProductionApproval,
      approvalScope: 'five_model_scanner_surface_rows_only',
      discordPostingRemainsGuarded: true,
      changesTradingLogic: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      automatedOrders: false,
    },
    authority: {
      scannerVisibleNow: false,
      localRuntimeSurfaceOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesScannerBehavior: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      canExecute: false,
      automatedOrders: false,
    },
    source: { scannerSurfaceSmokePath },
    summary: {
      selectedRows: 0,
      approvedDeskPlanRows: 0,
      formingDeskReadRows: 0,
      morningRows: 0,
      lunchRows: 0,
      eveningRows: 0,
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
    rows: [],
    blockers,
  };
}

function sourceBlockers(smoke: FiveModelScannerSurfaceSmokeInput): string[] {
  return [
    smoke.reportType === 'five_model_scanner_surface_smoke' ? null : 'Source report is not the five-model scanner surface smoke.',
    smoke.status === 'pass' ? null : `Source smoke status is ${smoke.status}.`,
    smoke.summary.recommendation === 'ready_for_explicit_runtime_visibility_decision' ? null : `Source recommendation is ${smoke.summary.recommendation}.`,
    smoke.authority.localOnly ? null : 'Source smoke is not local-only.',
    smoke.authority.installsRuntimeAdapter === false ? null : 'Source smoke already installs runtime adapter.',
    smoke.authority.scannerRuntimeWired === false ? null : 'Source smoke already wired scanner runtime.',
    smoke.authority.productionScannerVisibleNow === false ? null : 'Source smoke already exposed production scanner rows.',
    smoke.authority.postsDiscord === false ? null : 'Source smoke posts Discord.',
    smoke.authority.writesSupabase === false ? null : 'Source smoke writes Supabase.',
    smoke.authority.readsLiveSupabase === false ? null : 'Source smoke reads live Supabase.',
    smoke.authority.readsLiveBridge === false ? null : 'Source smoke reads live bridge.',
    smoke.authority.changesScannerBehavior === false ? null : 'Source smoke changes scanner behavior.',
    smoke.authority.changesTradingLogic === false ? null : 'Source smoke changes trading logic.',
    smoke.authority.changesCanExecute === false ? null : 'Source smoke changes canExecute.',
    smoke.authority.canExecute === false ? null : 'Source smoke has canExecute=true.',
    smoke.authority.automatedOrders === false ? null : 'Source smoke allows automated orders.',
    smoke.summary.renderedRows === smoke.surface.rows.length ? null : 'Source smoke rendered row count does not match surface rows.',
    smoke.summary.renderedRows > 0 ? null : 'Source smoke has zero rendered rows.',
    smoke.summary.approvedDeskPlanRows + smoke.summary.formingDeskReadRows === smoke.summary.renderedRows
      ? null
      : 'Source smoke contains unsupported row states.',
    smoke.summary.scannerRuntimeWiredRows === 0 ? null : 'Source smoke has scanner-runtime-wired rows.',
    smoke.summary.productionScannerVisibleNowRows === 0 ? null : 'Source smoke has production scanner-visible rows.',
    smoke.summary.discordPostRows === 0 ? null : 'Source smoke has Discord-post rows.',
    smoke.summary.supabaseWriteRows === 0 ? null : 'Source smoke has Supabase-write rows.',
    smoke.summary.liveSupabaseReadRows === 0 ? null : 'Source smoke has live Supabase read rows.',
    smoke.summary.liveBridgeReadRows === 0 ? null : 'Source smoke has live bridge read rows.',
    smoke.summary.canExecuteTrueRows === 0 ? null : 'Source smoke has canExecute=true rows.',
    smoke.summary.tradingLogicChangedRows === 0 ? null : 'Source smoke changed trading logic.',
    smoke.summary.canExecuteChangedRows === 0 ? null : 'Source smoke changed canExecute.',
    smoke.summary.automatedOrderRows === 0 ? null : 'Source smoke has automated-order rows.',
    smoke.summary.wordingViolationRows === 0 ? null : 'Source smoke has wording violations.',
    smoke.summary.blockedRows === 0 ? null : 'Source smoke has blocked rows.',
    smoke.surface.status === 'ready' ? null : 'Source surface is not ready.',
    smoke.surface.summary.rows === smoke.summary.renderedRows ? null : 'Source surface summary row count does not match smoke summary.',
    ...smoke.blockers,
    ...smoke.surface.blockers,
  ].filter((item): item is string => Boolean(item));
}

export function buildFiveModelProductionScannerSurfaceActivation(args: {
  explicitProductionApproval: boolean;
  scannerSurfaceSmokePath: string;
  scannerSurfaceSmoke: FiveModelScannerSurfaceSmokeInput;
}, generatedAt = new Date().toISOString()): FiveModelProductionScannerSurfaceActivation {
  if (!args.explicitProductionApproval) {
    return blockedActivation(false, args.scannerSurfaceSmokePath, ['Five-model production scanner surface requires explicit approval.'], generatedAt);
  }

  const blockers = sourceBlockers(args.scannerSurfaceSmoke);
  if (blockers.length) {
    return blockedActivation(true, args.scannerSurfaceSmokePath, blockers, generatedAt);
  }

  const rows = args.scannerSurfaceSmoke.surface.rows;
  return {
    reportType: 'five_model_production_scanner_surface_activation',
    generatedAt,
    status: 'active',
    approval: {
      explicitProductionApproval: true,
      approvalScope: 'five_model_scanner_surface_rows_only',
      discordPostingRemainsGuarded: true,
      changesTradingLogic: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      automatedOrders: false,
    },
    authority: {
      scannerVisibleNow: true,
      localRuntimeSurfaceOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesScannerBehavior: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      canExecute: false,
      automatedOrders: false,
    },
    source: { scannerSurfaceSmokePath: args.scannerSurfaceSmokePath },
    summary: {
      selectedRows: rows.length,
      approvedDeskPlanRows: rows.filter((row) => row.state === 'APPROVED_DESK_PLAN').length,
      formingDeskReadRows: rows.filter((row) => row.state === 'FORMING_DESK_READ').length,
      morningRows: rows.filter((row) => row.session === 'morning').length,
      lunchRows: rows.filter((row) => row.session === 'lunch').length,
      eveningRows: rows.filter((row) => row.session === 'evening').length,
      discordPostRows: 0,
      supabaseWriteRows: 0,
      liveSupabaseReadRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: 0,
      canExecuteChangedRows: 0,
      tradingLogicChangedRows: 0,
      automatedOrderRows: 0,
      blockedRows: 0,
    },
    rows,
    blockers: [],
  };
}
