import assert from 'node:assert/strict';
import { ExecutionStatus, NoTradeReason, SetupCandidateStatus, SetupType, type SetupCandidate } from '../../src/types';
import { type ScannerAlertDecision } from '../../src/lib/localScannerEngine';
import { evaluateScannerPrimaryAlertPublishingGate } from './nt-scanner';

type MatrixCase = {
  label: string;
  setupType: SetupType;
  scenarioLabel: string;
  direction: 'LONG' | 'SHORT';
  executionStatus: ExecutionStatus.Conditional | ExecutionStatus.Executable;
  score: number;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  riskPoints: number;
};

const phase2Matrix: MatrixCase[] = [
  {
    label: 'Turtle Soup / failed breakout reversal',
    setupType: SetupType.TurtleSoup,
    scenarioLabel: 'Bearish Turtle Soup Reversal',
    direction: 'SHORT',
    executionStatus: ExecutionStatus.Executable,
    score: 98,
    entry: 7483,
    stop: 7491.5,
    target1: 7470.25,
    target2: 7466,
    riskPoints: 8.5,
  },
  {
    label: 'Sweep + MSS + FVG retrace',
    setupType: SetupType.SweepMssFvgRetrace,
    scenarioLabel: 'ICT Model 1 Short: Sweep Reclaim Imbalance Retrace',
    direction: 'SHORT',
    executionStatus: ExecutionStatus.Conditional,
    score: 93,
    entry: 7445.75,
    stop: 7452.5,
    target1: 7429.25,
    target2: 7428.75,
    riskPoints: 6.75,
  },
  {
    label: 'HTF FVG cascade routed setup',
    setupType: SetupType.HtfDisplacementFvgContinuation,
    scenarioLabel: 'HTF Displacement FVG Continuation',
    direction: 'LONG',
    executionStatus: ExecutionStatus.Conditional,
    score: 91,
    entry: 7451.25,
    stop: 7443.75,
    target1: 7462.5,
    target2: 7466.25,
    riskPoints: 7.5,
  },
  {
    label: 'Active tactical zone migration setup',
    setupType: SetupType.IntradayMssMicroContinuation,
    scenarioLabel: 'Intraday MSS Micro Continuation',
    direction: 'LONG',
    executionStatus: ExecutionStatus.Conditional,
    score: 88,
    entry: 7453.75,
    stop: 7448.75,
    target1: 7461.25,
    target2: 7463.75,
    riskPoints: 5,
  },
  {
    label: 'Opposite-side high-confidence conditional',
    setupType: SetupType.FailedPlanReversal,
    scenarioLabel: 'Failed Plan Reversal',
    direction: 'SHORT',
    executionStatus: ExecutionStatus.Conditional,
    score: 90,
    entry: 7468.5,
    stop: 7475,
    target1: 7458.75,
    target2: 7455.5,
    riskPoints: 6.5,
  },
  {
    label: 'Tactical watch promoted only when full planning levels exist',
    setupType: SetupType.MorningFailedHighLiquidityRejection,
    scenarioLabel: 'Morning Failed High / Liquidity Rejection',
    direction: 'SHORT',
    executionStatus: ExecutionStatus.Conditional,
    score: 86,
    entry: 7568.25,
    stop: 7574.75,
    target1: 7558.5,
    target2: 7555.25,
    riskPoints: 6.5,
  },
];

function fullCandidate(item: MatrixCase): SetupCandidate {
  return {
    setupType: item.setupType,
    scenarioLabel: item.scenarioLabel,
    direction: item.direction,
    detectedStatus: SetupCandidateStatus.Conditional,
    executionStatus: item.executionStatus,
    confidence: 'High',
    priority: 96,
    rankScore: 250 + item.score / 10,
    decisionQualityScore: item.score,
    entry: item.entry,
    stop: item.stop,
    target1: item.target1,
    target2: item.target2,
    riskPoints: item.riskPoints,
    blockReason: item.executionStatus === ExecutionStatus.Conditional ? NoTradeReason.EntryTriggerPending : null,
    evidence: [`${item.label} evidence is structured and machine-readable.`],
    missingEvidence: item.executionStatus === ExecutionStatus.Conditional ? ['Completed 5M proof still controls execution.'] : [],
    requiredTrigger: `${item.label}: completed 5M confirmation still controls execution.`,
    nextAction: 'Publish as high-confidence conditional only; canExecute still controls execution approval.',
    invalidation: item.direction === 'LONG'
      ? `Invalid below ${item.stop.toFixed(2)}.`
      : `Invalid above ${item.stop.toFixed(2)}.`,
    reducedRiskPlan: null,
    tacticalZone: {
      sourceOfTruth: 'ohlc_fvg_zone',
      direction: item.direction,
      lower: Math.min(item.entry, item.entry + (item.direction === 'LONG' ? 1.25 : -1.25)),
      upper: Math.max(item.entry, item.entry + (item.direction === 'LONG' ? 1.25 : -1.25)),
      midpoint: item.entry,
      label: `${item.label} active tactical zone`,
      sourceTimeframe: '5M',
      confidence: 'High',
      evidence: 'Structured OHLC zone fixture for Discord publication regression.',
    },
  } as SetupCandidate;
}

function incompleteCandidate(item: MatrixCase): SetupCandidate {
  return {
    ...fullCandidate(item),
    stop: null,
    target1: null,
    target2: null,
    riskPoints: null,
    missingEvidence: ['Protected 5M stop missing.', 'App T1/T2 from actual entry/stop risk missing.'],
  } as SetupCandidate;
}

function neutralReviewDeskState(candidate: SetupCandidate): any {
  const longBias = {
    state: candidate.direction === 'LONG' ? 'primary' : 'secondary',
    lineInSand: candidate.direction === 'LONG' ? candidate.entry : null,
    tradeReadiness: { status: 'not_aligned' },
  };
  const shortBias = {
    state: candidate.direction === 'SHORT' ? 'primary' : 'secondary',
    lineInSand: candidate.direction === 'SHORT' ? candidate.entry : null,
    tradeReadiness: { status: 'not_aligned' },
  };
  return {
    canExecute: false,
    dataQualityStatus: 'sufficient',
    htfContextStatus: 'partial',
    primaryDeskPlay: {
      direction: 'WAIT',
      lineInSand: candidate.entry,
      longBias,
      shortBias,
      htfConflict: true,
    },
  };
}

function opposedDeskState(candidate: SetupCandidate): any {
  const base = neutralReviewDeskState(candidate);
  return {
    ...base,
    primaryDeskPlay: {
      ...base.primaryDeskPlay,
      direction: candidate.direction === 'LONG' ? 'SHORT' : 'LONG',
    },
  };
}

function publishDecision(candidate: SetupCandidate, staleReason: string | null = null): ScannerAlertDecision {
  return evaluateScannerPrimaryAlertPublishingGate({
    alertDecision: { shouldSend: true, reason: 'Phase 2 setup-class candidate qualified before DeskState publishing gate.' },
    deskState: neutralReviewDeskState(candidate),
    candidate,
    normalizedCanExecute: false,
    state: staleReason ? 'Missed' : 'TriggerPending',
    staleReason,
    scannerReviewStatus: null,
  });
}

function opposedPublishDecision(candidate: SetupCandidate): ScannerAlertDecision {
  return evaluateScannerPrimaryAlertPublishingGate({
    alertDecision: { shouldSend: true, reason: 'Phase 2 setup-class candidate qualified before DeskState publishing gate.' },
    deskState: opposedDeskState(candidate),
    candidate,
    normalizedCanExecute: false,
    state: 'TriggerPending',
    staleReason: null,
    scannerReviewStatus: null,
  });
}

for (const item of phase2Matrix) {
  const fresh = fullCandidate(item);
  const freshDecision = publishDecision(fresh);
  assert.equal(freshDecision.shouldSend, true, `${item.label} fresh full-level candidate shall publish`);
  assert.match(freshDecision.reason, /suppression bypassed for high-confidence conditional publication/, item.label);
  assert.match(freshDecision.reason, /NOT EXECUTION APPROVAL/i, item.label);
  assert.match(freshDecision.reason, /app-owned canExecute gate turns true/, item.label);

  const incomplete = incompleteCandidate(item);
  const incompleteDecision = publishDecision(incomplete);
  assert.equal(incompleteDecision.shouldSend, false, `${item.label} incomplete candidate must not be promoted as full-level plan`);
  assert.match(incompleteDecision.reason, /DeskState\/readiness gate/, item.label);

  const staleDecision = publishDecision(fresh, 'no chase: target already reached before alert generation');
  assert.equal(staleDecision.shouldSend, false, `${item.label} stale/no-chase candidate must remain blocked`);
  assert.match(staleDecision.reason, /stale\/no-chase review state/, item.label);

  const opposedDecision = opposedPublishDecision(fresh);
  assert.equal(opposedDecision.shouldSend, false, `${item.label} opposite-side candidate must not bypass active DeskState direction`);
  assert.match(opposedDecision.reason, /conflicts with DeskState/, item.label);
  assert.doesNotMatch(opposedDecision.reason, /suppression bypassed for high-confidence conditional publication/, item.label);
}

console.log(`Phase 2 setup-class matrix passed: ${phase2Matrix.length} setup buckets enforce fresh promotion, incomplete restraint, and stale/no-chase blocking.`);
