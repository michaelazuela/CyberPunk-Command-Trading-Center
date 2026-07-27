import { roundToTradeTick, targetsFromEntryStop } from '../config/tradeRules';

export type ProtectedShelfTimeframe = '15M' | '60M' | '120M' | '240M';
export type ProtectedShelfDirection = 'LONG' | 'SHORT';
export type ProtectedShelfState = 'watching' | 'forming' | 'proof_completed' | 'no_chase' | 'invalidated' | 'data_limited';

export interface ProtectedShelfBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface ProtectedShelfWatch {
  sourceOfTruth: 'protected_shelf_watch';
  state: ProtectedShelfState;
  direction: ProtectedShelfDirection | null;
  shelfTimeframe: ProtectedShelfTimeframe | null;
  shelfPrice: number | null;
  shelfKind: 'resistance_failure' | 'support_failure' | null;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
  proofTime: string | null;
  latestCompleted5mTime: string | null;
  noChaseReason: string | null;
  evidence: string[];
  missingEvidence: string[];
  authority: {
    htfShelfApprovesTrades: false;
    completed5mProofRequired: true;
    changesCanExecute: false;
    automatedOrders: false;
  };
}

export interface ProtectedShelfWatchInput {
  fiveMinuteBars: ProtectedShelfBar[];
  fifteenMinuteBars: ProtectedShelfBar[];
  shelfTimeframe?: ProtectedShelfTimeframe;
  shelfTolerancePoints?: number;
  generatedAt?: string;
}

function finitePrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function validBar(bar: ProtectedShelfBar): boolean {
  return Boolean(
    typeof bar.time === 'string' &&
    finitePrice(bar.open) &&
    finitePrice(bar.high) &&
    finitePrice(bar.low) &&
    finitePrice(bar.close) &&
    bar.high >= Math.max(bar.open, bar.close) &&
    bar.low <= Math.min(bar.open, bar.close),
  );
}

function sortedBars(bars: ProtectedShelfBar[]): ProtectedShelfBar[] {
  return bars.filter(validBar).slice().sort((a, b) => a.time.localeCompare(b.time));
}

function bodyRatio(bar: ProtectedShelfBar): number {
  const range = bar.high - bar.low;
  return range > 0 ? Math.abs(bar.close - bar.open) / range : 0;
}

function closeLocation(bar: ProtectedShelfBar): number {
  const range = bar.high - bar.low;
  return range > 0 ? (bar.close - bar.low) / range : 0.5;
}

function priorBars<T extends ProtectedShelfBar>(bars: T[], index: number, lookback: number): T[] {
  return bars.slice(Math.max(0, index - lookback), index);
}

function clusteredLevel(values: number[], tolerance: number, side: 'high' | 'low'): number | null {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  let bestCluster: number[] = [];
  for (const anchor of sorted) {
    const cluster = sorted.filter((value) => Math.abs(value - anchor) <= tolerance);
    if (
      cluster.length > bestCluster.length ||
      (cluster.length === bestCluster.length &&
        (side === 'high' ? Math.max(...cluster) > Math.max(...bestCluster) : Math.min(...cluster) < Math.min(...bestCluster)))
    ) {
      bestCluster = cluster;
    }
  }
  if (!bestCluster.length) return null;
  const level = side === 'high' ? Math.max(...bestCluster) : Math.min(...bestCluster);
  return roundToTradeTick(level);
}

function emptyWatch(state: ProtectedShelfState, missingEvidence: string[]): ProtectedShelfWatch {
  return {
    sourceOfTruth: 'protected_shelf_watch',
    state,
    direction: null,
    shelfTimeframe: null,
    shelfPrice: null,
    shelfKind: null,
    entry: null,
    stop: null,
    target1: null,
    target2: null,
    riskPoints: null,
    proofTime: null,
    latestCompleted5mTime: null,
    noChaseReason: null,
    evidence: [],
    missingEvidence,
    authority: {
      htfShelfApprovesTrades: false,
      completed5mProofRequired: true,
      changesCanExecute: false,
      automatedOrders: false,
    },
  };
}

function targetAlreadyPassed(direction: ProtectedShelfDirection, proofClose: number, target1: number | null): boolean {
  if (!finitePrice(target1)) return false;
  return direction === 'LONG' ? proofClose >= target1 : proofClose <= target1;
}

function buildWatch(args: {
  direction: ProtectedShelfDirection;
  shelfTimeframe: ProtectedShelfTimeframe;
  shelfPrice: number;
  shelfKind: ProtectedShelfWatch['shelfKind'];
  proofBar: ProtectedShelfBar;
  entry: number;
  stop: number;
  evidence: string[];
}): ProtectedShelfWatch {
  const targets = targetsFromEntryStop(args.direction, args.entry, args.stop);
  const noChase = targetAlreadyPassed(args.direction, args.proofBar.close, targets.target1);
  return {
    sourceOfTruth: 'protected_shelf_watch',
    state: noChase ? 'no_chase' : 'proof_completed',
    direction: args.direction,
    shelfTimeframe: args.shelfTimeframe,
    shelfPrice: args.shelfPrice,
    shelfKind: args.shelfKind,
    entry: args.entry,
    stop: args.stop,
    target1: targets.target1,
    target2: targets.target2,
    riskPoints: targets.riskPoints,
    proofTime: args.proofBar.time,
    latestCompleted5mTime: args.proofBar.time,
    noChaseReason: noChase
      ? 'Completed 5M proof closed at or beyond T1; do not chase. Wait for retest/hold or a new protected 5M structure.'
      : null,
    evidence: [
      ...args.evidence,
      `Completed 5M proof at ${args.proofBar.time}.`,
      '5M proof is execution authority; HTF/15M shelf is context/routing only.',
    ],
    missingEvidence: targets.target1 === null || targets.target2 === null ? ['Missing valid target math from entry/stop.'] : [],
    authority: {
      htfShelfApprovesTrades: false,
      completed5mProofRequired: true,
      changesCanExecute: false,
      automatedOrders: false,
    },
  };
}

function buildFormingWatch(args: {
  direction: ProtectedShelfDirection;
  shelfTimeframe: ProtectedShelfTimeframe;
  shelfPrice: number;
  shelfKind: ProtectedShelfWatch['shelfKind'];
  latestBar: ProtectedShelfBar;
  evidence: string[];
}): ProtectedShelfWatch {
  return {
    sourceOfTruth: 'protected_shelf_watch',
    state: 'forming',
    direction: args.direction,
    shelfTimeframe: args.shelfTimeframe,
    shelfPrice: args.shelfPrice,
    shelfKind: args.shelfKind,
    entry: null,
    stop: null,
    target1: null,
    target2: null,
    riskPoints: null,
    proofTime: null,
    latestCompleted5mTime: args.latestBar.time,
    noChaseReason: null,
    evidence: [
      ...args.evidence,
      `Latest completed 5M candle at ${args.latestBar.time} is forming protected-shelf failure context.`,
      'Watch only: completed 5M close-through proof, protected stop, and target math are still required.',
    ],
    missingEvidence: [
      'Missing completed 5M failure/displacement proof.',
      'Missing protected 5M stop from completed proof.',
      'Missing valid target math from entry/stop.',
    ],
    authority: {
      htfShelfApprovesTrades: false,
      completed5mProofRequired: true,
      changesCanExecute: false,
      automatedOrders: false,
    },
  };
}

export function detectProtectedShelfWatch(input: ProtectedShelfWatchInput): ProtectedShelfWatch {
  const fiveMinuteBars = sortedBars(input.fiveMinuteBars);
  const fifteenMinuteBars = sortedBars(input.fifteenMinuteBars);
  const tolerance = input.shelfTolerancePoints ?? 1.5;
  const shelfTimeframe = input.shelfTimeframe ?? '15M';
  if (fiveMinuteBars.length < 3) return emptyWatch('data_limited', ['Need at least three completed 5M bars.']);
  if (fifteenMinuteBars.length < 3) return emptyWatch('data_limited', ['Need at least three completed 15M bars to classify a protected shelf.']);

  for (let index = 2; index < fiveMinuteBars.length; index += 1) {
    const proofBar = fiveMinuteBars[index];
    const prior5m = priorBars(fiveMinuteBars, index, 6);
    const htfContext = fifteenMinuteBars.filter((bar) => bar.time <= proofBar.time).slice(-8);
    if (prior5m.length < 2 || htfContext.length < 3) continue;

    const highShelf = clusteredLevel(htfContext.map((bar) => bar.high), tolerance, 'high');
    if (finitePrice(highShelf)) {
      const testedShelf = proofBar.high >= highShelf - tolerance;
      const failedBelow = proofBar.close < highShelf;
      const bearishProof = proofBar.close < proofBar.open && bodyRatio(proofBar) >= 0.45 && closeLocation(proofBar) <= 0.45;
      const previous = prior5m.at(-1);
      const closesThroughPriorStructure = finitePrice(previous?.low) ? proofBar.close < previous.low : false;
      if (testedShelf && failedBelow && bearishProof && closesThroughPriorStructure) {
        const entry = roundToTradeTick(previous?.close ?? proofBar.close);
        const stop = roundToTradeTick(Math.max(proofBar.high, highShelf) + 0.25);
        const watch = buildWatch({
          direction: 'SHORT',
          shelfTimeframe,
          shelfPrice: highShelf,
          shelfKind: 'resistance_failure',
          proofBar,
          entry,
          stop,
          evidence: [
            `${shelfTimeframe} protected resistance shelf near ${highShelf}.`,
            `5M tested the shelf and closed back below it at ${proofBar.close}.`,
          ],
        });
        return watch;
      }
    }

    const lowShelf = clusteredLevel(htfContext.map((bar) => bar.low), tolerance, 'low');
    if (finitePrice(lowShelf)) {
      const raidedShelf = proofBar.low <= lowShelf + tolerance || prior5m.some((bar) => bar.low <= lowShelf + tolerance);
      const reclaimedAbove = proofBar.close > lowShelf;
      const bullishProof = proofBar.close > proofBar.open && bodyRatio(proofBar) >= 0.45 && closeLocation(proofBar) >= 0.55;
      const previous = prior5m.at(-1);
      const closesThroughPriorStructure = finitePrice(previous?.high) ? proofBar.close > previous.high : false;
      if (raidedShelf && reclaimedAbove && bullishProof && closesThroughPriorStructure) {
        const entry = roundToTradeTick(finitePrice(previous?.high) ? previous.high - 0.25 : proofBar.open);
        const stop = roundToTradeTick(proofBar.low - 0.25);
        const watch = buildWatch({
          direction: 'LONG',
          shelfTimeframe,
          shelfPrice: lowShelf,
          shelfKind: 'support_failure',
          proofBar,
          entry,
          stop,
          evidence: [
            `${shelfTimeframe} protected support shelf near ${lowShelf}.`,
            `5M raided or tested below the shelf and reclaimed above it at ${proofBar.close}.`,
          ],
        });
        return watch;
      }
    }
  }

  const latest = fiveMinuteBars.at(-1);
  if (latest) {
    const htfContext = fifteenMinuteBars.filter((bar) => bar.time <= latest.time).slice(-8);
    if (htfContext.length >= 3) {
      const highShelf = clusteredLevel(htfContext.map((bar) => bar.high), tolerance, 'high');
      const lowShelf = clusteredLevel(htfContext.map((bar) => bar.low), tolerance, 'low');
      const shortForming = finitePrice(highShelf) && latest.high >= highShelf - tolerance && latest.close < highShelf;
      const longForming = finitePrice(lowShelf) && latest.low <= lowShelf + tolerance && latest.close > lowShelf;
      const chooseShort =
        shortForming &&
        (!longForming ||
          (finitePrice(highShelf) && finitePrice(lowShelf) && Math.abs(highShelf - latest.high) < Math.abs(latest.low - lowShelf)) ||
          (latest.close < latest.open && !(latest.close > latest.open)));
      const chooseLong =
        longForming &&
        (!shortForming ||
          (finitePrice(highShelf) && finitePrice(lowShelf) && Math.abs(latest.low - lowShelf) < Math.abs(highShelf - latest.high)) ||
          (latest.close > latest.open && !(latest.close < latest.open)));
      if (chooseShort) {
        return buildFormingWatch({
          direction: 'SHORT',
          shelfTimeframe,
          shelfPrice: highShelf,
          shelfKind: 'resistance_failure',
          latestBar: latest,
          evidence: [
            `${shelfTimeframe} protected resistance shelf near ${highShelf}.`,
            `5M is reacting below the shelf at ${latest.close}; wait for bearish close-through proof.`,
          ],
        });
      }
      if (chooseLong) {
        return buildFormingWatch({
          direction: 'LONG',
          shelfTimeframe,
          shelfPrice: lowShelf,
          shelfKind: 'support_failure',
          latestBar: latest,
          evidence: [
            `${shelfTimeframe} protected support shelf near ${lowShelf}.`,
            `5M is reclaiming above the shelf at ${latest.close}; wait for bullish close-through proof.`,
          ],
        });
      }
    }
  }
  return {
    ...emptyWatch('watching', ['No completed 5M protected-shelf failure proof yet.']),
    latestCompleted5mTime: latest?.time || null,
    evidence: ['Protected shelf scanner is watching for failure/reclaim plus completed 5M proof.'],
  };
}
