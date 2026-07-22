import type { UnifiedDeskOutputScannerSurfaceModel } from './unifiedDeskOutputScannerSurface';

export const UNIFIED_DESK_OUTPUT_SCANNER_SURFACE_STORAGE_KEY = 'unified_desk_output_scanner_surface_smoke_report';

export interface UnifiedDeskOutputScannerSurfaceSmokeReport {
  reportType: 'unified_desk_output_scanner_surface_smoke';
  status: 'pass' | 'blocked';
  authority: {
    localOnly: true;
    readsSavedInstallAuditOnly: true;
    rendersScannerSurfaceOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    automatedOrders: false;
  };
  summary: {
    renderedRows: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    wordingViolationRows: number;
    blockedRows: number;
  };
  surface: UnifiedDeskOutputScannerSurfaceModel;
  blockers: string[];
}

export interface UnifiedDeskOutputScannerSurfacePreviewModel {
  status: 'disabled' | 'ready' | 'blocked';
  sourceOfTruth: 'local_scanner_surface_smoke_preview_only';
  localOnly: true;
  publishDiscord: false;
  writesSupabase: false;
  readsLiveSupabase: false;
  readsLiveBridge: false;
  canExecute: false;
  changesTradingLogic: false;
  changesCanExecute: false;
  rows: UnifiedDeskOutputScannerSurfaceModel['rows'];
  blockers: string[];
}

function base(): Omit<UnifiedDeskOutputScannerSurfacePreviewModel, 'status' | 'rows' | 'blockers'> {
  return {
    sourceOfTruth: 'local_scanner_surface_smoke_preview_only',
    localOnly: true,
    publishDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    canExecute: false,
    changesTradingLogic: false,
    changesCanExecute: false,
  };
}

export function buildUnifiedDeskOutputScannerSurfacePreviewModel(args: {
  enabled: boolean;
  localHost: boolean;
  report: UnifiedDeskOutputScannerSurfaceSmokeReport | null;
}): UnifiedDeskOutputScannerSurfacePreviewModel {
  const common = base();
  if (!args.enabled) {
    return {
      ...common,
      status: 'disabled',
      rows: [],
      blockers: ['Unified Desk Output scanner surface preview flag is disabled.'],
    };
  }
  if (!args.localHost) {
    return {
      ...common,
      status: 'blocked',
      rows: [],
      blockers: ['Unified Desk Output scanner surface preview is allowed only on a local host.'],
    };
  }
  if (!args.report) {
    return {
      ...common,
      status: 'blocked',
      rows: [],
      blockers: ['Missing scanner surface smoke report.'],
    };
  }

  const report = args.report;
  const blockers = [
    report.reportType === 'unified_desk_output_scanner_surface_smoke' ? null : 'Invalid scanner surface smoke report type.',
    report.status === 'pass' ? null : `Scanner surface smoke status is ${report.status}.`,
    report.authority.localOnly ? null : 'Surface smoke is not local-only.',
    report.authority.postsDiscord === false ? null : 'Surface smoke posts Discord.',
    report.authority.writesSupabase === false ? null : 'Surface smoke writes Supabase.',
    report.authority.readsLiveSupabase === false ? null : 'Surface smoke reads live Supabase.',
    report.authority.readsLiveBridge === false ? null : 'Surface smoke reads live bridge.',
    report.authority.changesTradingLogic === false ? null : 'Surface smoke changes trading logic.',
    report.authority.changesCanExecute === false ? null : 'Surface smoke changes canExecute.',
    report.authority.automatedOrders === false ? null : 'Surface smoke allows automated orders.',
    report.summary.discordPostRows === 0 ? null : 'Surface smoke has Discord post rows.',
    report.summary.supabaseWriteRows === 0 ? null : 'Surface smoke has Supabase write rows.',
    report.summary.liveBridgeReadRows === 0 ? null : 'Surface smoke has live bridge read rows.',
    report.summary.canExecuteTrueRows === 0 ? null : 'Surface smoke has canExecute=true rows.',
    report.summary.wordingViolationRows === 0 ? null : 'Surface smoke has wording violations.',
    report.summary.blockedRows === 0 ? null : 'Surface smoke has blocked rows.',
    report.surface.status === 'ready' ? null : `Surface model status is ${report.surface.status}.`,
    ...report.blockers,
    ...report.surface.blockers,
  ].filter((item): item is string => Boolean(item));

  return {
    ...common,
    status: blockers.length ? 'blocked' : 'ready',
    rows: blockers.length ? [] : report.surface.rows,
    blockers,
  };
}
