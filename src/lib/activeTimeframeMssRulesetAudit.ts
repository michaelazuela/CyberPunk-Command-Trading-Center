import type { ExecutionStatus, NoTradeReason, SetupCandidate } from '../types';

export type ActiveTimeframeMssRulesetAuditStatus =
  | 'passed'
  | 'blocked'
  | 'not_applicable'
  | 'missing_evidence_layer'
  | 'not_available';

export interface ActiveTimeframeMssRulesetAudit {
  applied: boolean;
  status: ActiveTimeframeMssRulesetAuditStatus;
  required: 'aligned_confirmed_5m_mss';
  appliesToAllModels: boolean;
  affectsExecution: boolean;
  candidateExecutionStatus: ExecutionStatus | null;
  candidateBlockReason: NoTradeReason | null;
  evidence: string[];
  blockers: string[];
  summary: string;
}

function withSummary(audit: Omit<ActiveTimeframeMssRulesetAudit, 'summary'>): ActiveTimeframeMssRulesetAudit {
  const blockerText = audit.blockers.length ? ` Blockers: ${audit.blockers.join(' ')}` : '';
  const executionText = audit.candidateExecutionStatus ? ` Candidate=${audit.candidateExecutionStatus}.` : '';
  return {
    ...audit,
    summary: `Active MSS ruleset: ${audit.status}. Applies to all models=${audit.appliesToAllModels}. Affects execution=${audit.affectsExecution}.${executionText}${blockerText}`,
  };
}

export function summarizeActiveTimeframeMssRuleset(candidate: SetupCandidate | null | undefined): ActiveTimeframeMssRulesetAudit {
  if (!candidate) {
    return withSummary({
      applied: false,
      status: 'not_available',
      required: 'aligned_confirmed_5m_mss',
      appliesToAllModels: true,
      affectsExecution: false,
      candidateExecutionStatus: null,
      candidateBlockReason: null,
      evidence: [],
      blockers: ['No setup candidate was selected for active MSS ruleset review.'],
    });
  }

  const rule = candidate.activeRuleset?.timeframeMss;
  if (!rule) {
    return withSummary({
      applied: false,
      status: 'not_available',
      required: 'aligned_confirmed_5m_mss',
      appliesToAllModels: true,
      affectsExecution: false,
      candidateExecutionStatus: candidate.executionStatus,
      candidateBlockReason: candidate.blockReason,
      evidence: [],
      blockers: ['Selected candidate does not include active MSS ruleset metadata.'],
    });
  }

  return withSummary({
    applied: rule.applied,
    status: rule.status,
    required: rule.required,
    appliesToAllModels: rule.appliesToAllModels,
    affectsExecution: rule.affectsExecution,
    candidateExecutionStatus: candidate.executionStatus,
    candidateBlockReason: candidate.blockReason,
    evidence: [...rule.evidence],
    blockers: [...rule.blockers],
  });
}
