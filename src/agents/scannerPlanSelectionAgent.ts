import { SetupCandidate, TradeDecisionStatus } from '../types';
import {
  classifyScannerVisibility,
  type ScannerState,
  type ScannerVisibilityMetadata,
  type StaleChaseResult,
  type TargetCascadeResult,
} from '../lib/localScannerEngine';
import type { NormalizedTradePlan } from '../lib/tradePlan';

export interface ScannerPlanSelection {
  candidate: SetupCandidate | null;
  stale: StaleChaseResult;
  state: ScannerState;
  stateForAlert: ScannerState;
  reviewStatus:
    | 'already_triggered_no_fresh_entry'
    | 'early_move_review_no_valid_candidate'
    | null;
  auditWarnings: string[];
  visibilityMetadata?: ScannerVisibilityMetadata;
}

function stateFromNormalizedPlan(normalized: NormalizedTradePlan): ScannerState {
  if (normalized.decisionStatus === TradeDecisionStatus.OutsideRules) return 'MarketMapping';
  return 'NoTrade';
}

export function selectScannerPlan(args: {
  normalized: NormalizedTradePlan;
  currentPrice: number | null;
  latestCompletedBar?: {
    high?: number | null;
    low?: number | null;
  } | null;
  guards?: unknown;
  targetCascade?: TargetCascadeResult | null;
}): ScannerPlanSelection {
  const state = stateFromNormalizedPlan(args.normalized);
  const stale: StaleChaseResult = {
    state,
    stale: false,
    reason: 'Blank-slate mode: scanner plan selection is disabled until new model definitions are installed.',
  };
  return {
    candidate: null,
    stale,
    state,
    stateForAlert: state,
    reviewStatus: null,
    auditWarnings: [
      'Blank-slate mode: no setup, fallback, context-only, or advisory candidate can be selected.',
    ],
    visibilityMetadata: classifyScannerVisibility({
      state,
      candidate: null,
      canExecute: false,
      staleReason: stale.reason,
    }),
  };
}
