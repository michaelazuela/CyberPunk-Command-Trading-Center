import type { AnalysisResult, RAGSaveContext } from '../types';
import type { AppPlanContext } from '../lib/planEngine';
import { reviewRiskWithAppAuthority, type RiskReviewResult } from './riskReviewAgent';
import { mergeOhlcFactsIntoAnalysis, type ChartFactMergeInput } from './chartFactAgent';
import { buildProofLearningContext, type ProofLearningInput } from './proofLearningAgent';
import type { MemoryAdvisory } from './memoryAgent';

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
    decisionAuthority: 'app_owned_pipeline',
    memoryAuthority: 'advisory_only',
    chartFactAuthority: 'facts_only',
    proofAuthority: 'journal_rag_learning_only',
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
  return [
    'Workflow orchestration may stage screenshots, request chart facts, retrieve memory, review risk, and save proof learning.',
    'It must not change trading rules, setup definitions, target formulas, time windows, or final executable approval.',
    'The app-owned trade decision pipeline remains the final execution authority.',
  ].join(' ');
}
