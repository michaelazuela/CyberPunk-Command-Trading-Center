import type { SetupCandidate, StructuralLevel, TargetObjective, TargetObjectivePlan } from '../types';
import { TRADE_RULES } from '../config/tradeRules';

function isPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function roundToTick(price: number): number {
  return Math.round(price / TRADE_RULES.targetModel.tickSize) * TRADE_RULES.targetModel.tickSize;
}

function confidenceScore(confidence: StructuralLevel['confidence']): number {
  if (confidence === 'High') return 30;
  if (confidence === 'Medium') return 18;
  if (confidence === 'Low') return 5;
  return -20;
}

function typeScore(type: StructuralLevel['type']): number {
  switch (type) {
    case 'high':
    case 'low':
      return 24;
    case 'liquidity_pool':
      return 22;
    case 'imbalance_zone':
      return 24;
    case 'imbalance_midpoint':
    case 'displacement_origin':
      return 20;
    case 'round_number':
      return 18;
    case 'midnight_open':
    case 'rth_open':
      return 16;
    case 'swing':
      return 14;
    case 'support':
    case 'resistance':
      return 12;
    default:
      return 6;
  }
}

function rQuality(rMultiple: number | null): number {
  if (rMultiple === null) return -25;
  if (rMultiple >= 2) return 30;
  if (rMultiple >= 1.5) return 24;
  if (rMultiple >= 1) return 8;
  return -20;
}

function levelSupportsDirection(level: StructuralLevel, direction: SetupCandidate['direction']): boolean {
  return direction === 'LONG'
    ? level.directionRelevance === 'LONG' || level.directionRelevance === 'BOTH'
    : direction === 'SHORT'
      ? level.directionRelevance === 'SHORT' || level.directionRelevance === 'BOTH'
      : false;
}

function objectiveFor(level: StructuralLevel, candidate: SetupCandidate): TargetObjective | null {
  if (candidate.direction !== 'LONG' && candidate.direction !== 'SHORT') return null;
  if (!isPrice(candidate.entry) || !isPrice(candidate.stop) || !isPrice(level.price)) return null;
  if (!levelSupportsDirection(level, candidate.direction)) return null;

  const risk = Math.abs(candidate.entry - candidate.stop);
  if (!isPrice(risk)) return null;
  const distance = candidate.direction === 'LONG'
    ? level.price - candidate.entry
    : candidate.entry - level.price;
  if (distance <= TRADE_RULES.targetModel.tickSize) return null;

  const rMultiple = distance / risk;
  const score =
    confidenceScore(level.confidence) +
    typeScore(level.type) +
    Math.min(level.strengthScore || 0, 35) +
    rQuality(rMultiple) +
    Math.min((level.touches || 0) * 3, 12);

  return {
    label: level.label,
    price: roundToTick(level.price),
    direction: candidate.direction,
    source: level.source,
    type: level.type,
    confidence: level.confidence,
    score,
    distancePoints: roundToTick(distance),
    rMultiple: Math.round(rMultiple * 100) / 100,
    reason: `${level.label} is a ${candidate.direction === 'LONG' ? 'long-side' : 'short-side'} reaction/target zone ${Math.round(rMultiple * 100) / 100}R from candidate entry. Watch for pause, rejection, reclaim, or runner continuation there.`,
  };
}

function nearestObjectiveAtOrBeyond(objectives: TargetObjective[], minimumR: number): TargetObjective | null {
  return objectives
    .filter(objective => (objective.rMultiple || 0) >= minimumR)
    .sort((a, b) => {
      const distanceA = Math.abs((a.rMultiple || 0) - minimumR);
      const distanceB = Math.abs((b.rMultiple || 0) - minimumR);
      if (distanceA !== distanceB) return distanceA - distanceB;
      return b.score - a.score;
    })[0] || null;
}

function nearestObjective(objectives: TargetObjective[]): TargetObjective | null {
  return [...objectives].sort((a, b) => {
    const distanceA = a.distancePoints ?? Number.POSITIVE_INFINITY;
    const distanceB = b.distancePoints ?? Number.POSITIVE_INFINITY;
    if (distanceA !== distanceB) return distanceA - distanceB;
    return b.score - a.score;
  })[0] || null;
}

function strongestRunnerObjective(objectives: TargetObjective[]): TargetObjective | null {
  return objectives
    .filter(objective => (objective.rMultiple || 0) >= TRADE_RULES.targetModel.t2R)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.distancePoints || 0) - (b.distancePoints || 0);
    })[0] || null;
}

function isSessionLiquidityObjective(objective: TargetObjective): boolean {
  const sessionSources: TargetObjective['source'][] = [
    'asian',
    'london',
    'ny_premarket',
    'full_context',
    'prior_eth',
    'previous_rth',
    'rth_morning',
    'lunch',
  ];
  const liquidityTypes: TargetObjective['type'][] = [
    'high',
    'low',
    'liquidity_pool',
    'imbalance_zone',
    'imbalance_midpoint',
    'displacement_origin',
    'gap',
    'round_number',
  ];

  return sessionSources.includes(objective.source) || liquidityTypes.includes(objective.type);
}

function uniqueObjectives(objectives: TargetObjective[]): TargetObjective[] {
  const seen = new Set<string>();
  return objectives.filter(objective => {
    const key = `${objective.label}|${objective.price}|${objective.direction}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function selectLiquidityTargets(objectives: TargetObjective[]): {
  liquidityTarget1: TargetObjective | null;
  liquidityTarget2: TargetObjective | null;
  liquidityRunnerTarget: TargetObjective | null;
} {
  const liquidityObjectives = uniqueObjectives(objectives)
    .filter(isSessionLiquidityObjective)
    .sort((a, b) => {
      const distanceA = a.distancePoints ?? Number.POSITIVE_INFINITY;
      const distanceB = b.distancePoints ?? Number.POSITIVE_INFINITY;
      if (distanceA !== distanceB) return distanceA - distanceB;
      return b.score - a.score;
    });

  const liquidityTarget1 = liquidityObjectives[0] || null;
  const liquidityTarget2 = liquidityObjectives
    .filter(objective => objective.price !== liquidityTarget1?.price)
    .sort((a, b) => {
      const rA = a.rMultiple ?? 0;
      const rB = b.rMultiple ?? 0;
      const aBeyondT1 = rA >= TRADE_RULES.targetModel.t1R ? 0 : 1;
      const bBeyondT1 = rB >= TRADE_RULES.targetModel.t1R ? 0 : 1;
      if (aBeyondT1 !== bBeyondT1) return aBeyondT1 - bBeyondT1;
      const distanceA = a.distancePoints ?? Number.POSITIVE_INFINITY;
      const distanceB = b.distancePoints ?? Number.POSITIVE_INFINITY;
      if (distanceA !== distanceB) return distanceA - distanceB;
      return b.score - a.score;
    })[0] || null;
  const liquidityRunnerTarget = liquidityObjectives
    .filter(objective => objective.price !== liquidityTarget1?.price && objective.price !== liquidityTarget2?.price)
    .filter(objective => (objective.rMultiple || 0) >= TRADE_RULES.targetModel.t2R)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.distancePoints || 0) - (b.distancePoints || 0);
    })[0] || null;

  return { liquidityTarget1, liquidityTarget2, liquidityRunnerTarget };
}

function targetPathWarning(objectives: TargetObjective[]): string | null {
  const blocker = objectives
    .filter(objective => (objective.rMultiple || 0) > 0 && (objective.rMultiple || 0) < TRADE_RULES.targetModel.t1R)
    .sort((a, b) => b.score - a.score)[0];

  if (!blocker || blocker.score < 70) return null;
  return `${blocker.label} at ${blocker.price} sits before 1.5R. Expect a possible pause/reaction before fixed-R T1.`;
}

function targetManagementInstruction(
  candidate: SetupCandidate,
  liquidityTarget1: TargetObjective | null,
  liquidityTarget2: TargetObjective | null,
  liquidityRunnerTarget: TargetObjective | null,
  warning: string | null
): string {
  if (!liquidityTarget1) {
    return 'No 15M/session liquidity target is mapped in this direction. Manage from fixed-R levels only until a new structural level forms.';
  }

  const t1 = candidate.target1;
  const t2 = candidate.target2;
  const directionWord = candidate.direction === 'SHORT' ? 'below' : 'above';
  const lq1BeforeT1 =
    isPrice(t1) &&
    (candidate.direction === 'LONG' ? liquidityTarget1.price < t1 : liquidityTarget1.price > t1);
  const lq1NearT1 =
    isPrice(t1) &&
    Math.abs(liquidityTarget1.price - t1) <= TRADE_RULES.targetModel.tickSize * 4;

  if (warning || lq1BeforeT1) {
    return `Liquidity sits before fixed-R T1. Treat ${liquidityTarget1.price} as the first decision zone; scale, tighten, or wait for a clean hold before expecting T1/T2.`;
  }

  if (lq1NearT1) {
    return `Fixed-R T1 aligns with ${liquidityTarget1.label}. Take T1 seriously there; hold runners only if price accepts ${directionWord} that level.`;
  }

  if (isPrice(t2) && liquidityTarget1 && (candidate.direction === 'LONG' ? liquidityTarget1.price > t2 : liquidityTarget1.price < t2)) {
    return `T1/T2 are tactical. Use ${liquidityTarget1.label} as the next 15M liquidity objective only after price clears and holds beyond T2.`;
  }

  if (liquidityTarget2 || liquidityRunnerTarget) {
    return `Manage in layers: fixed-R T1/T2 first, then LQ1 ${liquidityTarget1.price}${liquidityTarget2 ? ` and LQ2 ${liquidityTarget2.price}` : ''}${liquidityRunnerTarget ? ` as runner toward ${liquidityRunnerTarget.price}` : ''}.`;
  }

  return `Use ${liquidityTarget1.label} at ${liquidityTarget1.price} as the next 15M liquidity reaction zone after fixed-R management.`;
}

export function buildTargetObjectivePlan(candidate: SetupCandidate, structuralLevels: StructuralLevel[] = []): TargetObjectivePlan | null {
  if (candidate.direction !== 'LONG' && candidate.direction !== 'SHORT') return null;
  if (!isPrice(candidate.entry) || !isPrice(candidate.stop)) return null;

  const objectives = structuralLevels
    .map(level => objectiveFor(level, candidate))
    .filter((objective): objective is TargetObjective => Boolean(objective))
    .sort((a, b) => b.score - a.score);

  const selectedT1 = nearestObjectiveAtOrBeyond(objectives, TRADE_RULES.targetModel.t1R);
  const selectedT2 = nearestObjectiveAtOrBeyond(
    objectives.filter(objective => objective.price !== selectedT1?.price),
    TRADE_RULES.targetModel.t2R
  );
  const nearestLiquidityTarget = nearestObjective(objectives);
  const runnerTarget = strongestRunnerObjective(
    objectives.filter(objective => objective.price !== selectedT1?.price && objective.price !== selectedT2?.price)
  );
  const warning = targetPathWarning(objectives);
  const { liquidityTarget1, liquidityTarget2, liquidityRunnerTarget } = selectLiquidityTargets(objectives);
  const targetInstruction = targetManagementInstruction(
    candidate,
    liquidityTarget1,
    liquidityTarget2,
    liquidityRunnerTarget,
    warning
  );
  const liquidityMapSummary = liquidityTarget1
    ? `LQ1 ${liquidityTarget1.price} ${liquidityTarget1.label}${liquidityTarget2 ? ` | LQ2 ${liquidityTarget2.price} ${liquidityTarget2.label}` : ''}${liquidityRunnerTarget ? ` | Runner ${liquidityRunnerTarget.price} ${liquidityRunnerTarget.label}` : ''}`
    : 'No directional 15M/session liquidity targets mapped.';

  const notes = [
    'Executable T1/T2 remain fixed 1.5R / 2.0R by app rule.',
    objectives.length
      ? '15M/session liquidity levels mark reaction zones, nearby obstacles, and runner objectives. They guide target management but do not replace fixed-R execution targets.'
      : 'No structural objectives were available from imported ETH/RTH data.',
    targetInstruction,
  ];

  return {
    selectedT1,
    selectedT2,
    nearestLiquidityTarget,
    liquidityTarget1,
    liquidityTarget2,
    liquidityRunnerTarget,
    runnerTarget,
    targetManagementInstruction: targetInstruction,
    liquidityMapSummary,
    targetPathWarning: warning,
    targetQuality: !objectives.length ? 'no_liquidity_map' : warning ? 'target_blocked' : 'clear_path',
    objectives: objectives.slice(0, 8),
    notes,
    targetModel: 'fixed_r_with_structural_context',
  };
}

export function applyTargetObjectivesToCandidates<T extends SetupCandidate>(
  candidates: T[],
  structuralLevels: StructuralLevel[] = []
): T[] {
  return candidates.map(candidate => {
    const plan = buildTargetObjectivePlan(candidate, structuralLevels);
    if (!plan) return candidate;
    return {
      ...candidate,
      targetObjectivePlan: plan,
      target1Reason: plan.selectedT1
        ? `Nearest reaction/target zone near or beyond 1.5R: ${plan.selectedT1.label} at ${plan.selectedT1.price} (${plan.selectedT1.rMultiple}R).`
        : plan.liquidityTarget1
          ? `Fixed-R T1 remains tactical; first 15M/session liquidity objective is ${plan.liquidityTarget1.label} at ${plan.liquidityTarget1.price}.`
          : 'No clear reaction/target zone near or beyond 1.5R; fixed-R T1 remains the execution target.',
      target2Reason: plan.selectedT2
        ? `Nearest reaction/target zone near or beyond 2.0R: ${plan.selectedT2.label} at ${plan.selectedT2.price} (${plan.selectedT2.rMultiple}R).`
        : plan.liquidityRunnerTarget || plan.runnerTarget
          ? `No clean 2R alignment; runner objective to watch is ${(plan.liquidityRunnerTarget || plan.runnerTarget)?.label} at ${(plan.liquidityRunnerTarget || plan.runnerTarget)?.price} (${(plan.liquidityRunnerTarget || plan.runnerTarget)?.rMultiple}R).`
          : 'No clear reaction/target zone near or beyond 2.0R; fixed-R T2 remains the execution target.',
    };
  });
}
