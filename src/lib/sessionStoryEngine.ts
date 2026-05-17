import type {
  DisplacementCandleFact,
  FvgZoneFact,
  SessionImbalanceZone,
  SessionLevelRelationship,
  SessionSegmentName,
  SessionStats,
  SessionStory,
  StructuralLevel,
} from '../types';
import type { NinjaBridgeBar } from './ninjaTraderBridge';
import { TRADE_RULES } from '../config/tradeRules';
import { segmentTradingSession } from './sessionStructure';

function isPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function roundToTick(price: number): number {
  return Math.round(price / TRADE_RULES.targetModel.tickSize) * TRADE_RULES.targetModel.tickSize;
}

function segmentTrend(open: number | null, close: number | null): SessionStats['trend'] {
  if (!isPrice(open) || !isPrice(close)) return 'unknown';
  const delta = close - open;
  if (Math.abs(delta) < TRADE_RULES.targetModel.tickSize * 4) return 'balanced';
  return delta > 0 ? 'bullish' : 'bearish';
}

function toStats(): (segment: ReturnType<typeof segmentTradingSession>[number]) => SessionStats {
  return (segment) => ({
    name: segment.name,
    label: segment.label,
    barCount: segment.bars.length,
    high: segment.high,
    low: segment.low,
    open: segment.open,
    close: segment.close,
    midpoint: segment.midpoint,
    rangePoints: segment.rangePoints,
    trend: segmentTrend(segment.open, segment.close),
  });
}

function addRelationship(
  relationships: SessionLevelRelationship[],
  id: string,
  label: string,
  bias: SessionLevelRelationship['bias'],
  scoreImpact: number,
  evidence: string
) {
  relationships.push({ id, label, bias, scoreImpact, evidence });
}

function findStats(stats: SessionStats[], name: SessionSegmentName): SessionStats | undefined {
  return stats.find((segment) => segment.name === name && segment.barCount > 0);
}

function zoneFromDisplacement(
  displacement: DisplacementCandleFact,
  fvgZones: FvgZoneFact[] = []
): SessionImbalanceZone | null {
  if (!isPrice(displacement.high) || !isPrice(displacement.low) || !displacement.session) return null;

  const overlappingFvg = fvgZones.find((zone) => {
    if (!isPrice(zone.upper) || !isPrice(zone.lower)) return false;
    const upper = Math.max(zone.upper, zone.lower);
    const lower = Math.min(zone.upper, zone.lower);
    return lower <= displacement.high! && upper >= displacement.low!;
  });

  const upper = roundToTick(
    overlappingFvg && isPrice(overlappingFvg.upper)
      ? Math.max(overlappingFvg.upper, overlappingFvg.lower || overlappingFvg.upper)
      : displacement.high
  );
  const lower = roundToTick(
    overlappingFvg && isPrice(overlappingFvg.lower)
      ? Math.min(overlappingFvg.upper || overlappingFvg.lower, overlappingFvg.lower)
      : displacement.low
  );
  if (!isPrice(upper) || !isPrice(lower) || upper <= lower) return null;

  const direction = displacement.direction;
  const score = displacement.displacementScore || 0;
  return {
    id: `${displacement.session}-${direction}-${displacement.candleIndex}-${lower}-${upper}`,
    session: displacement.session,
    label: `${sessionLabel(displacement.session)} ${direction === 'SHORT' ? 'Bearish' : 'Bullish'} Displacement Imbalance`,
    direction,
    upper,
    lower,
    midpoint: roundToTick((upper + lower) / 2),
    originPrice: direction === 'SHORT' ? displacement.high ?? null : displacement.low ?? null,
    confidence: score >= 7 ? 'High' : score >= 5 ? 'Medium' : 'Low',
    displacementScore: score,
    evidence: [
      displacement.evidence || 'Displacement candle detected from OHLC.',
      overlappingFvg ? 'Overlaps a detected FVG/imbalance zone.' : 'No explicit three-candle FVG overlap detected.',
    ].join(' '),
  };
}

function sessionLabel(name: SessionSegmentName): string {
  switch (name) {
    case 'asian': return 'Asian';
    case 'london': return 'London';
    case 'ny_premarket': return 'NY Premarket';
    case 'rth_morning': return 'RTH Morning';
    case 'lunch': return 'Lunch';
    case 'previous_rth': return 'Previous RTH';
    case 'prior_eth': return 'Prior ETH';
    case 'full_context': return 'Full ETH';
    default: return 'Session';
  }
}

function buildRelationships(stats: SessionStats[], zones: SessionImbalanceZone[], currentPrice?: number | null): SessionLevelRelationship[] {
  const relationships: SessionLevelRelationship[] = [];
  const asian = findStats(stats, 'asian');
  const london = findStats(stats, 'london');
  const ny = findStats(stats, 'ny_premarket');
  const rth = findStats(stats, 'rth_morning');
  const full = findStats(stats, 'full_context');

  if (asian && london && isPrice(asian.low) && isPrice(london.low) && london.low < asian.low) {
    addRelationship(relationships, 'london_swept_asian_low', 'London swept Asian low', 'LONG', 15, `London low ${london.low} swept Asian low ${asian.low}; reclaim can support long reversal context.`);
  }
  if (asian && london && isPrice(asian.high) && isPrice(london.high) && london.high > asian.high) {
    addRelationship(relationships, 'london_swept_asian_high', 'London swept Asian high', 'SHORT', 15, `London high ${london.high} swept Asian high ${asian.high}; failed hold can support short reversal context.`);
  }
  if (london && ny && isPrice(london.low) && isPrice(ny.low) && ny.low < london.low) {
    addRelationship(relationships, 'ny_swept_london_low', 'NY premarket swept London low', 'LONG', 14, `NY premarket low ${ny.low} swept London low ${london.low}; reclaim can support long continuation/reversal context.`);
  }
  if (london && ny && isPrice(london.high) && isPrice(ny.high) && ny.high > london.high) {
    addRelationship(relationships, 'ny_swept_london_high', 'NY premarket swept London high', 'SHORT', 14, `NY premarket high ${ny.high} swept London high ${london.high}; failed hold can support short reversal context.`);
  }
  if (rth && full && isPrice(rth.open) && isPrice(full.low) && isPrice(full.high)) {
    const inside = rth.open >= full.low && rth.open <= full.high;
    if (inside && isPrice(currentPrice) && currentPrice < full.low) {
      addRelationship(relationships, 'rth_expands_below_eth_range', 'RTH expanded below ETH range', 'SHORT', 12, `RTH opened inside ETH range and expanded below ETH low ${full.low}.`);
    }
    if (inside && isPrice(currentPrice) && currentPrice > full.high) {
      addRelationship(relationships, 'rth_expands_above_eth_range', 'RTH expanded above ETH range', 'LONG', 12, `RTH opened inside ETH range and expanded above ETH high ${full.high}.`);
    }
  }

  zones.slice(0, 4).forEach((zone) => {
    const bias = zone.direction;
    addRelationship(
      relationships,
      `${zone.session}_${zone.direction.toLowerCase()}_displacement_zone`,
      zone.label,
      bias,
      zone.confidence === 'High' ? 18 : 10,
      `${zone.label} ${zone.lower}-${zone.upper}; reaction inside this zone can guide ${bias === 'LONG' ? 'long' : 'short'} target and rejection planning.`
    );
  });

  return relationships;
}

function targetLevelsFromZones(zones: SessionImbalanceZone[]): StructuralLevel[] {
  return zones.flatMap((zone): StructuralLevel[] => {
    const directionRelevance = zone.direction;
    const opposite = directionRelevance === 'LONG' ? 'SHORT' : 'LONG';
    return [
      {
        label: `${zone.label} Bottom`,
        price: zone.lower,
        type: 'imbalance_zone',
        source: zone.session,
        directionRelevance,
        confidence: zone.confidence,
        touches: 1,
        evidence: zone.evidence,
      },
      {
        label: `${zone.label} Midpoint`,
        price: zone.midpoint,
        type: 'imbalance_midpoint',
        source: zone.session,
        directionRelevance: 'BOTH',
        confidence: zone.confidence,
        touches: 1,
        evidence: zone.evidence,
      },
      {
        label: `${zone.label} Top`,
        price: zone.upper,
        type: 'imbalance_zone',
        source: zone.session,
        directionRelevance: opposite,
        confidence: zone.confidence,
        touches: 1,
        evidence: zone.evidence,
      },
    ];
  });
}

function deriveBias(relationships: SessionLevelRelationship[]): SessionStory['bias'] {
  const longScore = relationships.filter((item) => item.bias === 'LONG').reduce((sum, item) => sum + item.scoreImpact, 0);
  const shortScore = relationships.filter((item) => item.bias === 'SHORT').reduce((sum, item) => sum + item.scoreImpact, 0);
  if (longScore >= shortScore + 8) return 'LONG';
  if (shortScore >= longScore + 8) return 'SHORT';
  if (longScore || shortScore) return 'WAIT';
  return 'BALANCED';
}

export function buildSessionStory({
  bars,
  currentPrice,
  fvgZones = [],
  displacementCandles = [],
}: {
  bars: NinjaBridgeBar[];
  currentPrice?: number | null;
  fvgZones?: FvgZoneFact[];
  displacementCandles?: DisplacementCandleFact[];
}): SessionStory {
  const segments = segmentTradingSession(bars).map(toStats());
  const displacementZones = displacementCandles
    .filter((candle) => (candle.displacementScore || 0) >= 3)
    .map((candle) => zoneFromDisplacement(candle, fvgZones))
    .filter((zone): zone is SessionImbalanceZone => Boolean(zone))
    .sort((a, b) => b.displacementScore - a.displacementScore)
    .slice(0, 8);
  const relationships = buildRelationships(segments, displacementZones, currentPrice);
  const bias = deriveBias(relationships);
  const topRelationship = relationships[0];
  const summary = topRelationship
    ? `${topRelationship.label}: ${topRelationship.evidence}`
    : 'No dominant Asian/London/NY/RTH session relationship detected yet.';

  return {
    segments,
    displacementZones,
    relationships,
    bias,
    summary,
    targetLevels: targetLevelsFromZones(displacementZones),
    notes: [
      summary,
      displacementZones.length
        ? `Detected ${displacementZones.length} session displacement imbalance zone(s).`
        : 'No high-quality session displacement imbalance zone detected.',
    ],
  };
}
