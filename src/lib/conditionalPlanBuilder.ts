import { ChartContext, SetupCandidate } from '../types';

function hasDirectionallyValidStop(
  direction: 'LONG' | 'SHORT',
  entry: number | null | undefined,
  stop: number | null | undefined
): boolean {
  if (typeof entry !== 'number' || !Number.isFinite(entry) || typeof stop !== 'number' || !Number.isFinite(stop)) {
    return false;
  }
  return direction === 'LONG' ? stop < entry : stop > entry;
}

function guardedTargetOverrides(input: {
  direction: 'LONG' | 'SHORT';
  entry: number | null;
  stop: number | null;
  target1Override?: number | null;
  target2Override?: number | null;
}, computedTargets: { target1: number | null; target2: number | null }): { target1: number | null; target2: number | null } {
  const stopIsDirectionallyValid = hasDirectionallyValidStop(input.direction, input.entry, input.stop);
  return {
    target1: stopIsDirectionallyValid ? input.target1Override ?? computedTargets.target1 : null,
    target2: stopIsDirectionallyValid ? input.target2Override ?? computedTargets.target2 : null,
  };
}

export function buildConditionalPlans(_chartContext: ChartContext): SetupCandidate[] {
  void guardedTargetOverrides;
  return [];
}
