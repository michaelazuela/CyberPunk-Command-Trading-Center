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
