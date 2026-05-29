import type { NinjaBridgeBar } from '../lib/ninjaTraderBridge';
import type { NormalizedTradePlan } from '../lib/tradePlan';
import { isValidPrice } from '../lib/tradePlan';
import type { ScannerState, ScannerWindowState } from '../lib/localScannerEngine';
import { ExecutionStatus, type SetupCandidate } from '../types';

type WatchlistDirection = 'LONG' | 'SHORT' | 'NO TRADE';

export interface MorningContinuationWatchlistResult {
  watchlistDetected: boolean;
  watchlistType: 'morning_continuation_watchlist';
  direction: WatchlistDirection;
  status: 'WATCH_ONLY';
  canExecute: false;
  freshEntryAvailable: false;
  tradeAlertEligible: false;
  reason: string;
  noChaseWarning: true;
  requiredNextCondition: string;
  memoryEligible: boolean;
  evidence: string[];
  missingEvidence: string[];
  auditWarnings: string[];
  approvalBoundary: {
    watchlistApprovesTrade: false;
    watchlistChangesRules: false;
    watchlistCreatesEntry: false;
    watchlistCreatesTargets: false;
    watchlistOverridesScanner: false;
  };
}

export interface MorningContinuationWatchlistInput {
  tradeDate: string;
  instrument: string;
  window: Pick<ScannerWindowState, 'session' | 'label' | 'allowsTradePlan'>;
  bars5m: NinjaBridgeBar[];
  currentPrice: number | null;
  openingRangeHigh?: number | null;
  openingRangeLow?: number | null;
  higherTimeframeAlignment?: WatchlistDirection | null;
  normalizedPlan?: NormalizedTradePlan | null;
  selectedCandidate?: SetupCandidate | null;
  scannerState?: ScannerState | null;
}

export interface WatchlistMemoryRecord {
  memoryType: 'watchlist_context';
  watchlistType: 'morning_continuation_watchlist';
  tradeDate: string;
  instrument: string;
  session: 'morning';
  direction: WatchlistDirection;
  status: 'WATCH_ONLY';
  freshEntryAvailable: false;
  tradeAlertEligible: false;
  canExecute: false;
  currentPriceAtAlert: number | null;
  openingRangeHigh: number | null;
  openingRangeLow: number | null;
  displacementTime: string | null;
  displacementRange: number | null;
  distanceFromTrigger: number | null;
  distanceFromNearestStructureStop: number | null;
  reasonNoEntry: string;
  scannerState: ScannerState | null;
  selectedCandidateSnapshot: SetupCandidate | null;
  normalizedPlanSnapshot: NormalizedTradePlan | null;
  evidence: string[];
  missingEvidence: string[];
  auditWarnings: string[];
  laterValidSetupFormed: null;
  laterSetupType: null;
  laterOutcome: null;
  laterReviewTimestamp: null;
  reviewNotes: null;
  notes: string[];
  approvalBoundary: MorningContinuationWatchlistResult['approvalBoundary'] & {
    ragMemoryApprovesTrade: false;
    ragMemoryChangesRules: false;
  };
}

export interface WatchlistMemoryInput {
  watchlist: MorningContinuationWatchlistResult;
  tradeDate: string;
  instrument: string;
  session: 'morning';
  bars5m?: NinjaBridgeBar[];
  currentPriceAtAlert?: number | null;
  openingRangeHigh?: number | null;
  openingRangeLow?: number | null;
  displacementTime?: string | null;
  displacementRange?: number | null;
  distanceFromTrigger?: number | null;
  distanceFromNearestStructureStop?: number | null;
  reasonNoEntry?: string | null;
  scannerState?: ScannerState | null;
  selectedCandidateSnapshot?: SetupCandidate | null;
  normalizedPlanSnapshot?: NormalizedTradePlan | null;
  auditWarnings?: string[];
}

export type WatchlistOutcomeClassification =
  | 'later_valid_setup_formed'
  | 'ran_without_fresh_entry'
  | 'reversed_or_failed'
  | 'inconclusive';

export type WatchlistPerformanceRecord = Omit<
  WatchlistMemoryRecord,
  'laterValidSetupFormed' | 'laterSetupType' | 'laterOutcome' | 'laterReviewTimestamp' | 'reviewNotes'
> & {
  laterValidSetupFormed: boolean | null;
  laterSetupType: string | null;
  laterOutcome: WatchlistOutcomeClassification | 'valid_setup' | 'ran_without_pullback' | 'reversed' | 'failed' | null;
  laterReviewTimestamp: string | null;
  reviewNotes: string | null;
};

export interface WatchlistPerformanceReview {
  recordCount: number;
  reviewWindow: {
    firstTradeDate: string | null;
    lastTradeDate: string | null;
    minimumRecommendedSample: number;
    sampleSizeMet: boolean;
  };
  watchlistType: 'morning_continuation_watchlist';
  instrumentBreakdown: Record<string, number>;
  directionBreakdown: Record<WatchlistDirection, number>;
  laterValidSetupFormedCount: number;
  ranWithoutFreshEntryCount: number;
  reversedOrFailedCount: number;
  inconclusiveCount: number;
  commonReasonNoEntry: string[];
  commonWarnings: string[];
  noChaseProtectionNotes: string[];
  sampleRecords: Array<{
    tradeDate: string;
    instrument: string;
    direction: WatchlistDirection;
    classification: WatchlistOutcomeClassification;
    reasonNoEntry: string;
    laterSetupType: string | null;
  }>;
  recommendation: string;
  approvalBoundary: {
    reviewApprovesTrade: false;
    reviewChangesRules: false;
    reviewPromotesModel: false;
    reviewCreatesEntry: false;
    reviewCreatesTargets: false;
    reviewOverridesScanner: false;
  };
}

function baseResult(overrides: Partial<MorningContinuationWatchlistResult> = {}): MorningContinuationWatchlistResult {
  return {
    watchlistDetected: false,
    watchlistType: 'morning_continuation_watchlist',
    direction: 'NO TRADE',
    status: 'WATCH_ONLY',
    canExecute: false,
    freshEntryAvailable: false,
    tradeAlertEligible: false,
    reason: 'Morning continuation watchlist conditions not present.',
    noChaseWarning: true,
    requiredNextCondition: 'Wait for a completed 5M pullback or retest that passes existing approved rules.',
    memoryEligible: false,
    evidence: [],
    missingEvidence: [],
    auditWarnings: [],
    approvalBoundary: {
      watchlistApprovesTrade: false,
      watchlistChangesRules: false,
      watchlistCreatesEntry: false,
      watchlistCreatesTargets: false,
      watchlistOverridesScanner: false,
    },
    ...overrides,
  };
}

function sortedBars(bars: NinjaBridgeBar[]): NinjaBridgeBar[] {
  return [...bars]
    .filter((bar) =>
      isValidPrice(bar.open) &&
      isValidPrice(bar.high) &&
      isValidPrice(bar.low) &&
      isValidPrice(bar.close)
    )
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}

function openingRangeFromBars(bars: NinjaBridgeBar[]): { high: number | null; low: number | null } {
  const openingBars = bars.slice(0, Math.min(6, bars.length));
  if (!openingBars.length) return { high: null, low: null };
  return {
    high: Math.max(...openingBars.map((bar) => bar.high)),
    low: Math.min(...openingBars.map((bar) => bar.low)),
  };
}

function hasFreshExecutablePlan(input: MorningContinuationWatchlistInput): boolean {
  if (input.normalizedPlan?.canExecute) return true;
  if (
    input.selectedCandidate?.executionStatus === ExecutionStatus.Executable &&
    !input.selectedCandidate.blockReason
  ) {
    return true;
  }
  return input.scannerState === 'Approved' || input.scannerState === 'Executable';
}

function bodyQuality(bar: NinjaBridgeBar): number {
  const range = Math.max(0, bar.high - bar.low);
  if (!range) return 0;
  return Math.abs(bar.close - bar.open) / range;
}

function cloneOrNull<T>(value: T | null | undefined): T | null {
  return value ? JSON.parse(JSON.stringify(value)) as T : null;
}

function displacementBarForDirection(bars: NinjaBridgeBar[], direction: WatchlistDirection): NinjaBridgeBar | null {
  if (direction !== 'LONG' && direction !== 'SHORT') return null;
  return [...bars]
    .filter((bar) => direction === 'LONG' ? bar.close > bar.open : bar.close < bar.open)
    .sort((a, b) => {
      const aBody = Math.abs(a.close - a.open);
      const bBody = Math.abs(b.close - b.open);
      return bBody - aBody;
    })[0] || null;
}

export function detectMorningContinuationWatchlist(input: MorningContinuationWatchlistInput): MorningContinuationWatchlistResult {
  const auditWarnings = [
    'Morning continuation watchlist is advisory only. It cannot approve trades, create levels, or override scanner state.',
  ];

  if (input.window.session !== 'morning') {
    return baseResult({
      reason: 'Not a Morning execution context.',
      missingEvidence: ['Morning session context required.'],
      auditWarnings,
    });
  }

  if (hasFreshExecutablePlan(input)) {
    return baseResult({
      reason: 'Fresh executable app-owned setup already exists; watchlist is unnecessary.',
      missingEvidence: ['Watchlist suppressed because an app-owned executable setup is already selected.'],
      auditWarnings,
    });
  }

  const bars = sortedBars(input.bars5m);
  if (bars.length < 4) {
    return baseResult({
      reason: 'Not enough completed 5M bars to detect an early continuation watchlist.',
      missingEvidence: ['At least four completed 5M bars are required.'],
      auditWarnings,
    });
  }

  const openingRange = openingRangeFromBars(bars);
  const openingHigh = isValidPrice(input.openingRangeHigh) ? input.openingRangeHigh : openingRange.high;
  const openingLow = isValidPrice(input.openingRangeLow) ? input.openingRangeLow : openingRange.low;
  const latest = bars[bars.length - 1];
  const currentPrice = isValidPrice(input.currentPrice) ? input.currentPrice : latest.close;
  if (!isValidPrice(openingHigh) || !isValidPrice(openingLow) || !isValidPrice(currentPrice)) {
    return baseResult({
      reason: 'Opening range or current price is unavailable.',
      missingEvidence: ['Opening range high/low and current price are required.'],
      auditWarnings,
    });
  }

  const openingRangeSize = Math.max(1, openingHigh - openingLow);
  const bullishBreakDistance = currentPrice - openingHigh;
  const bearishBreakDistance = openingLow - currentPrice;
  const bestBullMove = Math.max(...bars.map((bar) => bar.high)) - openingLow;
  const bestBearMove = openingHigh - Math.min(...bars.map((bar) => bar.low));
  const bullishExpansion = bars.some((bar) => bar.close > bar.open && bodyQuality(bar) >= 0.6 && bar.high > openingHigh);
  const bearishExpansion = bars.some((bar) => bar.close < bar.open && bodyQuality(bar) >= 0.6 && bar.low < openingLow);
  const longExtended = bullishBreakDistance >= Math.max(2, openingRangeSize * 0.5) && bestBullMove >= Math.max(4, openingRangeSize);
  const shortExtended = bearishBreakDistance >= Math.max(2, openingRangeSize * 0.5) && bestBearMove >= Math.max(4, openingRangeSize);

  const direction: WatchlistDirection =
    bullishExpansion && longExtended && bestBullMove >= bestBearMove
      ? 'LONG'
      : bearishExpansion && shortExtended
        ? 'SHORT'
        : 'NO TRADE';

  if (direction === 'NO TRADE') {
    return baseResult({
      reason: 'No strong early directional displacement beyond the opening range.',
      missingEvidence: ['Strong displacement beyond opening range not confirmed.'],
      auditWarnings,
    });
  }

  const evidence = [
    `${direction} displacement detected after the open.`,
    direction === 'LONG'
      ? `Current price expanded above opening range high ${openingHigh}.`
      : `Current price expanded below opening range low ${openingLow}.`,
    'No fresh executable app-owned setup is currently selected.',
    'Current move is extended; no chase entry is permitted.',
  ];
  if (input.higherTimeframeAlignment === direction) {
    evidence.push('Higher-timeframe alignment supports the watchlist direction as context only.');
  }
  if (input.normalizedPlan?.earlyMoveReview?.status === 'already_triggered_no_fresh_entry') {
    evidence.push('App-owned plan already classified the move as already triggered with no fresh entry.');
  }

  return baseResult({
    watchlistDetected: true,
    direction,
    reason:
      direction === 'LONG'
        ? 'Strong bullish continuation is developing, but no fresh entry remains under current approved rules.'
        : 'Strong bearish continuation is developing, but no fresh entry remains under current approved rules.',
    memoryEligible: true,
    evidence,
    missingEvidence: [
      'No completed 5M pullback/retest has formed that passes existing approved rules.',
      'No safe fresh structure stop is available from this watchlist event.',
    ],
    auditWarnings,
  });
}

export function buildWatchlistMemoryRecord(input: WatchlistMemoryInput): WatchlistMemoryRecord {
  const bars = sortedBars(input.bars5m || []);
  const openingRange = openingRangeFromBars(bars);
  const openingRangeHigh = isValidPrice(input.openingRangeHigh) ? input.openingRangeHigh : openingRange.high;
  const openingRangeLow = isValidPrice(input.openingRangeLow) ? input.openingRangeLow : openingRange.low;
  const currentPriceAtAlert = isValidPrice(input.currentPriceAtAlert) ? input.currentPriceAtAlert : null;
  const displacementBar = displacementBarForDirection(bars, input.watchlist.direction);
  const displacementRange = isValidPrice(input.displacementRange)
    ? input.displacementRange
    : displacementBar
      ? Math.abs(displacementBar.high - displacementBar.low)
      : null;
  const distanceFromTrigger = isValidPrice(input.distanceFromTrigger)
    ? input.distanceFromTrigger
    : input.watchlist.direction === 'LONG' && isValidPrice(currentPriceAtAlert) && isValidPrice(openingRangeHigh)
      ? currentPriceAtAlert - openingRangeHigh
      : input.watchlist.direction === 'SHORT' && isValidPrice(currentPriceAtAlert) && isValidPrice(openingRangeLow)
        ? openingRangeLow - currentPriceAtAlert
        : null;

  return {
    memoryType: 'watchlist_context',
    watchlistType: 'morning_continuation_watchlist',
    tradeDate: input.tradeDate,
    instrument: input.instrument,
    session: 'morning',
    direction: input.watchlist.direction,
    status: 'WATCH_ONLY',
    freshEntryAvailable: false,
    tradeAlertEligible: false,
    canExecute: false,
    currentPriceAtAlert,
    openingRangeHigh,
    openingRangeLow,
    displacementTime: input.displacementTime || displacementBar?.time || null,
    displacementRange,
    distanceFromTrigger,
    distanceFromNearestStructureStop: isValidPrice(input.distanceFromNearestStructureStop)
      ? input.distanceFromNearestStructureStop
      : null,
    reasonNoEntry: input.reasonNoEntry || input.watchlist.reason,
    scannerState: input.scannerState || null,
    selectedCandidateSnapshot: cloneOrNull(input.selectedCandidateSnapshot),
    normalizedPlanSnapshot: cloneOrNull(input.normalizedPlanSnapshot),
    evidence: [...input.watchlist.evidence],
    missingEvidence: [...input.watchlist.missingEvidence],
    auditWarnings: [...input.watchlist.auditWarnings, ...(input.auditWarnings || [])],
    laterValidSetupFormed: null,
    laterSetupType: null,
    laterOutcome: null,
    laterReviewTimestamp: null,
    reviewNotes: null,
    notes: [
      'Watchlist saved for future context only.',
      'This does not change trade rules or future approval gates.',
      'Watchlist history may inform caution/context, not execution authority.',
    ],
    approvalBoundary: {
      ...input.watchlist.approvalBoundary,
      ragMemoryApprovesTrade: false,
      ragMemoryChangesRules: false,
    },
  };
}

export function buildWatchlistEmbeddingText(record: WatchlistMemoryRecord): string {
  return [
    'WATCHLIST CONTEXT ONLY',
    'This is a watchlist context record, not a trade.',
    'No entry, stop, or targets were generated.',
    'This record does not approve trades.',
    'Future use is context/caution only.',
    `Type: ${record.watchlistType}`,
    `Status: ${record.status} - NO FRESH ENTRY`,
    `Trade date: ${record.tradeDate}`,
    `Instrument: ${record.instrument}`,
    `Session: ${record.session}`,
    `Direction: ${record.direction}`,
    `Current price at alert: ${record.currentPriceAtAlert ?? 'unknown'}`,
    `Reason: ${record.reasonNoEntry}`,
    `Evidence: ${record.evidence.join(' | ') || 'none'}`,
    `Missing evidence: ${record.missingEvidence.join(' | ') || 'none'}`,
    'Action at time: Do not chase. Wait for existing current rules to confirm.',
    'Authority note: This record cannot approve trades, change rules, create entries, create targets, or override scanner gates.',
  ].join('\n');
}

function countBy<T extends string>(values: T[]): Record<T, number> {
  return values.reduce((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {} as Record<T, number>);
}

function topValues(values: string[], limit = 5): string[] {
  return Object.entries(countBy(values.filter(Boolean)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value, count]) => `${value} (${count})`);
}

function classifyWatchlistOutcome(record: WatchlistPerformanceRecord): WatchlistOutcomeClassification {
  if (record.laterValidSetupFormed === true || record.laterOutcome === 'later_valid_setup_formed' || record.laterOutcome === 'valid_setup') {
    return 'later_valid_setup_formed';
  }
  const combinedText = `${record.laterOutcome || ''} ${record.reviewNotes || ''}`.toLowerCase();
  if (combinedText.includes('ran_without') || combinedText.includes('ran without') || combinedText.includes('no fresh entry')) {
    return 'ran_without_fresh_entry';
  }
  if (combinedText.includes('reversed') || combinedText.includes('failed') || record.laterOutcome === 'reversed_or_failed') {
    return 'reversed_or_failed';
  }
  return 'inconclusive';
}

export function reviewWatchlistPerformance(records: WatchlistPerformanceRecord[]): WatchlistPerformanceReview {
  const copiedRecords = records.map((record) => cloneOrNull(record) as WatchlistPerformanceRecord);
  const sorted = copiedRecords
    .filter((record) => record.memoryType === 'watchlist_context' && record.watchlistType === 'morning_continuation_watchlist')
    .sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));
  const classifications = sorted.map(classifyWatchlistOutcome);
  const sampleSizeMet = sorted.length >= 20;
  const laterValidSetupFormedCount = classifications.filter((item) => item === 'later_valid_setup_formed').length;
  const ranWithoutFreshEntryCount = classifications.filter((item) => item === 'ran_without_fresh_entry').length;
  const reversedOrFailedCount = classifications.filter((item) => item === 'reversed_or_failed').length;
  const inconclusiveCount = classifications.filter((item) => item === 'inconclusive').length;

  return {
    recordCount: sorted.length,
    reviewWindow: {
      firstTradeDate: sorted[0]?.tradeDate || null,
      lastTradeDate: sorted[sorted.length - 1]?.tradeDate || null,
      minimumRecommendedSample: 20,
      sampleSizeMet,
    },
    watchlistType: 'morning_continuation_watchlist',
    instrumentBreakdown: countBy(sorted.map((record) => record.instrument)),
    directionBreakdown: {
      LONG: 0,
      SHORT: 0,
      'NO TRADE': 0,
      ...countBy(sorted.map((record) => record.direction)),
    },
    laterValidSetupFormedCount,
    ranWithoutFreshEntryCount,
    reversedOrFailedCount,
    inconclusiveCount,
    commonReasonNoEntry: topValues(sorted.map((record) => record.reasonNoEntry)),
    commonWarnings: topValues(sorted.flatMap((record) => record.auditWarnings || [])),
    noChaseProtectionNotes: [
      'No-chase rule preserved discipline on events where price ran without a fresh structure stop.',
      'Watchlist highlighted movement but did not produce executable trade authority.',
      'Continue tracking until more examples are available.',
    ],
    sampleRecords: sorted.slice(0, 5).map((record, index) => ({
      tradeDate: record.tradeDate,
      instrument: record.instrument,
      direction: record.direction,
      classification: classifications[index],
      reasonNoEntry: record.reasonNoEntry,
      laterSetupType: record.laterSetupType,
    })),
    recommendation: sampleSizeMet
      ? 'Descriptive watchlist review only. Patterns may be queued for human review, but this report does not recommend automatic rule changes or executable model promotion.'
      : 'Insufficient sample size. Continue tracking until at least 20-30 watchlist events are available. Do not infer performance quality or recommend rule changes.',
    approvalBoundary: {
      reviewApprovesTrade: false,
      reviewChangesRules: false,
      reviewPromotesModel: false,
      reviewCreatesEntry: false,
      reviewCreatesTargets: false,
      reviewOverridesScanner: false,
    },
  };
}
