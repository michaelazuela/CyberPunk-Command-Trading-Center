import { DESK_AGENT_AUTHORITY, DESK_AUTHORITY_MESSAGES } from './deskAgentBoundaries';
import type { DeskState } from '../lib/localScannerEngine';

export type DeskAgentKey =
  | 'scannerHealthAgent'
  | 'tradingAnalysisAgent'
  | 'scannerPlanSelectionAgent'
  | 'conditionalCandidateRiskAgent'
  | 'morningContinuationWatchlistAgent'
  | 'riskReviewAgent'
  | 'workflowOrchestrator'
  | 'proofLearningAgent';

export type DeskAgentAuthority =
  | 'operational_health_only'
  | 'app_owned_candidate_selection'
  | 'advisory_risk_context_only'
  | 'watchlist_context_only'
  | 'app_owned_plan_wrapper'
  | 'journal_rag_learning_only'
  | 'read_only_intelligence';

export interface DeskAgentRoleContract {
  key: DeskAgentKey;
  displayName: string;
  authority: DeskAgentAuthority;
  consumes: string[];
  produces: string[];
  mustNot: string[];
}

export interface DeskStackHandoff {
  stackName: 'quant_desk_trading_desk_stack';
  boundary: 'decision_support_only_app_owned_execution_authority';
  roles: DeskAgentRoleContract[];
  authoritySummary: {
    decisionAuthority: typeof DESK_AGENT_AUTHORITY.decisionAuthority;
    memoryAuthority: typeof DESK_AGENT_AUTHORITY.memoryAuthority;
    chartFactAuthority: typeof DESK_AGENT_AUTHORITY.chartFactAuthority;
    proofAuthority: typeof DESK_AGENT_AUTHORITY.proofAuthority;
  };
  safetyNotes: string[];
}

export interface DeskAgentPlanNarrative {
  sourceOfTruth: 'desk_agent_plan_narrative_from_scanner_desk_state';
  currentPlay: string;
  htfStructure: string;
  lineInSand: number | null;
  targetReaction: string | null;
  management: string;
  nextStructureMap: string;
  trigger: string;
  invalidation: string;
  executionBoundary: string;
  plainText: string[];
  approvalBoundary: {
    changesTradeApprovals: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
  };
}

export interface DeskStackSafetyFinding {
  path: string;
  reason: string;
  value: unknown;
}

export interface DeskStackSafetyAudit {
  safe: boolean;
  findingCount: number;
  findings: DeskStackSafetyFinding[];
}

const COMMON_MUST_NOT = [
  'approve live execution',
  'place orders',
  'change setup definitions',
  'change entry, stop, target, invalidation, session, or risk rules',
  'override canExecute protections',
];

export const DESK_AGENT_ROLE_CONTRACTS: DeskAgentRoleContract[] = [
  {
    key: 'scannerHealthAgent',
    displayName: 'Scanner Health Agent',
    authority: 'operational_health_only',
    consumes: ['bridge health', 'bar freshness', 'market-map/cache status', 'Discord configuration status'],
    produces: ['READY/DEGRADED/BLOCKED operational status', 'blocking reasons', 'warnings'],
    mustNot: [...COMMON_MUST_NOT, 'create entries or targets'],
  },
  {
    key: 'scannerPlanSelectionAgent',
    displayName: 'Scanner Plan Selection Agent',
    authority: 'app_owned_candidate_selection',
    consumes: ['normalized app-owned trade plan', 'NinjaTrader-OHLC setup candidates', 'current price', 'stale/chase guards', 'target cascade context'],
    produces: ['selected app-owned candidate', 'scanner alert state', 'Intraday MSS watch lifecycle status', 'stale/no-fresh-entry audit warnings'],
    mustNot: ['invent candidates', 'let Gemini/advisory context create Intraday MSS watches', 'bypass stale/chase guards', 'override deterministic plan output'],
  },
  {
    key: 'conditionalCandidateRiskAgent',
    displayName: 'Conditional Candidate Risk Agent',
    authority: 'advisory_risk_context_only',
    consumes: ['setup candidate', 'configured max risk', 'higher-timeframe alignment context'],
    produces: ['advisory risk score', 'risk-quality label', 'human-readable caution notes'],
    mustNot: [...COMMON_MUST_NOT, 'treat advisory risk as app-approved or broker-approved risk'],
  },
  {
    key: 'morningContinuationWatchlistAgent',
    displayName: 'Morning Continuation Watchlist Agent',
    authority: 'watchlist_context_only',
    consumes: ['completed 5M bars', 'opening range context', 'selected app-owned plan state'],
    produces: ['watch-only continuation context', 'RAG memory context', 'descriptive performance review'],
    mustNot: [...COMMON_MUST_NOT, 'create fresh entries after a move is already extended'],
  },
  {
    key: 'riskReviewAgent',
    displayName: 'Risk Review Agent',
    authority: 'app_owned_plan_wrapper',
    consumes: ['analysis result', 'app plan context', 'memory advisory'],
    produces: ['normalized app-owned plan', 'authority note', 'rule-review advisory context'],
    mustNot: ['accept Gemini/advisory output as executable', ...COMMON_MUST_NOT],
  },
  {
    key: 'workflowOrchestrator',
    displayName: 'Workflow Orchestrator',
    authority: 'app_owned_plan_wrapper',
    consumes: ['chart facts', 'analysis result', 'memory advisory', 'proof/RAG context', 'scanner-owned DeskState'],
    produces: ['fact merge', 'workflow decision wrapper', 'RAG context wrapper', 'authority snapshot', 'DeskState plan narrative with HTF reaction management'],
    mustNot: [...COMMON_MUST_NOT, 'move fact extraction into execution authority'],
  },
  {
    key: 'proofLearningAgent',
    displayName: 'Proof Learning Agent',
    authority: 'journal_rag_learning_only',
    consumes: ['trader-confirmed outcome', 'proof reference', 'original plan snapshot', 'selected candidate snapshot'],
    produces: ['outcome closure record', 'RAG save context', 'proof learning authority note'],
    mustNot: [...COMMON_MUST_NOT, 'approve trades retroactively'],
  },
  {
    key: 'tradingAnalysisAgent',
    displayName: 'Trading Analysis Agent',
    authority: 'read_only_intelligence',
    consumes: ['diagnostic reports', 'research backfills', 'watchlist records', 'health events', 'proof records'],
    produces: ['weekly intelligence report', 'Discord summary payload', 'human review recommendations'],
    mustNot: [...COMMON_MUST_NOT, 'promote models or write RAG records from a weekly report'],
  },
];

const UNSAFE_TRUE_KEYS = new Set([
  'canExecute',
  'healthApprovesTrade',
  'healthChangesRules',
  'healthCreatesEntry',
  'healthCreatesTargets',
  'healthOverridesScanner',
  'healthOverridesRisk',
  'riskScoreApprovesTrade',
  'riskScoreChangesRules',
  'riskScoreOverridesRisk',
  'riskScoreCreatesEntry',
  'riskScoreCreatesTargets',
  'watchlistApprovesTrade',
  'watchlistChangesRules',
  'watchlistCreatesEntry',
  'watchlistCreatesTargets',
  'watchlistOverridesScanner',
  'ragMemoryApprovesTrade',
  'ragMemoryChangesRules',
  'reviewApprovesTrade',
  'reviewChangesRules',
  'reviewPromotesModel',
  'reviewCreatesEntry',
  'reviewCreatesTargets',
  'reviewOverridesScanner',
  'proofSubmissionApprovesTrade',
  'tradeConfirmationOverridesRiskRules',
  'ragSaveApprovesTradeRetroactively',
  'weeklyReportApprovesTrade',
  'weeklyReportChangesRules',
  'weeklyReportCreatesEntry',
  'weeklyReportCreatesTargets',
  'weeklyReportRunsDiagnostics',
  'weeklyReportPromotesModel',
  'weeklyReportWritesRag',
  'automaticRuleChangesRecommended',
]);

const READ_ONLY_SNAPSHOT_KEYS = new Set([
  'originalPlanSnapshot',
  'selectedCandidateSnapshot',
  'normalizedPlanSnapshot',
]);

const UNSAFE_PHRASES = [
  'approved for live execution',
  'trade approved by agent',
  'agent approved execution',
  'net p/l proves profitability',
  'activate model',
  'deploy model',
];

export function buildDeskStackHandoff(): DeskStackHandoff {
  return {
    stackName: 'quant_desk_trading_desk_stack',
    boundary: 'decision_support_only_app_owned_execution_authority',
    roles: DESK_AGENT_ROLE_CONTRACTS.map((role) => ({
      ...role,
      consumes: [...role.consumes],
      produces: [...role.produces],
      mustNot: [...role.mustNot],
    })),
    authoritySummary: { ...DESK_AGENT_AUTHORITY },
    safetyNotes: [
      DESK_AUTHORITY_MESSAGES.deterministicExecution,
      DESK_AUTHORITY_MESSAGES.appPipelineFinalAuthority,
      DESK_AUTHORITY_MESSAGES.proofLearningOnly,
    ],
  };
}

function priceLine(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : 'N/A';
}

export function buildDeskAgentPlanNarrative(deskState: DeskState): DeskAgentPlanNarrative {
  const play = deskState.primaryDeskPlay;
  const transition = play.levelTransition;
  const targetReaction = transition?.targetReactionLevel !== null && transition?.targetReactionLevel !== undefined
    ? `${transition.targetReactionLabel || 'HTF/session reaction level'} ${priceLine(transition.targetReactionLevel)}`
    : play.targetReactionLevel !== null
      ? `${play.targetReactionLabel || 'HTF/session reaction level'} ${priceLine(play.targetReactionLevel)}`
      : null;
  const nextStructureMap = [
    transition?.longAbove !== null && transition?.longAbove !== undefined
      ? `LONG above ${priceLine(transition.longAbove)}`
      : play.longAbove !== null ? `LONG above ${priceLine(play.longAbove)}` : null,
    transition?.shortBelow !== null && transition?.shortBelow !== undefined
      ? `SHORT below ${priceLine(transition.shortBelow)}`
      : play.shortBelow !== null ? `SHORT below ${priceLine(play.shortBelow)}` : null,
  ].filter(Boolean).join(' / ') || 'No protected 5M shift line is mapped yet.';
  const management = transition?.targetManagementInstruction ||
    (targetReaction
      ? 'Management: take T1 seriously; cap expectation at T2 into HTF/session structure unless completed 5M acceptance clears it. Reversal risk is live.'
      : 'Management: app T1/T2 remain tactical only until scanner-owned HTF/session reaction context is mapped.');
  const executionBoundary = 'Desk narrative is decision support only. It does not approve execution, change canExecute, or change entry, stop, target, risk, model, or bridge rules.';
  const plainText = [
    `Current Play: ${play.title}`,
    `HTF/Structure: ${play.summary}`,
    `Line in the Sand: ${priceLine(play.lineInSand)}`,
    ...(targetReaction ? [`Target/reaction: ${targetReaction}`] : []),
    management,
    `After 5M shift: ${nextStructureMap}.`,
    `Trigger: ${play.nextTrigger || deskState.nextTrigger || 'Wait for completed 5M proof and retest/hold.'}`,
    `Invalidation: ${play.invalidation || deskState.invalidation || 'Invalidation remains unconfirmed until protected 5M structure is proven.'}`,
    executionBoundary,
  ];

  return {
    sourceOfTruth: 'desk_agent_plan_narrative_from_scanner_desk_state',
    currentPlay: play.title,
    htfStructure: play.summary,
    lineInSand: play.lineInSand,
    targetReaction,
    management,
    nextStructureMap,
    trigger: play.nextTrigger || deskState.nextTrigger || 'Wait for completed 5M proof and retest/hold.',
    invalidation: play.invalidation || deskState.invalidation || 'Invalidation remains unconfirmed until protected 5M structure is proven.',
    executionBoundary,
    plainText,
    approvalBoundary: {
      changesTradeApprovals: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
    },
  };
}

function walkForUnsafeValues(value: unknown, path: string, findings: DeskStackSafetyFinding[]): void {
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    const phrase = UNSAFE_PHRASES.find((item) => lower.includes(item));
    if (phrase) {
      findings.push({ path, reason: `Unsafe authority phrase: ${phrase}`, value });
    }
    return;
  }

  if (!value || typeof value !== 'object') return;

  if (Array.isArray(value)) {
    value.forEach((item, index) => walkForUnsafeValues(item, `${path}.${index}`, findings));
    return;
  }

  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    const nestedPath = path ? `${path}.${key}` : key;
    if (READ_ONLY_SNAPSHOT_KEYS.has(key)) continue;
    if (UNSAFE_TRUE_KEYS.has(key) && nestedValue === true) {
      findings.push({ path: nestedPath, reason: `${key} must not be true in desk-agent support output.`, value: nestedValue });
    }
    walkForUnsafeValues(nestedValue, nestedPath, findings);
  }
}

export function auditDeskStackSafety(outputs: Record<string, unknown>): DeskStackSafetyAudit {
  const findings: DeskStackSafetyFinding[] = [];
  walkForUnsafeValues(outputs, '', findings);
  return {
    safe: findings.length === 0,
    findingCount: findings.length,
    findings,
  };
}
