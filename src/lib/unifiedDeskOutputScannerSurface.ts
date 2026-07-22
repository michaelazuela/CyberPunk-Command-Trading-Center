import type {
  UnifiedDeskOutputScannerVisibleCard,
  UnifiedDeskOutputScannerVisibilityModel,
  UnifiedDeskVisibleState,
} from './unifiedDeskOutputScannerVisibilityAdapter';

export interface UnifiedDeskOutputScannerSurfaceRow {
  cardId: string;
  date: string;
  session: 'morning' | 'lunch';
  state: UnifiedDeskVisibleState;
  stateLabel: 'Approved Desk Plan' | 'Forming Desk Read';
  model: string;
  direction: 'LONG' | 'SHORT';
  headline: string;
  bodyLines: string[];
  levelLine: string;
  riskLine: string;
  proofLine: string;
  invalidationLine: string;
  authorityLine: string;
  scannerVisibleNow: true;
  publishDiscord: false;
  writesSupabase: false;
  readsLiveBridge: false;
  canExecute: false;
}

export interface UnifiedDeskOutputScannerSurfaceModel {
  status: 'ready' | 'blocked';
  sourceOfTruth: 'scanner_surface_unified_desk_output_consumer';
  localScannerOnly: true;
  rows: UnifiedDeskOutputScannerSurfaceRow[];
  summary: {
    rows: number;
    approvedDeskPlans: number;
    formingDeskReads: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    wordingViolationRows: number;
  };
  blockers: string[];
}

const BLOCKED_WORDING = /human[- ]review|no chase|no-trade|no trade|missed/i;

function stateLabel(state: UnifiedDeskVisibleState): UnifiedDeskOutputScannerSurfaceRow['stateLabel'] {
  return state === 'APPROVED_DESK_PLAN' ? 'Approved Desk Plan' : 'Forming Desk Read';
}

function lineText(row: UnifiedDeskOutputScannerSurfaceRow): string {
  return [
    row.headline,
    ...row.bodyLines,
    row.levelLine,
    row.riskLine,
    row.proofLine,
    row.invalidationLine,
    row.authorityLine,
  ].join(' ');
}

function cardBlockers(card: UnifiedDeskOutputScannerVisibleCard): string[] {
  return [
    card.scannerVisibleNow ? null : `${card.cardId} is not scanner-visible.`,
    card.localScannerOnly ? null : `${card.cardId} is not local-scanner-only.`,
    card.publishDiscord || card.shouldPostDiscord || card.shouldDispatch ? `${card.cardId} would post or dispatch Discord.` : null,
    card.writesSupabase ? `${card.cardId} would write Supabase.` : null,
    card.readsLiveSupabase ? `${card.cardId} would read live Supabase.` : null,
    card.readsLiveBridge ? `${card.cardId} would read live bridge.` : null,
    card.changesScannerBehavior ? `${card.cardId} changes scanner behavior.` : null,
    card.changesTradingLogic ? `${card.cardId} changes trading logic.` : null,
    card.changesCanExecute || card.canExecuteChanged ? `${card.cardId} changes canExecute.` : null,
    card.canExecute ? `${card.cardId} has canExecute=true.` : null,
    card.livePromotionAllowed ? `${card.cardId} allows live promotion.` : null,
    card.noAutomatedOrders ? null : `${card.cardId} is missing no-automated-orders boundary.`,
  ].filter((item): item is string => Boolean(item));
}

function surfaceRow(card: UnifiedDeskOutputScannerVisibleCard): UnifiedDeskOutputScannerSurfaceRow {
  const label = stateLabel(card.state);
  return {
    cardId: card.cardId,
    date: card.date,
    session: card.session,
    state: card.state,
    stateLabel: label,
    model: card.model,
    direction: card.direction,
    headline: `${label} | ${card.session.toUpperCase()} | ${card.direction} | ${card.model}`,
    bodyLines: [
      card.what,
      card.why,
    ],
    levelLine: `Entry ${card.entry} | Stop ${card.stop} | T1 ${card.target1} | T2 ${card.target2}`,
    riskLine: `Risk ${card.riskPoints} points from scanner-owned entry/stop.`,
    proofLine: `Completed 5M proof: ${card.proofTime.slice(11, 16)} ET.`,
    invalidationLine: card.invalidation,
    authorityLine: 'Decision support only. Discord/Supabase/bridge/canExecute remain off in this surface.',
    scannerVisibleNow: true,
    publishDiscord: false,
    writesSupabase: false,
    readsLiveBridge: false,
    canExecute: false,
  };
}

export function buildUnifiedDeskOutputScannerSurfaceModel(
  visibilityModel: UnifiedDeskOutputScannerVisibilityModel
): UnifiedDeskOutputScannerSurfaceModel {
  const modelBlockers = [
    visibilityModel.status === 'ready' ? null : `Visibility model status is ${visibilityModel.status}.`,
    visibilityModel.localScannerOnly ? null : 'Visibility model is not local-scanner-only.',
    visibilityModel.scannerVisibleNow ? null : 'Visibility model is not scanner-visible.',
    visibilityModel.publishDiscord || visibilityModel.shouldPostDiscord || visibilityModel.shouldDispatch ? 'Visibility model would post or dispatch Discord.' : null,
    visibilityModel.writesSupabase ? 'Visibility model would write Supabase.' : null,
    visibilityModel.readsLiveSupabase ? 'Visibility model would read live Supabase.' : null,
    visibilityModel.readsLiveBridge ? 'Visibility model would read live bridge.' : null,
    visibilityModel.changesScannerBehavior ? 'Visibility model changes scanner behavior.' : null,
    visibilityModel.changesTradingLogic ? 'Visibility model changes trading logic.' : null,
    visibilityModel.changesCanExecute || visibilityModel.canExecuteChanged ? 'Visibility model changes canExecute.' : null,
    visibilityModel.canExecute ? 'Visibility model has canExecute=true.' : null,
    visibilityModel.livePromotionAllowed ? 'Visibility model allows live promotion.' : null,
    visibilityModel.noAutomatedOrders ? null : 'Visibility model is missing no-automated-orders boundary.',
    ...visibilityModel.blockers,
  ].filter((item): item is string => Boolean(item));
  const cardLevelBlockers = visibilityModel.cards.flatMap(cardBlockers);
  const rows = visibilityModel.cards.map(surfaceRow);
  const wordingBlockers = rows.flatMap((row) => BLOCKED_WORDING.test(lineText(row)) ? [`${row.cardId} rendered blocked legacy wording.`] : []);
  const blockers = [...modelBlockers, ...cardLevelBlockers, ...wordingBlockers];
  return {
    status: blockers.length ? 'blocked' : 'ready',
    sourceOfTruth: 'scanner_surface_unified_desk_output_consumer',
    localScannerOnly: true,
    rows: blockers.length ? [] : rows,
    summary: {
      rows: blockers.length ? 0 : rows.length,
      approvedDeskPlans: blockers.length ? 0 : rows.filter((row) => row.state === 'APPROVED_DESK_PLAN').length,
      formingDeskReads: blockers.length ? 0 : rows.filter((row) => row.state === 'FORMING_DESK_READ').length,
      discordPostRows: rows.filter((row) => row.publishDiscord).length,
      supabaseWriteRows: rows.filter((row) => row.writesSupabase).length,
      liveBridgeReadRows: rows.filter((row) => row.readsLiveBridge).length,
      canExecuteTrueRows: rows.filter((row) => row.canExecute).length,
      wordingViolationRows: wordingBlockers.length,
    },
    blockers,
  };
}
