export const FVG_RESEARCH_MODEL_FAMILY = 'FairValueGapResearchModel' as const;

export const FVG_RESEARCH_BOUNDARY =
  'research_only_no_live_scanner_discord_or_trading_rule_change' as const;

export type FvgResearchSubmodel =
  | 'FvgWickDefenseContinuation'
  | 'FvgFailedAcceptanceReversal'
  | 'FvgObjectiveLadderContinuation'
  | 'FvgBalancedPathContinuation';

export interface FvgResearchModelDefinition {
  family: typeof FVG_RESEARCH_MODEL_FAMILY;
  submodel: FvgResearchSubmodel;
  purpose: string;
  requiredEvidence: string[];
  invalidation: string[];
  entry: string;
  stop: string;
  targets: string;
  publishBoundary: string;
}

export const FVG_RESEARCH_MODEL_DEFINITIONS: FvgResearchModelDefinition[] = [
  {
    family: FVG_RESEARCH_MODEL_FAMILY,
    submodel: 'FvgWickDefenseContinuation',
    purpose:
      'Trade continuation only after a 15M displacement-created FVG is defended on completed 5M candles.',
    requiredEvidence: [
      'HTF map from 60M/120M/240M is loaded as support, obstacle, draw, or caution only.',
      'A real 15M displacement creates the parent FVG.',
      'The displacement candle may be the left, middle, or confirming candle of the 3-candle FVG formation.',
      'Price returns into the 15M parent FVG or a clean nested 5M FVG aligned inside that 15M zone.',
      'A completed 5M candle tests the zone and rejects it with wick defense.',
      'The 5M body does not accept through the zone against the trade direction.',
      'When multiple same-side FVG rows come from the same parent displacement, the first valid completed 5M proof is the research trade candidate.',
    ],
    invalidation: [
      'The parent 15M FVG accepts through against the trade before completed 5M proof.',
      'The nested 5M FVG accepts through against the trade before completed 5M proof.',
      'A later same-parent row appears after an earlier valid completed 5M proof; treat it as management/re-entry context until a reset rule is approved.',
      'Target room is already gone before entry.',
    ],
    entry: 'Completed 5M wick-defense or confirmation close.',
    stop: 'Nearest protected 5M structure for the active side.',
    targets: 'T1 = 1.5R and T2 = 2.0R from actual entry-to-stop risk.',
    publishBoundary: FVG_RESEARCH_BOUNDARY,
  },
  {
    family: FVG_RESEARCH_MODEL_FAMILY,
    submodel: 'FvgFailedAcceptanceReversal',
    purpose:
      'Classify reversal when price fails acceptance through a key FVG/level, then proves the opposite direction on completed 5M candles.',
    requiredEvidence: [
      'HTF map identifies support, obstacle, draw, or caution only.',
      'A prior high/low, session extreme, or parent FVG area is tested.',
      'Price fails acceptance beyond that area instead of cleanly continuing.',
      'A fresh opposite-side displacement or breakdown forms a valid FVG context.',
      'Completed 5M proof confirms the reversal side.',
    ],
    invalidation: [
      'Price accepts beyond the failed area and holds.',
      'No completed 5M reversal proof appears.',
      'The proposed reversal has no protected 5M stop.',
    ],
    entry: 'Completed 5M reversal proof close after failed acceptance.',
    stop: 'Nearest protected 5M structure for the reversal side.',
    targets: 'T1/T2 from actual risk, with nearest real liquidity as management context.',
    publishBoundary: FVG_RESEARCH_BOUNDARY,
  },
  {
    family: FVG_RESEARCH_MODEL_FAMILY,
    submodel: 'FvgObjectiveLadderContinuation',
    purpose:
      'Track open, failed, and untouched FVGs plus real liquidity so a valid FVG entry has an objective ladder.',
    requiredEvidence: [
      '5M, 15M, 60M, 120M, and 240M FVG inventory is available when data exists.',
      'Inventory marks zones as open_untouched, partial_touch, filled, or failed_inverted.',
      'Prior same-day RTH and morning liquidity levels remain visible during lunch/PM review.',
      'For shorts, open FVGs/liquidity below are draw context and failed/open zones above are resistance context.',
      'For longs, open FVGs/liquidity above are draw context and failed/open zones below are support context.',
    ],
    invalidation: [
      'Objective ladder is used to approve a trade by itself.',
      'T1/T2 are replaced with non-risk-based HTF levels.',
    ],
    entry: 'No standalone entry. This submodel supports management after a valid FVG entry exists.',
    stop: 'No standalone stop. Stop remains nearest protected 5M structure from the entry model.',
    targets: 'T1/T2 remain tactical. FVG inventory and liquidity explain runner/management context.',
    publishBoundary: FVG_RESEARCH_BOUNDARY,
  },
  {
    family: FVG_RESEARCH_MODEL_FAMILY,
    submodel: 'FvgBalancedPathContinuation',
    purpose:
      'Classify continuation/runner quality when a valid FVG entry breaks out of a balanced path toward real liquidity while tracking open FVG objectives separately.',
    requiredEvidence: [
      'A valid FVG entry already passed the 15M parent setup and completed 5M proof workflow.',
      'FVG inventory and objective ladder are available for the review window.',
      'Real liquidity is labeled separately from FVG context: liquidity is prior swing/session/equal high-low; FVGs are objective/reaction context, not liquidity.',
      'Price breaks from a balanced or rebalanced range in the trade direction.',
      'The first real liquidity draw or separately labeled open-FVG objective is ahead of entry and reachable before or around T1.',
      'No opposing FVG/HTF obstacle defends before that objective is delivered.',
      'Later same-direction candidates in the same active move are continuation/management context unless a reset or add-on rule is explicitly approved.',
    ],
    invalidation: [
      'Balanced path is used as a standalone entry trigger.',
      'The 15M parent FVG or completed 5M proof is missing.',
      'An opposing FVG/HTF obstacle defends before the first objective.',
      'An FVG/objective zone is mislabeled as liquidity.',
      'The liquidity draw or separately labeled open-FVG objective was already gone before entry.',
    ],
    entry: 'No standalone entry. This rule only supports a valid FVG proof already found.',
    stop: 'No standalone stop. Stop remains nearest protected 5M structure from the entry model.',
    targets:
      'T1/T2 remain risk-based. First real liquidity and separately labeled open-FVG objectives become management and runner context.',
    publishBoundary: FVG_RESEARCH_BOUNDARY,
  },
];

export function getFvgResearchDefinition(submodel: FvgResearchSubmodel): FvgResearchModelDefinition {
  const definition = FVG_RESEARCH_MODEL_DEFINITIONS.find((item) => item.submodel === submodel);
  if (!definition) {
    throw new Error(`Unknown FVG research submodel: ${submodel}`);
  }
  return definition;
}
