import type { SessionSegmentName, StructuralLevel } from '../types';
import type { NinjaBridgeBar } from './ninjaTraderBridge';
import { TRADE_RULES } from '../config/tradeRules';

export interface SessionSegment {
  name: SessionSegmentName;
  label: string;
  bars: NinjaBridgeBar[];
  high: number | null;
  low: number | null;
  open: number | null;
  close: number | null;
  midpoint: number | null;
  rangePoints: number | null;
}

function isPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function roundToTick(price: number): number {
  return Math.round(price / TRADE_RULES.targetModel.tickSize) * TRADE_RULES.targetModel.tickSize;
}

function minutesFromIso(value: string): number | null {
  const match = value.match(/T(\d{2}):(\d{2})/);
  if (match) return Number(match[1]) * 60 + Number(match[2]);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getHours() * 60 + date.getMinutes();
}

function inMinuteRange(minutes: number | null, start: number, end: number): boolean {
  if (minutes === null) return false;
  if (start <= end) return minutes >= start && minutes <= end;
  return minutes >= start || minutes <= end;
}

function buildSegment(name: SessionSegmentName, label: string, bars: NinjaBridgeBar[]): SessionSegment {
  const valid = bars.filter(bar => isPrice(bar.high) && isPrice(bar.low) && isPrice(bar.open) && isPrice(bar.close));
  const high = valid.length ? Math.max(...valid.map(bar => bar.high)) : null;
  const low = valid.length ? Math.min(...valid.map(bar => bar.low)) : null;
  return {
    name,
    label,
    bars: valid,
    high,
    low,
    open: valid[0]?.open ?? null,
    close: valid[valid.length - 1]?.close ?? null,
    midpoint: high !== null && low !== null ? roundToTick((high + low) / 2) : null,
    rangePoints: high !== null && low !== null ? roundToTick(high - low) : null,
  };
}

export function segmentTradingSession(bars: NinjaBridgeBar[]): SessionSegment[] {
  const valid = bars.filter(bar => isPrice(bar.high) && isPrice(bar.low));
  const byRange = (start: number, end: number) => valid.filter(bar => inMinuteRange(minutesFromIso(bar.time), start, end));

  return [
    buildSegment('full_context', 'Full ETH Context', valid),
    buildSegment('previous_rth', 'Previous RTH', byRange(9 * 60 + 30, 16 * 60)),
    buildSegment('prior_eth', 'Prior ETH / Globex Context', byRange(18 * 60, 23 * 60 + 59)),
    buildSegment('asian', 'Asian Session', byRange(20 * 60, 2 * 60)),
    buildSegment('london', 'London Session', byRange(3 * 60, 8 * 60 + 29)),
    buildSegment('ny_premarket', 'New York Premarket', byRange(8 * 60 + 30, 9 * 60 + 29)),
    buildSegment('rth_morning', 'RTH Morning Window', byRange(9 * 60 + 30, 10 * 60 + 10)),
    buildSegment('lunch', 'Lunch Review Window', byRange(11 * 60 + 50, 13 * 60)),
    buildSegment('current_window', 'Current Imported Window', valid.slice(-16)),
  ];
}

function pushLevel(levels: StructuralLevel[], level: StructuralLevel) {
  if (!isPrice(level.price)) return;
  const price = roundToTick(level.price);
  const existing = levels.find(candidate =>
    Math.abs(candidate.price - price) <= TRADE_RULES.targetModel.tickSize &&
    candidate.type === level.type &&
    candidate.source === level.source
  );
  if (existing) {
    existing.touches = (existing.touches || 1) + (level.touches || 1);
    return;
  }
  levels.push({ ...level, price });
}

export function buildStructuralLevels({
  bars5m,
  bars15m = [],
  bars60m = [],
  bars240m = [],
  midnightOpen,
  rthOpen,
}: {
  bars5m: NinjaBridgeBar[];
  bars15m?: NinjaBridgeBar[];
  bars60m?: NinjaBridgeBar[];
  bars240m?: NinjaBridgeBar[];
  midnightOpen?: number | null;
  rthOpen?: number | null;
}): StructuralLevel[] {
  const contextBars = [...bars240m, ...bars60m, ...bars15m, ...bars5m].filter(bar => isPrice(bar.high) && isPrice(bar.low));
  const segments = segmentTradingSession(contextBars);
  const levels: StructuralLevel[] = [];

  segments.forEach(segment => {
    if (segment.high !== null) {
      pushLevel(levels, {
        label: `${segment.label} High`,
        price: segment.high,
        type: 'high',
        source: segment.name,
        directionRelevance: 'LONG',
        confidence: segment.bars.length >= 4 ? 'High' : segment.bars.length ? 'Medium' : 'Unreadable',
        touches: 1,
        evidence: `${segment.bars.length} bars reviewed for ${segment.label}.`,
      });
    }
    if (segment.low !== null) {
      pushLevel(levels, {
        label: `${segment.label} Low`,
        price: segment.low,
        type: 'low',
        source: segment.name,
        directionRelevance: 'SHORT',
        confidence: segment.bars.length >= 4 ? 'High' : segment.bars.length ? 'Medium' : 'Unreadable',
        touches: 1,
        evidence: `${segment.bars.length} bars reviewed for ${segment.label}.`,
      });
    }
  });

  const pushHigherTimeframeContext = (bars: NinjaBridgeBar[], label: string) => {
    const valid = bars.filter(bar => isPrice(bar.high) && isPrice(bar.low));
    if (!valid.length) return;
    const high = Math.max(...valid.map(bar => bar.high));
    const low = Math.min(...valid.map(bar => bar.low));
    pushLevel(levels, {
      label: `${label} High`,
      price: high,
      type: 'high',
      source: 'full_context',
      directionRelevance: 'LONG',
      confidence: valid.length >= 3 ? 'High' : 'Medium',
      touches: 1,
      evidence: `${valid.length} ${label} bars reviewed as macro liquidity context. Context only; 5M remains execution.`,
      contextRuleTags: ['higher_timeframe_context', label.toLowerCase().replace(/\s+/g, '_')],
      contextNote: `${label} high is a macro liquidity/target reference, not an execution trigger.`,
    });
    pushLevel(levels, {
      label: `${label} Low`,
      price: low,
      type: 'low',
      source: 'full_context',
      directionRelevance: 'SHORT',
      confidence: valid.length >= 3 ? 'High' : 'Medium',
      touches: 1,
      evidence: `${valid.length} ${label} bars reviewed as macro liquidity context. Context only; 5M remains execution.`,
      contextRuleTags: ['higher_timeframe_context', label.toLowerCase().replace(/\s+/g, '_')],
      contextNote: `${label} low is a macro liquidity/target reference, not an execution trigger.`,
    });
  };

  pushHigherTimeframeContext(bars240m, '4H Macro Context');
  pushHigherTimeframeContext(bars60m, '1H Session Context');

  if (isPrice(midnightOpen)) {
    pushLevel(levels, {
      label: 'Midnight Open',
      price: midnightOpen,
      type: 'midnight_open',
      source: 'app',
      directionRelevance: 'BOTH',
      confidence: 'High',
      evidence: 'Manual or extracted Midnight Open value.',
    });
  }

  if (isPrice(rthOpen)) {
    pushLevel(levels, {
      label: 'RTH Open',
      price: rthOpen,
      type: 'rth_open',
      source: 'rth_morning',
      directionRelevance: 'BOTH',
      confidence: 'High',
      evidence: 'First imported 5M RTH bar open.',
    });
  }

  const full = segments.find(segment => segment.name === 'full_context');
  if (isPrice(full?.high) && isPrice(full?.low)) {
    const lowRound = Math.floor((full.low as number) / 10) * 10;
    const highRound = Math.ceil((full.high as number) / 10) * 10;
    for (let price = lowRound; price <= highRound; price += 10) {
      pushLevel(levels, {
        label: `Round Number ${price}`,
        price,
        type: 'round_number',
        source: 'app',
        directionRelevance: 'BOTH',
        confidence: 'Medium',
        evidence: 'Whole/round-number magnet inside imported context range.',
      });
    }
  }

  return levels.sort((a, b) => a.price - b.price);
}
