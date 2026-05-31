import type { ResearchCandidateOutcome } from '../agents/researchOutcomeMathAgent';

export type FuturesRootSymbol = 'MES' | 'MNQ' | 'ES' | 'NQ' | 'UNKNOWN';

export type FuturesContractMetadata = {
  rootSymbol: Exclude<FuturesRootSymbol, 'UNKNOWN'>;
  displayName: string;
  contracts: 1;
  pointValue: number;
  tickSize: number;
  tickValue: number;
  currency: 'USD';
  source: 'static_contract_metadata';
};

export type EstimatedGrossContractPnlStatus =
  | 'available'
  | 'partial'
  | 'unavailable_no_outcome_math'
  | 'unavailable_no_defined_hypothetical_outcome'
  | 'unavailable_unknown_contract';

export type EstimatedGrossContractPnl = {
  rootSymbol: FuturesRootSymbol;
  displayName: string;
  contracts: 1;
  pointValue: number;
  tickSize: number;
  tickValue: number;
  currency: 'USD';
  metadataSource: 'static_contract_metadata';
  mfePoints?: number;
  mfeTicks?: number;
  mfeDollars?: number;
  maePoints?: number;
  maeTicks?: number;
  maeDollars?: number;
  t1Points?: number;
  t1Ticks?: number;
  t1Dollars?: number;
  t2Points?: number;
  t2Ticks?: number;
  t2Dollars?: number;
  adversePoints?: number;
  adverseTicks?: number;
  adverseDollars?: number;
  hypotheticalOutcomePoints?: number;
  hypotheticalOutcomeTicks?: number;
  hypotheticalOutcomeDollars?: number;
  firstMeaningfulMovePoints?: number;
  firstMeaningfulMoveTicks?: number;
  firstMeaningfulMoveDollars?: number;
  status: EstimatedGrossContractPnlStatus;
  note: string;
};

export const FUTURES_CONTRACT_METADATA: Record<Exclude<FuturesRootSymbol, 'UNKNOWN'>, FuturesContractMetadata> = {
  MES: {
    rootSymbol: 'MES',
    displayName: 'Micro E-mini S&P 500',
    contracts: 1,
    pointValue: 5,
    tickSize: 0.25,
    tickValue: 1.25,
    currency: 'USD',
    source: 'static_contract_metadata',
  },
  MNQ: {
    rootSymbol: 'MNQ',
    displayName: 'Micro E-mini Nasdaq-100',
    contracts: 1,
    pointValue: 2,
    tickSize: 0.25,
    tickValue: 0.5,
    currency: 'USD',
    source: 'static_contract_metadata',
  },
  ES: {
    rootSymbol: 'ES',
    displayName: 'E-mini S&P 500',
    contracts: 1,
    pointValue: 50,
    tickSize: 0.25,
    tickValue: 12.5,
    currency: 'USD',
    source: 'static_contract_metadata',
  },
  NQ: {
    rootSymbol: 'NQ',
    displayName: 'E-mini Nasdaq-100',
    contracts: 1,
    pointValue: 20,
    tickSize: 0.25,
    tickValue: 5,
    currency: 'USD',
    source: 'static_contract_metadata',
  },
};

const UNKNOWN_NOTE = 'Contract metadata could not be resolved; dollar P/L was not calculated.';

export function pointsToDollars(points: number, pointValue: number): number {
  return points * pointValue;
}

export function pointsToTicks(points: number, tickSize: number): number {
  return points / tickSize;
}

export function ticksToDollars(ticks: number, tickValue: number): number {
  return ticks * tickValue;
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function normalizeFuturesRootSymbol(value: unknown): FuturesRootSymbol {
  if (typeof value !== 'string' || !value.trim()) return 'UNKNOWN';
  const compact = value.toUpperCase().replace(/^\//, '').replace(/[^A-Z0-9]/g, '');
  if (compact.startsWith('MES')) return 'MES';
  if (compact.startsWith('MNQ')) return 'MNQ';
  if (compact.startsWith('ES')) return 'ES';
  if (compact.startsWith('NQ')) return 'NQ';
  return 'UNKNOWN';
}

export function resolveFuturesContractMetadata(...symbols: unknown[]): FuturesContractMetadata | null {
  for (const symbol of symbols) {
    const root = normalizeFuturesRootSymbol(symbol);
    if (root !== 'UNKNOWN') return FUTURES_CONTRACT_METADATA[root];
  }
  return null;
}

function unknownEstimate(): EstimatedGrossContractPnl {
  return {
    rootSymbol: 'UNKNOWN',
    displayName: 'Unknown futures contract',
    contracts: 1,
    pointValue: 0,
    tickSize: 0,
    tickValue: 0,
    currency: 'USD',
    metadataSource: 'static_contract_metadata',
    status: 'unavailable_unknown_contract',
    note: UNKNOWN_NOTE,
  };
}

function baseEstimate(metadata: FuturesContractMetadata, status: EstimatedGrossContractPnlStatus): EstimatedGrossContractPnl {
  return {
    rootSymbol: metadata.rootSymbol,
    displayName: metadata.displayName,
    contracts: 1,
    pointValue: metadata.pointValue,
    tickSize: metadata.tickSize,
    tickValue: metadata.tickValue,
    currency: metadata.currency,
    metadataSource: metadata.source,
    status,
    note: `Research-only gross estimate for 1 ${metadata.rootSymbol} contract. Excludes commissions, slippage, spread, fills, partial fills, taxes, fees, and live execution effects.`,
  };
}

function addPointValue(
  estimate: EstimatedGrossContractPnl,
  prefix: 'mfe' | 'mae' | 't1' | 't2' | 'adverse' | 'hypotheticalOutcome' | 'firstMeaningfulMove',
  points: number | null | undefined,
): void {
  if (!finite(points) || estimate.rootSymbol === 'UNKNOWN' || estimate.tickSize <= 0) return;
  const ticks = pointsToTicks(points, estimate.tickSize);
  const dollars = pointsToDollars(points, estimate.pointValue);
  const values = {
    points: round(points),
    ticks: round(ticks),
    dollars: round(dollars),
  };
  switch (prefix) {
    case 'mfe':
      estimate.mfePoints = values.points;
      estimate.mfeTicks = values.ticks;
      estimate.mfeDollars = values.dollars;
      break;
    case 'mae':
      estimate.maePoints = values.points;
      estimate.maeTicks = values.ticks;
      estimate.maeDollars = values.dollars;
      break;
    case 't1':
      estimate.t1Points = values.points;
      estimate.t1Ticks = values.ticks;
      estimate.t1Dollars = values.dollars;
      break;
    case 't2':
      estimate.t2Points = values.points;
      estimate.t2Ticks = values.ticks;
      estimate.t2Dollars = values.dollars;
      break;
    case 'adverse':
      estimate.adversePoints = values.points;
      estimate.adverseTicks = values.ticks;
      estimate.adverseDollars = values.dollars;
      break;
    case 'hypotheticalOutcome':
      estimate.hypotheticalOutcomePoints = values.points;
      estimate.hypotheticalOutcomeTicks = values.ticks;
      estimate.hypotheticalOutcomeDollars = values.dollars;
      break;
    case 'firstMeaningfulMove':
      estimate.firstMeaningfulMovePoints = values.points;
      estimate.firstMeaningfulMoveTicks = values.ticks;
      estimate.firstMeaningfulMoveDollars = values.dollars;
      break;
  }
}

function hypotheticalOutcomePoints(outcome: ResearchCandidateOutcome): number | null {
  const overlay = outcome.hypotheticalOutcomeOverlay;
  const label = overlay?.hypotheticalOutcomeLabel;
  const event = overlay?.firstResolvedEvent;
  if (label === 'favorable_continuation' || event === 'favorable_threshold_two') return outcome.thresholdTwoPoints;
  if (label === 'partial_favorable' || event === 'favorable_threshold_one') return outcome.thresholdOnePoints;
  if (label === 'adverse_first' || event === 'adverse_invalidation') return -outcome.adverseThresholdPoints;
  return null;
}

function firstMeaningfulMovePoints(outcome: ResearchCandidateOutcome): number | null {
  if (outcome.firstMeaningfulMove === 'favorable') return outcome.thresholdOnePoints;
  if (outcome.firstMeaningfulMove === 'adverse') return -outcome.adverseThresholdPoints;
  return null;
}

export function calculateEstimatedGrossContractPnl(args: {
  outcome?: ResearchCandidateOutcome | null;
  sampleSymbol?: unknown;
  reviewPackSymbol?: unknown;
  ledgerSymbol?: unknown;
}): EstimatedGrossContractPnl {
  const metadata = resolveFuturesContractMetadata(args.sampleSymbol, args.reviewPackSymbol, args.ledgerSymbol);
  if (!metadata) return unknownEstimate();
  if (!args.outcome) return baseEstimate(metadata, 'unavailable_no_outcome_math');

  const estimate = baseEstimate(metadata, 'partial');
  addPointValue(estimate, 'mfe', args.outcome.maxFavorableExcursionPoints);
  addPointValue(estimate, 'mae', finite(args.outcome.maxAdverseExcursionPoints) ? -args.outcome.maxAdverseExcursionPoints : null);
  addPointValue(estimate, 't1', finite(args.outcome.thresholdOnePoints) ? args.outcome.thresholdOnePoints : null);
  addPointValue(estimate, 't2', finite(args.outcome.thresholdTwoPoints) ? args.outcome.thresholdTwoPoints : null);
  addPointValue(estimate, 'adverse', finite(args.outcome.adverseThresholdPoints) ? -args.outcome.adverseThresholdPoints : null);
  addPointValue(estimate, 'firstMeaningfulMove', firstMeaningfulMovePoints(args.outcome));

  const hypotheticalPoints = hypotheticalOutcomePoints(args.outcome);
  addPointValue(estimate, 'hypotheticalOutcome', hypotheticalPoints);
  estimate.status = finite(hypotheticalPoints)
    ? 'available'
    : (finite(args.outcome.maxFavorableExcursionPoints) || finite(args.outcome.maxAdverseExcursionPoints))
      ? 'partial'
      : 'unavailable_no_defined_hypothetical_outcome';
  return estimate;
}

export function coerceEstimatedGrossContractPnl(value: unknown): EstimatedGrossContractPnl | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Partial<EstimatedGrossContractPnl>;
  if (!record.rootSymbol || !record.status || record.contracts !== 1) return null;
  return record as EstimatedGrossContractPnl;
}
