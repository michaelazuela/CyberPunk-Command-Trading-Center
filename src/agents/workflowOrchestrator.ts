import type { AnalysisResult, RAGSaveContext } from '../types';
import type { AppPlanContext } from '../lib/planEngine';
import { reviewRiskWithAppAuthority, type RiskReviewResult } from './riskReviewAgent';
import { mergeOhlcFactsIntoAnalysis, type ChartFactMergeInput } from './chartFactAgent';
import { buildProofLearningContext, type ProofLearningInput } from './proofLearningAgent';
import type { MemoryAdvisory } from './memoryAgent';
import { DESK_AGENT_AUTHORITY, workflowAuthorityNoteText } from './deskAgentBoundaries';

export type WorkflowStage = 'screenshot_staged' | 'analyze' | 'decision' | 'outcome_proof' | 'journal_rag';

export interface WorkflowOrchestrationSnapshot {
  stage: WorkflowStage;
  decisionAuthority: 'app_owned_pipeline';
  memoryAuthority: 'advisory_only';
  chartFactAuthority: 'facts_only';
  proofAuthority: 'journal_rag_learning_only';
}

export function workflowAuthoritySnapshot(stage: WorkflowStage): WorkflowOrchestrationSnapshot {
  return {
    stage,
    decisionAuthority: DESK_AGENT_AUTHORITY.decisionAuthority,
    memoryAuthority: DESK_AGENT_AUTHORITY.memoryAuthority,
    chartFactAuthority: DESK_AGENT_AUTHORITY.chartFactAuthority,
    proofAuthority: DESK_AGENT_AUTHORITY.proofAuthority,
  };
}

export function mergeChartFacts(input: ChartFactMergeInput): AnalysisResult {
  return mergeOhlcFactsIntoAnalysis(input);
}

export function buildWorkflowDecision(
  analysis: AnalysisResult | null | undefined,
  context: AppPlanContext,
  memoryAdvisory?: MemoryAdvisory | null,
): RiskReviewResult {
  return reviewRiskWithAppAuthority(analysis, context, memoryAdvisory);
}

export function buildWorkflowRagContext(input: ProofLearningInput): RAGSaveContext {
  return buildProofLearningContext(input);
}

export function workflowAuthorityNote(): string {
  return workflowAuthorityNoteText();
}
