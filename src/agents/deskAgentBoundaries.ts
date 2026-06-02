export const SCANNER_HEALTH_APPROVAL_BOUNDARY = {
  healthApprovesTrade: false,
  healthChangesRules: false,
  healthCreatesEntry: false,
  healthCreatesTargets: false,
  healthOverridesScanner: false,
  healthOverridesRisk: false,
} as const;

export const CONDITIONAL_RISK_APPROVAL_BOUNDARY = {
  riskScoreApprovesTrade: false,
  riskScoreChangesRules: false,
  riskScoreOverridesRisk: false,
  riskScoreCreatesEntry: false,
  riskScoreCreatesTargets: false,
} as const;

export const MORNING_WATCHLIST_APPROVAL_BOUNDARY = {
  watchlistApprovesTrade: false,
  watchlistChangesRules: false,
  watchlistCreatesEntry: false,
  watchlistCreatesTargets: false,
  watchlistOverridesScanner: false,
} as const;

export const WATCHLIST_PERFORMANCE_REVIEW_APPROVAL_BOUNDARY = {
  reviewApprovesTrade: false,
  reviewChangesRules: false,
  reviewPromotesModel: false,
  reviewCreatesEntry: false,
  reviewCreatesTargets: false,
  reviewOverridesScanner: false,
} as const;

export const PROOF_LEARNING_APPROVAL_BOUNDARY = {
  proofSubmissionApprovesTrade: false,
  tradeConfirmationOverridesRiskRules: false,
  ragSaveApprovesTradeRetroactively: false,
} as const;

export const WEEKLY_TRADING_REPORT_APPROVAL_BOUNDARY = {
  weeklyReportApprovesTrade: false,
  weeklyReportChangesRules: false,
  weeklyReportCreatesEntry: false,
  weeklyReportCreatesTargets: false,
  weeklyReportRunsDiagnostics: false,
  weeklyReportPromotesModel: false,
  weeklyReportWritesRag: false,
} as const;

export const DESK_AGENT_AUTHORITY = {
  decisionAuthority: 'app_owned_pipeline',
  memoryAuthority: 'advisory_only',
  chartFactAuthority: 'facts_only',
  proofAuthority: 'journal_rag_learning_only',
} as const;

export const DESK_AUTHORITY_MESSAGES = {
  riskReview:
    'Risk review may surface warnings and rule-review notes only.',
  deterministicExecution:
    'Executable entry, stop, T1, T2, risk, invalidation, and approval remain owned by tradeDecisionPipeline, setupScanner, conditionalPlanBuilder, and tradeRules.',
  workflow:
    'Workflow orchestration may stage screenshots, request chart facts, retrieve memory, review risk, and save proof learning.',
  noRuleOrApprovalChange:
    'It must not change trading rules, setup definitions, target formulas, time windows, or final executable approval.',
  watchlistRecordNoAuthority:
    'This record cannot approve trades, change rules, create entries, create targets, or override scanner gates.',
  appPipelineFinalAuthority:
    'The app-owned trade decision pipeline remains the final execution authority.',
  proofLearningOnly:
    'Proof and outcome learning updates journal/RAG records only. It does not approve trades, place orders, or override deterministic risk rules.',
  outcomeFutureContextOnly:
    'This does not change trade rules or future approval gates.',
} as const;

type MutableBoundary<T> = {
  -readonly [K in keyof T]: T[K];
};

export function cloneDeskBoundary<T extends Record<string, unknown>>(boundary: T): MutableBoundary<T> {
  return { ...boundary } as MutableBoundary<T>;
}

export function riskReviewAuthorityNote(sessionType: string): string {
  return [
    `App-owned trade decision authority: ${sessionType}`,
    DESK_AUTHORITY_MESSAGES.riskReview,
    DESK_AUTHORITY_MESSAGES.deterministicExecution,
  ].join(' ');
}

export function workflowAuthorityNoteText(): string {
  return [
    DESK_AUTHORITY_MESSAGES.workflow,
    DESK_AUTHORITY_MESSAGES.noRuleOrApprovalChange,
    DESK_AUTHORITY_MESSAGES.appPipelineFinalAuthority,
  ].join(' ');
}
