import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FinalTradePlanCard from './FinalTradePlanCard';
import {
  ExecutionStatus,
  NoTradeReason,
  SetupCandidateStatus,
  SetupType,
  TradeDecisionStatus,
} from '../types';
import type { NormalizedTradePlan } from '../lib/tradePlan';

describe('FinalTradePlanCard HTF draw model display', () => {
  it('shows the HTF Draw Continuation label without implying execution before gates pass', () => {
    const plan = {
      decision: 'NO TRADE',
      decisionLabel: 'WAIT',
      executionDecision: 'NO EXECUTABLE TRADE',
      planningDecision: 'VALID CONDITIONAL PLAN',
      entry: null,
      stop: null,
      t1: null,
      t2: null,
      riskPoints: null,
      riskRewardT1: null,
      riskRewardT2: null,
      finalConfidence: 'Medium',
      whyThisPlan: 'HTF draw continuation candidate is present, but execution gates are incomplete.',
      whyItWon: null,
      invalidation: 'Do not execute until app-owned entry, stop, target, risk, and trigger gates are complete.',
      source: 'app_rule_engine',
      canExecute: false,
      setupName: 'HTF Draw Continuation After Raid/Reclaim',
      decisionStatus: TradeDecisionStatus.Wait,
      noTradeReason: NoTradeReason.EntryTriggerPending,
      hasConditionalPlans: true,
      setupCandidates: [{
        setupType: SetupType.HtfDrawContinuationAfterRaid,
        scenarioLabel: 'HTF Draw Continuation After Raid/Reclaim',
        candidateState: 'REVERSAL_DELIVERY_PLAN_CANDIDATE',
        pathway: 'htf_liquidity_draw_mss',
        direction: 'LONG',
        detectedStatus: SetupCandidateStatus.Conditional,
        confidence: 'Medium',
        priority: 96,
        entry: null,
        stop: null,
        target1: null,
        target2: null,
        riskPoints: null,
        invalidation: null,
        entryClarity: 0.25,
        stopClarity: 0.25,
        targetClarity: 0.35,
        proximityScore: 0.82,
        levelContextScore: 18,
        levelContextSummary: 'HTF liquidity draw pathway aligned; external liquidity remains draw context.',
        evidence: ['5M MSS trigger confirmed'],
        missingEvidence: ['Clean retest or defined reclaim entry'],
        executionStatus: ExecutionStatus.Conditional,
        blockReason: null,
        requiredTrigger: 'Wait for clean retest or defined reclaim trigger.',
        nextAction: 'Execution stays disabled until all app-owned gates complete.',
        reducedRiskPlan: null,
      }],
      opportunitySelection: {
        bestExecutableCandidate: null,
        bestConditionalCandidate: null,
        blockedCandidates: [],
        finalDecision: TradeDecisionStatus.Wait,
        noTradeReason: NoTradeReason.EntryTriggerPending,
      },
      decisionAuditTrail: [],
      rejectedAlternatives: [],
    } as unknown as NormalizedTradePlan;

    render(<FinalTradePlanCard plan={plan} />);

    expect(document.body.textContent).toContain('HTF Draw Continuation After Raid/Reclaim');
    expect(screen.getByText(/Execution stays disabled until the required trigger and risk fields are satisfied/i)).toBeTruthy();
    expect(screen.queryByText(/Trade now/i)).toBeNull();
  });

  it('does not display executable wording for ConditionalTrade with raw canExecute true', () => {
    const plan = {
      decision: 'LONG',
      decisionLabel: 'WAIT / CONDITIONAL',
      executionDecision: 'NO EXECUTABLE TRADE',
      planningDecision: 'CONDITIONAL PLANS AVAILABLE',
      entry: 7625.5,
      stop: 7622.5,
      t1: 7630,
      t2: 7631.5,
      riskPoints: 3,
      riskRewardT1: '1.5R',
      riskRewardT2: '2.0R',
      finalConfidence: 'High',
      whyThisPlan: 'Conditional levels are present but the final pipeline has not approved execution.',
      invalidation: 'Invalid below protected structure.',
      source: 'app_rule_engine',
      canExecute: true,
      setupName: 'HTF Draw Continuation After Raid/Reclaim',
      decisionStatus: TradeDecisionStatus.ConditionalTrade,
      noTradeReason: null,
      hasConditionalPlans: true,
      setupCandidates: [],
      opportunitySelection: {
        bestExecutableCandidate: null,
        bestConditionalCandidate: null,
        blockedCandidates: [],
        finalDecision: TradeDecisionStatus.ConditionalTrade,
        noTradeReason: null,
      },
      decisionAuditTrail: [],
      rejectedAlternatives: [],
    } as unknown as NormalizedTradePlan;

    render(<FinalTradePlanCard plan={plan} />);

    expect(screen.getByText(/NO EXECUTABLE TRADE/i)).toBeTruthy();
    expect(screen.getByText(/Execution stays disabled until the required trigger and risk fields are satisfied/i)).toBeTruthy();
    expect(screen.queryByText(/^Executable$/i)).toBeNull();
    expect(screen.queryByText(/Executable by app/i)).toBeNull();
  });
});
