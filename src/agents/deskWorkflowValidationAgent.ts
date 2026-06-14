export type DeskWorkflowValidationScope =
  | 'research'
  | 'discord_report'
  | 'model_candidate_review';

export interface DeskWorkflowValidationInput {
  scope: DeskWorkflowValidationScope;
  payload?: unknown;
  deskStateCandidateKeys?: readonly string[];
  discordCandidateKeys?: readonly string[];
  requiresChartPng?: boolean;
  chartPngPath?: string | null;
  requiresRagButtons?: boolean;
  ragButtonCount?: number;
  htfContextReliability?: string | null;
  htfStructuralClaims?: readonly string[];
  outcomeButtonsApproveTrade?: boolean;
  modelPromotion?: {
    requested: boolean;
    evidenceIncludesPnl: boolean;
    evidenceIncludesHumanReview: boolean;
    humanApproved: boolean;
  };
}

export interface DeskWorkflowValidationFinding {
  code:
    | 'research_executable_field'
    | 'discord_candidate_not_in_desk_state'
    | 'missing_chart_png'
    | 'missing_rag_buttons'
    | 'htf_claim_without_sufficiency'
    | 'outcome_button_authority_drift'
    | 'pl_only_model_promotion'
    | 'human_review_required';
  path: string;
  message: string;
}

export interface DeskWorkflowValidationReport {
  sourceOfTruth: 'desk_workflow_validation_agent';
  scope: DeskWorkflowValidationScope;
  ok: boolean;
  findings: DeskWorkflowValidationFinding[];
  approvalBoundary: {
    validationApprovesTrade: false;
    validationChangesRules: false;
    validationCreatesEntry: false;
    validationCreatesTargets: false;
    validationPromotesModel: false;
  };
}

const FORBIDDEN_RESEARCH_KEYS = new Set([
  'canExecute',
  'entry',
  'stop',
  'stopLoss',
  'target',
  'targets',
  'target1',
  'target2',
  't1',
  't2',
  'T1',
  'T2',
  'riskReward',
  'orderInstructions',
  'executionApproved',
  'tradeAlerts',
]);

const READ_ONLY_KEYS = new Set([
  'originalPlanSnapshot',
  'selectedCandidateSnapshot',
  'normalizedPlanSnapshot',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function executableFieldFindings(value: unknown, path = 'payload'): DeskWorkflowValidationFinding[] {
  if (!isRecord(value)) {
    if (Array.isArray(value)) {
      return value.flatMap((item, index) => executableFieldFindings(item, `${path}[${index}]`));
    }
    return [];
  }
  const findings: DeskWorkflowValidationFinding[] = [];
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (READ_ONLY_KEYS.has(key)) continue;
    if (FORBIDDEN_RESEARCH_KEYS.has(key)) {
      findings.push({
        code: 'research_executable_field',
        path: childPath,
        message: `Research/model-review payload must not set executable field ${key}.`,
      });
    }
    findings.push(...executableFieldFindings(child, childPath));
  }
  return findings;
}

function addFinding(
  findings: DeskWorkflowValidationFinding[],
  code: DeskWorkflowValidationFinding['code'],
  path: string,
  message: string,
): void {
  findings.push({ code, path, message });
}

export function validateDeskWorkflowOutput(input: DeskWorkflowValidationInput): DeskWorkflowValidationReport {
  const findings: DeskWorkflowValidationFinding[] = [];

  if (input.scope === 'research' || input.scope === 'model_candidate_review') {
    findings.push(...executableFieldFindings(input.payload));
  }

  if (input.scope === 'discord_report' && input.discordCandidateKeys?.length) {
    const allowed = new Set(input.deskStateCandidateKeys || []);
    for (const key of input.discordCandidateKeys) {
      if (!allowed.has(key)) {
        addFinding(
          findings,
          'discord_candidate_not_in_desk_state',
          `discordCandidateKeys.${key}`,
          `Discord report candidate ${key} is not present in DeskState candidate keys.`,
        );
      }
    }
  }

  if (input.requiresChartPng && !String(input.chartPngPath || '').toLowerCase().endsWith('.png')) {
    addFinding(findings, 'missing_chart_png', 'chartPngPath', 'Chart-based reports require a PNG chart artifact.');
  }

  if (input.requiresRagButtons && (!input.ragButtonCount || input.ragButtonCount <= 0)) {
    addFinding(findings, 'missing_rag_buttons', 'ragButtonCount', 'Discord research/review reports require RAG/outcome buttons.');
  }

  const reliability = String(input.htfContextReliability || '').toLowerCase();
  if ((reliability === 'data_limited' || reliability === 'insufficient') && (input.htfStructuralClaims || []).length > 0) {
    addFinding(
      findings,
      'htf_claim_without_sufficiency',
      'htfStructuralClaims',
      'HTF structural claims require sufficient structured OHLC context.',
    );
  }

  if (input.outcomeButtonsApproveTrade) {
    addFinding(
      findings,
      'outcome_button_authority_drift',
      'outcomeButtonsApproveTrade',
      'Discord/RAG outcome buttons may update learning only and must not approve trades.',
    );
  }

  if (input.modelPromotion?.requested) {
    if (input.modelPromotion.evidenceIncludesPnl && !input.modelPromotion.evidenceIncludesHumanReview) {
      addFinding(
        findings,
        'pl_only_model_promotion',
        'modelPromotion',
        'P/L alone cannot promote a model candidate.',
      );
    }
    if (!input.modelPromotion.humanApproved) {
      addFinding(
        findings,
        'human_review_required',
        'modelPromotion.humanApproved',
        'Human review approval is required before any model-candidate promotion.',
      );
    }
  }

  return {
    sourceOfTruth: 'desk_workflow_validation_agent',
    scope: input.scope,
    ok: findings.length === 0,
    findings,
    approvalBoundary: {
      validationApprovesTrade: false,
      validationChangesRules: false,
      validationCreatesEntry: false,
      validationCreatesTargets: false,
      validationPromotesModel: false,
    },
  };
}
