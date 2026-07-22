export type UnifiedDeskVisibleState = 'APPROVED_DESK_PLAN' | 'FORMING_DESK_READ';

export interface UnifiedDeskOutputVisibilityCandidate {
  cardId: string;
  date: string;
  session: 'morning' | 'lunch';
  state: UnifiedDeskVisibleState;
  model: string;
  direction: 'LONG' | 'SHORT';
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

export interface UnifiedDeskOutputVisibilityReadinessReport {
  reportType: 'unified_desk_output_live_gate_readiness_audit';
  status: 'pass' | 'blocked';
  summary: {
    discordPostNowRows: number;
    supabaseWriteNowRows: number;
    liveBridgeReadNowRows: number;
    canExecuteTrueRows: number;
    canExecuteChangedRows: number;
    tradingLogicChangedRows: number;
    incompleteVisiblePlanRows: number;
    wordingViolationRows: number;
    blockedRows: number;
  };
  candidates: UnifiedDeskOutputVisibilityCandidate[];
  blockers: string[];
}

export interface UnifiedDeskOutputScannerVisibleCard {
  cardId: string;
  date: string;
  session: 'morning' | 'lunch';
  state: UnifiedDeskVisibleState;
  model: string;
  direction: 'LONG' | 'SHORT';
  proofTime: string;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  riskPoints: number;
  headline: string;
  what: string;
  where: string;
  when: string;
  why: string;
  invalidation: string;
  authority: string;
  scannerVisibleNow: true;
  localScannerOnly: true;
  publishDiscord: false;
  shouldPostDiscord: false;
  shouldDispatch: false;
  writesSupabase: false;
  readsLiveSupabase: false;
  readsLiveBridge: false;
  changesScannerBehavior: false;
  changesTradingLogic: false;
  changesCanExecute: false;
  canExecute: false;
  canExecuteChanged: false;
  livePromotionAllowed: false;
  noAutomatedOrders: true;
}

export interface UnifiedDeskOutputScannerVisibilityModel {
  status: 'disabled' | 'ready' | 'blocked';
  sourceOfTruth: 'scanner_visible_unified_desk_output_adapter';
  localScannerOnly: true;
  scannerVisibleNow: boolean;
  publishDiscord: false;
  shouldPostDiscord: false;
  shouldDispatch: false;
  writesSupabase: false;
  readsLiveSupabase: false;
  readsLiveBridge: false;
  changesScannerBehavior: false;
  changesTradingLogic: false;
  changesCanExecute: false;
  canExecute: false;
  canExecuteChanged: false;
  livePromotionAllowed: false;
  noAutomatedOrders: true;
  cards: UnifiedDeskOutputScannerVisibleCard[];
  blockers: string[];
}

const BLOCKED_WORDING = /human[- ]review|no chase|no-trade|no trade|missed/i;

function isFinitePrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function candidateBlockers(candidate: UnifiedDeskOutputVisibilityCandidate): string[] {
  return [
    candidate.scannerVisibleIfExplicitGateApproved ? null : `${candidate.cardId} is not approved for scanner visibility gate.`,
    candidate.discordEligibleIfSeparatelyApproved ? null : `${candidate.cardId} is missing separate Discord eligibility marker.`,
    candidate.supabaseEligibleIfSeparatelyApproved ? null : `${candidate.cardId} is missing separate Supabase eligibility marker.`,
    candidate.canExecuteRemainsExternalGate ? null : `${candidate.cardId} does not preserve canExecute as an external gate.`,
    candidate.state === 'APPROVED_DESK_PLAN' || candidate.state === 'FORMING_DESK_READ' ? null : `${candidate.cardId} has unsupported visible state.`,
    candidate.model ? null : `${candidate.cardId} missing model.`,
    candidate.direction === 'LONG' || candidate.direction === 'SHORT' ? null : `${candidate.cardId} missing direction.`,
    candidate.proofTime ? null : `${candidate.cardId} missing completed 5M proof time.`,
    isFinitePrice(candidate.entry) ? null : `${candidate.cardId} missing entry.`,
    isFinitePrice(candidate.stop) ? null : `${candidate.cardId} missing stop.`,
    isFinitePrice(candidate.target1) ? null : `${candidate.cardId} missing T1.`,
    isFinitePrice(candidate.target2) ? null : `${candidate.cardId} missing T2.`,
    isFinitePrice(candidate.riskPoints) ? null : `${candidate.cardId} missing risk.`,
  ].filter((item): item is string => Boolean(item));
}

function buildScannerCard(candidate: UnifiedDeskOutputVisibilityCandidate): UnifiedDeskOutputScannerVisibleCard {
  const stateLabel = candidate.state === 'APPROVED_DESK_PLAN' ? 'Approved Desk Plan' : 'Forming Desk Read';
  const side = candidate.direction.toLowerCase();
  return {
    cardId: candidate.cardId,
    date: candidate.date,
    session: candidate.session,
    state: candidate.state,
    model: candidate.model,
    direction: candidate.direction,
    proofTime: candidate.proofTime,
    entry: candidate.entry,
    stop: candidate.stop,
    target1: candidate.target1,
    target2: candidate.target2,
    riskPoints: candidate.riskPoints,
    headline: `${stateLabel}: ${candidate.model} ${candidate.direction}`,
    what: `${candidate.session} ${side} desk plan from ${candidate.model}.`,
    where: `Entry ${candidate.entry}, stop ${candidate.stop}, T1 ${candidate.target1}, T2 ${candidate.target2}.`,
    when: `Completed 5M proof time ${candidate.proofTime.slice(11, 16)} ET.`,
    why: `${candidate.model} is the selected scanner-owned lane for this ${candidate.session} window.`,
    invalidation: `Invalid if price violates the protected 5M stop line at ${candidate.stop}.`,
    authority: 'Decision-support desk output only. Existing deterministic execution gates remain in control. No automated orders.',
    scannerVisibleNow: true,
    localScannerOnly: true,
    publishDiscord: false,
    shouldPostDiscord: false,
    shouldDispatch: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    canExecute: false,
    canExecuteChanged: false,
    livePromotionAllowed: false,
    noAutomatedOrders: true,
  };
}

function modelBase(): Omit<UnifiedDeskOutputScannerVisibilityModel, 'status' | 'scannerVisibleNow' | 'cards' | 'blockers'> {
  return {
    sourceOfTruth: 'scanner_visible_unified_desk_output_adapter',
    localScannerOnly: true,
    publishDiscord: false,
    shouldPostDiscord: false,
    shouldDispatch: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    canExecute: false,
    canExecuteChanged: false,
    livePromotionAllowed: false,
    noAutomatedOrders: true,
  };
}

export function buildUnifiedDeskOutputScannerVisibilityModel(args: {
  enabled: boolean;
  readinessReport: UnifiedDeskOutputVisibilityReadinessReport | null;
}): UnifiedDeskOutputScannerVisibilityModel {
  const base = modelBase();
  if (!args.enabled) {
    return {
      ...base,
      status: 'disabled',
      scannerVisibleNow: false,
      cards: [],
      blockers: ['Unified Desk Output scanner visibility adapter is disabled.'],
    };
  }
  if (!args.readinessReport) {
    return {
      ...base,
      status: 'blocked',
      scannerVisibleNow: false,
      cards: [],
      blockers: ['Missing live-gate readiness audit report.'],
    };
  }

  const report = args.readinessReport;
  const reportBlockers = [
    report.reportType === 'unified_desk_output_live_gate_readiness_audit' ? null : 'Invalid live-gate readiness report type.',
    report.status === 'pass' ? null : 'Live-gate readiness audit is blocked.',
    report.summary.discordPostNowRows === 0 ? null : 'Readiness report has Discord post rows.',
    report.summary.supabaseWriteNowRows === 0 ? null : 'Readiness report has Supabase write rows.',
    report.summary.liveBridgeReadNowRows === 0 ? null : 'Readiness report has live bridge read rows.',
    report.summary.canExecuteTrueRows === 0 ? null : 'Readiness report has canExecute=true rows.',
    report.summary.canExecuteChangedRows === 0 ? null : 'Readiness report has canExecute changed rows.',
    report.summary.tradingLogicChangedRows === 0 ? null : 'Readiness report has trading-logic changed rows.',
    report.summary.incompleteVisiblePlanRows === 0 ? null : 'Readiness report has incomplete visible plan rows.',
    report.summary.wordingViolationRows === 0 ? null : 'Readiness report has blocked wording rows.',
    report.summary.blockedRows === 0 ? null : 'Readiness report has blocked rows.',
    ...report.blockers,
  ].filter((item): item is string => Boolean(item));
  const rowBlockers = report.candidates.flatMap(candidateBlockers);
  const cards = report.candidates.map(buildScannerCard);
  const wordingBlockers = cards.flatMap((card) => {
    const text = [card.headline, card.what, card.where, card.when, card.why, card.invalidation, card.authority].join(' ');
    return BLOCKED_WORDING.test(text) ? [`${card.cardId} contains blocked legacy wording.`] : [];
  });
  const blockers = [...reportBlockers, ...rowBlockers, ...wordingBlockers];
  return {
    ...base,
    status: blockers.length ? 'blocked' : 'ready',
    scannerVisibleNow: blockers.length ? false : cards.length > 0,
    cards: blockers.length ? [] : cards,
    blockers,
  };
}
