import type { FvgZoneFact, SessionLevelContext, SessionLevelRelationship, StructuralLevel } from '../types';
import { TRADE_RULES } from '../config/tradeRules';

function isPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function roundToTick(price: number): number {
  return Math.round(price / TRADE_RULES.targetModel.tickSize) * TRADE_RULES.targetModel.tickSize;
}

function confidenceScore(confidence: StructuralLevel['confidence']): number {
  if (confidence === 'High') return 14;
  if (confidence === 'Medium') return 8;
  if (confidence === 'Low') return 3;
  return -10;
}

function sourceScore(source: StructuralLevel['source']): number {
  switch (source) {
    case 'previous_rth': return 24;
    case 'full_context': return 24;
    case 'rth_morning': return 24;
    case 'ny_premarket': return 22;
    case 'london': return 20;
    case 'prior_eth': return 20;
    case 'asian': return 18;
    case 'lunch': return 16;
    case 'current_window': return 14;
    case 'app': return 10;
    default: return 8;
  }
}

function typeScore(type: StructuralLevel['type']): number {
  if (type === 'high' || type === 'low') return 12;
  if (type === 'imbalance_zone') return 14;
  if (type === 'imbalance_midpoint' || type === 'displacement_origin') return 12;
  if (type === 'liquidity_pool') return 10;
  if (type === 'round_number') return 6;
  if (type === 'midnight_open' || type === 'rth_open') return 8;
  return 4;
}

function proximityScore(level: StructuralLevel, currentPrice?: number | null): number {
  if (!isPrice(currentPrice)) return 0;
  const distance = Math.abs(level.price - currentPrice);
  if (distance <= 5) return 10;
  if (distance <= 10) return 7;
  if (distance <= 20) return 4;
  return 0;
}

function roundNumberOverlapScore(level: StructuralLevel): number {
  const nearestTen = roundToTick(Math.round(level.price / 10) * 10);
  return Math.abs(level.price - nearestTen) <= TRADE_RULES.targetModel.tickSize ? 5 : 0;
}

function fvgOverlapScore(level: StructuralLevel, fvgZones: FvgZoneFact[] = []): number {
  const matchingZone = fvgZones.find((zone) => {
    if (!isPrice(zone.upper) || !isPrice(zone.lower)) return false;
    const upper = Math.max(zone.upper, zone.lower);
    const lower = Math.min(zone.upper, zone.lower);
    const buffer = TRADE_RULES.targetModel.tickSize * 2;
    return level.price >= lower - buffer && level.price <= upper + buffer;
  });

  if (!matchingZone) return 0;
  if (matchingZone.reclaimed || matchingZone.confidence === 'High') return 8;
  if (matchingZone.confidence === 'Medium') return 5;
  return 2;
}

function strengthLabel(score: number): StructuralLevel['strengthLabel'] {
  if (score >= 62) return 'High';
  if (score >= 42) return 'Medium';
  return 'Low';
}

function findLevel(levels: StructuralLevel[], source: StructuralLevel['source'], type: 'high' | 'low'): StructuralLevel | undefined {
  const matches = levels.filter((level) => level.source === source && level.type === type && isPrice(level.price));
  if (type === 'high') return matches.sort((a, b) => b.price - a.price)[0];
  return matches.sort((a, b) => a.price - b.price)[0];
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

function relationshipBonus(level: StructuralLevel, relationships: SessionLevelRelationship[]): { bonus: number; tags: string[]; notes: string[] } {
  let bonus = 0;
  const tags: string[] = [];
  const notes: string[] = [];
  const label = level.label.toLowerCase();

  relationships.forEach((relationship) => {
    const id = relationship.id;
    const mentionsAsian = label.includes('asian');
    const mentionsLondon = label.includes('london');
    const mentionsNy = label.includes('premarket') || label.includes('new york');
    const mentionsEth = label.includes('eth') || label.includes('full');
    const mentionsRth = label.includes('rth') || label.includes('open');
    const mentionsMidnight = label.includes('midnight');

    const applies =
      (id.includes('asian') && mentionsAsian) ||
      (id.includes('london') && mentionsLondon) ||
      (id.includes('ny') && mentionsNy) ||
      (id.includes('eth') && mentionsEth) ||
      (id.includes('rth') && mentionsRth) ||
      (id.includes('midnight') && mentionsMidnight);

    if (!applies) return;
    bonus += relationship.scoreImpact;
    tags.push(id);
    notes.push(relationship.label);
  });

  return { bonus, tags, notes };
}

export function buildSessionLevelContext(
  structuralLevels: StructuralLevel[] = [],
  currentPrice?: number | null,
  options: { fvgZones?: FvgZoneFact[] } = {}
): SessionLevelContext {
  const relationships: SessionLevelRelationship[] = [];
  const asianHigh = findLevel(structuralLevels, 'asian', 'high');
  const asianLow = findLevel(structuralLevels, 'asian', 'low');
  const londonHigh = findLevel(structuralLevels, 'london', 'high');
  const londonLow = findLevel(structuralLevels, 'london', 'low');
  const nyHigh = findLevel(structuralLevels, 'ny_premarket', 'high');
  const nyLow = findLevel(structuralLevels, 'ny_premarket', 'low');
  const ethHigh = findLevel(structuralLevels, 'full_context', 'high');
  const ethLow = findLevel(structuralLevels, 'full_context', 'low');
  const rthHigh = findLevel(structuralLevels, 'rth_morning', 'high');
  const rthLow = findLevel(structuralLevels, 'rth_morning', 'low');
  const rthOpen = structuralLevels.find((level) => level.type === 'rth_open' && isPrice(level.price));
  const midnightOpen = structuralLevels.find((level) => level.type === 'midnight_open' && isPrice(level.price));

  if (asianLow && londonLow && asianLow.price < londonLow.price) {
    addRelationship(
      relationships,
      'asian_low_below_london_low',
      'Asian low is below London low',
      'LONG',
      10,
      `Asian low ${asianLow.price} is deeper liquidity than London low ${londonLow.price}; watch for rejection/reclaim if revisited.`
    );
  }
  if (asianHigh && londonHigh && asianHigh.price > londonHigh.price) {
    addRelationship(
      relationships,
      'asian_high_above_london_high',
      'Asian high is above London high',
      'SHORT',
      10,
      `Asian high ${asianHigh.price} is higher liquidity than London high ${londonHigh.price}; watch for rejection/failure if revisited.`
    );
  }
  if (asianLow && londonLow && londonLow.price < asianLow.price) {
    addRelationship(
      relationships,
      'london_swept_asian_low',
      'London swept below Asian low',
      'LONG',
      15,
      `London low ${londonLow.price} swept Asian low ${asianLow.price}; reclaim can support a long reversal context.`
    );
  }
  if (asianHigh && londonHigh && londonHigh.price > asianHigh.price) {
    addRelationship(
      relationships,
      'london_swept_asian_high',
      'London swept above Asian high',
      'SHORT',
      15,
      `London high ${londonHigh.price} swept Asian high ${asianHigh.price}; failed hold can support a short reversal context.`
    );
  }
  if (londonLow && nyLow && nyLow.price < londonLow.price) {
    addRelationship(
      relationships,
      'ny_swept_london_low',
      'NY premarket swept London low',
      'LONG',
      14,
      `NY premarket low ${nyLow.price} swept London low ${londonLow.price}; reclaim can support long continuation/reversal context.`
    );
  }
  if (londonHigh && nyHigh && nyHigh.price > londonHigh.price) {
    addRelationship(
      relationships,
      'ny_swept_london_high',
      'NY premarket swept London high',
      'SHORT',
      14,
      `NY premarket high ${nyHigh.price} swept London high ${londonHigh.price}; failed hold can support short reversal context.`
    );
  }
  if (ethLow && rthLow && rthLow.price <= ethLow.price + TRADE_RULES.targetModel.tickSize) {
    addRelationship(
      relationships,
      'rth_tested_eth_low',
      'RTH tested full ETH low',
      'LONG',
      12,
      `RTH low ${rthLow.price} tested ETH low ${ethLow.price}; reclaim can become important support context.`
    );
  }
  if (ethHigh && rthHigh && rthHigh.price >= ethHigh.price - TRADE_RULES.targetModel.tickSize) {
    addRelationship(
      relationships,
      'rth_tested_eth_high',
      'RTH tested full ETH high',
      'SHORT',
      12,
      `RTH high ${rthHigh.price} tested ETH high ${ethHigh.price}; failed hold can become important resistance context.`
    );
  }
  if (rthOpen && midnightOpen && rthOpen.price > midnightOpen.price + TRADE_RULES.targetModel.tickSize) {
    addRelationship(
      relationships,
      'rth_open_above_midnight_open',
      'RTH opened above Midnight Open',
      'SHORT',
      8,
      `RTH opened at ${rthOpen.price}, above Midnight Open ${midnightOpen.price}; watch whether price expands away or retraces back toward midnight.`
    );
  }
  if (rthOpen && midnightOpen && rthOpen.price < midnightOpen.price - TRADE_RULES.targetModel.tickSize) {
    addRelationship(
      relationships,
      'rth_open_below_midnight_open',
      'RTH opened below Midnight Open',
      'LONG',
      8,
      `RTH opened at ${rthOpen.price}, below Midnight Open ${midnightOpen.price}; watch whether price reclaims or continues away from midnight.`
    );
  }
  if (ethHigh && ethLow && rthOpen && isPrice(currentPrice)) {
    const openedAboveEth = rthOpen.price > ethHigh.price;
    const openedBelowEth = rthOpen.price < ethLow.price;
    const openedInsideEth = rthOpen.price <= ethHigh.price && rthOpen.price >= ethLow.price;
    const currentInsideEth = currentPrice <= ethHigh.price && currentPrice >= ethLow.price;

    if ((openedAboveEth || openedBelowEth) && currentInsideEth) {
      addRelationship(
        relationships,
        'rth_returns_into_eth_range',
        'RTH returned into ETH range',
        openedAboveEth ? 'SHORT' : 'LONG',
        12,
        `RTH opened ${openedAboveEth ? 'above' : 'below'} ETH range and current price ${currentPrice} returned inside ${ethLow.price}-${ethHigh.price}; failed expansion can support reversal/reclaim context.`
      );
    }
    if (openedInsideEth && currentPrice > ethHigh.price) {
      addRelationship(
        relationships,
        'rth_expands_above_eth_range',
        'RTH expands above ETH range',
        'LONG',
        12,
        `RTH opened inside ETH range and expanded above ETH high ${ethHigh.price}; pullback-hold can support long continuation context.`
      );
    }
    if (openedInsideEth && currentPrice < ethLow.price) {
      addRelationship(
        relationships,
        'rth_expands_below_eth_range',
        'RTH expands below ETH range',
        'SHORT',
        12,
        `RTH opened inside ETH range and expanded below ETH low ${ethLow.price}; failed reclaim can support short continuation context.`
      );
    }
  }

  const levels = structuralLevels.map((level) => {
    const relationship = relationshipBonus(level, relationships);
    const score =
      sourceScore(level.source) +
      typeScore(level.type) +
      confidenceScore(level.confidence) +
      proximityScore(level, currentPrice) +
      roundNumberOverlapScore(level) +
      fvgOverlapScore(level, options.fvgZones) +
      Math.min((level.touches || 0) * 3, 12) +
      relationship.bonus;
    return {
      ...level,
      strengthScore: score,
      strengthLabel: strengthLabel(score),
      contextRuleTags: relationship.tags,
      contextNote: relationship.notes[0] || level.evidence,
    };
  });

  const directional = (direction: 'LONG' | 'SHORT') => levels
    .filter((level) => level.directionRelevance === direction || level.directionRelevance === 'BOTH')
    .sort((a, b) => (b.strengthScore || 0) - (a.strengthScore || 0));

  const strongestLongLevels = directional('LONG').slice(0, 5);
  const strongestShortLevels = directional('SHORT').slice(0, 5);
  const levelsToWatch = [...levels]
    .sort((a, b) => (b.strengthScore || 0) - (a.strengthScore || 0))
    .slice(0, 8);

  return {
    levels,
    relationships,
    strongestLongLevels,
    strongestShortLevels,
    levelsToWatch,
    notes: relationships.length
      ? relationships.map((relationship) => relationship.evidence)
      : ['No strong Asian/London/NY relationship rule was detected from imported levels.'],
  };
}
