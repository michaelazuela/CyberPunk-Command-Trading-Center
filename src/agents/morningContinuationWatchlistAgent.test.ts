import assert from 'node:assert/strict';
import { ExecutionStatus, SetupCandidateStatus, SetupType, TradeDecisionStatus, type SetupCandidate } from '../types';
import type { NinjaBridgeBar } from '../lib/ninjaTraderBridge';
import type { NormalizedTradePlan } from '../lib/tradePlan';
import {
  buildWatchlistEmbeddingText,
  buildWatchlistMemoryRecord,
  detectMorningContinuationWatchlist,
  reviewWatchlistPerformance,
  type WatchlistPerformanceRecord,
} from './morningContinuationWatchlistAgent';

function bar(time: string, open: number, high: number, low: number, close: number): NinjaBridgeBar {
  return { time, open, high, low, close, volume: 1000 };
}

function candidate(overrides: Partial<SetupCandidate> = {}): SetupCandidate {
  return {
    setupType: SetupType.SweepMssFvgRetrace,
    scenarioLabel: 'App-owned executable setup',
    direction: 'LONG',
    detectedStatus: SetupCandidateStatus.Detected,
    confidence: 'High',
    priority: 90,
    entry: 100,
    stop: 96,
    target1: 106,
    target2: 108,
    riskPoints: 4,
    invalidation: 'Invalid below protected swing low.',
    rankScore: 100,
    evidence: ['approved setup evidence'],
    missingEvidence: [],
    executionStatus: ExecutionStatus.Executable,
    blockReason: null,
    requiredTrigger: '5M trigger.',
    nextAction: 'Final action only after trigger remains confirmed.',
    reducedRiskPlan: null,
    ...overrides,
  };
}

function normalized(overrides: Partial<NormalizedTradePlan> = {}): NormalizedTradePlan {
  return {
    decision: 'NO TRADE',
    decisionLabel: 'NO TRADE',
    executionDecision: 'No executable trade.',
    planningDecision: 'Watch only.',
    hasConditionalPlans: false,
    entry: null,
    stop: null,
    t1: null,
    t2: null,
    riskPoints: null,
    riskRewardT1: null,
    riskRewardT2: null,
    finalConfidence: 'Low',
    whyThisPlan: 'No executable setup.',
    invalidation: 'No trade.',
    source: 'app_rule_engine',
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    setupCandidates: [],
    opportunitySelection: {
      bestExecutableCandidate: null,
      bestConditionalCandidate: null,
      finalDecision: TradeDecisionStatus.Wait,
      noTradeReason: null,
    },
    earlyMoveReview: null,
    ...overrides,
  };
}

const morningWindow = {
  session: 'morning' as const,
  label: 'Morning Execution Window',
  allowsTradePlan: true,
};

const lunchWindow = {
  session: 'lunch' as const,
  label: 'Lunch Review',
  allowsTradePlan: true,
};

const morningMoveBars: NinjaBridgeBar[] = [
  bar('2026-05-28T09:30:00-04:00', 7535.75, 7538.75, 7534.75, 7535.25),
  bar('2026-05-28T09:35:00-04:00', 7535.25, 7537.25, 7527.75, 7530.00),
  bar('2026-05-28T09:40:00-04:00', 7530.00, 7530.00, 7525.50, 7527.25),
  bar('2026-05-28T09:45:00-04:00', 7527.25, 7530.25, 7525.50, 7528.75),
  bar('2026-05-28T09:50:00-04:00', 7528.50, 7532.00, 7526.00, 7527.25),
  bar('2026-05-28T09:55:00-04:00', 7527.25, 7537.25, 7526.25, 7531.75),
  bar('2026-05-28T10:00:00-04:00', 7531.75, 7536.25, 7530.50, 7535.75),
  bar('2026-05-28T10:05:00-04:00', 7535.75, 7539.75, 7533.50, 7536.50),
  bar('2026-05-28T10:10:00-04:00', 7536.25, 7540.25, 7533.50, 7540.25),
  bar('2026-05-28T10:15:00-04:00', 7540.25, 7574.00, 7535.00, 7564.75),
];

const beforeBars = JSON.stringify(morningMoveBars);
const plan = normalized({
  earlyMoveReview: {
    status: 'already_triggered_no_fresh_entry',
    direction: 'LONG',
    moveStart: 7525.5,
    moveExtreme: 7574,
    triggerArea: 7535.75,
    currentPrice: 7564.75,
    movePoints: 48.5,
    freshEntryAvailable: false,
    summary: 'First move detected.',
    reason: 'Already extended.',
    action: 'No fresh entry.',
    journalSuggestion: 'Journal missed move.',
    approvalBoundary: {
      approvesTrade: false,
      changesEntry: false,
      changesStop: false,
      changesTargets: false,
      changesRisk: false,
    },
  },
});
const beforePlan = JSON.stringify(plan);
const result = detectMorningContinuationWatchlist({
  tradeDate: '2026-05-28',
  instrument: 'MES',
  window: morningWindow,
  bars5m: morningMoveBars,
  currentPrice: 7564.75,
  normalizedPlan: plan,
  selectedCandidate: null,
  scannerState: 'Missed',
});

assert.equal(result.watchlistDetected, true);
assert.equal(result.watchlistType, 'morning_continuation_watchlist');
assert.equal(result.direction, 'LONG');
assert.equal(result.status, 'WATCH_ONLY');
assert.equal(result.canExecute, false);
assert.equal(result.tradeAlertEligible, false);
assert.equal(result.freshEntryAvailable, false);
assert.equal(result.noChaseWarning, true);
assert.equal(result.memoryEligible, true);
assert.equal(result.approvalBoundary.watchlistApprovesTrade, false);
assert.equal(result.approvalBoundary.watchlistChangesRules, false);
assert.equal(result.approvalBoundary.watchlistCreatesEntry, false);
assert.equal(result.approvalBoundary.watchlistCreatesTargets, false);
assert.equal(result.approvalBoundary.watchlistOverridesScanner, false);
assert.ok(result.reason.includes('no fresh entry'));
assert.ok(result.requiredNextCondition.includes('completed 5M pullback'));
assert.ok(result.missingEvidence.some((item) => item.includes('approved rules')));
assert.equal(JSON.stringify(morningMoveBars), beforeBars);
assert.equal(JSON.stringify(plan), beforePlan);
assert.equal('entry' in result, false);
assert.equal('stop' in result, false);
assert.equal('t1' in result, false);
assert.equal('t2' in result, false);

const memoryRecord = buildWatchlistMemoryRecord({
  watchlist: result,
  tradeDate: '2026-05-28',
  instrument: 'MES',
  session: 'morning',
  bars5m: morningMoveBars,
  currentPriceAtAlert: 7564.75,
  reasonNoEntry: result.reason,
  scannerState: 'Missed',
  selectedCandidateSnapshot: null,
  normalizedPlanSnapshot: plan,
});
assert.equal(memoryRecord.memoryType, 'watchlist_context');
assert.equal(memoryRecord.watchlistType, 'morning_continuation_watchlist');
assert.equal(memoryRecord.status, 'WATCH_ONLY');
assert.equal(memoryRecord.canExecute, false);
assert.equal(memoryRecord.tradeAlertEligible, false);
assert.equal(memoryRecord.freshEntryAvailable, false);
assert.equal(memoryRecord.laterValidSetupFormed, null);
assert.equal(memoryRecord.laterSetupType, null);
assert.equal(memoryRecord.laterOutcome, null);
assert.equal(memoryRecord.laterReviewTimestamp, null);
assert.equal(memoryRecord.reviewNotes, null);
assert.equal(memoryRecord.approvalBoundary.watchlistApprovesTrade, false);
assert.equal(memoryRecord.approvalBoundary.watchlistChangesRules, false);
assert.equal(memoryRecord.approvalBoundary.watchlistCreatesEntry, false);
assert.equal(memoryRecord.approvalBoundary.watchlistCreatesTargets, false);
assert.equal(memoryRecord.approvalBoundary.watchlistOverridesScanner, false);
assert.equal(memoryRecord.approvalBoundary.ragMemoryApprovesTrade, false);
assert.equal(memoryRecord.approvalBoundary.ragMemoryChangesRules, false);
assert.ok(memoryRecord.notes.some((note) => note.includes('future context only')));
assert.equal('entry' in memoryRecord, false);
assert.equal('stop' in memoryRecord, false);
assert.equal('t1' in memoryRecord, false);
assert.equal('t2' in memoryRecord, false);
assert.equal('tradeResult' in memoryRecord, false);
assert.equal('pnlTicks' in memoryRecord, false);
assert.equal(JSON.stringify(morningMoveBars), beforeBars);
assert.equal(JSON.stringify(plan), beforePlan);

const embeddingText = buildWatchlistEmbeddingText(memoryRecord);
assert.ok(embeddingText.includes('WATCHLIST CONTEXT ONLY'));
assert.ok(embeddingText.includes('not a trade'));
assert.ok(embeddingText.includes('No entry, stop, or targets were generated.'));
assert.ok(embeddingText.includes('This record does not approve trades.'));
assert.ok(embeddingText.includes('Future use is context/caution only.'));
assert.ok(embeddingText.includes('cannot approve trades, change rules, create entries, create targets, or override scanner gates'));
assert.ok(!/RAG approved|approved the trade|History confirms this trade|changes the rule|now executable/i.test(embeddingText));

function performanceRecord(
  index: number,
  overrides: Partial<WatchlistPerformanceRecord> = {}
): WatchlistPerformanceRecord {
  return {
    ...(memoryRecord as WatchlistPerformanceRecord),
    tradeDate: `2026-06-${String(index + 1).padStart(2, '0')}`,
    instrument: index % 2 === 0 ? 'MES' : 'MNQ',
    direction: index % 3 === 0 ? 'SHORT' : 'LONG',
    reasonNoEntry: index % 2 === 0 ? 'No fresh pullback formed.' : 'No safe fresh structure stop was available.',
    auditWarnings: index % 2 === 0 ? ['No chase guard stayed active.'] : ['Watchlist stayed context only.'],
    laterValidSetupFormed: null,
    laterSetupType: null,
    laterOutcome: null,
    laterReviewTimestamp: null,
    reviewNotes: null,
    ...overrides,
  };
}

const smallPerformanceInput = [
  performanceRecord(0, { laterValidSetupFormed: true, laterSetupType: 'SweepMssFvgRetrace', laterOutcome: 'later_valid_setup_formed' }),
  performanceRecord(1, { laterOutcome: 'ran_without_fresh_entry', reviewNotes: 'Price ran without fresh entry.' }),
  performanceRecord(2, { laterOutcome: 'reversed_or_failed', reviewNotes: 'Move reversed.' }),
  performanceRecord(3),
];
const smallPerformanceBefore = JSON.stringify(smallPerformanceInput);
const smallReview = reviewWatchlistPerformance(smallPerformanceInput);
assert.equal(smallReview.recordCount, 4);
assert.equal(smallReview.reviewWindow.sampleSizeMet, false);
assert.equal(smallReview.laterValidSetupFormedCount, 1);
assert.equal(smallReview.ranWithoutFreshEntryCount, 1);
assert.equal(smallReview.reversedOrFailedCount, 1);
assert.equal(smallReview.inconclusiveCount, 1);
assert.ok(smallReview.recommendation.includes('Insufficient sample size'));
assert.ok(smallReview.recommendation.includes('Do not infer performance quality'));
assert.equal(smallReview.approvalBoundary.reviewApprovesTrade, false);
assert.equal(smallReview.approvalBoundary.reviewChangesRules, false);
assert.equal(smallReview.approvalBoundary.reviewPromotesModel, false);
assert.equal(smallReview.approvalBoundary.reviewCreatesEntry, false);
assert.equal(smallReview.approvalBoundary.reviewCreatesTargets, false);
assert.equal(smallReview.approvalBoundary.reviewOverridesScanner, false);
assert.equal('entry' in smallReview, false);
assert.equal('stop' in smallReview, false);
assert.equal('t1' in smallReview, false);
assert.equal('t2' in smallReview, false);
assert.equal('executionStatus' in smallReview, false);
assert.equal(JSON.stringify(smallPerformanceInput), smallPerformanceBefore);

const largePerformanceInput = Array.from({ length: 24 }, (_, index) => {
  if (index < 8) return performanceRecord(index, { laterValidSetupFormed: true, laterSetupType: 'TurtleSoup', laterOutcome: 'valid_setup' });
  if (index < 14) return performanceRecord(index, { laterOutcome: 'ran_without_pullback', reviewNotes: 'Ran without pullback.' });
  if (index < 18) return performanceRecord(index, { laterOutcome: 'failed', reviewNotes: 'Failed and reversed.' });
  return performanceRecord(index);
});
const largeReview = reviewWatchlistPerformance(largePerformanceInput);
assert.equal(largeReview.recordCount, 24);
assert.equal(largeReview.reviewWindow.sampleSizeMet, true);
assert.equal(largeReview.laterValidSetupFormedCount, 8);
assert.equal(largeReview.ranWithoutFreshEntryCount, 6);
assert.equal(largeReview.reversedOrFailedCount, 4);
assert.equal(largeReview.inconclusiveCount, 6);
assert.ok(largeReview.commonReasonNoEntry.length > 0);
assert.ok(largeReview.commonWarnings.length > 0);
assert.ok(largeReview.noChaseProtectionNotes.some((note) => note.includes('did not produce executable trade authority')));
assert.ok(largeReview.recommendation.includes('Descriptive watchlist review only'));
assert.ok(largeReview.recommendation.includes('human review'));
assert.ok(!/watchlist model is approved|promote this to executable|change rules automatically|use watchlist as entry evidence|rag confirms future trades|history approves this setup/i.test(largeReview.recommendation));

const lunchResult = detectMorningContinuationWatchlist({
  tradeDate: '2026-05-28',
  instrument: 'MES',
  window: lunchWindow,
  bars5m: morningMoveBars,
  currentPrice: 7564.75,
  normalizedPlan: plan,
});
assert.equal(lunchResult.watchlistDetected, false);
assert.equal(lunchResult.canExecute, false);
assert.equal(lunchResult.tradeAlertEligible, false);

const executableCandidate = candidate();
const suppressed = detectMorningContinuationWatchlist({
  tradeDate: '2026-05-28',
  instrument: 'MES',
  window: morningWindow,
  bars5m: morningMoveBars,
  currentPrice: 7564.75,
  normalizedPlan: normalized({
    canExecute: true,
    decision: 'LONG',
    decisionStatus: TradeDecisionStatus.ApprovedTrade,
    entry: executableCandidate.entry,
    stop: executableCandidate.stop,
    setupCandidates: [executableCandidate],
    opportunitySelection: {
      bestExecutableCandidate: executableCandidate,
      bestConditionalCandidate: null,
      finalDecision: TradeDecisionStatus.ApprovedTrade,
      noTradeReason: null,
    },
  }),
  selectedCandidate: executableCandidate,
  scannerState: 'Approved',
});
assert.equal(suppressed.watchlistDetected, false);
assert.equal(suppressed.canExecute, false);
assert.equal(suppressed.tradeAlertEligible, false);
assert.ok(suppressed.missingEvidence.some((item) => item.includes('executable setup')));

const quietBars = [
  bar('2026-05-28T10:00:00-04:00', 100, 101, 99, 100),
  bar('2026-05-28T10:05:00-04:00', 100, 101, 99, 100.25),
  bar('2026-05-28T10:10:00-04:00', 100.25, 101.25, 99.75, 100.5),
  bar('2026-05-28T10:15:00-04:00', 100.5, 101.5, 100, 100.75),
];
const quiet = detectMorningContinuationWatchlist({
  tradeDate: '2026-05-28',
  instrument: 'MES',
  window: morningWindow,
  bars5m: quietBars,
  currentPrice: 100.75,
  normalizedPlan: normalized(),
});
assert.equal(quiet.watchlistDetected, false);
assert.equal(quiet.canExecute, false);
assert.equal(quiet.tradeAlertEligible, false);

console.log('Morning continuation watchlist agent verified.');
