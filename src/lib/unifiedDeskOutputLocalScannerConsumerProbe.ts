import {
  buildUnifiedDeskOutputDisabledScannerRuntimePreview,
  type UnifiedDeskOutputDisabledE2ERuntimeValidationReport,
  type UnifiedDeskOutputDisabledScannerRuntimePreview,
} from './unifiedDeskOutputDisabledScannerRuntime';

export interface UnifiedDeskOutputNormalScannerSnapshot {
  sourceOfTruth: 'normal_scanner_output_preserved';
  scannerEventsRead: number;
  normalShouldPostRows: number;
  normalCanExecuteTrueRows: number;
  normalDiscordSendRows: number;
}

export interface UnifiedDeskOutputLocalScannerConsumerProbe {
  reportType: 'unified_desk_output_local_scanner_consumer_probe';
  status: 'disabled' | 'ready' | 'blocked';
  sourceOfTruth: 'local_scanner_consumer_probe';
  authority: {
    localOnly: true;
    scannerConsumerProbeOnly: true;
    defaultDisabled: true;
    runtimeGateEnabled: false;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesNormalScannerOutput: false;
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
    normalScannerEventsRead: number;
    normalShouldPostRowsPreserved: number;
    normalCanExecuteTrueRowsPreserved: number;
    normalDiscordSendRowsPreserved: number;
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
  normalScannerOutput: UnifiedDeskOutputNormalScannerSnapshot;
  preview: UnifiedDeskOutputDisabledScannerRuntimePreview;
  blockers: string[];
}

function normalSnapshotBlockers(snapshot: UnifiedDeskOutputNormalScannerSnapshot | null): string[] {
  if (!snapshot) return ['Missing normal scanner output snapshot.'];
  return [
    snapshot.sourceOfTruth === 'normal_scanner_output_preserved' ? null : 'Normal scanner output snapshot has invalid source of truth.',
    snapshot.scannerEventsRead > 0 ? null : 'Normal scanner output snapshot has no scanner events.',
    snapshot.normalCanExecuteTrueRows >= 0 ? null : 'Normal scanner canExecute count is invalid.',
  ].filter((item): item is string => Boolean(item));
}

export function buildUnifiedDeskOutputLocalScannerConsumerProbe(args: {
  explicitLocalPreviewFlag: boolean;
  localHost: boolean;
  disabledE2EReport: UnifiedDeskOutputDisabledE2ERuntimeValidationReport | null;
  normalScannerOutput: UnifiedDeskOutputNormalScannerSnapshot | null;
}): UnifiedDeskOutputLocalScannerConsumerProbe {
  const preview = buildUnifiedDeskOutputDisabledScannerRuntimePreview({
    explicitLocalPreviewFlag: args.explicitLocalPreviewFlag,
    localHost: args.localHost,
    report: args.disabledE2EReport,
  });
  const normalScannerOutput = args.normalScannerOutput || {
    sourceOfTruth: 'normal_scanner_output_preserved' as const,
    scannerEventsRead: 0,
    normalShouldPostRows: 0,
    normalCanExecuteTrueRows: 0,
    normalDiscordSendRows: 0,
  };
  const blockers = [
    ...normalSnapshotBlockers(args.normalScannerOutput),
    args.explicitLocalPreviewFlag && preview.status !== 'ready' ? `Disabled scanner runtime preview status is ${preview.status}.` : null,
    !args.explicitLocalPreviewFlag && preview.status !== 'disabled' ? `Default disabled preview status is ${preview.status}.` : null,
    preview.summary.discordPostRows === 0 ? null : 'Preview has Discord post rows.',
    preview.summary.supabaseWriteRows === 0 ? null : 'Preview has Supabase write rows.',
    preview.summary.liveSupabaseReadRows === 0 ? null : 'Preview has live Supabase read rows.',
    preview.summary.liveBridgeReadRows === 0 ? null : 'Preview has live bridge read rows.',
    preview.summary.canExecuteTrueRows === 0 ? null : 'Preview has canExecute=true rows.',
    preview.summary.canExecuteChangedRows === 0 ? null : 'Preview changed canExecute.',
    preview.summary.tradingLogicChangedRows === 0 ? null : 'Preview changed trading logic.',
    preview.summary.automatedOrderRows === 0 ? null : 'Preview has automated order rows.',
    ...preview.blockers.filter((blocker) => args.explicitLocalPreviewFlag || !/explicit local preview flag/i.test(blocker)),
  ].filter((item): item is string => Boolean(item));
  const status = !args.explicitLocalPreviewFlag ? 'disabled' : blockers.length ? 'blocked' : 'ready';

  return {
    reportType: 'unified_desk_output_local_scanner_consumer_probe',
    status,
    sourceOfTruth: 'local_scanner_consumer_probe',
    authority: {
      localOnly: true,
      scannerConsumerProbeOnly: true,
      defaultDisabled: true,
      runtimeGateEnabled: false,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesNormalScannerOutput: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      canExecute: false,
      automatedOrders: false,
    },
    request: {
      explicitLocalPreviewFlag: args.explicitLocalPreviewFlag,
      localHost: args.localHost,
    },
    summary: {
      scannerPreviewAllowed: status === 'ready',
      scannerPreviewRows: status === 'ready' ? preview.summary.scannerPreviewRows : 0,
      approvedDeskPlanRows: status === 'ready' ? preview.summary.approvedDeskPlanRows : 0,
      formingDeskReadRows: status === 'ready' ? preview.summary.formingDeskReadRows : 0,
      morningRows: status === 'ready' ? preview.summary.morningRows : 0,
      lunchRows: status === 'ready' ? preview.summary.lunchRows : 0,
      normalScannerEventsRead: normalScannerOutput.scannerEventsRead,
      normalShouldPostRowsPreserved: normalScannerOutput.normalShouldPostRows,
      normalCanExecuteTrueRowsPreserved: normalScannerOutput.normalCanExecuteTrueRows,
      normalDiscordSendRowsPreserved: normalScannerOutput.normalDiscordSendRows,
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
    normalScannerOutput,
    preview,
    blockers,
  };
}
