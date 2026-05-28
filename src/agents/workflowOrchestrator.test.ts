import assert from 'node:assert/strict';
import { TradeDecisionStatus, type AnalysisResult, type SimilarSetup } from '../types';
import { buildWorkflowDecision, workflowAuthoritySnapshot } from './workflowOrchestrator';
import { advisoryFromSimilarSetups, memoryAuthorityNote } from './memoryAgent';

const analysis: AnalysisResult = {
  dayType: 'WAIT',
  reasoning: 'Fixture analysis.',
  confidence: 0.7,
  checks: [],
  current_rule_analysis: {
    summary: 'Fixture',
    setup_detected: 'Pending',
    rule_category: 'APP_OWNED_PIPELINE',
    entry: 5320,
    stop: 5316,
    target_1: 5326,
    target_2: 5328,
    trigger_state: 'PENDING_TRIGGER',
    entry_trigger: 'Wait for confirmation.',
    no_trade_reason: null,
    base_confidence: 'Medium',
  },
};

const review = buildWorkflowDecision(analysis, { sessionType: 'morning', instrument: 'MES', windowStatusOverride: 'active' });
assert.ok(review.authorityNote.includes('tradeDecisionPipeline'));
assert.ok(review.plan.consistencyWarnings.some((warning) => warning.includes('APP-COMPUTED PLAN ENGINE')));

const similarLosses: SimilarSetup[] = Array.from({ length: 3 }, (_, index) => ({
  id: `loss-${index}`,
  tradeDate: '2026-05-20',
  dayOfWeek: 'Wednesday',
  sessionType: 'morning',
  instrument: 'MES',
  similarity: 0.9,
  tradeResult: 'loss',
  pnlTicks: -8,
  pnlDollars: -100,
  embeddingText: 'similar losing setup',
}));
const advisory = advisoryFromSimilarSetups(similarLosses);
assert.equal(advisory.historicalSupport, 'CONFLICTS');
assert.equal(advisory.confidenceAdjustment, 'decrease');
assert.equal(advisory.similarSetupCount, 3);
assert.equal(advisory.completedSetupCount, 3);
assert.ok(advisory.memoryWarning?.includes('Do not modify stop rules automatically'));
assert.ok(memoryAuthorityNote(advisory).includes('Memory is advisory only'));

const snapshot = workflowAuthoritySnapshot('decision');
assert.equal(snapshot.decisionAuthority, 'app_owned_pipeline');
assert.equal(snapshot.memoryAuthority, 'advisory_only');
assert.equal(snapshot.proofAuthority, 'journal_rag_learning_only');

assert.notEqual(review.plan.decisionStatus, TradeDecisionStatus.ApprovedTrade, 'fixture should not become approved from orchestration');

console.log('Workflow agent orchestration boundary verified.');
