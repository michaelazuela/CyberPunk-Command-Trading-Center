export interface HeldLocalPreviewUiIndexItem {
  ticketId: string;
  sourceSnapshotId: string;
  setupType: string;
  direction: string;
  pngPath: string;
  imageSrc: string;
  previewStatus: 'preview_ready' | 'blocked';
  postable: false;
  publishDiscord: false;
  shouldPost: false;
  canExecute: false;
  shouldDispatch: false;
  writesSupabase: false;
  blockers: string[];
}

export interface HeldLocalPreviewUiIndexReport {
  reportType: 'unified_positive_held_local_preview_ui_index';
  status: 'pass' | 'fail';
  authority: {
    readOnly: true;
    localOnly: true;
    researchOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    runsSetupScanner: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
    changesBridgeBehavior: false;
    changesDiscordPosting: false;
    changesAppRuntime: false;
  };
  summary: {
    signoffRowsLoaded: number;
    previewItemsReady: number;
    blockedItems: number;
    postableFalseItems: number;
    shouldPostFalseItems: number;
    canExecuteFalseItems: number;
    publishDiscordFalseItems: number;
    shouldDispatchFalseItems: number;
    writesSupabaseFalseItems: number;
  };
  output: {
    htmlPath: string | null;
  };
  items: HeldLocalPreviewUiIndexItem[];
}

export interface HeldLocalPreviewUiModel {
  status: 'disabled' | 'ready' | 'blocked';
  sourceOfTruth: 'local_signoff_preview_index_only';
  localOnly: true;
  postable: false;
  publishDiscord: false;
  shouldPost: false;
  canExecute: false;
  shouldDispatch: false;
  writesSupabase: false;
  readsLiveSupabase: false;
  readsLiveBridge: false;
  runsSetupScanner: false;
  changesScannerBehavior: false;
  changesTradingLogic: false;
  items: Array<{
    ticketId: string;
    setupType: string;
    direction: string;
    imageSrc: string;
    previewStatus: 'preview_ready';
  }>;
  blockers: string[];
}

export function buildHeldLocalPreviewUiModel(args: {
  enabled: boolean;
  localHost: boolean;
  report: HeldLocalPreviewUiIndexReport | null;
}): HeldLocalPreviewUiModel {
  const base = {
    sourceOfTruth: 'local_signoff_preview_index_only' as const,
    localOnly: true as const,
    postable: false as const,
    publishDiscord: false as const,
    shouldPost: false as const,
    canExecute: false as const,
    shouldDispatch: false as const,
    writesSupabase: false as const,
    readsLiveSupabase: false as const,
    readsLiveBridge: false as const,
    runsSetupScanner: false as const,
    changesScannerBehavior: false as const,
    changesTradingLogic: false as const,
  };

  if (!args.enabled) {
    return {
      ...base,
      status: 'disabled',
      items: [],
      blockers: ['held-local preview UI flag is disabled'],
    };
  }

  if (!args.localHost) {
    return {
      ...base,
      status: 'blocked',
      items: [],
      blockers: ['held-local preview UI is allowed only on a local host'],
    };
  }

  if (!args.report) {
    return {
      ...base,
      status: 'blocked',
      items: [],
      blockers: ['missing local preview index report'],
    };
  }

  const blockers = [
    args.report.reportType !== 'unified_positive_held_local_preview_ui_index' ? 'invalid preview index report type' : null,
    args.report.status !== 'pass' ? `preview index status ${args.report.status}` : null,
    args.report.authority.localOnly !== true ? 'preview index localOnly is not true' : null,
    args.report.authority.postsDiscord !== false ? 'preview index postsDiscord is not false' : null,
    args.report.authority.writesSupabase !== false ? 'preview index writesSupabase is not false' : null,
    args.report.authority.readsLiveSupabase !== false ? 'preview index readsLiveSupabase is not false' : null,
    args.report.authority.readsLiveBridge !== false ? 'preview index readsLiveBridge is not false' : null,
    args.report.authority.runsSetupScanner !== false ? 'preview index runsSetupScanner is not false' : null,
    args.report.authority.changesScannerBehavior !== false ? 'preview index changesScannerBehavior is not false' : null,
    args.report.authority.changesTradingLogic !== false ? 'preview index changesTradingLogic is not false' : null,
    args.report.authority.changesCanExecute !== false ? 'preview index changesCanExecute is not false' : null,
    args.report.authority.changesAppRuntime !== false ? 'preview index changesAppRuntime is not false' : null,
    args.report.summary.blockedItems !== 0 ? 'preview index has blocked items' : null,
  ].filter((item): item is string => Boolean(item));

  const itemBlockers: string[] = [];
  const items = args.report.items.flatMap((item) => {
    const rowBlockers = [
      item.previewStatus !== 'preview_ready' ? `${item.ticketId} status ${item.previewStatus}` : null,
      item.postable !== false ? `${item.ticketId} postable is not false` : null,
      item.shouldPost !== false ? `${item.ticketId} shouldPost is not false` : null,
      item.canExecute !== false ? `${item.ticketId} canExecute is not false` : null,
      item.publishDiscord !== false ? `${item.ticketId} publishDiscord is not false` : null,
      item.shouldDispatch !== false ? `${item.ticketId} shouldDispatch is not false` : null,
      item.writesSupabase !== false ? `${item.ticketId} writesSupabase is not false` : null,
      !item.imageSrc.startsWith('file:///') ? `${item.ticketId} imageSrc is not a local file URL` : null,
    ].filter((rowBlocker): rowBlocker is string => Boolean(rowBlocker));
    itemBlockers.push(...rowBlockers);
    if (rowBlockers.length) return [];
    return [{
      ticketId: item.ticketId,
      setupType: item.setupType,
      direction: item.direction,
      imageSrc: item.imageSrc,
      previewStatus: 'preview_ready' as const,
    }];
  });

  const allBlockers = [...blockers, ...itemBlockers];
  return {
    ...base,
    status: allBlockers.length ? 'blocked' : 'ready',
    items: allBlockers.length ? [] : items,
    blockers: allBlockers,
  };
}
