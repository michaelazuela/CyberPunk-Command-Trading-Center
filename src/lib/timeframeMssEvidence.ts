import type { NinjaBridgeBar } from './ninjaTraderBridge';
import { parseBridgeTime } from './localScannerEngine';
import type {
  BridgeBarTimestampMode,
  BridgeBarTimeZoneMode,
  CompletedBarStatus,
  MssEvidenceDirection,
  MssEvidenceTimeframe,
  MultiTimeframeMssEvidenceLayer,
  TimeframeMssEvidence,
} from '../types';

export type TimeframeMssEvidenceInput = Partial<Record<'5M' | '15M' | '60M' | '120M' | '240M', NinjaBridgeBar[]>>;

const TIMEFRAMES: MssEvidenceTimeframe[] = ['5M', '15M', '60M', '120M', '240M'];
const TIMEFRAME_MINUTES: Record<MssEvidenceTimeframe, number> = {
  '5M': 5,
  '15M': 15,
  '60M': 60,
  '120M': 120,
  '240M': 240,
};

const DEFAULT_BAR_TIMESTAMP_MODE: BridgeBarTimestampMode = 'open';
const DEFAULT_BAR_TIME_ZONE: BridgeBarTimeZoneMode = 'eastern';

function isFinitePrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validBars(bars: NinjaBridgeBar[] | undefined): NinjaBridgeBar[] {
  return (bars || [])
    .filter((bar) =>
      bar &&
      typeof bar.time === 'string' &&
      isFinitePrice(bar.open) &&
      isFinitePrice(bar.high) &&
      isFinitePrice(bar.low) &&
      isFinitePrice(bar.close) &&
      bar.high >= Math.max(bar.open, bar.close) &&
      bar.low <= Math.min(bar.open, bar.close)
    )
    .slice()
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}

function timestampMs(value?: string | null, barTimeZone: BridgeBarTimeZoneMode = DEFAULT_BAR_TIME_ZONE): number | null {
  if (!value) return null;
  const parsed = parseBridgeTime(value, barTimeZone);
  return parsed ? parsed.getTime() : null;
}

function completedAtMs(
  bar: NinjaBridgeBar,
  timeframe: MssEvidenceTimeframe,
  barTimestampMode: BridgeBarTimestampMode,
  barTimeZone: BridgeBarTimeZoneMode
): number | null {
  const parsed = timestampMs(bar.time, barTimeZone);
  if (parsed === null) return null;
  return barTimestampMode === 'close'
    ? parsed
    : parsed + TIMEFRAME_MINUTES[timeframe] * 60 * 1000;
}

function completedBarStatus(
  bar: NinjaBridgeBar | undefined,
  timeframe: MssEvidenceTimeframe,
  asOfTimestamp: string | null | undefined,
  barTimestampMode: BridgeBarTimestampMode,
  barTimeZone: BridgeBarTimeZoneMode
): CompletedBarStatus {
  if (!bar) return 'unknown';
  const asOf = timestampMs(asOfTimestamp, barTimeZone);
  const completedAt = completedAtMs(bar, timeframe, barTimestampMode, barTimeZone);
  if (asOf === null || completedAt === null) return 'unknown';
  return completedAt <= asOf ? 'completed' : 'incomplete';
}

function completedBarsFor(
  bars: NinjaBridgeBar[],
  timeframe: MssEvidenceTimeframe,
  asOfTimestamp: string | null | undefined,
  barTimestampMode: BridgeBarTimestampMode,
  barTimeZone: BridgeBarTimeZoneMode
): NinjaBridgeBar[] {
  if (!asOfTimestamp) return bars;
  return bars.filter((bar) => completedBarStatus(bar, timeframe, asOfTimestamp, barTimestampMode, barTimeZone) === 'completed');
}

function range(bar: NinjaBridgeBar): number {
  return Math.max(0, bar.high - bar.low);
}

function body(bar: NinjaBridgeBar): number {
  return Math.abs(bar.close - bar.open);
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function roundRatio(value: number | null): number | null {
  return value === null || !Number.isFinite(value) ? null : Math.round(value * 100) / 100;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function priorRangeAverage(bars: NinjaBridgeBar[], index: number): number {
  return average(bars.slice(Math.max(0, index - 8), index).map(range).filter((value) => value > 0));
}

function displacementDirection(bar: NinjaBridgeBar): Exclude<MssEvidenceDirection, 'neutral' | 'unknown'> | null {
  if (bar.close > bar.open) return 'bullish';
  if (bar.close < bar.open) return 'bearish';
  return null;
}

function displacementQuality(bars: NinjaBridgeBar[], index: number): TimeframeMssEvidence['displacementQuality'] {
  const bar = bars[index];
  const candleRange = bar ? range(bar) : 0;
  const direction = bar ? displacementDirection(bar) : null;
  if (!bar || !direction || candleRange <= 0) {
    return {
      present: false,
      direction: null,
      score: 0,
      bodyToRange: null,
      closeLocation: null,
      rangeExpansion: null,
    };
  }

  const bodyToRange = body(bar) / candleRange;
  const closeLocation = direction === 'bullish'
    ? (bar.close - bar.low) / candleRange
    : (bar.high - bar.close) / candleRange;
  const avgRange = priorRangeAverage(bars, index);
  const rangeExpansion = avgRange > 0 ? candleRange / avgRange : 1;
  const score = clampScore((bodyToRange * 45) + (closeLocation * 35) + (Math.min(rangeExpansion, 2) / 2 * 20));
  return {
    present: bodyToRange >= 0.5 && closeLocation >= 0.65 && rangeExpansion >= 1.15,
    direction,
    score,
    bodyToRange: roundRatio(bodyToRange),
    closeLocation: roundRatio(closeLocation),
    rangeExpansion: roundRatio(rangeExpansion),
  };
}

type SwingPoint = {
  type: 'high' | 'low';
  index: number;
  price: number;
  timestamp: string;
};

function confirmedSwings(bars: NinjaBridgeBar[], strength = 1): SwingPoint[] {
  const swings: SwingPoint[] = [];
  if (bars.length < (strength * 2) + 1) return swings;

  for (let index = strength; index < bars.length - strength; index += 1) {
    const bar = bars[index];
    const left = bars.slice(index - strength, index);
    const right = bars.slice(index + 1, index + strength + 1);
    if (left.every((item) => bar.high > item.high) && right.every((item) => bar.high > item.high)) {
      swings.push({ type: 'high', index, price: bar.high, timestamp: bar.time });
    }
    if (left.every((item) => bar.low < item.low) && right.every((item) => bar.low < item.low)) {
      swings.push({ type: 'low', index, price: bar.low, timestamp: bar.time });
    }
  }

  return swings.sort((a, b) => a.index - b.index);
}

function lastSwingBefore(swings: SwingPoint[], index: number, type: SwingPoint['type']): SwingPoint | null {
  return swings.filter((swing) => swing.type === type && swing.index < index).at(-1) || null;
}

function priorStructureDirection(swings: SwingPoint[], index: number): MssEvidenceDirection {
  const priorHighs = swings.filter((swing) => swing.type === 'high' && swing.index < index).slice(-2);
  const priorLows = swings.filter((swing) => swing.type === 'low' && swing.index < index).slice(-2);
  const highsRising = priorHighs.length === 2 && priorHighs[1].price > priorHighs[0].price;
  const lowsRising = priorLows.length === 2 && priorLows[1].price > priorLows[0].price;
  const highsFalling = priorHighs.length === 2 && priorHighs[1].price < priorHighs[0].price;
  const lowsFalling = priorLows.length === 2 && priorLows[1].price < priorLows[0].price;

  if ((highsRising && lowsRising) || (lowsRising && !highsFalling)) return 'bullish';
  if ((highsFalling && lowsFalling) || (highsFalling && !lowsRising)) return 'bearish';
  return 'unknown';
}

function emptyStructureBreak(type: TimeframeMssEvidence['structureBreak']['type']): NonNullable<TimeframeMssEvidence['structureBreak']> {
  return {
    type,
    brokenLevel: null,
    brokenSwingTimestamp: null,
    priorStructureDirection: 'unknown',
    closeThroughPoints: null,
    wickOnlyBreak: false,
  };
}

function detectStructureBreak(
  bars: NinjaBridgeBar[],
  swings: SwingPoint[],
  index: number
): {
  direction: Exclude<MssEvidenceDirection, 'neutral' | 'unknown'> | null;
  isMss: boolean;
  breaksStructure: boolean;
  audit: NonNullable<TimeframeMssEvidence['structureBreak']>;
} {
  const bar = bars[index];
  const prior = bars[index - 1];
  if (!bar || !prior) {
    return { direction: null, isMss: false, breaksStructure: false, audit: emptyStructureBreak('insufficient_swings') };
  }

  const swingHigh = lastSwingBefore(swings, index, 'high');
  const swingLow = lastSwingBefore(swings, index, 'low');
  const structureDirection = priorStructureDirection(swings, index);
  const bullishCloseBreak = Boolean(swingHigh && prior.close <= swingHigh.price && bar.close > swingHigh.price);
  const bearishCloseBreak = Boolean(swingLow && prior.close >= swingLow.price && bar.close < swingLow.price);
  const bullishWickOnly = Boolean(swingHigh && bar.high > swingHigh.price && bar.close <= swingHigh.price);
  const bearishWickOnly = Boolean(swingLow && bar.low < swingLow.price && bar.close >= swingLow.price);

  if (bullishCloseBreak && swingHigh) {
    const isMss = structureDirection === 'bearish';
    return {
      direction: 'bullish',
      isMss,
      breaksStructure: true,
      audit: {
        type: isMss ? 'mss' : 'bos_continuation',
        brokenLevel: swingHigh.price,
        brokenSwingTimestamp: swingHigh.timestamp,
        priorStructureDirection: structureDirection,
        closeThroughPoints: roundRatio(bar.close - swingHigh.price),
        wickOnlyBreak: false,
      },
    };
  }

  if (bearishCloseBreak && swingLow) {
    const isMss = structureDirection === 'bullish';
    return {
      direction: 'bearish',
      isMss,
      breaksStructure: true,
      audit: {
        type: isMss ? 'mss' : 'bos_continuation',
        brokenLevel: swingLow.price,
        brokenSwingTimestamp: swingLow.timestamp,
        priorStructureDirection: structureDirection,
        closeThroughPoints: roundRatio(swingLow.price - bar.close),
        wickOnlyBreak: false,
      },
    };
  }

  return {
    direction: null,
    isMss: false,
    breaksStructure: false,
    audit: {
      ...emptyStructureBreak(swings.length < 2 ? 'insufficient_swings' : 'none'),
      priorStructureDirection: structureDirection,
      brokenLevel: bullishWickOnly ? swingHigh?.price ?? null : bearishWickOnly ? swingLow?.price ?? null : null,
      brokenSwingTimestamp: bullishWickOnly ? swingHigh?.timestamp ?? null : bearishWickOnly ? swingLow?.timestamp ?? null : null,
      wickOnlyBreak: bullishWickOnly || bearishWickOnly,
    },
  };
}

function emptyEvidence(
  timeframe: MssEvidenceTimeframe,
  status: TimeframeMssEvidence['status'],
  blockers: string[],
  barTimestampMode: BridgeBarTimestampMode,
  barTimeZone: BridgeBarTimeZoneMode
): TimeframeMssEvidence {
  return {
    timeframe,
    direction: 'unknown',
    status,
    displacementQuality: {
      present: false,
      direction: null,
      score: 0,
      bodyToRange: null,
      closeLocation: null,
      rangeExpansion: null,
    },
    breaksStructure: false,
    structureBreak: emptyStructureBreak('none'),
    evidenceTimestamp: null,
    completedBarStatus: 'unknown',
    barTimestampMode,
    barTimeZone,
    source: 'ninjatrader_ohlc',
    blockers,
    confidence: 0,
  };
}

export function buildTimeframeMssEvidence(args: {
  timeframe: MssEvidenceTimeframe;
  bars?: NinjaBridgeBar[];
  asOfTimestamp?: string | null;
  barTimestampMode?: BridgeBarTimestampMode;
  barTimeZone?: BridgeBarTimeZoneMode;
}): TimeframeMssEvidence {
  const barTimestampMode = args.barTimestampMode || DEFAULT_BAR_TIMESTAMP_MODE;
  const barTimeZone = args.barTimeZone || DEFAULT_BAR_TIME_ZONE;
  const bars = validBars(args.bars);
  if (!bars.length) return emptyEvidence(args.timeframe, 'insufficient_data', [`${args.timeframe}: no valid NinjaTrader OHLC bars available.`], barTimestampMode, barTimeZone);

  const completed = completedBarsFor(bars, args.timeframe, args.asOfTimestamp, barTimestampMode, barTimeZone);
  if (!completed.length) {
    return emptyEvidence(args.timeframe, 'pending_incomplete_bar', [`${args.timeframe}: latest bar is not completed at ${args.asOfTimestamp || 'unknown as-of time'} using ${barTimeZone}/${barTimestampMode} timestamp interpretation.`], barTimestampMode, barTimeZone);
  }

  const latestRaw = bars[bars.length - 1];
  const latestRawStatus = completedBarStatus(latestRaw, args.timeframe, args.asOfTimestamp, barTimestampMode, barTimeZone);
  const swings = confirmedSwings(completed);
  const structureCandidates = completed
    .map((bar, index) => ({ bar, index, quality: displacementQuality(completed, index), structure: detectStructureBreak(completed, swings, index) }))
    .filter((item) => item.structure.isMss && item.structure.direction)
    .reverse();
  const displacementCandidates = completed
    .map((bar, index) => ({ bar, index, quality: displacementQuality(completed, index), structure: detectStructureBreak(completed, swings, index) }))
    .filter((item) => item.quality.present && item.quality.direction)
    .reverse();

  if (!structureCandidates.length) {
    const selectedDisplacement = displacementCandidates[0] || null;
    if (selectedDisplacement) {
      const displacementDirectionValue = selectedDisplacement.quality.direction as Exclude<MssEvidenceDirection, 'neutral' | 'unknown'>;
      const blockers = [
        ...(latestRawStatus === 'incomplete' ? [`${args.timeframe}: latest bar is incomplete using ${barTimeZone}/${barTimestampMode}; evidence is based on last completed bar only.`] : []),
        selectedDisplacement.structure.breaksStructure
          ? `${args.timeframe}: displacement broke structure as ${selectedDisplacement.structure.audit.type}, not MSS against opposite prior swing structure.`
          : selectedDisplacement.structure.audit.wickOnlyBreak
            ? `${args.timeframe}: displacement wicked through a swing level but did not close through structure.`
            : `${args.timeframe}: displacement detected, but completed close did not break a confirmed swing structure level.`,
      ];

      return {
        timeframe: args.timeframe,
        direction: displacementDirectionValue,
        status: 'displacement_without_mss',
        displacementQuality: selectedDisplacement.quality,
        breaksStructure: selectedDisplacement.structure.breaksStructure,
        structureBreak: selectedDisplacement.structure.audit,
        evidenceTimestamp: selectedDisplacement.bar.time,
        completedBarStatus: 'completed',
        barTimestampMode,
        barTimeZone,
        source: 'ninjatrader_ohlc',
        blockers,
        confidence: clampScore(selectedDisplacement.quality.score - (selectedDisplacement.structure.breaksStructure ? 5 : 15) - (latestRawStatus === 'incomplete' ? 10 : 0)),
      };
    }

    return {
      ...emptyEvidence(args.timeframe, latestRawStatus === 'incomplete' ? 'pending_incomplete_bar' : 'no_mss', [], barTimestampMode, barTimeZone),
      direction: 'neutral',
      evidenceTimestamp: completed[completed.length - 1]?.time || null,
      completedBarStatus: latestRawStatus === 'unknown' ? 'unknown' : 'completed',
      barTimestampMode,
      barTimeZone,
      blockers: latestRawStatus === 'incomplete' ? [`${args.timeframe}: latest bar is incomplete using ${barTimeZone}/${barTimestampMode}; only completed bars were evaluated.`] : [],
      confidence: 20,
    };
  }

  const selected = structureCandidates[0];
  const direction = selected.structure.direction as Exclude<MssEvidenceDirection, 'neutral' | 'unknown'>;
  const blockers = [
    ...(latestRawStatus === 'incomplete' ? [`${args.timeframe}: latest bar is incomplete using ${barTimeZone}/${barTimestampMode}; evidence is based on last completed bar only.`] : []),
    ...(!selected.quality.present ? [`${args.timeframe}: confirmed swing-structure MSS does not have qualifying displacement on the break candle.`] : []),
  ];

  return {
    timeframe: args.timeframe,
    direction,
    status: 'confirmed_mss',
    displacementQuality: selected.quality,
    breaksStructure: true,
    structureBreak: selected.structure.audit,
    evidenceTimestamp: selected.bar.time,
    completedBarStatus: 'completed',
    barTimestampMode,
    barTimeZone,
    source: 'ninjatrader_ohlc',
    blockers,
    confidence: clampScore((selected.quality.present ? selected.quality.score : 55) + 10 - (latestRawStatus === 'incomplete' ? 10 : 0)),
  };
}

export function buildMultiTimeframeMssEvidenceLayer(args: {
  barsByTimeframe: TimeframeMssEvidenceInput;
  asOfTimestamp?: string | null;
  barTimestampMode?: BridgeBarTimestampMode;
  barTimeZone?: BridgeBarTimeZoneMode;
}): MultiTimeframeMssEvidenceLayer {
  const entries = TIMEFRAMES.map((timeframe) => [
    timeframe,
    buildTimeframeMssEvidence({
      timeframe,
      bars: args.barsByTimeframe[timeframe],
      asOfTimestamp: args.asOfTimestamp,
      barTimestampMode: args.barTimestampMode,
      barTimeZone: args.barTimeZone,
    }),
  ] as const);

  return {
    source: 'ninjatrader_ohlc',
    authority: 'ohlc_facts_only',
    boundary: 'evidence_only_not_approval_or_execution_authority',
    timeframes: Object.fromEntries(entries) as Record<MssEvidenceTimeframe, TimeframeMssEvidence>,
    notes: [
      'Per-timeframe MSS/displacement evidence is stored separately from htfLiquidityDrawState.',
      'CONFLICTING_MSS classifications must not erase raw timeframe evidence.',
      'This layer does not change model approval gates, scanner behavior, bridge behavior, Discord behavior, or canExecute behavior.',
    ],
    approvesExecution: false,
    changesTradeLogic: false,
  };
}
